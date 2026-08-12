const SEARCH_URL = "https://tommy-1.app.n8n.cloud/webhook/dentalink/buscar-paciente";

export interface DentalinkPatient {
  id: number;
  rut: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono: string;
  celular: string;
  email: string;
  habilitado: number;
}

export async function searchDentalinkPatients(query: string): Promise<DentalinkPatient[]> {
  const res = await fetch(`${SEARCH_URL}?nombre=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("No se pudo conectar con Dentalink");
  const data = (await res.json()) as { pacientes?: DentalinkPatient[] };
  return Array.isArray(data.pacientes) ? data.pacientes : [];
}
