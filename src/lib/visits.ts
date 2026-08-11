import { supabase } from "./supabase";
import { PHOTO_BUCKET, type Photo, type Visit } from "./types";

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

export async function createVisitWithPhotos(params: {
  patientId: string;
  visitDate: string;
  visitLabel?: string | null;
  notes?: string | null;
  photos: PendingPhoto[];
  onProgress?: (done: number, total: number) => void;
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
  const v = visit as Visit;

  let done = 0;
  for (const item of params.photos) {
    const ext = (item.file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${params.patientId}/${v.id}/${item.photoType}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, item.file, { upsert: false, ...(item.file.type ? { contentType: item.file.type } : {}) });
    if (upErr) throw upErr;

    const { error: insErr } = await supabase.from("photos").insert({
      visit_id: v.id,
      photo_type: item.photoType,
      storage_path: path,
      file_size_bytes: item.file.size,
    });
    if (insErr) throw insErr;
    done += 1;
    params.onProgress?.(done, params.photos.length);
  }

  return v;
}

export async function deleteVisit(visitId: string) {
  const { data: photos } = await supabase.from("photos").select("storage_path").eq("visit_id", visitId);
  const paths = ((photos ?? []) as { storage_path: string }[]).map((p) => p.storage_path);
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  await supabase.from("photos").delete().eq("visit_id", visitId);
  const { error } = await supabase.from("visits").delete().eq("id", visitId);
  if (error) throw error;
}
