import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PHOTO_TYPE_LABELS } from "@/lib/types";
import type { VisitWithPhotos } from "@/lib/visits";
import { exportPhotosPdf } from "@/lib/pdf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visits: VisitWithPhotos[];
  patientName: string;
}

function fmt(v: VisitWithPhotos) {
  const d = new Date(`${v.visit_date}T00:00:00`).toLocaleDateString("es-CL");
  return v.visit_label ? `${d} · ${v.visit_label}` : d;
}

export function CompareDialog({ open, onOpenChange, visits, patientName }: Props) {
  const withPhotos = useMemo(() => visits.filter((v) => v.photos.length > 0), [visits]);
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");
  const [type, setType] = useState("");
  const [pos, setPos] = useState(50);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!withPhotos.length) return;
    const oldest = withPhotos[withPhotos.length - 1]?.id;
    const newest = withPhotos[0]?.id;
    if (oldest) setBeforeId((prev) => (withPhotos.some((v) => v.id === prev) ? prev : oldest));
    if (newest) setAfterId((prev) => (withPhotos.some((v) => v.id === prev) ? prev : newest));
  }, [withPhotos]);

  const before = withPhotos.find((v) => v.id === beforeId);
  const after = withPhotos.find((v) => v.id === afterId);

  const sharedTypes = useMemo(() => {
    if (!before || !after) return [];
    const a = new Set(before.photos.map((p) => p.photo_type));
    return [...new Set(after.photos.map((p) => p.photo_type))].filter((t) => a.has(t));
  }, [before, after]);

  const activeType = sharedTypes.includes(type) ? type : (sharedTypes[0] ?? "");
  const beforePhoto = before?.photos.find((p) => p.photo_type === activeType);
  const afterPhoto = after?.photos.find((p) => p.photo_type === activeType);
  const beforeUrl = beforePhoto ? (beforePhoto.fullUrl ?? beforePhoto.url) : null;
  const afterUrl = afterPhoto ? (afterPhoto.fullUrl ?? afterPhoto.url) : null;

  const handleExport = async () => {
    if (!beforeUrl || !afterUrl || !before || !after) return;
    setExporting(true);
    try {
      await exportPhotosPdf({
        patientName,
        subtitle: `Comparación ${fmt(before)} → ${fmt(after)}`,
        photos: [
          { url: beforeUrl, caption: `Antes · ${fmt(before)}` },
          { url: afterUrl, caption: `Después · ${fmt(after)}` },
        ],
      });
    } catch {
      toast.error("No se pudo generar el PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Comparador antes / después</DialogTitle>
          <DialogDescription>
            Selecciona dos visitas y desliza para comparar la misma toma.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label>Antes</Label>
            <Select value={beforeId} onValueChange={setBeforeId}>
              <SelectTrigger><SelectValue placeholder="Visita" /></SelectTrigger>
              <SelectContent>
                {withPhotos.map((v) => <SelectItem key={v.id} value={v.id}>{fmt(v)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Después</Label>
            <Select value={afterId} onValueChange={setAfterId}>
              <SelectTrigger><SelectValue placeholder="Visita" /></SelectTrigger>
              <SelectContent>
                {withPhotos.map((v) => <SelectItem key={v.id} value={v.id}>{fmt(v)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Tipo de foto</Label>
            <Select value={activeType} onValueChange={setType} disabled={!sharedTypes.length}>
              <SelectTrigger><SelectValue placeholder="Sin coincidencias" /></SelectTrigger>
              <SelectContent>
                {sharedTypes.map((t) => (
                  <SelectItem key={t} value={t}>{PHOTO_TYPE_LABELS[t] ?? t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {beforeUrl && afterUrl ? (
          <>
            <div className="relative select-none overflow-hidden rounded-2xl border border-border bg-black">
              <img src={afterUrl} alt="Después" className="block max-h-[52vh] w-full object-contain" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
              >
                <img src={beforeUrl} alt="Antes" className="block h-full w-full object-contain" />
              </div>
              <div
                className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow"
                style={{ left: `${pos}%` }}
              />
              <span className="absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-xs font-medium">Antes</span>
              <span className="absolute right-3 top-3 rounded-full bg-background/85 px-3 py-1 text-xs font-medium">Después</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              aria-label="Comparar antes y después"
              onChange={(e) => setPos(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-end">
              <Button onClick={handleExport} disabled={exporting}>
                <FileDown className="mr-2 h-4 w-4" />
                {exporting ? "Generando…" : "Exportar PDF"}
              </Button>
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Necesitas dos visitas con fotos del mismo tipo para comparar.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
