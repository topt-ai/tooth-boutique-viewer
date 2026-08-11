import { supabase } from "./supabase";
import { PHOTO_BUCKET, type Patient, type Photo, type Visit } from "./types";

export interface PatientListItem extends Patient {
  lastVisitDate: string | null;
  thumbnailUrl: string | null;
}

export async function signedUrl(path: string | null | undefined, expiresIn = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function searchPatients(term: string): Promise<PatientListItem[]> {
  let query = supabase
    .from("patients")
    .select("*")
    .order("name", { ascending: true })
    .limit(60);

  if (term.trim()) query = query.ilike("name", `%${term.trim()}%`);

  const { data: patients, error } = await query;
  if (error) throw error;
  const rows = (patients ?? []) as Patient[];
  if (rows.length === 0) return [];

  const ids = rows.map((p) => p.id);
  const { data: visits } = await supabase
    .from("visits")
    .select("id, patient_id, visit_date")
    .in("patient_id", ids)
    .order("visit_date", { ascending: false });

  const latestVisitByPatient = new Map<string, { id: string; visit_date: string }>();
  for (const v of (visits ?? []) as Visit[]) {
    if (!latestVisitByPatient.has(v.patient_id)) {
      latestVisitByPatient.set(v.patient_id, { id: v.id, visit_date: v.visit_date });
    }
  }

  const visitIds = [...latestVisitByPatient.values()].map((v) => v.id);
  const photoByVisit = new Map<string, Photo>();
  if (visitIds.length) {
    const { data: photos } = await supabase
      .from("photos")
      .select("*")
      .in("visit_id", visitIds);
    for (const p of (photos ?? []) as Photo[]) {
      if (!photoByVisit.has(p.visit_id)) photoByVisit.set(p.visit_id, p);
    }
  }

  const paths = [...photoByVisit.values()].map((p) => p.thumbnail_path ?? p.storage_path);
  const urlByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }

  return rows.map((p) => {
    const visit = latestVisitByPatient.get(p.id);
    const photo = visit ? photoByVisit.get(visit.id) : undefined;
    const path = photo ? (photo.thumbnail_path ?? photo.storage_path) : null;
    return {
      ...p,
      lastVisitDate: visit?.visit_date ?? null,
      thumbnailUrl: path ? (urlByPath.get(path) ?? null) : null,
    };
  });
}

export async function getPatient(id: string): Promise<Patient> {
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Patient;
}

export async function upsertPatient(patient: Partial<Patient> & { name: string }) {
  const payload = { ...patient };
  const { data, error } = patient.id
    ? await supabase.from("patients").update(payload).eq("id", patient.id).select().single()
    : await supabase.from("patients").insert(payload).select().single();
  if (error) throw error;
  return data as Patient;
}