import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
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
import { searchDentalinkPatients, type DentalinkPatient } from "@/lib/dentalink";
import { PATIENT_STATUSES, PATIENT_STATUS_LABELS, type Patient } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  onSaved?: (patient: Patient) => void;
}

const empty = {
  name: "", email: "", birth_date: "", phone: "", treatment_type: "", start_date: "",
  status: "activo", notes: "", dentalink_id: "",
};

function fmtDate(d: string) {
  if (!d) return "";
  const parsed = new Date(`${d}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
}

export function PatientFormDialog({ open, onOpenChange, patient, onSaved }: Props) {
  const [form, setForm] = useState(empty);
  const [dentalinkQuery, setDentalinkQuery] = useState("");
  const queryClient = useQueryClient();

  const searchMutation = useMutation({
    mutationFn: (query: string) => searchDentalinkPatients(query),
    onError: () => toast.error("No se pudo conectar con Dentalink. Puedes llenar los datos manualmente."),
  });

  useEffect(() => {
    if (!open) return;
    setForm(
      patient
        ? {
            name: patient.name ?? "",
            email: patient.email ?? "",
            birth_date: patient.birth_date ?? "",
            phone: patient.phone ?? "",
            treatment_type: patient.treatment_type ?? "",
            start_date: patient.start_date ?? "",
            status: patient.status ?? "activo",
            notes: patient.notes ?? "",
            dentalink_id: patient.dentalink_id ?? "",
          }
        : empty,
    );
    setDentalinkQuery("");
    searchMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient]);

  const mutation = useMutation({
    mutationFn: () =>
      upsertPatient({
        ...(patient?.id ? { id: patient.id } : {}),
        name: form.name.trim(),
        email: form.email || null,
        birth_date: form.birth_date || null,
        phone: form.phone || null,
        treatment_type: form.treatment_type || null,
        start_date: form.start_date || null,
        status: form.status || "activo",
        notes: form.notes || null,
        dentalink_id: form.dentalink_id || null,
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

  const handleDentalinkSearch = () => {
    const q = dentalinkQuery.trim();
    if (!q) return;
    searchMutation.mutate(q);
  };

  const handleSelectDentalink = (dp: DentalinkPatient) => {
    setForm((f) => ({
      ...f,
      name: `${dp.nombre} ${dp.apellidos}`.trim(),
      email: dp.email || "",
      phone: dp.celular || dp.telefono || "",
      birth_date: dp.fecha_nacimiento || "",
      dentalink_id: String(dp.id),
    }));
    searchMutation.reset();
    setDentalinkQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{patient ? "Editar ficha" : "Nuevo paciente"}</DialogTitle>
          <DialogDescription>
            Datos básicos del paciente para su seguimiento fotográfico.
          </DialogDescription>
        </DialogHeader>

        {!patient ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-3">
            <Label htmlFor="dentalink_search" className="text-xs font-medium text-muted-foreground">
              Buscar en Dentalink
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="dentalink_search"
                value={dentalinkQuery}
                onChange={(e) => setDentalinkQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleDentalinkSearch();
                  }
                }}
                placeholder="Nombre del paciente…"
                className="bg-background"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleDentalinkSearch}
                disabled={!dentalinkQuery.trim() || searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchMutation.isSuccess && searchMutation.data.length > 0 ? (
              <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                {searchMutation.data.map((dp) => (
                  <li key={dp.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectDentalink(dp)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <p className="font-medium">{dp.nombre} {dp.apellidos}</p>
                      <p className="text-xs text-muted-foreground">
                        {dp.fecha_nacimiento ? fmtDate(dp.fecha_nacimiento) : "Sin fecha de nacimiento"}
                        {" · "}
                        {dp.celular || dp.telefono || "Sin teléfono"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {searchMutation.isSuccess && searchMutation.data.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No se encontró en Dentalink, puedes llenar los datos manualmente.
              </p>
            ) : null}

            {form.dentalink_id ? (
              <p className="mt-2 text-xs text-primary">
                Datos cargados desde Dentalink (ID {form.dentalink_id}). Puedes editarlos antes de guardar.
              </p>
            ) : null}
          </div>
        ) : null}

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

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="paciente@correo.com" />
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
