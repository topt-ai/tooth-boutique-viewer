import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarPlus, FileDown, GitCompareArrows, Image as ImageIcon, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getPatient } from "@/lib/patients";
import { getVisits } from "@/lib/visits";
import { PATIENT_STATUS_LABELS, PHOTO_TYPE_LABELS } from "@/lib/types";
import { PatientFormDialog } from "@/components/app/PatientFormDialog";
import { NewVisitDialog } from "@/components/app/NewVisitDialog";
import { CompareDialog } from "@/components/app/CompareDialog";
import { exportPhotosPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Ficha de paciente — Tooth Boutique" },
      { name: "description", content: "Historial fotográfico y timeline de visitas del paciente." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientProfilePage,
});

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function PatientProfilePage() {
  const { patientId } = Route.useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, { url: string; caption: string }>>({});
  const [exporting, setExporting] = useState(false);

  const patientQuery = useQuery({ queryKey: ["patient", patientId], queryFn: () => getPatient(patientId) });
  const visitsQuery = useQuery({ queryKey: ["visits", patientId], queryFn: () => getVisits(patientId) });

  const patient = patientQuery.data;
  const visits = visitsQuery.data ?? [];
  const selectedList = Object.values(selected);

  const toggle = (id: string, url: string | null, caption: string) => {
    if (!url) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = { url, caption };
      return next;
    });
  };

  const handleExport = async () => {
    if (!patient || !selectedList.length) return;
    setExporting(true);
    try {
      await exportPhotosPdf({ patientName: patient.name, photos: selectedList });
    } catch {
      toast.error("No se pudo generar el PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a pacientes
      </Link>

      {patientQuery.isLoading ? (
        <Skeleton className="mt-6 h-40 rounded-2xl" />
      ) : patient ? (
        <section className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{patient.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {patient.status ? (
                  <Badge variant="secondary">{PATIENT_STATUS_LABELS[patient.status] ?? patient.status}</Badge>
                ) : null}
                {patient.treatment_type ? (
                  <span className="text-sm text-muted-foreground">{patient.treatment_type}</span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar ficha
              </Button>
              <Button variant="outline" onClick={() => setCompareOpen(true)} disabled={visits.filter((v) => v.photos.length).length < 2}>
                <GitCompareArrows className="mr-2 h-4 w-4" /> Comparar
              </Button>
              <Button onClick={() => setVisitOpen(true)}>
                <CalendarPlus className="mr-2 h-4 w-4" /> Nueva visita
              </Button>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Nacimiento", patient.birth_date ? fmtDate(patient.birth_date) : "—"],
              ["Teléfono", patient.phone ?? "—"],
              ["Inicio tratamiento", patient.start_date ? fmtDate(patient.start_date) : "—"],
              ["Visitas", String(visits.length)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl surface-gradient p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {patient.notes ? (
            <p className="mt-4 rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
              {patient.notes}
            </p>
          ) : null}
        </section>
      ) : (
        <p className="mt-6 text-sm text-destructive">No se encontró el paciente.</p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Timeline de visitas</h2>
        <Button variant="outline" onClick={handleExport} disabled={!selectedList.length || exporting}>
          <FileDown className="mr-2 h-4 w-4" />
          {exporting ? "Generando…" : `Exportar PDF${selectedList.length ? ` (${selectedList.length})` : ""}`}
        </Button>
      </div>

      {visitsQuery.isLoading ? (
        <Skeleton className="mt-4 h-48 rounded-2xl" />
      ) : visits.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-medium">Aún no hay visitas</p>
          <p className="mt-1 text-sm text-muted-foreground">Crea la primera visita y sube las fotos de la sesión.</p>
        </div>
      ) : (
        <ol className="mt-4 space-y-6 border-l border-border pl-6">
          {visits.map((visit) => (
            <li key={visit.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{fmtDate(visit.visit_date)}</p>
                    {visit.visit_label ? (
                      <p className="text-sm text-muted-foreground">{visit.visit_label}</p>
                    ) : null}
                  </div>
                  <Badge variant="secondary">{visit.photos.length} fotos</Badge>
                </div>

                {visit.notes ? <p className="mt-2 text-sm text-muted-foreground">{visit.notes}</p> : null}

                {visit.photos.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {visit.photos.map((photo) => {
                      const isSel = Boolean(selected[photo.id]);
                      return (
                        <button
                          type="button"
                          key={photo.id}
                          onClick={() =>
                            toggle(
                              photo.id,
                              photo.url,
                              `${PHOTO_TYPE_LABELS[photo.photo_type] ?? photo.photo_type} · ${fmtDate(visit.visit_date)}`,
                            )
                          }
                          className={`overflow-hidden rounded-xl border text-left transition-all ${
                            isSel ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex h-24 items-center justify-center surface-gradient">
                            {photo.url ? (
                              <img src={photo.url} alt={photo.photo_type} loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <p className="truncate px-2 py-1.5 text-[11px] text-muted-foreground">
                            {PHOTO_TYPE_LABELS[photo.photo_type] ?? photo.photo_type}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      <PatientFormDialog open={editOpen} onOpenChange={setEditOpen} patient={patient ?? null} />
      <NewVisitDialog patientId={patientId} open={visitOpen} onOpenChange={setVisitOpen} />
      {patient ? (
        <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} visits={visits} patientName={patient.name} />
      ) : null}
    </main>
  );
}
