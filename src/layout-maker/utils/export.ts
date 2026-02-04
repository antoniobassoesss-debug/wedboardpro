/**
 * Export Utilities
 *
 * Functions to generate export files in PDF, PNG, and SVG formats.
 */

import type { Layout } from '../types/layout';
import type { BaseElement, TableElement, ChairElement } from '../types/elements';
import type { GuestAssignment } from '../types/guests';
import type { ExportConfig, PAGE_SIZES } from '../components/Export/exportTypes';

/**
 * Export options interface (simplified from ExportConfig)
 */
export interface ExportOptions {
  format: 'pdf' | 'png' | 'svg';
  pageSize: 'a4' | 'a3' | 'letter' | 'custom';
  orientation: 'portrait' | 'landscape';
  scale: number;
  quality: number;
  tableNumbers: boolean;
  tableShapes: boolean;
  dimensions: boolean;
  grid: boolean;
  guestNames: boolean;
  dietaryIcons: boolean;
  mealSummary: boolean;
  measurements: boolean;
  notes: boolean;
  includeLogo: boolean;
  logoUrl?: string;
  includeFooter: boolean;
  footerText?: string;
}

/**
 * Convert layout position to PDF coordinates
 */
function layoutToPDF(
  x: number,
  y: number,
  scale: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  return {
    x: (x * scale) + offsetX,
    y: (y * scale) + offsetY,
  };
}

/**
 * Get page dimensions in mm
 */
function getPageDimensions(
  pageSize: 'a4' | 'a3' | 'letter' | 'custom',
  orientation: 'portrait' | 'landscape'
): { width: number; height: number } {
  const sizes: Record<typeof pageSize, { width: number; height: number }> = {
    a4: { width: 210, height: 297 },
    a3: { width: 297, height: 420 },
    letter: { width: 215.9, height: 279.4 },
    custom: { width: 210, height: 297 },
  };

  const size = sizes[pageSize];
  return orientation === 'landscape'
    ? { width: size.height, height: size.width }
    : { width: size.width, height: size.height };
}

/**
 * Calculate scale to fit layout on page
 */
function calculateScale(
  layout: Layout,
  pageWidth: number,
  pageHeight: number,
  margin: number
): number {
  const layoutWidth = layout.space?.dimensions?.width || 20;
  const layoutHeight = layout.space?.dimensions?.height || 20;

  const availableWidth = pageWidth - (margin * 2);
  const availableHeight = pageHeight - (margin * 2);

  const scaleX = availableWidth / layoutWidth;
  const scaleY = availableHeight / layoutHeight;

  return Math.min(scaleX, scaleY);
}

/**
 * Get dietary color
 */
function getDietaryColor(dietaryType: string | null): string {
  const colors: Record<string, string> = {
    vegetarian: '#228B22',
    vegan: '#32CD32',
    halal: '#4169E1',
    kosher: '#9370DB',
    other: '#808080',
    regular: '#8B4513',
  };
  return colors[dietaryType || 'regular'] || '#8B4513';
}

/**
 * Export layout to PDF
 */
export async function exportToPDF(
  layout: Layout,
  config: ExportConfig
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const { format, page, options } = config;

  const pageDims = getPageDimensions(page.size, page.orientation);
  const margin = 15; // mm
  const scale = calculateScale(
    layout,
    pageDims.width - (margin * 2),
    pageDims.height - (margin * 2),
    margin
  );

  const doc = new jsPDF({
    orientation: page.orientation,
    unit: 'mm',
    format: format,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Grid
  if (options.grid) {
    doc.setDrawColor(220, 220, 220);
    const gridSize = 0.5 * scale; // 0.5m grid
    const layoutWidth = (layout.space?.dimensions?.width || 20) * scale;
    const layoutHeight = (layout.space?.dimensions?.height || 20) * scale;

    for (let x = 0; x <= layoutWidth; x += gridSize) {
      doc.line(margin + x, margin, margin + x, margin + layoutHeight);
    }
    for (let y = 0; y <= layoutHeight; y += gridSize) {
      doc.line(margin, margin + y, margin + layoutWidth, margin + y);
    }
  }

  // Walls
  if (layout.space?.walls) {
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.5);
    for (const wall of layout.space.walls) {
      const start = layoutToPDF(wall.startX, wall.startY, scale, margin, margin);
      const end = layoutToPDF(wall.endX, wall.endY, scale, margin, margin);
      doc.line(start.x, start.y, end.x, end.y);
    }
  }

  // Elements
  const elements = layout.elementOrder?.map(id => layout.elements[id]).filter(Boolean) || [];

  for (const element of elements) {
    if (!element) continue;

    const pos = layoutToPDF(element.x, element.y, scale, margin, margin);
    const width = element.width * scale;
    const height = element.height * scale;

    if (element.type.startsWith('table-')) {
      const table = element as TableElement;
      const tableNumber = table.tableNumber || table.label || '';

      // Table shape
      if (options.tableShapes) {
        doc.setFillColor(245, 245, 245);
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.roundedRect(pos.x, pos.y, width, height, 3, 3, 'FD');
      }

      // Table number
      if (options.tableNumbers && tableNumber) {
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        doc.text(tableNumber, pos.x + width / 2, pos.y + height / 2, { align: 'center' });
      }

      // Dimensions
      if (options.dimensions) {
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `${element.width.toFixed(1)}m × ${element.height.toFixed(1)}m`,
          pos.x + width / 2,
          pos.y + height + 3,
          { align: 'center' }
        );
      }

      // Meal summary
      if (options.mealSummary) {
        const chairs = elements.filter(
          (e): e is ChairElement => e?.type === 'chair' && (e as ChairElement).parentTableId === table.id
        );
        const assignedCount = chairs.filter(c => c.assignedGuestId).length;

        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `${assignedCount}/${table.capacity || chairs.length}`,
          pos.x + width + 2,
          pos.y + height / 2,
          { align: 'left' }
        );
      }
    } else if (element.type === 'chair') {
      const chair = element as ChairElement;

      if (options.guestNames && chair.assignedGuestName) {
        // Filled chair with guest initials
        doc.setFillColor(74, 144, 217);
        doc.setDrawColor(46, 107, 176);
        doc.setLineWidth(0.2);
        doc.roundedRect(pos.x, pos.y, width, height, 2, 2, 'FD');

        // Initials
        const initials = chair.assignedGuestName
          .split(' ')
          .map(n => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();

        doc.setFontSize(Math.min(width, height) * 0.4);
        doc.setTextColor(255, 255, 255);
        doc.text(initials, pos.x + width / 2, pos.y + height / 2 + 1, { align: 'center' });
      } else {
        // Empty chair
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.2);
        doc.roundedRect(pos.x, pos.y, width, height, 2, 2, 'FD');
      }

      // Dietary icon
      if (options.dietaryIcons && chair.dietaryType && chair.dietaryType !== 'regular') {
        const color = getDietaryColor(chair.dietaryType);
        doc.setFillColor(color);
        doc.circle(pos.x + width - 3, pos.y + 3, 2, 'F');
      }
    } else {
      // Other elements (zones, service, etc.)
      doc.setFillColor(230, 230, 250);
      doc.setDrawColor(150, 150, 200);
      doc.setLineWidth(0.2);
      doc.rect(pos.x, pos.y, width, height, 'FD');
    }
  }

  // Measurements
  if (options.measurements) {
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Scale: 1:${Math.round(100 / scale)} | Grid: 0.5m`,
      margin,
      pageHeight - 5
    );
  }

  // Logo
  if (options.includeLogo && options.logoUrl) {
    try {
      doc.addImage(options.logoUrl, 'PNG', margin, margin, 15, 15);
    } catch {
      // Logo failed to load, continue without it
    }
  }

  // Footer
  if (options.includeFooter) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      options.footerText || 'WedBoardPro Layout',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // Title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(
    layout.name || 'Floor Plan',
    pageWidth / 2,
    margin - 5,
    { align: 'center' }
  );

  return doc.output('blob');
}

/**
 * Export layout to PNG
 */
export async function exportToPNG(
  layout: Layout,
  config: ExportConfig,
  canvas: HTMLCanvasElement
): Promise<Blob> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const { format, page, options, quality } = config;
  const margin = 20;
  const scale = 2; // High DPI

  const pageDims = getPageDimensions(page.size, page.orientation);
  const canvasWidth = (pageDims.width * scale) + (margin * 2 * scale);
  const canvasHeight = (pageDims.height * scale) + (margin * 2 * scale);

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const displayScale = calculateScale(
    layout,
    pageDims.width - (margin * 2),
    pageDims.height - (margin * 2),
    margin
  ) * scale;

  const pixelScale = displayScale / scale;

  // Draw layout elements
  const elements = layout.elementOrder?.map(id => layout.elements[id]).filter(Boolean) || [];

  for (const element of elements) {
    if (!element) continue;

    const x = (element.x * displayScale) + (margin * scale);
    const y = (element.y * displayScale) + (margin * scale);
    const width = element.width * displayScale;
    const height = element.height * displayScale;

    if (element.type.startsWith('table-')) {
      const table = element as TableElement;

      // Table
      ctx.fillStyle = '#F5F5F5';
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 4);
      ctx.fill();
      ctx.stroke();

      // Table number
      if (options.tableNumbers) {
        const tableNumber = table.tableNumber || table.label || '';
        ctx.fillStyle = '#333333';
        ctx.font = `${8 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tableNumber, x + width / 2, y + height / 2);
      }

      // Dimensions
      if (options.dimensions) {
        ctx.fillStyle = '#999999';
        ctx.font = `${6 * scale}px sans-serif`;
        ctx.fillText(
          `${element.width.toFixed(1)}m`,
          x + width / 2,
          y + height + 8
        );
      }
    } else if (element.type === 'chair') {
      const chair = element as ChairElement;

      if (options.guestNames && chair.assignedGuestName) {
        // Filled chair
        ctx.fillStyle = '#4A90D9';
        ctx.strokeStyle = '#2E6BB0';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 2);
        ctx.fill();
        ctx.stroke();

        // Initials
        const initials = chair.assignedGuestName
          .split(' ')
          .map(n => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${(width * 0.4)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, x + width / 2, y + height / 2);
      } else {
        // Empty chair
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#CCCCCC';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 2);
        ctx.fill();
        ctx.stroke();
      }

      // Dietary icon
      if (options.dietaryIcons && chair.dietaryType && chair.dietaryType !== 'regular') {
        const color = getDietaryColor(chair.dietaryType);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + width - 4, y + 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create PNG blob'));
      },
      'image/png',
      quality / 100
    );
  });
}

/**
 * Export layout to SVG
 */
export function exportToSVG(
  layout: Layout,
  config: ExportConfig
): string {
  const { format, page, options } = config;

  const pageDims = getPageDimensions(page.size, page.orientation);
  const margin = 20;
  const scale = calculateScale(
    layout,
    pageDims.width - (margin * 2),
    pageDims.height - (margin * 2),
    margin
  );

  const svgWidth = pageDims.width;
  const svgHeight = pageDims.height;

  const elements = layout.elementOrder?.map(id => layout.elements[id]).filter(Boolean) || [];

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${svgWidth}mm"
     height="${svgHeight}mm"
     viewBox="0 0 ${svgWidth} ${svgHeight}"
     style="background: white;">
  <style>
    text { font-family: Arial, sans-serif; }
    .table { fill: #F5F5F5; stroke: #666666; stroke-width: 0.5; }
    .chair-empty { fill: #FFFFFF; stroke: #CCCCCC; stroke-width: 0.3; }
    .chair-filled { fill: #4A90D9; stroke: #2E6BB0; stroke-width: 0.3; }
    .wall { stroke: #333333; stroke-width: 0.5; }
    .grid { stroke: #E0E0E0; stroke-width: 0.1; }
  </style>

  <!-- Background -->
  <rect width="100%" height="100%" fill="white"/>

  <!-- Grid -->
  ${options.grid ? `
  <defs>
    <pattern id="grid" width="${0.5 * scale}" height="${0.5 * scale}" patternUnits="userSpaceOnUse">
      <path d="M ${0.5 * scale} 0 L 0 0 0 ${0.5 * scale}" fill="none" class="grid"/>
    </pattern>
  </defs>
  <rect x="${margin}" y="${margin}"
        width="${(layout.space?.dimensions?.width || 20) * scale}"
        height="${(layout.space?.dimensions?.height || 20) * scale}"
        fill="url(#grid)"/>
  ` : ''}

  <!-- Walls -->
  ${layout.space?.walls?.map(wall => `
    <line x1="${wall.startX * scale + margin}" y1="${wall.startY * scale + margin}"
          x2="${wall.endX * scale + margin}" y2="${wall.endY * scale + margin}"
          class="wall"/>
  `).join('') || ''}

  <!-- Elements -->
  ${elements.map(element => {
    if (!element) return '';
    const x = element.x * scale + margin;
    const y = element.y * scale + margin;
    const width = element.width * scale;
    const height = element.height * scale;

    if (element.type.startsWith('table-')) {
      const table = element as TableElement;
      return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="3" class="table"/>
      ${options.tableNumbers && table.tableNumber ? `
      <text x="${x + width / 2}" y="${y + height / 2}"
            text-anchor="middle" dominant-baseline="middle"
            font-size="${8 * scale}" fill="#333333">
        ${table.tableNumber}
      </text>` : ''}
      ${options.dimensions ? `
      <text x="${x + width / 2}" y="${y + height + 5 * scale}"
            text-anchor="middle" font-size="${6 * scale}" fill="#999999">
        ${element.width.toFixed(1)}m × ${element.height.toFixed(1)}m
      </text>` : ''}
    </g>`;
    } else if (element.type === 'chair') {
      const chair = element as ChairElement;
      const isAssigned = options.guestNames && chair.assignedGuestName;

      return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2"
            class="${isAssigned ? 'chair-filled' : 'chair-empty'}"/>
      ${isAssigned && chair.assignedGuestName ? `
      <text x="${x + width / 2}" y="${y + height / 2 + 1}"
            text-anchor="middle" dominant-baseline="middle"
            font-size="${width * 0.4}" fill="white" font-weight="bold">
        ${chair.assignedGuestName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
      </text>` : ''}
      ${options.dietaryIcons && chair.dietaryType && chair.dietaryType !== 'regular' ? `
      <circle cx="${x + width - 3}" cy="${y + 3}" r="3" fill="${getDietaryColor(chair.dietaryType)}"/>` : ''}
    </g>`;
    }
    return '';
  }).join('')}

  <!-- Title -->
  <text x="${svgWidth / 2}" y="${margin - 5}"
        text-anchor="middle" font-size="14" font-weight="bold">
    ${layout.name || 'Floor Plan'}
  </text>

  ${options.includeFooter ? `
  <!-- Footer -->
  <text x="${svgWidth / 2}" y="${svgHeight - 5}"
        text-anchor="middle" font-size="8" fill="#666666">
    ${options.footerText || 'WedBoardPro Layout'}
  </text>` : ''}

  ${options.measurements ? `
  <!-- Scale -->
  <text x="${margin}" y="${svgHeight - 5}" font-size="6" fill="#666666">
    Scale: 1:${Math.round(100 / scale)} | Grid: 0.5m
  </text>` : ''}
</svg>`;

  return svg;
}

/**
 * Generate export filename
 */
export function generateExportFilename(
  layoutName: string,
  format: 'pdf' | 'png' | 'svg'
): string {
  const sanitized = layoutName
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const date = new Date().toISOString().split('T')[0];
  return `floor-plan-${sanitized}-${date}.${format}`;
}

/**
 * Main export function - dispatches to appropriate format
 */
export async function exportLayout(
  layout: Layout,
  config: ExportConfig,
  canvas?: HTMLCanvasElement
): Promise<Blob | string> {
  switch (config.format) {
    case 'pdf':
      return exportToPDF(layout, config);
    case 'png':
      if (!canvas) {
        canvas = document.createElement('canvas');
      }
      return exportToPNG(layout, config, canvas);
    case 'svg':
      return exportToSVG(layout, config);
    default:
      throw new Error(`Unsupported export format: ${config.format}`);
  }
}
