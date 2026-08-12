import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, FileDown, Share2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PHOTO_TYPE_LABELS } from "@/lib/types";
import type { VisitWithPhotos } from "@/lib/visits";
import { exportPhotosPdf } from "@/lib/pdf";
import { createComparisonShare } from "@/lib/shares";
import { CompareSlider } from "@/components/app/CompareSlider";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visits: VisitWithPhotos[];
  patientId: string;
  patientName: string;
}

function fmt(v: VisitWithPhotos) {
  const d = new Date(`${v.visit_date}T00:00:00`).toLocaleDateString("es-CL");
  return v.visit_label ? `${d} · ${v.visit_label}` : d;
}

export function CompareDialog({ open, onOpenChange, visits, patientId, patientName }: Props) {
  const withPhotos = useMemo(() => visits.filter((v) => v.photos.length > 0), [visits]);
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");
  const [type, setType] = useState("");
  const [exporting, setExporting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!withPhotos.length) return;
    const oldest = withPhotos[withPhotos.length - 1]?.id;
    const newest = withPhotos[0]?.id;
    if (oldest) setBeforeId((prev) => (withPhotos.some((v) => v.id === prev) ? prev : oldest));
    if (newest) setAfterId((prev) => (withPhotos.some((v) => v.id === prev) ? prev : newest));
  }, [withPhotos]);

  useEffect(() => {
    setShareUrl(null);
    setCopied(false);
  }, [beforeId, afterId, type]);

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

  const shareMutation = useMutation({
    mutationFn: () => {
      if (!beforePhoto || !afterPhoto || !before || !after) throw new Error("Faltan fotos para comparar");
      return createComparisonShare({
        patientId,
        beforePhotoId: beforePhoto.id,
        afterPhotoId: afterPhoto.id,
        beforeLabel: `Antes · ${fmt(before)}`,
        afterLabel: `Después · ${fmt(after)}`,
      });
    },
    onSuccess: (id) => {
      setShareUrl(`${window.location.origin}/ver/${id}`);
    },
    onError: () => toast.error("No se pudo crear el enlace para compartir"),
  });

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Enlace copiado");
  };

  const handleExport = async () => {
    if (!beforeUrl || !afterUrl || !before || !after) return;
    setExporting(true);
    try {
      await exportPhotosPdf({
        patientName,
        subtitle: `Comparación ${fmt(before)} · ${fmt(after)}`,
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
            <CompareSlider beforeUrl={beforeUrl} afterUrl={afterUrl} />

            {shareUrl ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-2">
                <Input readOnly value={shareUrl} className="h-8 bg-background text-xs" onFocus={(e) => e.target.select()} />
                <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => shareMutation.mutate()} disabled={shareMutation.isPending}>
                <Share2 className="mr-2 h-4 w-4" />
                {shareMutation.isPending ? "Creando enlace…" : "Compartir"}
              </Button>
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
