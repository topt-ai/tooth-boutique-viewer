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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { upsertPatient } from "@/lib/patients";
import { PATIENT_STATUSES, PATIENT_STATUS_LABELS, type Patient } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  onSaved?: (patient: Patient) => void;
}

const empty = {
  name: "", birth_date: "", phone: "", treatment_type: "", start_date: "",
  status: "activo", notes: "",
};

export function PatientFormDialog({ open, onOpenChange, patient, onSaved }: Props) {
  const [form, setForm] = useState(empty);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setForm(
      patient
        ? {
            name: patient.name ?? "",
            birth_date: patient.birth_date ?? "",
            phone: patient.phone ?? "",
            treatment_type: patient.treatment_type ?? "",
            start_date: patient.start_date ?? "",
            status: patient.status ?? "activo",
            notes: patient.notes ?? "",
          }
        : empty,
    );
  }, [open, patient]);

  const mutation = useMutation({
    mutationFn: () =>
      upsertPatient({
        ...(patient?.id ? { id: patient.id } : {}),
        name: form.name.trim(),
        birth_date: form.birth_date || null,
        phone: form.phone || null,
        treatment_type: form.treatment_type || null,
        start_date: form.start_date || null,
        status: form.status || "activo",
        notes: form.notes || null,
      }),
    onSuccess: (saved) => {
      toast.success(patient ? "Ficha actualizada" : "Paciente creado");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", saved.id] });
      onOpenChange(false);
      onSaved?.(saved);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la ficha"),
  });

  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{patient ? "Editar ficha" : "Nuevo paciente"}</DialogTitle>
          <DialogDescription>
            Datos básicos del paciente para su seguimiento fotográfico.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) {
              toast.error("El nombre es obligatorio");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name")(e.target.value)} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <Input id="birth_date" type="date" value={form.birth_date} onChange={(e) => set("birth_date")(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+56 9 ..." />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="treatment_type">Tipo de tratamiento</Label>
              <Input id="treatment_type" value={form.treatment_type} onChange={(e) => set("treatment_type")(e.target.value)} placeholder="Ortodoncia, estética…" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start_date">Fecha de inicio</Label>
              <Input id="start_date" type="date" value={form.start_date} onChange={(e) => set("start_date")(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={set("status")}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                {PATIENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{PATIENT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
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
