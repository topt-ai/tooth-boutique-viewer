import { jsPDF } from "jspdf";
import logoUrl from "@/assets/tooth-boutique-logo.png";

const BRAND: [number, number, number] = [0, 137, 167];
const BRAND_TINT: [number, number, number] = [232, 245, 248];
const INK: [number, number, number] = [30, 41, 51];
const MUTED: [number, number, number] = [110, 122, 133];
const LINE: [number, number, number] = [223, 231, 235];

async function toDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 4, height: 3 });
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

export interface PdfPhoto {
  url: string;
  caption: string;
}

export async function exportPhotosPdf(params: {
  patientName: string;
  subtitle?: string;
  photos: PdfPhoto[];
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 16;

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 3, "F");

  const logo = await toDataUrl(logoUrl);
  if (logo) {
    const w = 30;
    const h = (logo.height / logo.width) * w;
    doc.addImage(logo.dataUrl, "PNG", margin, 14, w, h);
  }

  const textX = margin + 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...BRAND);
  doc.text("The Tooth Boutique", textX, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text(params.patientName, textX, 29.5);

  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(
    params.subtitle ?? new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" }),
    textX,
    35,
  );

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(margin, 44, pageW - margin, 44);

  const cellW = (pageW - margin * 2 - 10) / 2;
  const photoH = 58;
  const captionH = 10;
  const cellH = photoH + captionH;
  let x = margin;
  let y = 52;

  const drawCard = (px: number, py: number, w: number, h: number) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.35);
    doc.roundedRect(px, py, w, h, 2.5, 2.5, "S");
  };

  for (const photo of params.photos) {
    const img = await toDataUrl(photo.url);
    if (!img) continue;

    if (y + cellH + 12 > pageH - margin) {
      doc.addPage();
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, pageW, 3, "F");
      y = margin + 6;
      x = margin;
    }

    drawCard(x, y, cellW, photoH);

    const ratio = img.width / img.height;
    const innerPad = 2;
    const innerW = cellW - innerPad * 2;
    const innerH = photoH - innerPad * 2;
    let w = innerW;
    let h = w / ratio;
    if (h > innerH) { h = innerH; w = h * ratio; }
    doc.addImage(
      img.dataUrl,
      "JPEG",
      x + (cellW - w) / 2,
      y + (photoH - h) / 2,
      w,
      h,
      undefined,
      "FAST",
    );

    doc.setFillColor(...BRAND_TINT);
    doc.roundedRect(x, y + photoH + 2, cellW, captionH - 2, 1.5, 1.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND);
    doc.text(photo.caption, x + cellW / 2, y + photoH + 2 + (captionH - 2) / 2 + 1.2, {
      align: "center",
    });

    if (x === margin) {
      x = margin + cellW + 10;
    } else {
      x = margin;
      y += cellH + 8;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("The Tooth Boutique", margin, pageH - 9);
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, pageH - 9, { align: "right" });
  }

  const safeName = params.patientName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
  doc.save(`the-tooth-boutique-${safeName}.pdf`);
}
