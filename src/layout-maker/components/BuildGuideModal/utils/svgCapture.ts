/**
 * SVG Capture Utility
 *
 * Two capture strategies:
 *
 * 1. renderLayoutFromShapes() — data-driven, works always.
 *    Builds an off-screen SVG from stored shape objects (from canvas_data.shapes).
 *    Used for all layouts in multi-layout Build Guides.
 *
 * 2. captureCanvasAsPng() — DOM-based fallback.
 *    Serialises the live [data-layout-canvas] SVG (GridCanvasStore or CanvasArea).
 *    Used when shapes are empty/unavailable and the canvas is mounted.
 */

import { useCanvasStore } from '../../../store/canvasStore';

// ─── Shape-to-category mapping (mirrors GridCanvasStore) ─────────────────────

const CHAIR_ELEMENT_TYPES = new Set([
  'chair', 'seat-standard', 'seat-armchair', 'seat-chaise',
  'seat-sofa-2', 'seat-sofa-3', 'seat-bench', 'seat-barstool', 'seat-throne',
  'ceremony-block',
]);
const ENTERTAINMENT_TYPES = new Set(['dance-floor', 'stage', 'cocktail-area', 'ceremony-area']);
const SERVICE_TYPES = new Set(['bar', 'buffet', 'cake-table', 'gift-table', 'dj-booth']);
const DECOR_TYPES = new Set(['flower-arrangement', 'arch', 'photo-booth']);
const LIGHTING_TYPES = new Set(['string-lights', 'bunting']);
const TABLE_TYPES = new Set(['table-round', 'table-rectangular', 'table-square', 'table-oval']);

function shapeCategory(shape: any): string {
  if (shape.tableData) return 'tables';
  if (shape.chairData) return shape.chairData.parentTableId ? 'tables' : 'seating';
  const et: string | undefined = shape.elementType;
  if (!et) return 'custom';
  if (TABLE_TYPES.has(et)) return 'tables';
  if (CHAIR_ELEMENT_TYPES.has(et)) return 'seating';
  if (ENTERTAINMENT_TYPES.has(et)) return 'entertainment';
  if (SERVICE_TYPES.has(et)) return 'service';
  if (DECOR_TYPES.has(et)) return 'decor';
  if (LIGHTING_TYPES.has(et)) return 'lighting';
  return 'custom';
}

// ─── Off-screen shape renderer ────────────────────────────────────────────────

/**
 * Render a layout's stored shape objects to a PNG data URL.
 * Never touches the live DOM canvas — works when the modal is open and
 * the canvas has been unmounted or is showing a different layout.
 */
export async function renderLayoutFromShapes(
  shapes: any[],
  viewBox: { x: number; y: number; width: number; height: number },
  widthPx: number,
  heightPx: number,
  hiddenCategories: string[],
  grayscale: boolean,
  satelliteBackground?: { imageBase64: string; pixelsPerMeter: number } | null,
): Promise<string | null> {
  if (!shapes || shapes.length === 0) {
    console.warn('[svgCapture] renderLayoutFromShapes: no shapes supplied');
    return null;
  }

  const hidden = new Set(hiddenCategories);
  const vb = viewBox ?? { x: 0, y: 0, width: 800, height: 1132 };

  // Build SVG markup from shape objects
  const shapeMarkup: string[] = [];

  for (const shape of shapes) {
    if (hidden.has(shapeCategory(shape))) continue;

    const fill   = shape.fill ?? '#cccccc';
    const stroke = shape.stroke ?? '#333333';
    const sw     = shape.strokeWidth ?? 1;
    const x = shape.x ?? 0;
    const y = shape.y ?? 0;
    const w = shape.width ?? 20;
    const h = shape.height ?? 20;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rot = shape.rotation ?? 0;
    const transformAttr = rot ? ` transform="rotate(${rot},${cx},${cy})"` : '';

    // String lights / bunting — skip visual detail, draw a simple line
    if (shape.elementType === 'string-lights' || shape.elementType === 'bunting') {
      const ld = shape.lightingData;
      if (ld) {
        const x1 = x + (ld.startOffX ?? 0);
        const y1 = y + (ld.startOffY ?? 0);
        const x2 = x + (ld.endOffX ?? w);
        const y2 = y + (ld.endOffY ?? 0);
        shapeMarkup.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3"/>`);
      }
      continue;
    }

    // Ceremony block — draw a labelled rectangle
    if (shape.elementType === 'ceremony-block') {
      shapeMarkup.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${transformAttr}/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="${Math.min(w, h) * 0.15}" fill="${stroke}" font-family="sans-serif">Ceremony</text>`,
      );
      continue;
    }

    // Individual seat types — render as small rounded rect
    if (shape.elementType?.startsWith('seat-')) {
      shapeMarkup.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" ry="3" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${transformAttr}/>`,
      );
      continue;
    }

    // Circle shapes (round tables, chairs)
    if (shape.type === 'circle') {
      const rx = w / 2;
      const ry = h / 2;
      // Perfect circle
      if (Math.abs(rx - ry) < 1) {
        shapeMarkup.push(
          `<circle cx="${cx}" cy="${cy}" r="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${transformAttr}/>`,
        );
      } else {
        shapeMarkup.push(
          `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${transformAttr}/>`,
        );
      }
      // Table number label (skip for chairs)
      if (shape.tableData) {
        const fontSize = Math.max(8, rx * 0.35);
        shapeMarkup.push(
          `<text x="${cx}" y="${cy + fontSize * 0.35}" text-anchor="middle" font-size="${fontSize}" fill="${stroke}" font-family="sans-serif" pointer-events="none">${shape.label ?? ''}</text>`,
        );
      }
      continue;
    }

    // Rect shapes (rectangular tables, zones, service areas, dance floor…)
    shapeMarkup.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${transformAttr}/>`,
    );
    // Label for tables
    if (shape.tableData || shape.label) {
      const fontSize = Math.max(8, Math.min(w, h) * 0.2);
      shapeMarkup.push(
        `<text x="${cx}" y="${cy + fontSize * 0.35}" text-anchor="middle" font-size="${fontSize}" fill="${stroke}" font-family="sans-serif" pointer-events="none">${shape.label ?? ''}</text>`,
      );
    }
  }

  // Satellite background layer — rendered before all shapes
  const bgLayer: string[] = [];
  if (satelliteBackground?.imageBase64) {
    const href = satelliteBackground.imageBase64.startsWith('data:')
      ? satelliteBackground.imageBase64
      : `data:image/jpeg;base64,${satelliteBackground.imageBase64}`;
    bgLayer.push(
      `<image href="${href}" x="${vb.x}" y="${vb.y}" width="${vb.width}" height="${vb.height}" preserveAspectRatio="xMidYMid meet" opacity="${grayscale ? '0.35' : '0.7'}"/>`,
    );
  }

  // Compose final SVG: white A4 background + optional satellite + all shapes
  const svgString = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}" width="${widthPx}" height="${heightPx}">`,
    `<rect x="${vb.x}" y="${vb.y}" width="${vb.width}" height="${vb.height}" fill="#ffffff"/>`,
    ...bgLayer,
    ...shapeMarkup,
    '</svg>',
  ].join('\n');

  console.log(`[svgCapture] renderLayoutFromShapes: ${shapes.length} shapes → ${shapeMarkup.length} SVG elements`);

  return svgStringToPng(svgString, widthPx, heightPx, grayscale);
}

// ─── DOM-based capture (fallback when canvas is live) ─────────────────────────

const SELECTORS_TO_REMOVE = [
  '#background-layer',
  '#grid-layer',
  '#ui-layer',
  '#selection-layer',
  '#guides-layer',
  '#placement-preview-layer',
  '.rotate-button',
];

function resolveCssVars(s: string): string {
  return s.replace(/var\(--[\w-]+,\s*([^)]+)\)/g, '$1');
}

/**
 * Capture the live [data-layout-canvas] SVG as a PNG.
 * Used as a fallback when no shapes data is available.
 * Returns null if the canvas is not found in the DOM.
 */
export async function captureCanvasAsPng(
  hiddenCategories: string[],
  widthPx: number,
  heightPx: number,
  grayscale: boolean,
  layoutId?: string,
): Promise<string | null> {
  console.log('CAPTURE CALLED for layoutId:', layoutId ?? '(none)', '| size:', widthPx, '×', heightPx);

  try {
    // DOM snapshot diagnostics
    const allSvgs = document.querySelectorAll('svg');
    const allCanvases = document.querySelectorAll('canvas');
    console.log('DIAG DOM snapshot — svg count:', allSvgs.length, '| canvas count:', allCanvases.length);
    const layoutCanvas = document.querySelector('[data-layout-canvas]');
    console.log('DIAG [data-layout-canvas] element:', layoutCanvas ? layoutCanvas.tagName : 'NOT FOUND');

    const svgEl = document.querySelector('[data-layout-canvas]') as SVGSVGElement | null;
    if (!svgEl) {
      console.error('CAPTURE FAILED: SVG element found: null — [data-layout-canvas] missing from DOM');
      return null;
    }

    const vb = svgEl.getAttribute('viewBox');
    const domW = svgEl.getBoundingClientRect().width;
    const domH = svgEl.getBoundingClientRect().height;
    console.log(`SVG element found: ${svgEl.tagName} | viewBox: "${vb}" | DOM: ${Math.round(domW)}×${Math.round(domH)} | children: ${svgEl.childElementCount}`);

    // Determine a4Bounds: prefer the #a4-clip rect inside the SVG (GridCanvas),
    // then fall back to canvasStore (LayoutMaker), then a sensible default.
    let a4Bounds: { x: number; y: number; width: number; height: number };
    const clipRect = svgEl.querySelector('clipPath#a4-clip rect') as SVGRectElement | null;
    if (clipRect) {
      a4Bounds = {
        x:      parseFloat(clipRect.getAttribute('x') ?? '0'),
        y:      parseFloat(clipRect.getAttribute('y') ?? '0'),
        width:  parseFloat(clipRect.getAttribute('width') ?? '800'),
        height: parseFloat(clipRect.getAttribute('height') ?? '1132'),
      };
      console.log('[svgCapture] a4Bounds from #a4-clip rect:', a4Bounds);
    } else {
      a4Bounds = useCanvasStore.getState().a4Bounds ?? { x: 0, y: 0, width: 800, height: 1132 };
      console.log('[svgCapture] a4Bounds from canvasStore:', a4Bounds);
    }

    const clone = svgEl.cloneNode(true) as SVGSVGElement;

    let removed = 0;
    SELECTORS_TO_REMOVE.forEach((sel) => {
      clone.querySelectorAll(sel).forEach((el) => { el.remove(); removed++; });
    });
    // Inline base64 images so they survive off-screen canvas rendering.
    // Remote/blob URLs would taint the canvas; data URLs are safe.
    await Promise.all(Array.from(clone.querySelectorAll('image')).map(async (imgEl) => {
      const href = imgEl.getAttribute('href') || imgEl.getAttribute('xlink:href');
      if (!href) { imgEl.remove(); removed++; return; }
      if (href.startsWith('data:')) return; // already safe, keep as-is
      try {
        const response = await fetch(href);
        const blob = await response.blob();
        const base64 = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(blob);
        });
        imgEl.setAttribute('href', base64);
        imgEl.removeAttribute('xlink:href');
      } catch (e) {
        console.warn('[svgCapture] Could not inline image, removing:', href, e);
        imgEl.remove(); removed++;
      }
    }));
    clone.querySelectorAll('defs pattern').forEach((el) => { el.remove(); removed++; });
    clone.querySelectorAll('rect').forEach((rect) => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      if (x <= -1000) { rect.remove(); removed++; }
    });
    console.log(`[svgCapture] Removed ${removed} elements from clone`);

    if (hiddenCategories.length > 0) {
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = hiddenCategories
        .map((cat) => `[data-element-category="${cat}"] { display: none !important; }`)
        .join('\n');
      clone.insertBefore(style, clone.firstChild);
    }

    clone.setAttribute('viewBox', `${a4Bounds.x} ${a4Bounds.y} ${a4Bounds.width} ${a4Bounds.height}`);
    clone.setAttribute('width', String(widthPx));
    clone.setAttribute('height', String(heightPx));

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);
    svgString = svgString.replace(/NS\d+:/g, '').replace(/xmlns:NS\d+="[^"]*"/g, '');
    svgString = resolveCssVars(svgString);

    console.log(`[svgCapture] Serialized SVG: ${svgString.length.toLocaleString()} chars`);

    return svgStringToPng(svgString, widthPx, heightPx, grayscale);

  } catch (outerErr) {
    console.error('CAPTURE FAILED:', outerErr);
    return null;
  }
}

// ─── Shared PNG conversion ─────────────────────────────────────────────────────

function svgStringToPng(
  svgString: string,
  widthPx: number,
  heightPx: number,
  grayscale: boolean,
): Promise<string | null> {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  return new Promise<string | null>((resolve) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, widthPx, heightPx);
        if (grayscale) ctx.filter = 'grayscale(100%)';
        ctx.drawImage(img, 0, 0, widthPx, heightPx);

        try {
          const png = canvas.toDataURL('image/png');
          console.log(`[svgCapture] PNG ready: ${(png.length / 1024).toFixed(0)} KB`);
          resolve(png);
        } catch (secErr) {
          console.error('[svgCapture] canvas.toDataURL() SecurityError:', secErr);
          resolve(null);
        }
      } catch (err) {
        console.error('[svgCapture] Canvas draw error:', err);
        resolve(null);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(blobUrl);
      console.error('[svgCapture] SVG load error:', err);
      console.error('[svgCapture] SVG opening tag:', svgString.substring(0, 400));
      resolve(null);
    };

    img.src = blobUrl;
  });
}

// ─── Thumbnail helpers ────────────────────────────────────────────────────────

export async function createThumbnail(
  dataUrl: string,
  thumbW: number,
  thumbH: number,
): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = thumbW;
      canvas.height = thumbH;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, thumbW, thumbH);
      ctx.drawImage(img, 0, 0, thumbW, thumbH);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}

export function createPlaceholderThumbnail(
  bgColor: string,
  label: string,
  thumbW: number,
  thumbH: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = thumbW;
  canvas.height = thumbH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, thumbW, thumbH);

  ctx.fillStyle = 'rgba(50,50,60,0.55)';
  const fontSize = Math.floor(thumbW / 9);
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.substring(0, 18), thumbW / 2, thumbH / 2);

  return canvas.toDataURL('image/png');
}
