import { Upload } from "tus-js-client";
import { supabase } from "./supabase";
import { PHOTO_BUCKET, type Photo, type Visit } from "./types";

const LARGE_FILE_BYTES = 8 * 1024 * 1024;
const THUMBNAIL_WIDTH = 400;

async function createThumbnail(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const source = await createImageBitmap(file);
  const scale = Math.min(1, THUMBNAIL_WIDTH / source.width);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(source, 0, 0, width, height);
  source.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("No se pudo crear el thumbnail"))), "image/jpeg", 0.82),
  );
  return { blob, width, height };
}

async function uploadResumable(path: string, file: File, onProgress?: (value: number) => void) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("La sesión expiró. Vuelve a iniciar sesión.");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`;
  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: url,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      headers: {
        authorization: `Bearer ${token}`,
        "x-upsert": "false",
      },
      metadata: {
        bucketName: PHOTO_BUCKET,
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onError: reject,
      onProgress: (loaded, total) => onProgress?.(Math.round((loaded / total) * 100)),
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

export interface VisitWithPhotos extends Visit {
  photos: (Photo & { url: string | null })[];
}

export async function getVisits(patientId: string): Promise<VisitWithPhotos[]> {
  const { data: visits, error } = await supabase
    .from("visits")
    .select("*")
    .eq("patient_id", patientId)
    .order("visit_date", { ascending: false });
  if (error) throw error;
  const rows = (visits ?? []) as Visit[];
  if (!rows.length) return [];

  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .in("visit_id", rows.map((v) => v.id))
    .order("created_at", { ascending: true });

  const list = (photos ?? []) as Photo[];
  const paths = list.map((p) => p.thumbnail_path ?? p.storage_path);
  const urlByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  return rows.map((v) => ({
    ...v,
    photos: list
      .filter((p) => p.visit_id === v.id)
      .map((p) => ({ ...p, url: urlByPath.get(p.thumbnail_path ?? p.storage_path) ?? null })),
  }));
}

export interface PendingPhoto {
  file: File;
  photoType: string;
}

export async function createVisit(params: {
  patientId: string;
  visitDate: string;
  visitLabel?: string | null;
  notes?: string | null;
}) {
  const { data: visit, error } = await supabase
    .from("visits")
    .insert({
      patient_id: params.patientId,
      visit_date: params.visitDate,
      visit_label: params.visitLabel || null,
      notes: params.notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return visit as Visit;
}

export async function uploadVisitPhoto(params: { patientId: string; visitId: string; photo: PendingPhoto }) {
  const { patientId, visitId, photo } = params;
  const ext = (photo.file.name.split(".").pop() || "jpg").toLowerCase();
  const stem = `${patientId}/${visitId}/${photo.photoType}-${crypto.randomUUID().slice(0, 8)}`;
  const path = `${stem}.${ext}`;
  if (photo.file.size >= LARGE_FILE_BYTES) {
    await uploadResumable(path, photo.file);
  } else {
    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, photo.file, { upsert: false, ...(photo.file.type ? { contentType: photo.file.type } : {}) });
    if (upErr) throw upErr;
  }

  let thumbnailPath: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const thumbnail = await createThumbnail(photo.file);
    thumbnailPath = `${stem}-thumbnail.jpg`;
    width = thumbnail.width;
    height = thumbnail.height;
    const { error: thumbnailError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(thumbnailPath, thumbnail.blob, { upsert: false, contentType: "image/jpeg", cacheControl: "3600" });
    if (thumbnailError) thumbnailPath = null;
  } catch {
    // Some browsers cannot decode HEIC; the original remains available as a fallback.
  }

  const { error: insErr } = await supabase.from("photos").insert({
    visit_id: visitId,
    photo_type: photo.photoType,
    storage_path: path,
    thumbnail_path: thumbnailPath,
    file_size_bytes: photo.file.size,
    width,
    height,
  });
  if (insErr) throw insErr;
}

export async function deletePhoto(photo: Pick<Photo, "id" | "storage_path" | "thumbnail_path">) {
  const paths = [photo.storage_path, photo.thumbnail_path].filter((p): p is string => Boolean(p));
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  const { error } = await supabase.from("photos").delete().eq("id", photo.id);
  if (error) throw error;
}

export async function deleteVisit(visitId: string) {
  const { data: photos } = await supabase.from("photos").select("storage_path, thumbnail_path").eq("visit_id", visitId);
  const paths = ((photos ?? []) as { storage_path: string; thumbnail_path: string | null }[]).flatMap((p) =>
    [p.storage_path, p.thumbnail_path].filter((path): path is string => Boolean(path)),
  );
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  await supabase.from("photos").delete().eq("visit_id", visitId);
  const { error } = await supabase.from("visits").delete().eq("id", visitId);
  if (error) throw error;
}
