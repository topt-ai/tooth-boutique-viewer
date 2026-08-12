import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarPlus, FileDown, GitCompareArrows, Image as ImageIcon, Pencil, PencilLine, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getPatient } from "@/lib/patients";
import { deletePhoto, deleteVisit, getVisits, updatePhotoType, type VisitWithPhotos } from "@/lib/visits";
import { PATIENT_STATUS_LABELS, PHOTO_TYPES, PHOTO_TYPE_LABELS } from "@/lib/types";
import { PatientFormDialog } from "@/components/app/PatientFormDialog";
import { NewVisitDialog } from "@/components/app/NewVisitDialog";
import { CompareDialog } from "@/components/app/CompareDialog";
import { exportPhotosPdf } from "@/lib/pdf";
import { useStaffRole } from "@/hooks/useStaffRole";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Ficha de paciente — The Tooth Boutique" },
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
  const [photoToDelete, setPhotoToDelete] = useState<VisitWithPhotos["photos"][number] | null>(null);
  const [visitToDelete, setVisitToDelete] = useState<VisitWithPhotos | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { isAdmin } = useStaffRole();
  const patientQuery = useQuery({ queryKey: ["patient", patientId], queryFn: () => getPatient(patientId) });
  const visitsQuery = useQuery({ queryKey: ["visits", patientId], queryFn: () => getVisits(patientId) });

  const patient = patientQuery.data;
  const visits = visitsQuery.data ?? [];
  const selectedList = Object.values(selected);

  const deleteMutation = useMutation({
    mutationFn: (photo: { id: string; storage_path: string; thumbnail_path: string | null }) => deletePhoto(photo),
    onSuccess: (_, photo) => {
      toast.success("Foto eliminada");
      setSelected((prev) => {
        if (!prev[photo.id]) return prev;
        const next = { ...prev };
        delete next[photo.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["visits", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: () => toast.error("No se pudo eliminar la foto"),
    onSettled: () => setPhotoToDelete(null),
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) => updatePhotoType(id, type),
    onSuccess: () => {
      toast.success("Tipo de foto actualizado");
      queryClient.invalidateQueries({ queryKey: ["visits", patientId] });
    },
    onError: () => toast.error("No se pudo actualizar el tipo de foto"),
  });

  const deleteVisitMutation = useMutation({
    mutationFn: (visitId: string) => deleteVisit(visitId),
    onSuccess: () => {
      toast.success("Visita eliminada");
      queryClient.invalidateQueries({ queryKey: ["visits", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: () => toast.error("No se pudo eliminar la visita"),
    onSettled: () => setVisitToDelete(null),
  });

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
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{visit.photos.length} fotos</Badge>
                    {isAdmin ? (
                      <button
                        type="button"
                        aria-label="Eliminar visita"
                        onClick={() => setVisitToDelete(visit)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {visit.notes ? <p className="mt-2 text-sm text-muted-foreground">{visit.notes}</p> : null}

                {visit.photos.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Sin fotos en esta visita.</p>
                ) : null}

                {visit.photos.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {visit.photos.map((photo) => {
                      const isSel = Boolean(selected[photo.id]);
                      const isEditing = editingPhotoId === photo.id;
                      return (
                        <div
                          key={photo.id}
                          className={`group overflow-hidden rounded-xl border transition-all ${
                            isSel ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                toggle(
                                  photo.id,
                                  photo.url,
                                  `${PHOTO_TYPE_LABELS[photo.photo_type] ?? photo.photo_type} · ${fmtDate(visit.visit_date)}`,
                                )
                              }
                              className="flex h-24 w-full items-center justify-center surface-gradient"
                            >
                              {photo.url ? (
                                <img src={photo.url} alt={photo.photo_type} loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                            {isAdmin ? (
                              <button
                                type="button"
                                aria-label="Editar tipo de foto"
                                onClick={() => setEditingPhotoId(photo.id)}
                                className="absolute left-1 top-1 rounded-full bg-background/90 p-1 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                            {isAdmin ? (
                              <button
                                type="button"
                                aria-label="Eliminar foto"
                                onClick={() => setPhotoToDelete(photo)}
                                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>

                          {isEditing ? (
                            <Select
                              value={photo.photo_type}
                              onValueChange={(v) => updateTypeMutation.mutate({ id: photo.id, type: v })}
                              onOpenChange={(open) => { if (!open) setEditingPhotoId(null); }}
                              defaultOpen
                            >
                              <SelectTrigger className="h-7 rounded-none border-0 border-t border-border text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PHOTO_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>{PHOTO_TYPE_LABELS[t]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                toggle(
                                  photo.id,
                                  photo.url,
                                  `${PHOTO_TYPE_LABELS[photo.photo_type] ?? photo.photo_type} · ${fmtDate(visit.visit_date)}`,
                                )
                              }
                              className="block w-full truncate px-2 py-1.5 text-left text-[11px] text-muted-foreground"
                            >
                              {PHOTO_TYPE_LABELS[photo.photo_type] ?? photo.photo_type}
                            </button>
                          )}
                        </div>
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

      <AlertDialog open={Boolean(photoToDelete)} onOpenChange={(v) => { if (!v) setPhotoToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La foto se eliminará permanentemente de la visita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (photoToDelete) deleteMutation.mutate(photoToDelete);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(visitToDelete)} onOpenChange={(v) => { if (!v) setVisitToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta visita?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la visita{visitToDelete ? ` del ${fmtDate(visitToDelete.visit_date)}` : ""} y todas sus fotos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteVisitMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteVisitMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (visitToDelete) deleteVisitMutation.mutate(visitToDelete.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteVisitMutation.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
