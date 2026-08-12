import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { searchPatients } from "@/lib/patients";
import { PATIENT_STATUS_LABELS } from "@/lib/types";
import { PatientFormDialog } from "@/components/app/PatientFormDialog";

export const Route = createFileRoute("/_authenticated/patients/")({
  head: () => ({
    meta: [
      { title: "Pacientes — The Tooth Boutique" },
      { name: "description", content: "Búsqueda y gestión de fichas de pacientes de la clínica." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const [term, setTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["patients", term],
    queryFn: () => searchPatients(term),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Busca una ficha o crea una nueva para empezar a registrar fotos.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo paciente
        </Button>
      </div>

      <PatientFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(p) => navigate({ to: "/patients/$patientId", params: { patientId: p.id } })}
      />

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar paciente por nombre…"
          className="h-12 rounded-xl border-border bg-card pl-10 text-base shadow-soft"
          autoFocus
        />
      </div>

      {error ? (
        <p className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudieron cargar los pacientes. Verifica la conexión con la base de datos.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))
          : (data ?? []).map((p) => (
              <Link
                key={p.id}
                to="/patients/$patientId"
                params={{ patientId: p.id }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl surface-gradient">
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={`Última foto de ${p.name}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {p.treatment_type ?? "Sin tratamiento asignado"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {p.status ? (
                      <Badge variant="secondary">
                        {PATIENT_STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {p.lastVisitDate
                        ? `Última visita: ${new Date(p.lastVisitDate).toLocaleDateString("es-CL")}`
                        : "Sin visitas"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
      </div>

      {!isLoading && !error && (data ?? []).length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-medium">Sin resultados</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {term ? `No hay pacientes que coincidan con "${term}".` : "Aún no hay pacientes cargados."}
          </p>
        </div>
      ) : null}
    </main>
  );
}