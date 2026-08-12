import { jsPDF } from "jspdf";
import logoUrl from "@/assets/tooth-boutique-logo.png";

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
  const margin = 15;

  const logo = await toDataUrl(logoUrl);
  if (logo) {
    const w = 26;
    const h = (logo.height / logo.width) * w;
    doc.addImage(logo.dataUrl, "PNG", margin, 12, w, h);
  }

  doc.setFontSize(18);
  doc.text("The Tooth Boutique", margin + 32, 20);
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text(params.patientName, margin + 32, 27);
  doc.setFontSize(10);
  doc.text(
    params.subtitle ?? new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" }),
    margin + 32,
    33,
  );
  doc.setDrawColor(210);
  doc.line(margin, 42, pageW - margin, 42);
  doc.setTextColor(20);

  const cellW = (pageW - margin * 2 - 8) / 2;
  const cellH = 62;
  let x = margin;
  let y = 50;

  for (const photo of params.photos) {
    const img = await toDataUrl(photo.url);
    if (!img) continue;
    const ratio = img.width / img.height;
    let w = cellW;
    let h = w / ratio;
    if (h > cellH) { h = cellH; w = h * ratio; }

    if (y + cellH + 12 > pageH - margin) {
      doc.addPage();
      y = margin;
      x = margin;
    }

    doc.addImage(img.dataUrl, "JPEG", x + (cellW - w) / 2, y, w, h, undefined, "FAST");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(photo.caption, x + cellW / 2, y + cellH + 5, { align: "center" });
    doc.setTextColor(20);

    if (x === margin) {
      x = margin + cellW + 8;
    } else {
      x = margin;
      y += cellH + 12;
    }
  }

  const safeName = params.patientName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
  doc.save(`tooth-boutique-${safeName}.pdf`);
}
