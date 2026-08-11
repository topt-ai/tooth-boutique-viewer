import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadCloud, X, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PHOTO_TYPES, PHOTO_TYPE_LABELS } from "@/lib/types";
import { createVisitWithPhotos } from "@/lib/visits";

interface Props {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Item {
  id: string;
  file: File;
  preview: string;
  photoType: string;
}

const MAX_BYTES = 50 * 1024 * 1024;

export function NewVisitDialog({ patientId, open, onOpenChange }: Props) {
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [nextType, setNextType] = useState<string>(PHOTO_TYPES[0]);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const accepted: Item[] = [];
      let typeIndex = PHOTO_TYPES.indexOf(nextType as (typeof PHOTO_TYPES)[number]);
      if (typeIndex < 0) typeIndex = 0;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} no es una imagen`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} supera los 50 MB`);
          continue;
        }
        accepted.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          photoType: PHOTO_TYPES[Math.min(typeIndex, PHOTO_TYPES.length - 1)] ?? "otro",
        });
        typeIndex += 1;
      }
      if (accepted.length) setItems((prev) => [...prev, ...accepted]);
    },
    [nextType],
  );

  const reset = () => {
    items.forEach((i) => URL.revokeObjectURL(i.preview));
    setItems([]);
    setLabel("");
    setNotes("");
    setProgress(0);
    setVisitDate(new Date().toISOString().slice(0, 10));
  };

  const mutation = useMutation({
    mutationFn: () =>
      createVisitWithPhotos({
        patientId,
        visitDate,
        visitLabel: label,
        notes,
        photos: items.map((i) => ({ file: i.file, photoType: i.photoType })),
        onProgress: (done, total) => setProgress(Math.round((done / total) * 100)),
      }),
    onSuccess: () => {
      toast.success("Visita registrada");
      queryClient.invalidateQueries({ queryKey: ["visits", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la visita"),
  });

  const usedTypes = new Set(items.map((i) => i.photoType));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && mutation.isPending) return;
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nueva visita</DialogTitle>
          <DialogDescription>
            Registra la fecha y arrastra las fotos de la sesión. Asigna un tipo a cada una.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="visit_date">Fecha de la visita</Label>
            <Input id="visit_date" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="visit_label">Etiqueta (opcional)</Label>
            <Input id="visit_label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Control 3 meses" />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="visit_notes">Notas</Label>
          <Textarea id="visit_notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label>Tipo por defecto para las próximas fotos</Label>
          <Select value={nextType} onValueChange={setNextType}>
            <SelectTrigger className="sm:w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PHOTO_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{PHOTO_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Checklist de tipos</p>
          <div className="flex flex-wrap gap-2">
            {PHOTO_TYPES.map((t) => (
              <span
                key={t}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                  usedTypes.has(t)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {usedTypes.has(t) ? <Check className="h-3 w-3" /> : null}
                {PHOTO_TYPE_LABELS[t]}
              </span>
            ))}
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border bg-card/50 hover:border-primary/50"
          }`}
        >
          <UploadCloud className="h-8 w-8 text-primary" />
          <p className="mt-2 text-sm font-medium">Arrastra las fotos aquí</p>
          <p className="text-xs text-muted-foreground">JPG, PNG o HEIC · hasta 50 MB por archivo</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {items.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-2 shadow-soft">
                <div className="relative overflow-hidden rounded-lg">
                  <img src={item.preview} alt={item.file.name} className="h-32 w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Quitar foto"
                    onClick={() => {
                      URL.revokeObjectURL(item.preview);
                      setItems((prev) => prev.filter((i) => i.id !== item.id));
                    }}
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Select
                  value={item.photoType}
                  onValueChange={(v) =>
                    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, photoType: v } : i)))
                  }
                >
                  <SelectTrigger className="mt-2 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PHOTO_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{PHOTO_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.file.name}</p>
              </div>
            ))}
          </div>
        ) : null}

        {mutation.isPending ? <Progress value={progress} className="h-2" /> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? `Subiendo… ${progress}%` : `Guardar visita${items.length ? ` (${items.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
