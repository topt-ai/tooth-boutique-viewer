export type PatientStatus = string;

export interface Patient {
  id: string;
  dentalink_id: string | null;
  name: string;
  email: string | null;
  birth_date: string | null;
  phone: string | null;
  treatment_type: string | null;
  start_date: string | null;
  status: PatientStatus | null;
  notes: string | null;
}

export interface Visit {
  id: string;
  patient_id: string;
  visit_date: string;
  visit_label: string | null;
  notes: string | null;
}

export interface Photo {
  id: string;
  visit_id: string;
  photo_type: string;
  storage_path: string;
  thumbnail_path: string | null;
  display_path: string | null;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
}

export const PHOTO_TYPES = [
  "frontal",
  "frontal_sonrisa",
  "perfil_derecho",
  "perfil_izquierdo",
  "oclusal_superior",
  "oclusal_inferior",
  "frontal_oclusion",
  "otro",
] as const;

export const PHOTO_TYPE_LABELS: Record<string, string> = {
  frontal: "Frontal",
  frontal_sonrisa: "Frontal sonrisa",
  perfil_derecho: "Perfil derecho",
  perfil_izquierdo: "Perfil izquierdo",
  oclusal_superior: "Oclusal superior",
  oclusal_inferior: "Oclusal inferior",
  frontal_oclusion: "Frontal en oclusión",
  otro: "Otro",
};

export const PATIENT_STATUSES = ["activo", "en_tratamiento", "finalizado", "inactivo"] as const;

export const PATIENT_STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  en_tratamiento: "En tratamiento",
  finalizado: "Finalizado",
  inactivo: "Inactivo",
};

export const PHOTO_BUCKET = "patient-photos";