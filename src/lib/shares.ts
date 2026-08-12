import { supabase } from "./supabase";
import { PHOTO_BUCKET } from "./types";

const SIGNED_URL_TTL = 60 * 60 * 24; // 1 day, enough for a viewing session

export async function createComparisonShare(params: {
  patientId: string;
  beforePhotoId: string;
  afterPhotoId: string;
  beforeLabel: string;
  afterLabel: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("comparison_shares")
    .insert({
      patient_id: params.patientId,
      before_photo_id: params.beforePhotoId,
      after_photo_id: params.afterPhotoId,
      before_label: params.beforeLabel,
      after_label: params.afterLabel,
      created_by: auth.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export interface PublicComparison {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel: string;
  afterLabel: string;
  patientName: string;
}

export async function getPublicComparison(shareId: string): Promise<PublicComparison | null> {
  const { data, error } = await supabase.rpc("get_comparison_share", { p_id: shareId });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;

  const { data: signed, error: signError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls([row.before_path, row.after_path], SIGNED_URL_TTL);
  if (signError) throw signError;

  const urlByPath = new Map<string, string>();
  for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  const beforeUrl = urlByPath.get(row.before_path);
  const afterUrl = urlByPath.get(row.after_path);
  if (!beforeUrl || !afterUrl) return null;

  return {
    beforeUrl,
    afterUrl,
    beforeLabel: row.before_label,
    afterLabel: row.after_label,
    patientName: row.patient_name,
  };
}
