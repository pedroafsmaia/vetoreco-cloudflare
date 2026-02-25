import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function buildSimplePdfFromText(title: string, text: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 40;
  const lineHeight = 14;
  let y = page.getHeight() - margin;

  const wrap = (line: string, maxWidth: number) => {
    const words = line.split(/\s+/);
    const out: string[] = [];
    let current = '';
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      const width = font.widthOfTextAtSize(candidate, 10);
      if (width > maxWidth && current) {
        out.push(current);
        current = w;
      } else {
        current = candidate;
      }
    }
    if (current) out.push(current);
    return out.length ? out : [''];
  };

  const drawLine = (line: string, isHeader = false) => {
    const maxWidth = page.getWidth() - margin * 2;
    const fontSize = isHeader ? 12 : 10;
    const useFont = isHeader ? bold : font;
    const lines = wrap(line, maxWidth);
    for (const ln of lines) {
      if (y < margin) {
        page = pdf.addPage([595.28, 841.89]);
        y = page.getHeight() - margin;
      }
      page.drawText(ln, { x: margin, y, size: fontSize, font: useFont, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  };

  drawLine(title, true);
  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: page.getWidth() - margin, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  y -= 16;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line) {
      y -= 8;
      continue;
    }
    const isHeader = !line.startsWith('- ') && /^\d+\.|^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(line);
    drawLine(line, isHeader);
  }

  return pdf.save();
}
