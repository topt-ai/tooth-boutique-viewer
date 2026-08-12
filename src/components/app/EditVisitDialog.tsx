import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateVisit } from "@/lib/visits";
import type { VisitWithPhotos } from "@/lib/visits";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  visit: VisitWithPhotos | null;
}

export function EditVisitDialog({ open, onOpenChange, patientId, visit }: Props) {
  const [visitDate, setVisitDate] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open || !visit) return;
    setVisitDate(visit.visit_date);
    setLabel(visit.visit_label ?? "");
    setNotes(visit.notes ?? "");
  }, [open, visit]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!visit) throw new Error("Sin visita");
      return updateVisit(visit.id, { visitDate, visitLabel: label, notes });
    },
    onSuccess: () => {
      toast.success("Visita actualizada");
      queryClient.invalidateQueries({ queryKey: ["visits", patientId] });
      onOpenChange(false);
    },
    onError: () => toast.error("No se pudo actualizar la visita"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar visita</DialogTitle>
          <DialogDescription>Actualiza la fecha, etiqueta o notas de esta visita.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!visitDate) {
              toast.error("La fecha es obligatoria");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="edit_visit_date">Fecha de la visita</Label>
            <Input id="edit_visit_date" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit_visit_label">Etiqueta (opcional)</Label>
            <Input id="edit_visit_label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Control 3 meses" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit_visit_notes">Notas</Label>
            <Textarea id="edit_visit_notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
