/**
 * SatellitePickerModal — Pick a satellite view for the canvas background.
 *
 * Step 1 (map):       Location + size/rotation controls → "Next: Calibrate Scale →"
 * Step 2 (calibrate): Draw reference lines on the captured image → "Add to Canvas"
 *
 * Calibration is optional. Skipping uses the mathematical scale derived from
 * the size inputs. After drawing ≥1 line, a 1m grid overlay is available for
 * visual verification, plus a ±20% fine-tune slider.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { SatelliteBackground, CalibrationLine } from '../../layout-maker/store/canvasStore';
import { useCanvasStore } from '../../layout-maker/store/canvasStore';
import { X, Move } from 'lucide-react';

// ── Rotation helper ───────────────────────────────────────────────────────────

/**
 * Rotates a base64 image by the given degrees, scaling up to cover the full
 * output canvas so no black corners appear at any angle.
 *
 * The scale factor |cos(θ)| + |sin(θ)| is the minimum enlargement needed
 * so that a rotated square still covers all four corners of the original
 * bounding box — identical to CSS background-size: cover applied to a rotation.
 *
 * Output dimensions are the same as input (the canvas clips the overflow).
 */
function rotateBase64Image(base64: string, degrees: number): Promise<string> {
  return new Promise((resolve) => {
    if (degrees === 0) { resolve(base64); return; }
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      const rad = (degrees * Math.PI) / 180;
      // Scale factor: ensures the rotated image fully covers the w×h output at any angle.
      // Derived from the condition that all four corners of the output must lie
      // inside the rotated (scaled) square.
      const scale = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rad);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -w / 2, -h / 2);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = base64;
  });
}

// ── Calibration helpers (identical to CustomUploadModal) ─────────────────────

const LINE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'];
const FONT = "'Geist', 'Inter', sans-serif";

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2 : (s[m] ?? 0);
}

function derivePixelsPerMeter(lines: CalibrationLine[], nw: number, nh: number): number {
  const ratios = lines
    .filter((l) => l.realWorldMeters > 0)
    .map((l) => {
      const dx = (l.x2 - l.x1) * nw;
      const dy = (l.y2 - l.y1) * nh;
      return Math.sqrt(dx * dx + dy * dy) / l.realWorldMeters;
    });
  return median(ratios);
}

function lineDeviation(line: CalibrationLine, mPpm: number, nw: number, nh: number): number {
  if (!mPpm || !line.realWorldMeters) return 0;
  const dx = (line.x2 - line.x1) * nw;
  const dy = (line.y2 - line.y1) * nh;
  const ppm = Math.sqrt(dx * dx + dy * dy) / line.realWorldMeters;
  return Math.abs(ppm - mPpm) / mPpm;
}

function genCalId() {
  return `cal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Geo / image helpers ───────────────────────────────────────────────────────

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Compute the Mapbox zoom level that ensures the full rotated rectangle fits
// inside the 1280-CSS-px Mapbox image (with a 25% safety buffer for rotation corners).
//
// For a rectangle W×H rotated by θ, its axis-aligned bounding box is:
//   aabbW = W|cosθ| + H|sinθ|,  aabbH = W|sinθ| + H|cosθ|
// The Mapbox 1280-CSS-px image covers:
//   geoW = 40075016 × 1280 × cos(lat) / (512 × 2^z)  metres
// We need geoW ≥ max(aabbW, aabbH) × 1.25, so we cap the zoom accordingly.
function computeMapboxZoom(
  lat: number,
  realWorldWidth: number,
  realWorldHeight: number,
  rotationDeg: number,
  requestedZoom: number,
): number {
  const θ = Math.abs(rotationDeg * Math.PI / 180);
  const aabbW = realWorldWidth * Math.abs(Math.cos(θ)) + realWorldHeight * Math.abs(Math.sin(θ));
  const aabbH = realWorldWidth * Math.abs(Math.sin(θ)) + realWorldHeight * Math.abs(Math.cos(θ));
  const required = Math.max(aabbW, aabbH) * 1.25;
  const maxZoom = Math.log2(40075016.686 * 1280 * Math.cos(lat * Math.PI / 180) / (512 * required));
  return Math.min(requestedZoom, Math.floor(maxZoom));
}

// Rotate the Mapbox image by -θ then crop the centre W×H pixel region.
//
// The Mapbox image is centred on the rectangle's centre. Rotating by -θ
// undoes the user's rotation so the rectangle becomes axis-aligned in the
// canvas. We then crop the exact W×H pixels from the centre of that rotated
// image — those pixels correspond precisely to the user's selection.
//
// Works for any angle. Handles both 1280×1280 and 2560×2560 Mapbox responses
// by deriving pxPerMeter from the actual image dimensions.
function rotateAndCropMapbox(
  base64: string,
  centerLat: number,
  zoom: number,
  realWorldWidth: number,
  realWorldHeight: number,
  rotationDeg: number,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const imgW = img.width;
      const imgH = img.height;

      // Geographic width of the 1280-CSS-px Mapbox viewport in metres.
      // (@2x doubles physical pixels but not geographic coverage.)
      const CSS_REQUESTED = 1280;
      const geoWidthM = 40075016.686 * CSS_REQUESTED *
        Math.cos(centerLat * Math.PI / 180) / (512 * Math.pow(2, zoom));

      // Physical pixels per metre in the received image
      const pxPerMeter = imgW / geoWidthM;

      const cropW = Math.round(realWorldWidth  * pxPerMeter);
      const cropH = Math.round(realWorldHeight * pxPerMeter);

      if (cropW < 4 || cropH < 4) { resolve(base64); return; }

      const out = document.createElement('canvas');
      out.width  = cropW;
      out.height = cropH;
      const ctx = out.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Translate to output centre → rotate by -θ (undoes the user's clockwise
      // rotation) → draw source image so its centre aligns with output centre.
      ctx.translate(cropW / 2, cropH / 2);
      ctx.rotate(-(rotationDeg * Math.PI / 180));
      ctx.drawImage(img, -imgW / 2, -imgH / 2);

      resolve(out.toDataURL('image/jpeg', 0.93));
    };
    img.src = base64;
  });
}

// ── Style tokens (matching CustomUploadModal) ─────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#374151',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  fontFamily: FONT,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#f9fafb',
  color: '#1f2937',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: FONT,
  transition: 'all 0.15s ease',
};

const A4_RATIO = Math.sqrt(2);

const LOAD_STEP_MSG = 'Processing…';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SatellitePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  a4Dimensions: { a4X: number; a4Y: number; a4WidthPx: number; a4HeightPx: number };
  initialData?: SatelliteBackground;
}

declare global {
  interface Window {
    google: any;
    googleMapsLoaded: boolean;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export const SatellitePickerModal: React.FC<SatellitePickerModalProps> = ({
  isOpen,
  onClose,
  a4Dimensions,
  initialData,
}) => {
  const setSatelliteBackground = useCanvasStore((s) => s.setSatelliteBackground);

  // ── Map refs ────────────────────────────────────────────────────────────────
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const latRef = useRef(initialData?.center.lat ?? 48.8566);
  const lngRef = useRef(initialData?.center.lng ?? 2.3522);

  // ── Map state ───────────────────────────────────────────────────────────────
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [lat, setLat] = useState(initialData?.center.lat ?? 48.8566);
  const [lng, setLng] = useState(initialData?.center.lng ?? 2.3522);
  const [coordsStr, setCoordsStr] = useState(
    initialData ? `${initialData.center.lat}, ${initialData.center.lng}` : ''
  );
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [baseSize, setBaseSize] = useState(initialData?.realWorldWidth ?? 40);
  const [rotation, setRotation] = useState(initialData?.rotation ?? 0);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(
    initialData?.orientation ?? 'landscape'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(20);
  const [rectPosition, setRectPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, rectX: 0, rectY: 0 });

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<'map' | 'calibrate'>('map');
  const [capturedBase64, setCapturedBase64] = useState('');
  const [capturedCenter, setCapturedCenter] = useState({ lat: 48.8566, lng: 2.3522 });
  const [capturedBounds, setCapturedBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [capturedRealWorldWidth, setCapturedRealWorldWidth] = useState<number | null>(null);

  // ── Calibration state ───────────────────────────────────────────────────────
  const [calLines, setCalLines] = useState<CalibrationLine[]>([]);
  const [calPendingStart, setCalPendingStart] = useState<{ x: number; y: number } | null>(null);
  const [calInputLineId, setCalInputLineId] = useState<string | null>(null);
  const [calInputMeters, setCalInputMeters] = useState('');
  const [calScaleFactor, setCalScaleFactor] = useState(1.0);
  const [calImgZoom, setCalImgZoom] = useState(1);
  const [calImgPan, setCalImgPan] = useState({ x: 0, y: 0 });
  const [calPhase, setCalPhase] = useState<'draw' | 'verify'>('draw');
  const [imgNaturalWidth, setImgNaturalWidth] = useState(0);
  const [imgNaturalHeight, setImgNaturalHeight] = useState(0);

  const calCanvasRef = useRef<HTMLCanvasElement>(null);
  const calImgRef = useRef<HTMLImageElement | null>(null);
  const calPanStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const calIsPanningRef = useRef(false);

  // ── Calibration derived values ──────────────────────────────────────────────
  const calCompletedLines = useMemo(
    () => calLines.filter((l) => l.realWorldMeters > 0),
    [calLines]
  );
  const calRawPpm = useMemo(
    () => derivePixelsPerMeter(calCompletedLines, imgNaturalWidth, imgNaturalHeight),
    [calCompletedLines, imgNaturalWidth, imgNaturalHeight]
  );
  const calAdjustedPpm = calRawPpm * calScaleFactor;
  const calConfidence =
    calCompletedLines.length >= 3 ? 3 :
    calCompletedLines.length >= 2 ? 2 :
    calCompletedLines.length >= 1 ? 1 : 0;

  // ── Dimension helpers ───────────────────────────────────────────────────────

  const getDimensions = useCallback(() => {
    if (orientation === 'landscape') {
      return { width: baseSize, height: baseSize / A4_RATIO };
    } else {
      return { width: baseSize / A4_RATIO, height: baseSize };
    }
  }, [baseSize, orientation]);

  const mathScaleLabel = (() => {
    const { width: w } = getDimensions();
    return `1cm = ${(w / 29.7).toFixed(1)}m`;
  });

  // Returns the fraction of the container the rectangle should occupy,
  // derived from the real-world meters the user entered vs the map viewport size.
  const getRectPixelSize = useCallback(() => {
    if (!mapInstanceRef.current || !containerRef.current) return { w: 0.60, h: 0.42 };
    const map = mapInstanceRef.current;
    const mapBounds = map.getBounds();
    if (!mapBounds) return { w: 0.60, h: 0.42 };

    const ne = mapBounds.getNorthEast();
    const sw = mapBounds.getSouthWest();
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    // Real-world size of the full map viewport in meters
    const midLat = (ne.lat() + sw.lat()) / 2;
    const midLng = (ne.lng() + sw.lng()) / 2;
    const viewportWidthM  = haversineMeters(midLat, sw.lng(), midLat, ne.lng());
    const viewportHeightM = haversineMeters(sw.lat(), midLng, ne.lat(), midLng);

    // Real-world size of the rectangle from user inputs
    const { width: rectW, height: rectH } = getDimensions();

    // Fraction of the viewport the rectangle occupies, clamped to fit on screen
    const fracW = Math.min(rectW / viewportWidthM,  0.85);
    const fracH = Math.min(rectH / viewportHeightM, 0.85);

    return { w: fracW, h: fracH, wPx: fracW * cw, hPx: fracH * ch };
  }, [baseSize, orientation, zoom]); // zoom causes map viewport to change

  // ── Map helpers ─────────────────────────────────────────────────────────────

  const applyCoords = useCallback((raw: string) => {
    setCoordsError(null);
    const s = raw.trim();
    if (!s) return;
    const matches = [...s.matchAll(/(-?\d+(?:\.\d+)?)\s*°?\s*([NSEWnsew])?/g)];
    if (matches.length < 2) {
      setCoordsError('Could not parse — try: 38.7193, -9.1534');
      return;
    }
    let newLat = parseFloat(matches[0]?.[1] ?? '0');
    let newLng = parseFloat(matches[1]?.[1] ?? '0');
    const latDir = matches[0]?.[2]?.toUpperCase();
    const lngDir = matches[1]?.[2]?.toUpperCase();
    if (latDir === 'S') newLat = -Math.abs(newLat);
    if (lngDir === 'W') newLng = -Math.abs(newLng);
    if (!isFinite(newLat) || !isFinite(newLng) || Math.abs(newLat) > 90 || Math.abs(newLng) > 180) {
      setCoordsError('Invalid coordinates');
      return;
    }
    setLat(newLat); setLng(newLng);
    setCoordsStr(`${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
    if (mapInstanceRef.current) mapInstanceRef.current.panTo({ lat: newLat, lng: newLng });
  }, []);

  const getRectCenterLatLng = useCallback(() => {
    if (!mapInstanceRef.current || !containerRef.current) return { lat, lng };
    const map = mapInstanceRef.current;
    const bounds = map.getBounds();
    if (!bounds) return { lat, lng };
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const centerLat = ne.lat() - (rectPosition.y / 100) * (ne.lat() - sw.lat());
    const centerLng = sw.lng() + (rectPosition.x / 100) * (ne.lng() - sw.lng());
    return { lat: centerLat, lng: centerLng };
  }, [rectPosition, lat, lng]);

  const updateMapCenter = useCallback(() => {
    const center = getRectCenterLatLng();
    setLat(center.lat); setLng(center.lng);
    setCoordsStr(`${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`);
  }, [getRectCenterLatLng]);

  const getRectBoundsLatLng = useCallback(() => {
    if (!mapInstanceRef.current || !containerRef.current) return null;
    const map = mapInstanceRef.current;
    const mapBounds = map.getBounds();
    if (!mapBounds) return null;

    const ne = mapBounds.getNorthEast();
    const sw = mapBounds.getSouthWest();
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    // Use the same dynamic size as the rendered rectangle
    const { w: fracW, h: fracH } = getRectPixelSize();

    const rectLeftPx   = (rectPosition.x / 100 - fracW / 2) * cw;
    const rectTopPx    = (rectPosition.y / 100 - fracH / 2) * ch;
    const rectRightPx  = rectLeftPx + fracW * cw;
    const rectBottomPx = rectTopPx  + fracH * ch;

    // Lat: top of screen = ne.lat(), bottom = sw.lat() — Y is INVERTED relative to lat
    const latRange = ne.lat() - sw.lat();
    const north = ne.lat() - (rectTopPx    / ch) * latRange;
    const south = ne.lat() - (rectBottomPx / ch) * latRange;

    // Lng: left = sw.lng(), right = ne.lng() — X is normal
    const lngRange = ne.lng() - sw.lng();
    const west = sw.lng() + (rectLeftPx  / cw) * lngRange;
    const east = sw.lng() + (rectRightPx / cw) * lngRange;

    return { north, south, east, west };
  }, [rectPosition, getRectPixelSize]);

  // ── Map zoom controls ───────────────────────────────────────────────────────

  const handleZoomIn = useCallback(() => {
    if (mapInstanceRef.current && zoom < 21) {
      const nz = zoom + 1; setZoom(nz);
      mapInstanceRef.current.setZoom(nz);
      mapInstanceRef.current.setTilt(0); mapInstanceRef.current.setHeading(0);
    }
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current && zoom > 1) {
      const nz = zoom - 1; setZoom(nz);
      mapInstanceRef.current.setZoom(nz);
      mapInstanceRef.current.setTilt(0); mapInstanceRef.current.setHeading(0);
    }
  }, [zoom]);

  // ── Map init ────────────────────────────────────────────────────────────────

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    if (mapInstanceRef.current) return; // Already initialized — don't recreate

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: latRef.current, lng: lngRef.current },
      zoom: 20,
      mapTypeId: 'satellite',
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      heading: 0,
      tilt: 0,
    });
    mapInstanceRef.current = map;

    map.addListener('zoom_changed', () => {
      map.setTilt(0); map.setHeading(0);
      setZoom(map.getZoom() || 20);
    });
    map.addListener('center_changed', () => {
      if (!isDraggingRef.current) {
        const c = map.getCenter();
        if (c) {
          setLat(c.lat()); setLng(c.lng());
          setCoordsStr(`${c.lat().toFixed(6)}, ${c.lng().toFixed(6)}`);
          latRef.current = c.lat(); lngRef.current = c.lng();
        }
      }
    });

    const input = document.getElementById('satellite-address-input') as HTMLInputElement;
    if (input && window.google.maps.places) {
      const ac = new window.google.maps.places.Autocomplete(input);
      ac.bindTo('bounds', map);
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        const newLat = place.geometry.location.lat();
        const newLng = place.geometry.location.lng();
        setLat(newLat); setLng(newLng);
        latRef.current = newLat; lngRef.current = newLng;
        setCoordsStr(`${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
        setAddress(place.formatted_address ?? input.value);
        map.panTo({ lat: newLat, lng: newLng });
      });
      autocompleteRef.current = ac;
    }
    setMapReady(true);
  }, []); // Stable — no deps that change during interaction

  useEffect(() => {
    if (!isOpen) {
      mapInstanceRef.current = null;
      setMapReady(false);
      setStep('map');
      setCapturedBase64('');
      return;
    }
    if (window.google?.maps) { initMap(); return; }
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', initMap);
      return () => existing.removeEventListener('load', initMap);
    }
    const key = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? '';
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, [isOpen, initMap]);

  // ── Rectangle drag handlers ─────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, rectX: rectPosition.x, rectY: rectPosition.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const c = containerRef.current;
    const dx = ((e.clientX - dragStartRef.current.x) / c.clientWidth) * 100;
    const dy = ((e.clientY - dragStartRef.current.y) / c.clientHeight) * 100;
    setRectPosition({
      x: Math.max(15, Math.min(85, dragStartRef.current.rectX + dx)),
      y: Math.max(15, Math.min(85, dragStartRef.current.rectY + dy)),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      updateMapCenter();
    }
  }, [updateMapCenter]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ── Calibration canvas draw ─────────────────────────────────────────────────

  const calDraw = useCallback(() => {
    const canvas = calCanvasRef.current;
    const img = calImgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const dw = canvas.clientWidth;
    const dh = canvas.clientHeight;
    canvas.width = dw * dpr;
    canvas.height = dh * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, dw, dh);

    ctx.save();
    ctx.translate(calImgPan.x + dw / 2, calImgPan.y + dh / 2);
    ctx.scale(calImgZoom, calImgZoom);

    const scale = Math.min(dw / img.naturalWidth, dh / img.naturalHeight) * 0.9;
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);

    // 1m grid overlay — only in verify phase
    if (calPhase === 'verify' && calAdjustedPpm > 0) {
      const gpx = calAdjustedPpm * scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5 / calImgZoom;
      ctx.setLineDash([3 / calImgZoom, 3 / calImgZoom]);
      const cols = Math.ceil(iw / gpx) + 1;
      const rows = Math.ceil(ih / gpx) + 1;
      for (let c = 0; c <= cols; c++) {
        const x = -iw / 2 + c * gpx;
        ctx.beginPath(); ctx.moveTo(x, -ih / 2); ctx.lineTo(x, ih / 2); ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        const y = -ih / 2 + r * gpx;
        ctx.beginPath(); ctx.moveTo(-iw / 2, y); ctx.lineTo(iw / 2, y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Calibration lines
    calLines.forEach((line) => {
      const x1 = -iw / 2 + line.x1 * iw;
      const y1 = -ih / 2 + line.y1 * ih;
      const x2 = -iw / 2 + line.x2 * iw;
      const y2 = -ih / 2 + line.y2 * ih;
      const bad =
        calRawPpm > 0 &&
        lineDeviation(line, calRawPpm, imgNaturalWidth, imgNaturalHeight) > 0.15 &&
        calCompletedLines.length >= 2;

      ctx.strokeStyle = bad ? '#ef4444' : line.color;
      ctx.lineWidth = 2 / calImgZoom;
      ctx.setLineDash(line.realWorldMeters > 0 ? [] : [5 / calImgZoom, 3 / calImgZoom]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);

      // Endpoint dots
      [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(({ x, y }) => {
        ctx.fillStyle = line.color;
        ctx.beginPath(); ctx.arc(x, y, 4 / calImgZoom, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 / calImgZoom; ctx.stroke();
      });

      // Label at midpoint
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const label = line.realWorldMeters > 0 ? `${line.realWorldMeters}m` : '…';
      ctx.font = `bold ${11 / calImgZoom}px ${FONT}`;
      ctx.lineWidth = 3 / calImgZoom;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(label, mx + 6 / calImgZoom, my - 4 / calImgZoom);
      ctx.fillStyle = bad ? '#ef4444' : '#fff';
      ctx.fillText(label, mx + 6 / calImgZoom, my - 4 / calImgZoom);
    });

    // Pending start dot
    if (calPendingStart) {
      const x = -iw / 2 + calPendingStart.x * iw;
      const y = -ih / 2 + calPendingStart.y * ih;
      ctx.fillStyle = LINE_COLORS[calLines.length % LINE_COLORS.length] ?? '#ef4444';
      ctx.beginPath(); ctx.arc(x, y, 6 / calImgZoom, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 / calImgZoom; ctx.stroke();
    }

    ctx.restore();
  }, [
    calLines, calPendingStart, calPhase, calAdjustedPpm, calImgZoom, calImgPan,
    calRawPpm, imgNaturalWidth, imgNaturalHeight, calCompletedLines,
  ]);

  // Load image into calImgRef when captured base64 is set and step changes to calibrate
  useEffect(() => {
    if (!capturedBase64 || step !== 'calibrate') return;
    const img = new Image();
    img.onload = () => {
      calImgRef.current = img;
      setImgNaturalWidth(img.naturalWidth);
      setImgNaturalHeight(img.naturalHeight);
      calDraw();
    };
    img.src = capturedBase64;
  }, [capturedBase64, step]); // intentionally excludes calDraw to avoid double-load

  // Redraw whenever calibration state changes
  useEffect(() => {
    if (step === 'calibrate') calDraw();
  }, [calDraw, step]);

  // ── Calibration canvas interaction ──────────────────────────────────────────

  const calCanvasToNorm = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = calCanvasRef.current;
    const img = calImgRef.current;
    if (!canvas || !img) return null;
    const rect = canvas.getBoundingClientRect();
    const dw = rect.width;
    const dh = rect.height;
    const scale = Math.min(dw / img.naturalWidth, dh / img.naturalHeight) * 0.9;
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = (mx - (calImgPan.x + dw / 2)) / calImgZoom;
    const wy = (my - (calImgPan.y + dh / 2)) / calImgZoom;
    const ix = wx + iw / 2;
    const iy = wy + ih / 2;
    if (ix < 0 || iy < 0 || ix > iw || iy > ih) return null;
    return { x: ix / iw, y: iy / ih };
  }, [calImgZoom, calImgPan]);

  const handleCalCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (calPhase !== 'draw' || calIsPanningRef.current) return;
    const pt = calCanvasToNorm(e);
    if (!pt) return;
    if (!calPendingStart) {
      setCalPendingStart(pt);
    } else {
      const newLine: CalibrationLine = {
        id: genCalId(),
        x1: calPendingStart.x, y1: calPendingStart.y,
        x2: pt.x, y2: pt.y,
        realWorldMeters: 0,
        color: LINE_COLORS[calLines.length % LINE_COLORS.length] ?? LINE_COLORS[0]!,
      };
      setCalLines((prev) => [...prev, newLine]);
      setCalPendingStart(null);
      setCalInputLineId(newLine.id);
      setCalInputMeters('');
    }
  }, [calPhase, calPendingStart, calLines.length, calCanvasToNorm]);

  const handleCalMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      calIsPanningRef.current = true;
      calPanStart.current = { mx: e.clientX, my: e.clientY, px: calImgPan.x, py: calImgPan.y };
    }
  }, [calImgPan]);

  const handleCalMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!calPanStart.current) return;
    const dx = e.clientX - calPanStart.current.mx;
    const dy = e.clientY - calPanStart.current.my;
    setCalImgPan({ x: calPanStart.current.px + dx, y: calPanStart.current.py + dy });
  }, []);

  const handleCalMouseUp = useCallback(() => {
    calPanStart.current = null;
    setTimeout(() => { calIsPanningRef.current = false; }, 50);
  }, []);

  const handleCalWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setCalImgZoom((z) => Math.max(0.2, Math.min(10, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))));
  }, []);

  const calSubmitMeters = useCallback(() => {
    const m = parseFloat(calInputMeters);
    if (!calInputLineId || isNaN(m) || m <= 0) return;
    setCalLines((prev) => prev.map((l) => l.id === calInputLineId ? { ...l, realWorldMeters: m } : l));
    setCalInputLineId(null); setCalInputMeters('');
  }, [calInputLineId, calInputMeters]);

  // ── Step 1: Fetch satellite image → go to calibration step ─────────────────

  const handleFetchAndCalibrate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const map = mapInstanceRef.current;
      if (!map) {
        setError('Map not ready. Try again.');
        setIsLoading(false);
        return;
      }

      const center = getRectCenterLatLng();
      const { width: realWorldWidth, height: realWorldHeight } = getDimensions();
      const currentZoom = map.getZoom() ?? zoom;

      // Compute the zoom level that fits the full rotated AABB in the Mapbox image
      const mapboxZoom = computeMapboxZoom(center.lat, realWorldWidth, realWorldHeight, rotation, currentZoom);

      // Fetch full 1280×1280 Mapbox satellite image centered on the selection
      const res = await fetch('/api/satellite/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: center.lat,
          lng: center.lng,
          zoom: mapboxZoom,
          realWorldWidth,
          realWorldHeight,
          highQuality: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `Capture failed (${res.status})`);
      }

      const { imageBase64 } = await res.json();

      // Single operation: rotate by -θ around image centre, then crop the W×H rect
      const finalBase64 = await rotateAndCropMapbox(
        imageBase64, center.lat, mapboxZoom, realWorldWidth, realWorldHeight, rotation
      );

      const realWorldWidthM = realWorldWidth;

      setCapturedRealWorldWidth(realWorldWidthM);
      setCapturedBounds(null);
      setCapturedCenter(center);
      setCapturedBase64(finalBase64);

      // Reset calibration state for this fresh capture
      setCalLines([]);
      setCalScaleFactor(1.0);
      setCalPendingStart(null);
      setCalInputLineId(null);
      setCalInputMeters('');
      setCalImgZoom(1);
      setCalImgPan({ x: 0, y: 0 });
      setCalPhase('draw');

      setStep('calibrate');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Commit to canvas with calibrated (or math) scale ───────────────

  const handleCommitToCanvas = () => {
    const { width, height } = getDimensions();
    let pixelsPerMeter: number;
    let calibrationLines: CalibrationLine[] = [];
    let scaleFactor = 1.0;

    if (calAdjustedPpm > 0 && calCompletedLines.length > 0) {
      // Calibrated: back-calculate real-world width from image pixel density
      const calibratedRealWorldWidth = imgNaturalWidth / calAdjustedPpm;
      pixelsPerMeter = a4Dimensions.a4WidthPx / calibratedRealWorldWidth;
      calibrationLines = calCompletedLines;
      scaleFactor = calScaleFactor;
    } else {
      // Mathematical fallback: Haversine-derived width from bounds takes priority over size inputs
      pixelsPerMeter = a4Dimensions.a4WidthPx / (capturedRealWorldWidth ?? width);
    }

    const bg: SatelliteBackground = {
      center: capturedCenter,
      address: address || `${capturedCenter.lat.toFixed(5)}, ${capturedCenter.lng.toFixed(5)}`,
      realWorldWidth: width,
      realWorldHeight: height,
      orientation,
      rotation,
      pixelsPerMeter,
      imageBase64: capturedBase64,
      calibrationLines,
      scaleFactor,
      addedAt: new Date().toISOString(),
    };

    setSatelliteBackground(bg);
    setTimeout(() => window.dispatchEvent(new CustomEvent('forceLayoutSync')), 500);
    onClose();
  };

  if (!isOpen) return null;

  const { width: displayWidth, height: displayHeight } = getDimensions();
  const calConfidenceColor = ['#6b7280', '#ef4444', '#f59e0b', '#22c55e'][calConfidence]!;
  const calConfidenceLabel = ['No lines yet', 'Low — 1 line', 'Good — 2 lines', 'High ✓'][calConfidence]!;

  // Live calibrated scale label (falls back to math scale when no lines)
  const calScaleLabelText = (() => {
    if (calAdjustedPpm > 0 && imgNaturalWidth > 0) {
      const calibratedRealWorldWidth = imgNaturalWidth / calAdjustedPpm;
      const ppm = a4Dimensions.a4WidthPx / calibratedRealWorldWidth;
      return `1cm = ${(100 / ppm).toFixed(2)}m`;
    }
    return mathScaleLabel();
  })();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: FONT,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          height: '85vh',
          maxHeight: 820,
          background: '#ffffff',
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f3f4f6',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Globe icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M3.6 9h16.8M3.6 15h16.8" />
                <ellipse cx="12" cy="12" rx="4" ry="9" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                Satellite Background
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                {step === 'map'
                  ? 'Position the capture rectangle over your venue'
                  : calPhase === 'draw'
                  ? 'Click two points to draw a reference line — enter the real-world distance'
                  : 'Verify the 1m grid against your venue — use the slider to fine-tune'
                }
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {([
              { key: 'map', label: '1  Location' },
              { key: 'calibrate', label: '2  Calibrate' },
            ] as const).map((s, i) => {
              const active = step === s.key;
              const done = step === 'calibrate' && s.key === 'map';
              return (
                <React.Fragment key={s.key}>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: active ? '#0f172a' : 'transparent',
                    color: active ? '#fff' : done ? '#22c55e' : '#cbd5e1',
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {done && <span style={{ fontSize: 11 }}>✓</span>}
                    {s.label}
                  </div>
                  {i < 1 && <span style={{ color: '#e2e8f0', fontSize: 14 }}>/</span>}
                </React.Fragment>
              );
            })}
          </div>

          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: 'none', background: '#f1f5f9',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#64748b',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ═══════════════════ STEP: MAP ═══════════════════ */}
          {step === 'map' && (
            <>
              {/* Left Panel - Location Controls */}
              <div style={{
                width: 300, flexShrink: 0,
                padding: '20px 20px',
                borderRight: '1px solid #f3f4f6',
                display: 'flex', flexDirection: 'column', gap: 14,
                overflowY: 'auto',
                background: '#fafbfc',
              }}>
                <div>
                  <label style={labelStyle}>Address</label>
                  <input
                    id="satellite-address-input"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Search location..."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Coordinates</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={coordsStr}
                      onChange={(e) => { setCoordsStr(e.target.value); setCoordsError(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') applyCoords(coordsStr); }}
                      placeholder="38.7193, -9.1534"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={() => applyCoords(coordsStr)}
                      style={{
                        padding: '0 14px', borderRadius: 10, border: 'none',
                        background: '#0f172a', color: '#fff', cursor: 'pointer',
                        fontSize: 13, fontWeight: 600, fontFamily: FONT,
                      }}
                    >Go</button>
                  </div>
                  {coordsError && (
                    <p style={{ margin: '4px 0 0', color: '#ef4444', fontSize: 11 }}>{coordsError}</p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Size (m)</label>
                  <input
                    type="number"
                    value={baseSize}
                    min={5} max={500}
                    onChange={(e) => setBaseSize(Math.max(5, parseInt(e.target.value) || 40))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Orientation</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['landscape', 'portrait'] as const).map((o) => (
                      <button
                        key={o}
                        onClick={() => setOrientation(o)}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 10,
                          border: '1px solid', cursor: 'pointer',
                          fontSize: 13, fontWeight: 500, fontFamily: FONT,
                          background: orientation === o ? '#0f172a' : '#fff',
                          borderColor: orientation === o ? '#0f172a' : '#e5e7eb',
                          color: orientation === o ? '#fff' : '#6b7280',
                        }}
                      >
                        {o === 'landscape' ? '↔' : '↕'} {o.charAt(0).toUpperCase() + o.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Rotation</label>
                    <span style={{ color: '#6b7280', fontSize: 12 }}>{rotation}°</span>
                  </div>
                  <input
                    type="range" min={0} max={360} step={15}
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#0f172a' }}
                  />
                </div>

                <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ margin: 0, color: '#0f172a', fontSize: 12, fontWeight: 600 }}>
                    {displayWidth.toFixed(0)}m × {displayHeight.toFixed(0)}m{rotation > 0 && ` • ${rotation}°`}
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 11 }}>
                    Scale: {mathScaleLabel()}
                  </p>
                </div>


                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 10, color: '#dc2626', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleFetchAndCalibrate}
                  disabled={isLoading}
                  style={{
                    marginTop: 'auto',
                    padding: '13px 16px',
                    borderRadius: 12, border: 'none',
                    background: isLoading ? '#9ca3af' : '#0f172a',
                    color: '#fff', fontWeight: 600, fontSize: 14,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontFamily: FONT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {isLoading ? LOAD_STEP_MSG : (
                    <>
                      Next: Calibrate Scale
                      <span style={{ fontSize: 16, lineHeight: 1 }}>→</span>
                    </>
                  )}
                </button>

                <p style={{ margin: 0, color: '#94a3b8', fontSize: 11, textAlign: 'center', lineHeight: 1.5 }}>
                  Calibration improves element proportions —<br />skip if your size inputs are accurate.
                </p>

                <button
                  onClick={onClose}
                  style={{
                    padding: '10px', borderRadius: 10,
                    border: '1px solid #e5e7eb', background: '#fff',
                    color: '#6b7280', cursor: 'pointer', fontSize: 13, fontFamily: FONT,
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* Right Panel - Map */}
              <div
                ref={containerRef}
                style={{
                  flex: 1, position: 'relative',
                  background: '#f3f4f6', overflow: 'hidden',
                  cursor: isDragging ? 'grabbing' : 'default',
                }}
              >
                <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

                {/* Selection overlay */}
                {mapReady && (
                  <div
                    ref={overlayRef}
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                  >
                    <div
                      onMouseDown={handleMouseDown}
                      style={{
                        position: 'absolute',
                        left: `${rectPosition.x - (getRectPixelSize().w * 100) / 2}%`,
                        top: `${rectPosition.y - (getRectPixelSize().h * 100) / 2}%`,
                        width: `${getRectPixelSize().w * 100}%`,
                        height: `${getRectPixelSize().h * 100}%`,
                        border: '3px solid #0f172a',
                        borderRadius: 4,
                        boxShadow: isDragging ? '0 0 0 4px rgba(15,23,42,0.3)' : '0 4px 20px rgba(0,0,0,0.4)',
                        transition: isDragging ? 'none' : 'box-shadow 0.2s',
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        background: 'rgba(15,23,42,0.08)',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        pointerEvents: 'auto',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      left: `${rectPosition.x}%`, top: `${rectPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px',
                      background: 'rgba(15,23,42,0.9)',
                      borderRadius: 16, color: '#fff', fontSize: 11, fontWeight: 500,
                      whiteSpace: 'nowrap', pointerEvents: 'none',
                    }}>
                      <Move size={12} />
                      {displayWidth.toFixed(0)}m × {displayHeight.toFixed(0)}m{rotation > 0 && ` • ${rotation}°`}
                    </div>
                  </div>
                )}

                {!mapReady && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#f3f4f6', color: '#6b7280',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                      Loading map...
                    </div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                {/* Zoom controls */}
                {mapReady && (
                  <div style={{
                    position: 'absolute', right: 16, bottom: 16,
                    display: 'flex', flexDirection: 'column', gap: 4,
                    background: '#fff', borderRadius: 10,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)', overflow: 'hidden',
                  }}>
                    <button onClick={handleZoomIn} disabled={zoom >= 21} style={{
                      width: 40, height: 40, border: 'none', background: '#fff',
                      cursor: zoom >= 21 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: zoom >= 21 ? '#d1d5db' : '#374151',
                      borderBottom: '1px solid #f3f4f6',
                    }}>+</button>
                    <div style={{
                      height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: '#6b7280', fontWeight: 500, background: '#f9fafb',
                    }}>{zoom}x</div>
                    <button onClick={handleZoomOut} disabled={zoom <= 1} style={{
                      width: 40, height: 40, border: 'none', background: '#fff',
                      cursor: zoom <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: zoom <= 1 ? '#d1d5db' : '#374151',
                      borderTop: '1px solid #f3f4f6',
                    }}>−</button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════════════════ STEP: CALIBRATE ═══════════════════ */}
          {step === 'calibrate' && (
            <>
              {/* Left Panel - Calibration Controls */}
              <div style={{
                width: 300, flexShrink: 0,
                borderRight: '1px solid #f1f5f9',
                background: '#ffffff',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}>
                {/* Phase sub-tabs */}
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['draw', 'verify'] as const).map((p) => {
                      const enabled = p === 'draw' || calCompletedLines.length > 0;
                      return (
                        <button
                          key={p}
                          onClick={() => enabled && setCalPhase(p)}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 8,
                            border: 'none', cursor: enabled ? 'pointer' : 'default',
                            background: calPhase === p ? '#0f172a' : 'transparent',
                            color: calPhase === p ? '#fff' : enabled ? '#475569' : '#cbd5e1',
                            fontSize: 13, fontWeight: calPhase === p ? 600 : 500,
                            fontFamily: FONT,
                          }}
                        >
                          {p === 'draw' ? 'Draw Lines' : 'Verify Grid'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── DRAW phase ── */}
                {calPhase === 'draw' && (
                  <>
                    <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          </svg>
                          Reference lines
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: calConfidenceColor,
                          padding: '3px 8px',
                          background: calConfidenceColor === '#22c55e' ? '#dcfce7' : calConfidenceColor === '#f59e0b' ? '#fef3c7' : calConfidenceColor === '#ef4444' ? '#fee2e2' : '#f1f5f9',
                          borderRadius: 20,
                        }}>
                          {calConfidenceLabel}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                        More lines = better accuracy. Draw on known distances.
                      </p>
                    </div>

                    {/* Inline measurement input */}
                    {calInputLineId && (
                      <div style={{ margin: '10px 16px 0', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                          How long is this line in real life?
                        </p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="number" min="0.01" step="0.1" placeholder="e.g. 8"
                            value={calInputMeters}
                            onChange={(e) => setCalInputMeters(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') calSubmitMeters();
                              if (e.key === 'Escape') { setCalInputLineId(null); setCalInputMeters(''); }
                            }}
                            autoFocus
                            style={{
                              flex: 1, padding: '9px 11px', borderRadius: 8,
                              border: '1px solid #cbd5e1', background: '#fff',
                              fontSize: 14, outline: 'none', fontFamily: FONT,
                            }}
                          />
                          <span style={{ fontSize: 13, color: '#64748b' }}>m</span>
                          <button onClick={calSubmitMeters} style={{
                            padding: '9px 14px', borderRadius: 8, border: 'none',
                            background: '#0f172a', color: '#fff',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
                          }}>OK</button>
                        </div>
                      </div>
                    )}

                    {/* Lines list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
                      {calLines.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8', fontSize: 13 }}>
                          No lines drawn yet.<br />Click on the image to start.
                        </div>
                      ) : (
                        calLines.map((line, i) => {
                          const bad =
                            calRawPpm > 0 &&
                            lineDeviation(line, calRawPpm, imgNaturalWidth, imgNaturalHeight) > 0.15 &&
                            calCompletedLines.length >= 2;
                          return (
                            <div key={line.id} style={{
                              display: 'flex', alignItems: 'center', gap: 9,
                              padding: '9px 11px', marginBottom: 7, borderRadius: 8,
                              border: `1px solid ${bad ? '#fecaca' : '#e2e8f0'}`,
                              background: bad ? '#fef2f2' : '#f8fafc',
                              fontSize: 13,
                            }}>
                              <span style={{ width: 9, height: 9, borderRadius: '50%', background: line.color, flexShrink: 0 }} />
                              <span style={{ color: '#6b7280' }}>Line {i + 1}</span>
                              {line.realWorldMeters > 0
                                ? <span style={{ fontWeight: 600, color: '#111827' }}>{line.realWorldMeters}m</span>
                                : <button
                                    onClick={() => { setCalInputLineId(line.id); setCalInputMeters(''); }}
                                    style={{ border: 'none', background: 'none', color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                  >Enter length</button>
                              }
                              {bad && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#ef4444' }}>⚠ inconsistent</span>}
                              <button
                                onClick={() => {
                                  setCalLines((p) => p.filter((l) => l.id !== line.id));
                                  if (calInputLineId === line.id) { setCalInputLineId(null); setCalInputMeters(''); }
                                }}
                                style={{ marginLeft: bad ? 0 : 'auto', border: 'none', background: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 15, padding: 0, lineHeight: 1 }}
                              >×</button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Scale readout + next */}
                    {calCompletedLines.length > 0 && (
                      <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                          <span style={{ color: '#64748b' }}>Calculated scale</span>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{calScaleLabelText}</span>
                        </div>
                        <button
                          onClick={() => setCalPhase('verify')}
                          style={{
                            width: '100%', padding: '11px 0', borderRadius: 9, border: 'none',
                            background: '#0f172a', color: '#fff',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
                          }}
                        >
                          Next: Verify Grid
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* ── VERIFY phase ── */}
                {calPhase === 'verify' && (
                  <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>
                    <div>
                      <p style={{ margin: '0 0 5px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Scale verification</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                        Do the grid squares look like 1m × 1m? Use the slider if they're off.
                      </p>
                    </div>

                    {/* Confidence */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={calConfidenceColor} strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span style={{ fontSize: 13, fontWeight: 600, color: calConfidenceColor }}>{calConfidenceLabel}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>({calCompletedLines.length} line{calCompletedLines.length !== 1 ? 's' : ''})</span>
                    </div>

                    {/* Inconsistency warning */}
                    {calCompletedLines.length >= 2 && calCompletedLines.some((l) => lineDeviation(l, calRawPpm, imgNaturalWidth, imgNaturalHeight) > 0.15) && (
                      <div style={{ padding: '11px 13px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', lineHeight: 1.5 }}>
                        Some lines disagree by &gt;15%. Check measurements or go back to re-draw.
                      </div>
                    )}

                    {/* Fine-tune slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                        <label style={{ ...labelStyle, marginBottom: 0, fontSize: 13 }}>Fine-tune scale</label>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                          {calScaleFactor >= 1 ? '+' : ''}{((calScaleFactor - 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range" min={0.8} max={1.2} step={0.01}
                        value={calScaleFactor}
                        onChange={(e) => setCalScaleFactor(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#0f172a' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                        <span>−20%</span>
                        <button onClick={() => setCalScaleFactor(1)} style={{ border: 'none', background: 'none', color: '#0f172a', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Reset</button>
                        <span>+20%</span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {[
                        { label: 'Scale', value: calScaleLabelText },
                        { label: 'Area', value: `${displayWidth.toFixed(1)}m × ${displayHeight.toFixed(1)}m` },
                        { label: 'Lines used', value: `${calCompletedLines.length}` },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: '#64748b' }}>{label}</span>
                          <span style={{ fontWeight: 500, color: '#0f172a' }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setCalPhase('draw')}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 8,
                        border: '1px solid #e5e7eb', background: '#fff',
                        color: '#374151', fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', fontFamily: FONT,
                      }}
                    >
                      Back to calibrate
                    </button>
                  </div>
                )}

                {/* CTA footer */}
                <div style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9', background: '#fafafa', flexShrink: 0 }}>
                  <p style={{ margin: '0 0 9px', fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.4 }}>
                    {calCompletedLines.length > 0
                      ? `Using calibrated scale (${calCompletedLines.length} line${calCompletedLines.length !== 1 ? 's' : ''})`
                      : 'No lines — using size-input scale'}
                  </p>
                  <button
                    onClick={handleCommitToCanvas}
                    style={{
                      width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                      background: '#0f172a', color: '#fff',
                      fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
                      marginBottom: 8,
                    }}
                  >
                    Add to Canvas
                  </button>
                  <button
                    onClick={() => { setStep('map'); setCapturedBase64(''); setError(null); }}
                    style={{
                      width: '100%', padding: '9px 0', borderRadius: 9,
                      border: '1px solid #e5e7eb', background: '#fff',
                      color: '#6b7280', fontSize: 13, cursor: 'pointer', fontFamily: FONT,
                    }}
                  >
                    ← Back to Location
                  </button>
                </div>
              </div>

              {/* Right Panel - Calibration canvas */}
              <div style={{ flex: 1, position: 'relative', background: '#1a1a2e', overflow: 'hidden' }}>
                <canvas
                  ref={calCanvasRef}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    cursor: calPhase === 'draw' ? 'crosshair' : 'grab',
                  }}
                  onClick={handleCalCanvasClick}
                  onMouseDown={handleCalMouseDown}
                  onMouseMove={handleCalMouseMove}
                  onMouseUp={handleCalMouseUp}
                  onMouseLeave={handleCalMouseUp}
                  onWheel={handleCalWheel}
                />

                {/* Instruction overlay */}
                <div style={{
                  position: 'absolute', top: 12, left: 12,
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                  borderRadius: 8, padding: '7px 12px',
                  color: '#f3f4f6', fontSize: 12, pointerEvents: 'none',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  {calPhase === 'draw' ? (
                    calPendingStart
                      ? '📍 Click to place the end point'
                      : '📐 Click two points to draw a reference line'
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                      </svg>
                      1m × 1m grid — does it match your venue?
                    </>
                  )}
                </div>

                {/* Zoom controls */}
                <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: '+', onClick: () => setCalImgZoom((z) => Math.min(10, z * 1.2)) },
                    { label: '−', onClick: () => setCalImgZoom((z) => Math.max(0.2, z / 1.2)) },
                    { label: '⊙', onClick: () => { setCalImgZoom(1); setCalImgPan({ x: 0, y: 0 }); } },
                  ].map(({ label, onClick }) => (
                    <button key={label} onClick={onClick} style={{
                      width: 32, height: 32,
                      background: 'rgba(0,0,0,0.6)', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8, cursor: 'pointer', fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{label}</button>
                  ))}
                </div>

                <p style={{
                  position: 'absolute', bottom: 12, left: 12,
                  margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)',
                  pointerEvents: 'none',
                }}>
                  Alt + drag or middle-click to pan · Scroll to zoom
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SatellitePickerModal;
