/**
 * PDF Generation Hook
 *
 * Two-phase workflow:
 *   1. generatePreview() — captures layout images, shows them in the PreviewTab
 *   2. generatePDF()     — builds the PDF using the already-captured images
 *
 * Design language: clean, minimal, monochrome. White backgrounds, charcoal
 * typography, thin grey rules. No decorative coloured bars.
 */

import { useState, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { browserSupabaseClient } from '../../../../client/browserSupabaseClient';
import {
  captureCanvasAsPng,
  renderLayoutFromShapes,
  createThumbnail,
  createPlaceholderThumbnail,
} from '../utils/svgCapture';
import type { BuildGuideConfig, LayoutConfig, TimelineRow, Contact } from '../../../types/buildGuide';

// ─── Capture dimensions ───────────────────────────────────────────────────────

const CAPTURE_W = 1400; // px — full-res capture
const CAPTURE_H = 1980; // px — A4 portrait ratio ≈ 210:297

// Thumbnail dimensions (shown in the PreviewTab page map)
const THUMB_W = 160; // px
const THUMB_H = 226; // px — same ratio as A4

// ─── PDF page geometry (mm, A4 portrait default) ─────────────────────────────

const M = 16;        // page margin all sides
const FOOTER_H = 10; // footer zone height

// ─── Colour palette (minimal monochrome) ─────────────────────────────────────

const BLACK   = [10,  12,  18]  as const; // #0a0c12 — near-black body text
const CHARCL  = [30,  35,  45]  as const; // #1e232d — headings
const MGRAY   = [100, 105, 115] as const; // #646973 — secondary text
const LGRAY   = [200, 205, 212] as const; // #c8cdd4 — rules / borders
const XLGRAY  = [245, 246, 248] as const; // #f5f6f8 — alternating row tint
const WHITE   = [255, 255, 255] as const;

// Category palette (colored legend dots only)
const CAT_COLORS: Record<string, [number, number, number]> = {
  tables:        [14,  116, 144],
  seating:       [37,  99,  235],
  ceremony:      [147, 51,  234],
  entertainment: [234, 88,  12],
  service:       [22,  163, 74],
  decor:         [219, 39,  119],
  lighting:      [245, 158, 11],
  custom:        [107, 114, 128],
};
const CAT_LABELS: Record<string, string> = {
  tables: 'Tables', seating: 'Seating', ceremony: 'Ceremony',
  entertainment: 'Zones', service: 'Service', decor: 'Decor',
  lighting: 'Lighting', custom: 'Custom',
};

// ─── Low-level helpers ────────────────────────────────────────────────────────

function fill(pdf: jsPDF, c: readonly [number, number, number]) {
  pdf.setFillColor(c[0], c[1], c[2]);
}
function stroke(pdf: jsPDF, c: readonly [number, number, number]) {
  pdf.setDrawColor(c[0], c[1], c[2]);
}
function textColor(pdf: jsPDF, c: readonly [number, number, number]) {
  pdf.setTextColor(c[0], c[1], c[2]);
}

function rule(pdf: jsPDF, y: number, x1: number, x2: number, c: readonly [number, number, number], lw = 0.4) {
  stroke(pdf, c);
  pdf.setLineWidth(lw);
  pdf.line(x1, y, x2, y);
}

function rect(pdf: jsPDF, x: number, y: number, w: number, h: number, mode: 'F' | 'S' | 'FD' = 'F') {
  pdf.rect(x, y, w, h, mode);
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function drawCover(pdf: jsPDF, W: number, H: number, config: BuildGuideConfig, eventName: string) {
  const { cover } = config.documentSettings;
  const { headerFooter } = config.documentSettings;

  // Pure white background
  fill(pdf, WHITE);
  rect(pdf, 0, 0, W, H);

  // Top rule
  rule(pdf, M, M, W - M, LGRAY, 0.4);

  // "EVENT BUILD GUIDE" label — small, spaced
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  textColor(pdf, MGRAY);
  pdf.text('EVENT BUILD GUIDE', W / 2, M + 10, { align: 'center' });

  // Event name — large, centered, charcoal
  const displayName = (cover.eventName || eventName).toUpperCase();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  textColor(pdf, CHARCL);
  const nameLines = pdf.splitTextToSize(displayName, W - M * 2 - 4);
  const nameY = H * 0.38;
  pdf.text(nameLines, W / 2, nameY, { align: 'center' });

  // Thin rule below name
  const ruleY = nameY + nameLines.length * 10 + 6;
  rule(pdf, ruleY, W / 2 - 30, W / 2 + 30, CHARCL, 0.5);

  // Metadata block
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  textColor(pdf, MGRAY);
  let metaY = ruleY + 13;
  const lineH = 8;
  if (cover.eventDate) {
    try {
      const fmt = new Date(cover.eventDate).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      pdf.text(fmt, W / 2, metaY, { align: 'center' });
    } catch {
      pdf.text(cover.eventDate, W / 2, metaY, { align: 'center' });
    }
    metaY += lineH;
  }
  if (cover.venueName) {
    pdf.text(cover.venueName, W / 2, metaY, { align: 'center' });
    metaY += lineH;
  }
  if (cover.plannerCompanyName) {
    pdf.setFont('helvetica', 'normal');
    textColor(pdf, BLACK);
    pdf.text(cover.plannerCompanyName, W / 2, metaY, { align: 'center' });
  }

  // Bottom rule
  rule(pdf, H - M - FOOTER_H, M, W - M, LGRAY, 0.4);

  // Version label — bottom centre
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  textColor(pdf, [170, 173, 180] as const);
  pdf.text(config.versionLabel, W / 2, H - M - FOOTER_H + 5, { align: 'center' });

  // Watermark — below version if enabled
  if (headerFooter.showWatermark) {
    pdf.setFontSize(7);
    textColor(pdf, [200, 202, 207] as const);
    pdf.text('Generated with WedBoardPro', W / 2, H - M - FOOTER_H + 11, { align: 'center' });
  }
}

// ─── Footer (all non-cover pages) ─────────────────────────────────────────────

function drawFooter(
  pdf: jsPDF,
  W: number,
  H: number,
  pageNum: number,
  total: number,
  config: BuildGuideConfig,
  isCover: boolean,
) {
  if (isCover) return;
  const { headerFooter } = config.documentSettings;
  const lineY = H - M - FOOTER_H;

  // Thin top border on footer area
  rule(pdf, lineY, M, W - M, LGRAY, 0.4);

  // Footer text — left
  if (headerFooter.footerText) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    textColor(pdf, MGRAY);
    pdf.text(headerFooter.footerText, M, lineY + 5);
  }

  // Page number — right
  if (headerFooter.showPageNumbers) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    textColor(pdf, MGRAY);
    pdf.text(`${pageNum} / ${total}`, W - M, lineY + 5, { align: 'right' });
  }

  // Watermark — centre (below footer line)
  if (headerFooter.showWatermark) {
    pdf.setFontSize(6.5);
    textColor(pdf, [200, 202, 207] as const);
    pdf.text('WedBoardPro', W / 2, lineY + 5, { align: 'center' });
  }
}

// ─── Layout content page ──────────────────────────────────────────────────────

function drawLayoutPage(
  pdf: jsPDF,
  W: number,
  H: number,
  lc: LayoutConfig,
  imgData: string | null,
) {
  const contentTop = M;
  const contentBot = H - M - FOOTER_H - 2;
  const contentW = W - M * 2;

  // White background
  fill(pdf, WHITE);
  rect(pdf, 0, 0, W, H);

  // Layout name — top left, 13pt charcoal
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  textColor(pdf, CHARCL);
  pdf.text(lc.layoutName, M, contentTop + 10);

  // Space name — top right, 10pt medium grey
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  textColor(pdf, MGRAY);
  pdf.text(lc.spaceName, W - M, contentTop + 10, { align: 'right' });

  // Thin rule below title
  rule(pdf, contentTop + 14, M, W - M, LGRAY, 0.4);

  // ── Compute image region ────────────────────────────────────────────────
  const titleH = 17; // mm reserved for title area
  const imageM = 8;  // mm inner margin around image
  const imgX = M + imageM;
  const imgW = contentW - imageM * 2;

  // Bottom annotation height
  const includedNotes = lc.includeNotes ? lc.notes.filter(n => n.included) : [];
  const includedTasks = lc.includeTasks ? lc.tasks.filter(t => t.included) : [];
  const legendH  = lc.includeLegend ? 9 : 0;
  const notesH   = includedNotes.length > 0 ? 4 + includedNotes.slice(0, 3).length * 3.5 : 0;
  const tasksH   = includedTasks.length > 0 ? 4 + includedTasks.slice(0, 4).length * 3.5 : 0;
  const annotH   = legendH + notesH + tasksH + (legendH + notesH + tasksH > 0 ? 3 : 0);

  const imgY = contentTop + titleH + imageM;
  const imgH = contentBot - imgY - annotH - imageM;

  // Image — with thin grey border
  if (imgData) {
    stroke(pdf, LGRAY);
    pdf.setLineWidth(0.4);
    rect(pdf, imgX - 0.5, imgY - 0.5, imgW + 1, imgH + 1, 'S');
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);
  } else {
    // Placeholder
    fill(pdf, XLGRAY);
    rect(pdf, imgX, imgY, imgW, imgH);
    stroke(pdf, LGRAY);
    pdf.setLineWidth(0.4);
    rect(pdf, imgX, imgY, imgW, imgH, 'S');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    textColor(pdf, MGRAY);
    pdf.text('Layout preview not available', imgX + imgW / 2, imgY + imgH / 2 - 3, { align: 'center' });
    pdf.setFontSize(6.5);
    pdf.text('(Generate Preview before exporting)', imgX + imgW / 2, imgY + imgH / 2 + 4, { align: 'center' });
  }

  let aY = contentBot - annotH + 3;

  // ── Legend — inline coloured dot + label, separated by thin vertical dividers
  if (lc.includeLegend && lc.elementVisibility.length > 0) {
    const visible = lc.elementVisibility.filter(ev => ev.visible);
    const hidden  = lc.elementVisibility.filter(ev => !ev.visible);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    textColor(pdf, MGRAY);

    let dotX = M + imageM;
    const dotY = aY;

    visible.forEach((ev, i) => {
      const col = CAT_COLORS[ev.category] ?? [107, 114, 128] as const;
      fill(pdf, col);
      rect(pdf, dotX, dotY - 2.2, 2.5, 2.5);
      textColor(pdf, BLACK);
      pdf.text(CAT_LABELS[ev.category] ?? ev.category, dotX + 3.5, dotY);
      dotX += 22;

      // Thin vertical divider between items
      if (i < visible.length - 1) {
        stroke(pdf, LGRAY);
        pdf.setLineWidth(0.3);
        pdf.line(dotX - 2, dotY - 3, dotX - 2, dotY + 1);
      }
    });

    if (hidden.length > 0) {
      aY += 4;
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'italic');
      textColor(pdf, MGRAY);
      pdf.text(
        `Hidden: ${hidden.map(ev => CAT_LABELS[ev.category] ?? ev.category).join(', ')}`,
        M + imageM, aY,
      );
    }

    if (lc.includeDimensions) {
      aY += 4;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      textColor(pdf, MGRAY);
      pdf.text('All dimensions in metres', M + imageM, aY);
    }

    aY = dotY + 5;
  }

  // ── Notes ──────────────────────────────────────────────────────────────
  if (includedNotes.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    textColor(pdf, BLACK);
    pdf.text('Notes', M + imageM, aY);
    pdf.setFont('helvetica', 'normal');
    aY += 3;
    includedNotes.slice(0, 3).forEach((note) => {
      pdf.setFontSize(7);
      textColor(pdf, MGRAY);
      const t = note.content.length > 70 ? note.content.substring(0, 67) + '…' : note.content;
      pdf.text(`• ${t}`, M + imageM + 2, aY);
      aY += 3.5;
    });
  }

  // ── Tasks ──────────────────────────────────────────────────────────────
  if (includedTasks.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    textColor(pdf, BLACK);
    pdf.text('Tasks', M + imageM, aY);
    pdf.setFont('helvetica', 'normal');
    aY += 3;
    includedTasks.slice(0, 4).forEach((task) => {
      const marker = task.status === 'done' ? '[x]' : task.status === 'in_progress' ? '[>]' : '[ ]';
      const col: readonly [number, number, number] =
        task.status === 'done'        ? [22,  163, 74]  :
        task.status === 'in_progress' ? [234, 88,  12]  :
                                        MGRAY;
      textColor(pdf, col);
      pdf.setFontSize(7);
      pdf.text(`${marker} ${task.title}`, M + imageM + 2, aY);
      aY += 3.5;
    });
    textColor(pdf, BLACK);
  }
}

// ─── Supplier run sheet page ──────────────────────────────────────────────────

function drawTimeline(pdf: jsPDF, W: number, H: number, rows: TimelineRow[]) {
  const contentTop = M;
  const contentBot = H - M - FOOTER_H - 2;

  fill(pdf, WHITE);
  rect(pdf, 0, 0, W, H);

  // Section title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  textColor(pdf, CHARCL);
  pdf.text('Supplier Run Sheet', M, contentTop + 11);

  // Thin rule below title
  rule(pdf, contentTop + 15, M, W - M, LGRAY, 0.4);

  // Table geometry
  const tY = contentTop + 20;
  const tW = W - M * 2;
  const colX = {
    time:    M,
    company: M + 27,
    role:    M + 70,
    location:M + 100,
    contact: M + 130,
    phone:   M + 155,
  };
  const headerH = 8.5;
  const rowH = 8.5;

  // Table header — charcoal background, white text
  fill(pdf, CHARCL);
  rect(pdf, M, tY, tW, headerH);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  textColor(pdf, WHITE);
  pdf.text('Time',            colX.time    + 1, tY + 6);
  pdf.text('Supplier',        colX.company + 1, tY + 6);
  pdf.text('Role',            colX.role    + 1, tY + 6);
  pdf.text('Location',        colX.location+ 1, tY + 6);
  pdf.text('Contact',         colX.contact + 1, tY + 6);
  pdf.text('Phone',           colX.phone   + 1, tY + 6);

  // Data rows
  const sorted = [...rows].sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);

  let rowY = tY + headerH;
  sorted.forEach((row, idx) => {
    if (rowY + rowH > contentBot) return;

    // Alternating row tint
    if (idx % 2 === 0) {
      fill(pdf, XLGRAY);
      rect(pdf, M, rowY, tW, rowH);
    }

    // Bottom border
    stroke(pdf, LGRAY);
    pdf.setLineWidth(0.3);
    pdf.line(M, rowY + rowH, M + tW, rowY + rowH);

    textColor(pdf, BLACK);
    const name = (row.supplierName || row.companyName || '').substring(0, 22);
    pdf.text(`${row.arrivalTime}–${row.departureTime}`, colX.time    + 1, rowY + 6);
    pdf.text(name,                                      colX.company + 1, rowY + 6);
    pdf.text(row.role.substring(0, 14),                 colX.role    + 1, rowY + 6);
    pdf.text(row.location.substring(0, 13),             colX.location+ 1, rowY + 6);
    pdf.text(row.contactPerson.substring(0, 13),        colX.contact + 1, rowY + 6);
    pdf.text(row.phone.substring(0, 14),                colX.phone   + 1, rowY + 6);

    rowY += rowH;
  });

  // Outer table border
  stroke(pdf, LGRAY);
  pdf.setLineWidth(0.4);
  rect(pdf, M, tY, tW, rowY - tY, 'S');

  // Supplier notes section
  const notesRows = sorted.filter(r => r.notes?.trim());
  if (notesRows.length > 0 && rowY + 8 < contentBot) {
    rowY += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    textColor(pdf, CHARCL);
    pdf.text('Notes', M, rowY);
    rowY += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    textColor(pdf, MGRAY);
    notesRows.forEach((r) => {
      if (rowY + 4 > contentBot) return;
      const label = (r.supplierName || r.companyName || '').substring(0, 20);
      pdf.text(`${label}: ${(r.notes ?? '').substring(0, 90)}`, M + 2, rowY);
      rowY += 4;
    });
  }
}

// ─── Emergency contacts page ──────────────────────────────────────────────────

function drawContacts(pdf: jsPDF, W: number, H: number, contacts: Contact[]) {
  const contentTop = M;

  fill(pdf, WHITE);
  rect(pdf, 0, 0, W, H);

  // Section title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  textColor(pdf, CHARCL);
  pdf.text('Emergency Contacts', M, contentTop + 11);

  // Thin rule below title
  rule(pdf, contentTop + 15, M, W - M, LGRAY, 0.4);

  // 2-column card grid
  const cardW = (W - M * 2 - 6) / 2;
  const cardH = 34;
  const colPositions = [M, M + cardW + 6];
  let cardY = contentTop + 20;
  let col = 0;

  contacts.forEach((contact) => {
    const cx = colPositions[col] ?? M;

    // Card — white with thin grey border
    fill(pdf, WHITE);
    rect(pdf, cx, cardY, cardW, cardH);
    stroke(pdf, LGRAY);
    pdf.setLineWidth(0.4);
    rect(pdf, cx, cardY, cardW, cardH, 'S');

    // Thin left accent line (charcoal, 2px)
    fill(pdf, CHARCL);
    rect(pdf, cx, cardY, 2, cardH);

    // Vendor badge
    if (contact.isFromVendor) {
      stroke(pdf, LGRAY);
      pdf.setLineWidth(0.3);
      rect(pdf, cx + cardW - 22, cardY + 3, 19, 6, 'S');
      pdf.setFontSize(5.5);
      textColor(pdf, MGRAY);
      pdf.text('VENDOR', cx + cardW - 12.5, cardY + 7.5, { align: 'center' });
    }

    // Name
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    textColor(pdf, CHARCL);
    pdf.text(contact.name || 'Unnamed', cx + 5, cardY + 9);

    // Role
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    textColor(pdf, MGRAY);
    pdf.text(contact.role || '', cx + 5, cardY + 15);

    // Phone
    pdf.setFontSize(9);
    textColor(pdf, BLACK);
    pdf.text(contact.phone || '', cx + 5, cardY + 21);

    // Email
    if (contact.email) {
      pdf.setFontSize(8);
      textColor(pdf, MGRAY);
      pdf.text(contact.email, cx + 5, cardY + 27);
    }

    // Notes
    if (contact.notes) {
      pdf.setFontSize(7.5);
      textColor(pdf, MGRAY);
      const t = contact.notes.length > 55 ? contact.notes.substring(0, 52) + '…' : contact.notes;
      pdf.text(t, cx + 5, cardY + 31);
    }

    col++;
    if (col === 2) { col = 0; cardY += cardH + 5; }
  });
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateLayouts(configs: LayoutConfig[]): LayoutConfig[] {
  const seen = new Set<string>();
  return configs.filter((lc) => {
    if (seen.has(lc.layoutId)) {
      console.warn('[PDF] Duplicate layoutId skipped:', lc.layoutId, lc.layoutName);
      return false;
    }
    seen.add(lc.layoutId);
    return true;
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface PageThumb {
  title: string;
  thumb: string;           // small PNG data URL for the preview grid
  fullImg?: string | undefined; // full-res PNG (layouts only)
}

export const usePDFGeneration = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [pageMap, setPageMap] = useState<PageThumb[]>([]);
  const [previewReady, setPreviewReady] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  // Store full-res captured images keyed by layoutId — reused when generating PDF
  const capturedRef = useRef<Record<string, string | null>>({});

  // ── Phase 1: Generate Preview ─────────────────────────────────────────────

  const generatePreview = useCallback(async (config: BuildGuideConfig) => {
    setIsCapturing(true);
    setCaptureProgress('Preparing preview…');
    setPreviewReady(false);

    const newMap: PageThumb[] = [];
    const newCaptures: Record<string, string | null> = {};

    const { formatting, cover } = config.documentSettings;
    const grayscale = formatting.colorMode === 'grayscale';
    const isLandscape = formatting.orientation === 'landscape';
    const cW = isLandscape ? CAPTURE_H : CAPTURE_W;
    const cH = isLandscape ? CAPTURE_W : CAPTURE_H;

    const seen = new Set<string>();
    const uniqueLayouts = config.layoutConfigs.filter((lc) => {
      if (seen.has(lc.layoutId)) return false;
      seen.add(lc.layoutId);
      return true;
    });
    const includedLayouts = uniqueLayouts.filter((lc) => lc.included);
    const includedTimeline = config.timelineRows.filter((r) => r.included);
    const includedContacts = config.contacts.filter((c) => c.included);

    console.log('[Preview] Layouts included:', includedLayouts.length,
      '| Timeline rows:', includedTimeline.length,
      '| Contacts:', includedContacts.length);

    // Cover thumbnail (generated, not captured)
    if (cover.includeCover) {
      newMap.push({
        title: 'Cover',
        thumb: createPlaceholderThumbnail('#ffffff', cover.eventName || 'Cover', THUMB_W, THUMB_H),
      });
    }

    // Capture each included layout
    for (let i = 0; i < includedLayouts.length; i++) {
      const lc = includedLayouts[i]!;
      setCaptureProgress(`Capturing layout ${i + 1} of ${includedLayouts.length}: ${lc.layoutName}…`);

      const hiddenCats = (lc.elementVisibility ?? [])
        .filter((ev) => !ev.visible)
        .map((ev) => ev.category);

      // Prefer data-driven render from stored shapes; fall back to DOM capture
      const shapes = (lc as any).shapes as any[] | undefined;
      const vb = (lc as any).viewBox as { x: number; y: number; width: number; height: number } | undefined;
      const satBg = (lc as any).satelliteBackground ?? null;
      let png: string | null = null;
      if (shapes && shapes.length > 0 && vb) {
        png = await renderLayoutFromShapes(shapes, vb, cW, cH, hiddenCats, grayscale, satBg);
      }
      if (!png) {
        png = await captureCanvasAsPng(hiddenCats, cW, cH, grayscale, lc.layoutId);
      }
      newCaptures[lc.layoutId] = png;
      console.log(`[Preview] "${lc.layoutName}" →`, png ? `captured (${(png.length / 1024).toFixed(0)} KB)` : 'null (placeholder)');

      const thumb = png
        ? await createThumbnail(png, THUMB_W, THUMB_H)
        : createPlaceholderThumbnail('#f5f6f8', lc.layoutName, THUMB_W, THUMB_H);

      newMap.push({ title: lc.layoutName, thumb, fullImg: png ?? undefined });
    }

    // Timeline thumbnail
    if (includedTimeline.length > 0) {
      newMap.push({
        title: 'Run Sheet',
        thumb: createPlaceholderThumbnail('#1e232d', 'Run Sheet', THUMB_W, THUMB_H),
      });
    }

    // Contacts thumbnail
    if (includedContacts.length > 0) {
      newMap.push({
        title: 'Contacts',
        thumb: createPlaceholderThumbnail('#1e232d', 'Contacts', THUMB_W, THUMB_H),
      });
    }

    capturedRef.current = newCaptures;
    setPageMap(newMap);
    setPreviewReady(true);
    setIsCapturing(false);
    setCaptureProgress('');
    console.log('[Preview] Done. Pages:', newMap.length);
  }, []);

  // ── Phase 2: Generate PDF ─────────────────────────────────────────────────

  const generatePDF = useCallback(async (config: BuildGuideConfig, eventName: string) => {
    setIsGenerating(true);
    setGenerationProgress('Building PDF…');

    try {
      const { formatting, cover } = config.documentSettings;
      const isLandscape = formatting.orientation === 'landscape';
      const cW = isLandscape ? CAPTURE_H : CAPTURE_W;
      const cH = isLandscape ? CAPTURE_W : CAPTURE_H;

      const seen = new Set<string>();
      const uniqueLayouts = config.layoutConfigs.filter((lc) => {
        if (seen.has(lc.layoutId)) return false;
        seen.add(lc.layoutId);
        return true;
      });
      const includedLayouts = uniqueLayouts.filter((lc) => lc.included);
      const includedTimeline = config.timelineRows.filter((r) => r.included);
      const includedContacts = config.contacts.filter((c) => c.included);

      const grayscale = formatting.colorMode === 'grayscale';

      // Use pre-captured images when available; re-capture on-the-fly if not
      const images: Record<string, string | null> = { ...capturedRef.current };
      for (const lc of includedLayouts) {
        if (!(lc.layoutId in images)) {
          setGenerationProgress(`Capturing ${lc.layoutName}…`);
          const hiddenCats = (lc.elementVisibility ?? [])
            .filter((ev) => !ev.visible)
            .map((ev) => ev.category);
          const shapes = (lc as any).shapes as any[] | undefined;
          const vb = (lc as any).viewBox as { x: number; y: number; width: number; height: number } | undefined;
          const satBg = (lc as any).satelliteBackground ?? null;
          let reCapture: string | null = null;
          if (shapes && shapes.length > 0 && vb) {
            reCapture = await renderLayoutFromShapes(shapes, vb, cW, cH, hiddenCats, grayscale, satBg);
          }
          if (!reCapture) {
            reCapture = await captureCanvasAsPng(hiddenCats, cW, cH, grayscale, lc.layoutId);
          }
          images[lc.layoutId] = reCapture;
        }
      }

      const pdf = new jsPDF({
        orientation: formatting.orientation,
        unit: 'mm',
        format: formatting.paperSize,
      });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();

      setGenerationProgress('Composing pages…');
      const pageInfo: Array<{ isCover: boolean }> = [];

      // ── Cover ──────────────────────────────────────────────────────────
      if (cover.includeCover) {
        drawCover(pdf, W, H, config, eventName);
        pageInfo.push({ isCover: true });

        if (includedLayouts.length > 0 || includedTimeline.length > 0 || includedContacts.length > 0) {
          pdf.addPage();
        }
      }

      // ── Layout pages ───────────────────────────────────────────────────
      const hasAfter = includedTimeline.length > 0 || includedContacts.length > 0;

      for (let i = 0; i < includedLayouts.length; i++) {
        const lc = includedLayouts[i]!;
        const img = images[lc.layoutId] ?? null;
        const isLast = i === includedLayouts.length - 1;

        drawLayoutPage(pdf, W, H, lc, img);
        pageInfo.push({ isCover: false });

        if (!isLast || hasAfter) {
          pdf.addPage();
        }
      }

      // ── Supplier run sheet ─────────────────────────────────────────────
      if (includedTimeline.length > 0) {
        setGenerationProgress('Composing run sheet…');
        drawTimeline(pdf, W, H, includedTimeline);
        pageInfo.push({ isCover: false });
        if (includedContacts.length > 0) pdf.addPage();
      }

      // ── Contacts ──────────────────────────────────────────────────────
      if (includedContacts.length > 0) {
        setGenerationProgress('Composing contacts…');
        drawContacts(pdf, W, H, includedContacts);
        pageInfo.push({ isCover: false });
      }

      // ── Footer on every page (second pass) ────────────────────────────
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        const info = pageInfo[p - 1] ?? { isCover: false };
        drawFooter(pdf, W, H, p, totalPages, config, info.isCover);
      }

      // ── Save ──────────────────────────────────────────────────────────
      setGenerationProgress('Saving…');
      const safe = eventName.replace(/[^a-z0-9]/gi, '_');
      pdf.save(`${safe}_BuildGuide_${config.versionLabel}.pdf`);
      console.log(`[PDF] Saved: ${safe}_BuildGuide_${config.versionLabel}.pdf (${totalPages} pages)`);

      // ── Persist last_generated_at ─────────────────────────────────────
      const now = new Date().toISOString();
      try {
        if (browserSupabaseClient && config.eventId) {
          const { error } = await browserSupabaseClient
            .from('build_guide_configs')
            .upsert({ event_id: config.eventId, last_generated_at: now, updated_at: now }, { onConflict: 'event_id' });
          if (error) console.warn('[PDF] Supabase upsert failed:', error.message);
        }
      } catch (dbErr) {
        console.warn('[PDF] Could not persist last_generated_at:', dbErr);
      }

      setLastGeneratedAt(now);
      setGenerationProgress('Build Guide saved!');
      setTimeout(() => setGenerationProgress(''), 4000);
    } catch (err) {
      console.error('[PDF] Error:', err);
      setGenerationProgress('Error — see console for details');
      setTimeout(() => setGenerationProgress(''), 6000);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Legacy alias — some callers use this name
  const generationProgress_alias = isCapturing ? captureProgress : generationProgress;

  return {
    // Preview phase
    isCapturing,
    captureProgress,
    generatePreview,
    previewReady,
    // PDF phase
    isGenerating,
    generationProgress: generationProgress_alias,
    generatePDF,
    // Shared
    pageMap,
    lastGeneratedAt,
  };
};
