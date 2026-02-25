/**
 * Layout Export Engine
 *
 * Captures the SVG canvas as a high-quality image and exports to PDF, PNG, or JPG.
 * Uses SVG serialization → Canvas rendering for pixel-perfect results.
 * Also supports native browser print with proper @page CSS.
 */

import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

export type ExportFormat = 'pdf' | 'png' | 'jpg';

export interface ExportOptions {
  format: ExportFormat;
  quality?: number;          // 0.1–1.0, default 0.95
  scale?: number;            // pixel density multiplier, default 3
  filename?: string;
  paperSize?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export const PAPER_SIZES: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  Letter: { w: 215.9, h: 279.4 },
};

/**
 * Render an SVG element to a Canvas at a given scale.
 * Clips to the A4 bounds (white rect area) for a clean export.
 */
async function svgToCanvas(
  svgElement: SVGSVGElement,
  a4Bounds: { x: number; y: number; width: number; height: number },
  scale: number,
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;

  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Set viewBox to exactly the A4 area
  clone.setAttribute('viewBox', `${a4Bounds.x} ${a4Bounds.y} ${a4Bounds.width} ${a4Bounds.height}`);

  const canvasWidth = Math.round(a4Bounds.width * scale);
  const canvasHeight = Math.round(a4Bounds.height * scale);
  clone.setAttribute('width', String(canvasWidth));
  clone.setAttribute('height', String(canvasHeight));

  // Remove grid background (the large -10000 rect)
  const rects = clone.querySelectorAll('rect');
  rects.forEach((rect) => {
    const x = parseFloat(rect.getAttribute('x') || '0');
    if (x <= -1000) {
      rect.remove();
    }
  });

  // Serialize to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not get canvas 2d context'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}

/**
 * Fallback: use html2canvas to capture an HTML element.
 */
async function html2canvasCapture(
  element: HTMLElement,
  scale: number,
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const html2canvas = (await import('html2canvas')).default;
  return html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
  });
}

/**
 * Export a layout canvas to file.
 *
 * @param element - The SVG element or HTML container to capture
 * @param options - Export format and quality settings
 * @param a4Bounds - Optional A4 bounds for SVG clipping { x, y, width, height }
 */
export async function exportLayout(
  element: HTMLElement | SVGSVGElement,
  options: ExportOptions,
  a4Bounds?: { x: number; y: number; width: number; height: number },
): Promise<void> {
  const {
    format,
    quality = 0.95,
    scale = 3,
    filename,
    paperSize = 'A4',
    orientation = 'portrait',
  } = options;

  let canvas: HTMLCanvasElement;

  if (element instanceof SVGSVGElement && a4Bounds) {
    canvas = await svgToCanvas(element, a4Bounds, scale);
  } else {
    canvas = await html2canvasCapture(element as HTMLElement, scale);
  }

  const baseName = filename || 'layout-export';

  switch (format) {
    case 'pdf': {
      const paper = PAPER_SIZES[paperSize] ?? PAPER_SIZES['A4']!;
      const pageW = orientation === 'landscape' ? paper!.h : paper!.w;
      const pageH = orientation === 'landscape' ? paper!.w : paper!.h;

      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: [pageW, pageH],
      });

      const imgData = canvas.toDataURL('image/jpeg', quality);
      doc.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);

      const blob = doc.output('blob');
      saveAs(blob, `${baseName}.pdf`);
      break;
    }

    case 'png': {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('PNG blob creation failed'))),
          'image/png',
        );
      });
      saveAs(blob, `${baseName}.png`);
      break;
    }

    case 'jpg': {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('JPG blob creation failed'))),
          'image/jpeg',
          quality,
        );
      });
      saveAs(blob, `${baseName}.jpg`);
      break;
    }
  }
}

/**
 * Print a layout canvas using the browser's native print dialog.
 * Opens a clean popup window with A4 page CSS.
 */
export async function printLayout(
  element: HTMLElement | SVGSVGElement,
  a4Bounds?: { x: number; y: number; width: number; height: number },
): Promise<void> {
  const scale = 3;

  let canvas: HTMLCanvasElement;

  if (element instanceof SVGSVGElement && a4Bounds) {
    canvas = await svgToCanvas(element, a4Bounds, scale);
  } else {
    canvas = await html2canvasCapture(element as HTMLElement, scale);
  }

  // If the image is landscape, rotate it so it fills a portrait A4 sheet
  const isLandscape = canvas.width > canvas.height;
  let imgData: string;

  if (isLandscape) {
    const rotated = document.createElement('canvas');
    rotated.width = canvas.height;
    rotated.height = canvas.width;
    const rctx = rotated.getContext('2d')!;
    rctx.translate(rotated.width / 2, rotated.height / 2);
    rctx.rotate(-Math.PI / 2);
    rctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    imgData = rotated.toDataURL('image/png');
  } else {
    imgData = canvas.toDataURL('image/png');
  }

  const printWindow = window.open('', '_blank', 'width=800,height=1132');
  if (!printWindow) {
    throw new Error('Could not open print window. Check popup blocker settings.');
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Layout</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100vw;
          height: 100vh;
        }
        img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
      </style>
    </head>
    <body>
      <img src="${imgData}" />
    </body>
    </html>
  `);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  printWindow.onafterprint = () => {
    printWindow.close();
  };
}
