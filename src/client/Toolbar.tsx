import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import WallMaker from './components/WallMaker';
import type { Wall, WallMakerConfig, Door } from './types/wall.js';

interface SpaceOption {
  id: string;
  label: string;
  widthMeters: number;
  heightMeters: number;
  pixelsPerMeter: number;
}

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onAddSpace?: (width: number, height: number) => void; // width and height in meters
  onAddTable?: (type: string, size: string, seats: number, imageUrl: string, spaceId?: string) => void; // table properties with target space
  onAddWalls?: (walls: Wall[], doors: Door[]) => void; // walls and doors from Wall Maker
  brushSize?: number;
  brushColor?: string;
  onBrushSizeChange?: (size: number) => void;
  onBrushColorChange?: (color: string) => void;
  availableSpaces?: SpaceOption[];
}

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange, onAddSpace, onAddTable, onAddWalls, brushSize = 2, brushColor = '#000000', onBrushSizeChange, onBrushColorChange, availableSpaces = [] }) => {
  const toolbarWidth = 60;
  const toolbarHeight = 300; // Increased to fit Structure button
  const buttonSize = 44;
  const buttonSpacing = 12;
  const padding = 20;
  
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [disableHover, setDisableHover] = useState<boolean>(false);
  const [suppressHover, setSuppressHover] = useState<boolean>(false);
  const [isStructureMenuOpen, setIsStructureMenuOpen] = useState(false);
  const [openWindow, setOpenWindow] = useState<string | null>(null); // Track which window is open
  const [showBrushSettings, setShowBrushSettings] = useState(false); // Track if brush settings panel is visible
  const [showNewSpaceForm, setShowNewSpaceForm] = useState(false);
  const [spaceWidth, setSpaceWidth] = useState<string>('');
  const [spaceHeight, setSpaceHeight] = useState<string>('');
  const [showPresetNameInput, setShowPresetNameInput] = useState(false);
  const [presetName, setPresetName] = useState<string>('');
  const [presets, setPresets] = useState<Array<{ id: string; width: number; height: number; name: string }>>([]);
  const [presetContextMenu, setPresetContextMenu] = useState<{ presetId: string; x: number; y: number; type?: 'space' | 'wall' } | null>(null);
  const [tableType, setTableType] = useState<'round' | 'rectangular'>('round');
  const [tablePrimarySize, setTablePrimarySize] = useState<string>('');
  const [tableSecondarySize, setTableSecondarySize] = useState<string>('');
  const [tableSeats, setTableSeats] = useState<string>('0');
  const [tablePreview, setTablePreview] = useState<string | null>(null);
  const tablePreviewAltRef = useRef<string[]>([]);
  const [tableSizeIndex, setTableSizeIndex] = useState<number>(0);

  const TABLE_VARIANTS: Array<{ id: 'round' | 'rectangular'; label: string; description: string }> = [
    { id: 'round', label: 'Round Tables', description: 'Balanced seating, ideal for social layouts.' },
    { id: 'rectangular', label: 'Rectangular Tables', description: 'Great for banquet runs and head tables.' },
  ];

  const TABLE_SIZE_STOPS: Record<'round' | 'rectangular', number[]> = {
    round: [1, 1.5, 1.7, 1.9, 2],
    rectangular: [1, 1.5, 1.7, 1.9, 2],
  };

  const getSelectedSizeValue = useCallback((): number | null => {
    const stops = TABLE_SIZE_STOPS[tableType] || [];
    if (stops.length === 0) return null;
    const clampedIndex = Math.min(Math.max(tableSizeIndex, 0), stops.length - 1);
    return stops[clampedIndex] ?? null;
  }, [tableSizeIndex, tableType]);

  const generateTablePreview = useCallback((sizeValue: number | null, seatRaw: string) => {
    if (sizeValue == null) {
      setTablePreview(null);
      tablePreviewAltRef.current = [];
      return;
    }
    const sizeStr = `${sizeValue}`;
    const sizeUnderscore = sizeStr.replace(/[.,]/g, '_');
    const sizeDot = sizeStr.replace(/_/g, '.').replace(/,/g, '.');
    const seatStr = seatRaw && seatRaw.trim().length > 0 ? seatRaw.trim() : '0';
    const candidates: string[] = [
      `/tables/${tableType}_${sizeUnderscore}_${seatStr}seats.png`,
      `/tables/${tableType}_${sizeDot}_${seatStr}seats.png`,
      `/tables/${tableType}_${sizeUnderscore}.png`,
      `/tables/${tableType}_${sizeDot}.png`,
    ];
    setTablePreview(candidates[0] ?? null);
    tablePreviewAltRef.current = candidates.slice(1);
  }, [tableType]);

  const requiresSecondarySize = tableType === 'rectangular';

  useEffect(() => {
    const stops = TABLE_SIZE_STOPS[tableType] || [];
    if (stops.length === 0) {
      setTablePrimarySize('');
      setTableSecondarySize('');
      setTablePreview(null);
      tablePreviewAltRef.current = [];
      return;
    }
    if (tableSizeIndex >= stops.length) {
      setTableSizeIndex(0);
      return;
    }
    const sizeValue = getSelectedSizeValue();
    if (sizeValue != null) {
      const sizeStr = sizeValue.toString();
      if (tablePrimarySize !== sizeStr) {
        setTablePrimarySize(sizeStr);
      }
      if (requiresSecondarySize) {
        const secondaryStr = (sizeValue * 0.6).toFixed(2);
        if (tableSecondarySize !== secondaryStr) {
          setTableSecondarySize(secondaryStr);
        }
      } else if (tableSecondarySize) {
        setTableSecondarySize('');
      }
      generateTablePreview(sizeValue, tableSeats);
    }
  }, [tableType, tableSizeIndex, tableSeats, requiresSecondarySize, getSelectedSizeValue, generateTablePreview, tablePrimarySize, tableSecondarySize]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [showWallMaker, setShowWallMaker] = useState(false);
  const [wallMakerWalls, setWallMakerWalls] = useState<Wall[]>([]);
  const [wallMakerSize, setWallMakerSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const [showWallMakerAdvancedSettings, setShowWallMakerAdvancedSettings] = useState(false);
  const [wallMakerTool, setWallMakerTool] = useState<'wall' | 'pan' | 'door'>('wall');
  const [wallMakerDoors, setWallMakerDoors] = useState<Door[]>([]);
  const [wallMakerConfig, setWallMakerConfig] = useState<WallMakerConfig>({
    gridSize: 20,
    snapToGrid: true,
    snapAngles: [0, 45, 90, 135, 180, 225, 270, 315],
    defaultThickness: 4,
    showMeasurements: true,
    showAngles: true,
    showGrid: true,
  });
  const [wallPresets, setWallPresets] = useState<Array<{ id: string; walls: Wall[]; doors: Door[]; name: string }>>([]);
  const [showWallPresetNameInput, setShowWallPresetNameInput] = useState(false);
  const [wallPresetName, setWallPresetName] = useState('');
  const structureMenuRef = useRef<HTMLDivElement>(null);
  const presetContextMenuRef = useRef<HTMLDivElement>(null);
  const brushSettingsRef = useRef<HTMLDivElement>(null);
  const activeSpace = useMemo(() => availableSpaces.length > 0 ? availableSpaces[availableSpaces.length - 1] : null, [availableSpaces]);
  const hasActiveSpace = Boolean(activeSpace);

  // Load presets from localStorage
  const STORAGE_PRESETS_KEY = 'layout-maker-space-presets';
  const STORAGE_WALL_PRESETS_KEY = 'layout-maker-wall-presets';
  const loadPresets = (): Array<{ id: string; width: number; height: number; name: string }> => {
    try {
      const stored = localStorage.getItem(STORAGE_PRESETS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const loadWallPresets = (): Array<{ id: string; walls: Wall[]; doors: Door[]; name: string }> => {
    try {
      const stored = localStorage.getItem(STORAGE_WALL_PRESETS_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((preset: any) => ({
        id: preset.id,
        walls: preset.walls || [],
        doors: preset.doors || [],
        name: preset.name,
      }));
    } catch {
      return [];
    }
  };

  // Load presets on component mount and when window opens
  useEffect(() => {
    if (openWindow === 'space') {
      setPresets(loadPresets());
      setWallPresets(loadWallPresets());
    }
  }, [openWindow]);

  // Default selected space for table scaling
  useEffect(() => {
    if (availableSpaces.length > 0 && activeSpace) {
      setSelectedSpaceId(prev => {
        if (prev && availableSpaces.some(space => space.id === prev)) {
          return prev;
        }
        return activeSpace.id;
      });
    } else {
      setSelectedSpaceId(null);
    }
  }, [availableSpaces, activeSpace]);

  // Close preset context menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetContextMenuRef.current && !presetContextMenuRef.current.contains(event.target as Node)) {
        setPresetContextMenu(null);
      }
    };

    if (presetContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [presetContextMenu]);

  useEffect(() => {
    setTablePreview(null);
  }, [tableType, tablePrimarySize, tableSecondarySize, selectedSpaceId]);

  useEffect(() => {
    if (!requiresSecondarySize) {
      setTableSecondarySize('');
    }
  }, [requiresSecondarySize]);

  const deletePreset = (presetId: string) => {
    const currentPresets = loadPresets();
    const updatedPresets = currentPresets.filter(p => p.id !== presetId);
    localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(updatedPresets));
    setPresets(updatedPresets);
    setPresetContextMenu(null);
  };

  const savePreset = (width: number, height: number, name: string) => {
    const currentPresets = loadPresets();
    const newPreset = {
      id: Date.now().toString(),
      width,
      height,
      name: name.trim() || `${width}m × ${height}m`,
    };
    const updatedPresets = [...currentPresets, newPreset];
    localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(updatedPresets));
    setPresets(updatedPresets);
  };

  const saveWallPreset = (walls: Wall[], doors: Door[], name: string) => {
    const currentPresets = loadWallPresets();
    const newPreset = {
      id: Date.now().toString(),
      walls: JSON.parse(JSON.stringify(walls)), // Deep copy
      doors: JSON.parse(JSON.stringify(doors || [])),
      name: name.trim() || `Wall Layout ${currentPresets.length + 1}`,
    };
    const updatedPresets = [...currentPresets, newPreset];
    localStorage.setItem(STORAGE_WALL_PRESETS_KEY, JSON.stringify(updatedPresets));
    setWallPresets(updatedPresets);
  };

  const parseMetersValue = (value: string) => {
    const normalized = typeof value === 'string' ? value.replace(',', '.') : '';
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const selectedSpace = useMemo(() => {
    if (!selectedSpaceId) return null;
    return availableSpaces.find(space => space.id === selectedSpaceId) || null;
  }, [availableSpaces, selectedSpaceId]);

  const sizeMeters = useMemo(() => {
    const primaryValue = parseMetersValue(tablePrimarySize);
    if (primaryValue <= 0) return null;

    if (requiresSecondarySize) {
      const secondaryValue = parseMetersValue(tableSecondarySize);
      if (secondaryValue <= 0) return null;
      return { width: primaryValue, height: secondaryValue };
    }

    // Round tables or any single-dimension object
    return { width: primaryValue, height: primaryValue };
  }, [tablePrimarySize, tableSecondarySize, requiresSecondarySize]);

  const computedSizeString = useMemo(() => {
    if (!sizeMeters) return '';
    if (requiresSecondarySize) {
      return `${sizeMeters.width}x${sizeMeters.height}`;
    }
    return `${sizeMeters.width}`;
  }, [sizeMeters, requiresSecondarySize]);

  // If user didn't explicitly choose a space, assume the most-recently-created one on the canvas
  const effectiveSpace = useMemo(() => {
    if (selectedSpace) return selectedSpace;
    return activeSpace;
  }, [selectedSpace, activeSpace]);

  const previewPixels = useMemo(() => {
    if (!sizeMeters || !effectiveSpace) return null;
    const ppm = effectiveSpace.pixelsPerMeter;
    return {
      widthPx: sizeMeters.width * ppm,
      heightPx: sizeMeters.height * ppm,
    };
  }, [sizeMeters, effectiveSpace]);

  const parsedSeats = parseInt(tableSeats, 10);
  // Allow zero seats (0) as valid (some tables may be marked 0 seats)
  const hasSeatCount = Number.isFinite(parsedSeats) && parsedSeats >= 0;
  // Allow Add to Canvas even if toolbar hasn't received the space list yet;
  // GridCanvas will locate the space on the canvas when handling the add.
  const canAddToCanvas = Boolean(sizeMeters && hasSeatCount && tablePreview);

  const selectedSizeValue = getSelectedSizeValue();
  const currentSizeStops = TABLE_SIZE_STOPS[tableType] || [];
  const sliderMaxIndex = currentSizeStops.length > 0 ? currentSizeStops.length - 1 : 0;
  const sliderValue = Math.min(tableSizeIndex, sliderMaxIndex);

  const deleteWallPreset = (presetId: string) => {
    const currentPresets = loadWallPresets();
    const updatedPresets = currentPresets.filter(p => p.id !== presetId);
    localStorage.setItem(STORAGE_WALL_PRESETS_KEY, JSON.stringify(updatedPresets));
    setWallPresets(updatedPresets);
  };

  const handleSizeSliderChange = useCallback((value: number) => {
    const stops = TABLE_SIZE_STOPS[tableType] || [];
    if (stops.length === 0) return;
    const clamped = Math.min(Math.max(value, 0), stops.length - 1);
    setTableSizeIndex(clamped);
  }, [tableType]);

  const tools = [
    { id: 'hand', label: 'Hand', icon: '/icons/hand.png', isImage: true },
    { id: 'brush', label: 'Brush', icon: '/icons/brush.png', isImage: true },
    { id: 'eraser', label: 'Eraser', icon: '/icons/eraser.png', isImage: true },
    // 'shapes' (aka Forms) uses the provided PNG but keeps the same id so functionality remains unchanged
    { id: 'shapes', label: 'Forms', icon: '/icons/forms.png', isImage: true },
    { id: 'text', label: 'Text', icon: '/icons/text.png', isImage: true },
  ];

  const structureOptions = [
    { id: 'space', label: 'Space' },
    { id: 'tables', label: 'Tables' },
    { id: 'bars', label: 'Bars' },
    { id: 'dance-floor', label: 'Dance floor' },
    { id: 'audiovisual', label: 'Audiovisual' },
    { id: 'ilumination', label: 'Ilumination' },
  ];

  // Close structure menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (structureMenuRef.current && !structureMenuRef.current.contains(event.target as Node)) {
        setIsStructureMenuOpen(false);
      }
    };

    if (isStructureMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isStructureMenuOpen]);

  // Close brush settings when clicking outside or when tool changes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brushSettingsRef.current && !brushSettingsRef.current.contains(event.target as Node)) {
        // Check if clicking on the toolbar buttons (they should not close the settings)
        const target = event.target as HTMLElement;
        const toolbar = target.closest('[style*="position: fixed"][style*="left: 20px"]');
        if (!toolbar) {
          setShowBrushSettings(false);
        }
      }
    };

    if (activeTool === 'brush' && showBrushSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeTool, showBrushSettings]);

  // Reset brush settings visibility when switching away from brush tool
  useEffect(() => {
    if (activeTool !== 'brush') {
      setShowBrushSettings(false);
    }
  }, [activeTool]);

  const getButtonBackground = (toolId: string): string => {
    if (suppressHover && toolId === 'brush') return 'transparent';
    const effective = suppressHover ? 'hand' : activeTool;
    const hover = suppressHover ? null : hoveredTool;
    if (effective === toolId) {
      return hover === toolId ? '#b0b0b0' : '#c0c0c0';
    } else {
      return hover === toolId ? '#e5e5e5' : 'transparent';
    }
  };

  const getButtonColor = (toolId: string): string => {
    if (suppressHover && toolId === 'brush') return '#666666';
    const effective = suppressHover ? 'hand' : activeTool;
    return effective === toolId ? '#333333' : '#666666';
  };

  // Clear hover state whenever the active tool changes to avoid stale hover visuals
  useEffect(() => {
    setHoveredTool(null);
  }, [activeTool]);

  const effectiveActiveTool = suppressHover ? 'hand' : activeTool;

  // listen for canvas move events to temporarily disable toolbar hover/highlight
  useEffect(() => {
    const onMoveStart = () => { setDisableHover(true); setHoveredTool(null); };
    const onMoveEnd = () => { setDisableHover(false); };
    const onSelectionChange = (ev: Event) => {
      setHoveredTool(null);
      const detail = (ev as CustomEvent)?.detail;
      const selectedId = detail ? detail.selectedId : null;
      setSuppressHover(Boolean(selectedId));
      if (selectedId) {
        setShowBrushSettings(false);
      }
      // remove focus from any toolbar element to avoid focus highlight
      try {
        const active = document.activeElement as HTMLElement | null;
        if (active) active.blur();
        const brushBtn = document.querySelector('[data-tool-id="brush"]') as HTMLElement | null;
        if (brushBtn) {
          brushBtn.blur();
          brushBtn.style.outline = 'none';
          brushBtn.style.boxShadow = 'none';
        }
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('canvas:move-start', onMoveStart as EventListener);
    window.addEventListener('canvas:move-end', onMoveEnd as EventListener);
    window.addEventListener('canvas:selection-change', onSelectionChange as EventListener);
    return () => {
      window.removeEventListener('canvas:move-start', onMoveStart as EventListener);
      window.removeEventListener('canvas:move-end', onMoveEnd as EventListener);
      window.removeEventListener('canvas:selection-change', onSelectionChange as EventListener);
    };
  }, []);

  const handleStructureClick = () => {
    setIsStructureMenuOpen(!isStructureMenuOpen);
  };

  const handleStructureOptionClick = (optionId: string) => {
    setOpenWindow(optionId);
    setIsStructureMenuOpen(false);
  };

  const handleCloseWindow = () => {
    setOpenWindow(null);
  };

  return (
    <>
        <div
        style={{
          position: 'fixed',
          left: `${padding}px`,
          top: '50%',
          transform: 'translateY(-50%)',
          width: `${toolbarWidth}px`,
          height: `${toolbarHeight}px`,
          background: '#ffffff',
          borderRadius: '30px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 8px',
          zIndex: 10000,
          border: '1px solid #e0e0e0',
          isolation: 'isolate',
          pointerEvents: disableHover ? 'none' : 'auto',
          zoom: 1,
          transformOrigin: 'center left',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {tools.map((tool) => (
          <button
            key={tool.id}
            data-tool-id={tool.id}
            onMouseDown={(e) => {
              if (tool.id === 'brush') {
                try { e.currentTarget.blur(); } catch (err) { /* ignore */ }
              }
            }}
            onClick={() => {
              if (tool.id === 'brush' && effectiveActiveTool === 'brush') {
                // Toggle brush settings when clicking brush tool again
                setShowBrushSettings(prev => !prev);
              } else {
                onToolChange(tool.id);
              }
            }}
            onMouseEnter={() => { if (!disableHover && !suppressHover) setHoveredTool(tool.id); }}
            onMouseLeave={() => { if (!disableHover && !suppressHover) setHoveredTool(null); }}
            style={{
              width: `${buttonSize}px`,
              height: `${buttonSize}px`,
              borderRadius: '12px',
              border: '2px solid transparent',
              background: getButtonBackground(tool.id),
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              transition: 'all 0.18s ease',
              color: getButtonColor(tool.id),
              padding: '6px',
              ...(suppressHover && tool.id === 'brush'
                ? {
                    outline: 'none',
                    boxShadow: 'none',
                    filter: 'grayscale(1)',
                    opacity: 0.65,
                    cursor: 'default',
                  }
                : {}),
            }}
            title={tool.label}
            tabIndex={suppressHover && tool.id === 'brush' ? -1 : 0}
          >
            {tool.isImage ? (
              <img
                src={tool.icon}
                alt={tool.label}
                style={{
                  width: '20px',
                  height: '20px',
                  objectFit: 'contain',
                  filter: suppressHover && tool.id === 'brush'
                    ? 'brightness(0.6)'
                    : ((suppressHover ? 'hand' : activeTool) === tool.id ? 'brightness(0.2)' : 'brightness(0.6)'),
                }}
              />
            ) : (
              tool.icon
            )}
          </button>
        ))}
        
        {/* Structure Button */}
        <button
          onClick={handleStructureClick}
          onMouseEnter={() => setHoveredTool('structure')}
          onMouseLeave={() => setHoveredTool(null)}
          style={{
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            borderRadius: '12px',
            border: '2px solid transparent',
            background: isStructureMenuOpen
              ? '#c0c0c0'
              : hoveredTool === 'structure'
                ? '#e5e5e5'
                : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '400',
            transition: 'all 0.2s ease',
            color: '#333333',
            padding: '0',
          }}
          title="Structure"
        >
          <img src="/icons/plus.png" alt="Structure" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
        </button>
      </div>

      {/* Brush Controls Panel - appears when brush tool is active */}
  {effectiveActiveTool === 'brush' && showBrushSettings && onBrushSizeChange && onBrushColorChange && (
        <div
          ref={brushSettingsRef}
          style={{
            position: 'fixed',
            top: '50%',
            left: `${padding + toolbarWidth + buttonSpacing}px`,
            transform: 'translateY(-50%)',
            width: '64px',
            background: '#ffffff',
            borderRadius: '30px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e0e0e0',
            zIndex: 10001,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            gap: '12px',
          }}
        >
          {/* Brush Size Control - Vertical Slider */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', width: '100%' }}>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
              className="vertical-slider"
              style={{
                width: '120px',
                height: '4px',
                transform: 'rotate(-90deg)',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                background: 'transparent',
                position: 'absolute',
              }}
            />
            <style>{`
              .vertical-slider::-webkit-slider-thumb {
                appearance: none;
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #666666;
                cursor: pointer;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                margin-top: -6px;
              }
              .vertical-slider::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #666666;
                cursor: pointer;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
              }
              .vertical-slider::-webkit-slider-runnable-track {
                width: 100%;
                height: 4px;
                background: #e0e0e0;
                border-radius: 2px;
              }
              .vertical-slider::-moz-range-track {
                width: 100%;
                height: 4px;
                background: #e0e0e0;
                border-radius: 2px;
              }
            `}</style>
          </div>

          {/* Brush Color Control - Color Picker */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px' }}>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => onBrushColorChange(e.target.value)}
              style={{
                width: '44px',
                height: '44px',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                padding: 0,
                margin: 0,
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                overflow: 'hidden',
                background: brushColor,
              }}
            />
            <style>{`
              input[type="color"]::-webkit-color-swatch-wrapper {
                padding: 0;
                border: none;
                border-radius: 50%;
                overflow: hidden;
              }
              input[type="color"]::-webkit-color-swatch {
                border: none;
                border-radius: 50%;
                padding: 0;
                width: 100%;
                height: 100%;
              }
              input[type="color"]::-moz-color-swatch {
                border: none;
                border-radius: 50%;
                padding: 0;
                width: 100%;
                height: 100%;
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Structure Menu Popup */}
      {isStructureMenuOpen && (
        <div
          ref={structureMenuRef}
          style={{
            position: 'fixed',
            left: `${padding + toolbarWidth + 20}px`,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '280px',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e0e0e0',
            padding: '16px',
            zIndex: 10001,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {structureOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleStructureOptionClick(option.id)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                color: '#333333',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Structure Windows Modal - Reusable for all options */}
      {openWindow && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.3)',
              zIndex: 10002,
              pointerEvents: 'auto',
            }}
            onClick={handleCloseWindow}
          />
          
          {/* Window */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '60vw',
              height: '60vh',
              background: 'rgba(255,255,255,0.96)',
              borderRadius: '28px',
              boxShadow: '0 12px 40px rgba(10, 20, 30, 0.15)',
              border: '1px solid rgba(224,224,224,0.9)',
              zIndex: 10003,
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              paddingTop: '64px', // space for floating top bar
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Top Bar */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 64px)',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                background: 'rgba(245,245,245,0.95)',
                backdropFilter: 'blur(6px)',
                borderRadius: '20px',
                border: '1px solid rgba(224,224,224,0.8)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                zIndex: 10005,
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Left area - could hold quick tools in future */}
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => { setShowNewSpaceForm(true); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '14px',
                    background: '#ffffff',
                    border: '1px solid rgba(224,224,224,0.9)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  New Space
                </button>
                <button
                  onClick={handleCloseWindow}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '14px',
                    background: '#000000',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, padding: '28px', overflow: 'auto', background: 'transparent' }}>
              {/* Space Window Content */}
              {openWindow === 'space' && (
                <>
                  {!showNewSpaceForm ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
                      {/* Wall Maker Button */}
                      <div
                        onClick={() => {
                          console.log('Wall Maker button clicked');
                          setShowWallMaker(true);
                          setOpenWindow(null);
                          setTimeout(() => {
                            setWallMakerSize({ width: 800, height: 600 });
                          }, 100);
                        }}
                        style={{
                          width: '120px',
                          height: '120px',
                          background: '#ffffff',
                          borderRadius: '16px',
                          border: '2px solid #e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f5f5f5';
                          e.currentTarget.style.borderColor = '#3498db';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = '#e0e0e0';
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#333333',
                            textAlign: 'center',
                            fontFamily: 'inherit',
                          }}
                        >
                          Wall Maker
                        </span>
                      </div>

                      {/* New Space Button */}
                      <div
                        style={{
                          width: '120px',
                          height: '120px',
                          background: '#ffffff',
                          borderRadius: '16px',
                          border: '2px solid #e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f5f5f5';
                          e.currentTarget.style.borderColor = '#3498db';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = '#e0e0e0';
                        }}
                        onClick={() => {
                          setShowNewSpaceForm(true);
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#333333',
                            textAlign: 'center',
                            fontFamily: 'inherit',
                          }}
                        >
                          {hasActiveSpace ? 'Replace Space' : 'New Space'}
                        </span>
                      </div>
                      
                      {activeSpace && (
                        <div
                          style={{
                            flex: '1 1 240px',
                            minWidth: '200px',
                            background: '#ffffff',
                            borderRadius: '20px',
                            border: '1px solid rgba(224,224,224,0.9)',
                            padding: '16px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Current Space
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: '#111111', marginTop: '6px' }}>
                            {activeSpace.widthMeters}m × {activeSpace.heightMeters}m
                          </div>
                          <div style={{ fontSize: '12px', color: '#888888', marginTop: '8px', lineHeight: '1.4' }}>
                            Adding another space will automatically replace this one and remove tables tied to it.
                          </div>
                        </div>
                      )}
                      
                      {/* Wall Presets Section */}
                      {wallPresets.length > 0 && (
                        <>
                          <div style={{ 
                            width: '100%', 
                            marginTop: '20px', 
                            marginBottom: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333333',
                          }}>
                            Wall Presets
                          </div>
                          {wallPresets.map((preset) => (
                            <div
                              key={preset.id}
                              style={{
                                width: '120px',
                                height: '120px',
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '2px solid #e0e0e0',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                position: 'relative',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f5f5f5';
                                e.currentTarget.style.borderColor = '#27ae60';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.borderColor = '#e0e0e0';
                              }}
                              onClick={() => {
                                setWallMakerWalls(JSON.parse(JSON.stringify(preset.walls)));
                                setWallMakerDoors(JSON.parse(JSON.stringify(preset.doors || [])));
                                setShowWallMaker(true);
                                setOpenWindow(null);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setPresetContextMenu({
                                  presetId: preset.id,
                                  x: e.clientX,
                                  y: e.clientY,
                                  type: 'wall',
                                });
                              }}
                            >
                              <div style={{
                                fontSize: '11px',
                                fontWeight: '500',
                                color: '#333333',
                                textAlign: 'center',
                                padding: '8px',
                                wordBreak: 'break-word',
                              }}>
                                {preset.name}
                              </div>
                              <div style={{ fontSize: '10px', color: '#666666', marginTop: '4px' }}>
                                {preset.walls.length} wall{preset.walls.length !== 1 ? 's' : ''}
                                {preset.doors?.length
                                  ? ` · ${preset.doors.length} door${preset.doors.length !== 1 ? 's' : ''}`
                                  : ''}
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Space Preset Buttons */}
                      {presets.length > 0 && (
                        <>
                          <div style={{ 
                            width: '100%', 
                            marginTop: wallPresets.length > 0 ? '20px' : '0',
                            marginBottom: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333333',
                          }}>
                            Space Presets
                          </div>
                        </>
                      )}
                      {presets.map((preset) => (
                        <div
                          key={preset.id}
                          style={{
                            width: '120px',
                            height: '120px',
                            background: '#ffffff',
                            borderRadius: '16px',
                            border: '2px solid #e0e0e0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            padding: '12px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                            e.currentTarget.style.borderColor = '#3498db';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.borderColor = '#e0e0e0';
                          }}
                          onClick={() => {
                            if (onAddSpace) {
                              onAddSpace(preset.width, preset.height);
                              setOpenWindow(null);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPresetContextMenu({
                              presetId: preset.id,
                              x: e.clientX,
                              y: e.clientY,
                              type: 'space',
                            });
                          }}
                        >
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: '500',
                              color: '#333333',
                              textAlign: 'center',
                              fontFamily: 'inherit',
                              wordBreak: 'break-word',
                            }}
                          >
                            {preset.name}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '400',
                              color: '#666666',
                              textAlign: 'center',
                              fontFamily: 'inherit',
                              marginTop: '4px',
                            }}
                          >
                            {preset.width}m × {preset.height}m
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full max-w-md mx-auto bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-xl">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <h3 className="m-0 text-xl font-semibold text-gray-800 tracking-tight">
                          Create New Space
                        </h3>
                      </div>
                      {activeSpace && (
                        <div className="mb-5 p-4 rounded-xl border border-yellow-200 bg-yellow-50 text-sm text-yellow-800 leading-snug">
                          Current space: <strong>{activeSpace.widthMeters}m × {activeSpace.heightMeters}m</strong>. Creating a new space will replace it and remove tables linked to it.
                        </div>
                      )}
                      <div className="flex flex-col gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Width (meters)
                          </label>
                          <input
                            type="number"
                            value={spaceWidth}
                            onChange={(e) => setSpaceWidth(e.target.value)}
                            placeholder="e.g., 5"
                            min="0.1"
                            step="0.1"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-gray-50 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Height (meters)
                          </label>
                          <input
                            type="number"
                            value={spaceHeight}
                            onChange={(e) => setSpaceHeight(e.target.value)}
                            placeholder="e.g., 4"
                            min="0.1"
                            step="0.1"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-gray-50 focus:bg-white"
                          />
                        </div>
                        <div className="flex flex-col gap-3 mt-2">
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                const width = parseFloat(spaceWidth);
                                const height = parseFloat(spaceHeight);
                                if (width > 0 && height > 0 && onAddSpace) {
                                  onAddSpace(width, height);
                                  setSpaceWidth('');
                                  setSpaceHeight('');
                                  setShowNewSpaceForm(false);
                                  setOpenWindow(null);
                                }
                              }}
                              disabled={!spaceWidth || !spaceHeight || parseFloat(spaceWidth) <= 0 || parseFloat(spaceHeight) <= 0}
                              className="flex-1 px-4 py-3 rounded-xl border-none text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:scale-95 text-white shadow-lg hover:shadow-xl disabled:from-gray-300 disabled:to-gray-400 disabled:hover:from-gray-300 disabled:hover:to-gray-400"
                            >
                              Create
                            </button>
                            <button
                              onClick={() => {
                                setShowNewSpaceForm(false);
                                setSpaceWidth('');
                                setSpaceHeight('');
                              }}
                              className="px-4 py-3 rounded-xl border-2 border-gray-200 bg-transparent hover:bg-gray-50 active:scale-95 text-gray-700 text-sm font-semibold cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Cancel
                            </button>
                          </div>
                          {!showPresetNameInput ? (
                            <button
                              onClick={() => {
                                const width = parseFloat(spaceWidth);
                                const height = parseFloat(spaceHeight);
                                if (width > 0 && height > 0) {
                                  setShowPresetNameInput(true);
                                  setPresetName(`${width}m × ${height}m`);
                                }
                              }}
                              disabled={!spaceWidth || !spaceHeight || parseFloat(spaceWidth) <= 0 || parseFloat(spaceHeight) <= 0}
                              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-purple-400 active:scale-95 text-gray-700 hover:text-purple-600 text-sm font-semibold cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-700"
                            >
                              Save as preset
                            </button>
                          ) : (
                            <div className="flex flex-col gap-3 transition-all duration-200">
                              <input
                                type="text"
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                placeholder="Enter preset name"
                                autoFocus
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none transition-all duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-gray-50 focus:bg-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const width = parseFloat(spaceWidth);
                                    const height = parseFloat(spaceHeight);
                                    if (width > 0 && height > 0) {
                                      savePreset(width, height, presetName);
                                      setShowPresetNameInput(false);
                                      setPresetName('');
                                    }
                                  } else if (e.key === 'Escape') {
                                    setShowPresetNameInput(false);
                                    setPresetName('');
                                  }
                                }}
                              />
                              <div className="flex gap-3">
                                <button
                                  onClick={() => {
                                    const width = parseFloat(spaceWidth);
                                    const height = parseFloat(spaceHeight);
                                    if (width > 0 && height > 0) {
                                      savePreset(width, height, presetName);
                                      setShowPresetNameInput(false);
                                      setPresetName('');
                                    }
                                  }}
                                  className="flex-1 px-4 py-3 rounded-xl border-none text-sm font-semibold cursor-pointer transition-all duration-200 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 active:scale-95 text-white shadow-lg hover:shadow-xl"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setShowPresetNameInput(false);
                                    setPresetName('');
                                  }}
                                  className="px-4 py-3 rounded-xl border-2 border-gray-200 bg-transparent hover:bg-gray-50 active:scale-95 text-gray-700 text-sm font-semibold cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Tables Window Content */}
              {openWindow === 'tables' && (
                <div
                  style={{
                    width: '100%',
                    maxWidth: '860px',
                    display: 'flex',
                    gap: '28px',
                    alignItems: 'stretch',
                  }}
                >
                  {/* Table type cards */}
                  <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {TABLE_VARIANTS.map((variant) => {
                      const isActive = tableType === variant.id;
                      return (
                        <button
                          key={variant.id}
                          onClick={() => {
                            if (tableType !== variant.id) {
                              setTablePreview(null);
                              setTableType(variant.id);
                              setTableSizeIndex(0);
                            }
                          }}
                          style={{
                            borderRadius: '22px',
                            padding: '18px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: isActive ? '#111111' : 'rgba(255,255,255,0.85)',
                            color: isActive ? '#ffffff' : '#333333',
                            boxShadow: isActive ? '0 20px 35px rgba(0,0,0,0.25)' : '0 10px 25px rgba(0,0,0,0.08)',
                            border: isActive ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(0,0,0,0.05)',
                          }}
                        >
                          <div style={{ fontSize: '15px', fontWeight: 600 }}>{variant.label}</div>
                          <div style={{ fontSize: '12px', marginTop: '6px', opacity: isActive ? 0.85 : 0.6 }}>
                            {variant.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Main content panel */}
                  <div
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.96)',
                      borderRadius: '32px',
                      border: '1px solid rgba(255,255,255,0.6)',
                      boxShadow: '0 30px 60px rgba(15,15,15,0.1)',
                      padding: '28px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Current diameter
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: '#111111' }}>
                          {getSelectedSizeValue() ? `${getSelectedSizeValue()}m` : '—'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#999999' }}>Available sizes</div>
                        <div style={{ fontSize: '13px', color: '#555555' }}>
                          {TABLE_SIZE_STOPS[tableType].map((size) => `${size}m`).join(' • ')}
                        </div>
                      </div>
                    </div>

                    {/* Slider */}
                    <div style={{ padding: '12px 4px 0 4px' }}>
                      <input
                        type="range"
                        min={0}
                        max={(TABLE_SIZE_STOPS[tableType] || []).length > 0 ? TABLE_SIZE_STOPS[tableType].length - 1 : 0}
                        step={1}
                        value={Math.min(tableSizeIndex, Math.max((TABLE_SIZE_STOPS[tableType] || []).length - 1, 0))}
                        onChange={(e) => handleSizeSliderChange(Number(e.target.value))}
                        style={{
                          width: '100%',
                          accentColor: '#111111',
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                        {(TABLE_SIZE_STOPS[tableType] || []).map((stop, idx) => (
                          <span
                            key={`${tableType}-stop-${stop}`}
                            style={{
                              fontSize: '12px',
                              color: idx === tableSizeIndex ? '#111111' : '#888888',
                              fontWeight: idx === tableSizeIndex ? 700 : 500,
                              transition: 'color 0.15s ease',
                            }}
                          >
                            {stop}m
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    <div
                      style={{
                        borderRadius: '26px',
                        border: '1px solid rgba(0,0,0,0.08)',
                        padding: '20px',
                        background: 'linear-gradient(135deg, #f8f8f8 0%, #ffffff 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        minHeight: '240px',
                      }}
                    >
                      {tablePreview ? (
                        <img
                          src={tablePreview || undefined}
                          alt="Table preview"
                          onLoad={(ev) => {
                            const imgEl = ev.currentTarget as HTMLImageElement;
                            if (tablePreview !== imgEl.src) {
                              setTablePreview(imgEl.src);
                            }
                          }}
                          onError={(e) => {
                            const imgEl = e.currentTarget as HTMLImageElement;
                            const alts = tablePreviewAltRef.current || [];
                            if (alts.length > 0) {
                              const next = alts.shift()!;
                              tablePreviewAltRef.current = alts;
                              imgEl.src = next;
                              setTablePreview(next);
                              return;
                            }
                            imgEl.style.display = 'none';
                            const errorDiv = document.createElement('div');
                            const tried = [tablePreview, ...(tablePreviewAltRef.current || [])].filter(Boolean).join(', ');
                            errorDiv.textContent = `Image not found. Tried: ${tried}`;
                            errorDiv.style.color = '#e74c3c';
                            errorDiv.style.fontSize = '13px';
                            errorDiv.style.fontFamily = 'inherit';
                            e.currentTarget.parentElement?.appendChild(errorDiv);
                          }}
                          style={{ maxWidth: '280px', maxHeight: '220px', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#999999', fontSize: '13px' }}>
                          Slide to choose a diameter and we will load the table preview automatically.
                        </div>
                      )}
                      {previewPixels && (
                        <div style={{ fontSize: '12px', color: '#777777' }}>
                          Render size: {previewPixels.widthPx.toFixed(1)}px × {previewPixels.heightPx.toFixed(1)}px
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          flex: '1 1 220px',
                          borderRadius: '20px',
                          border: '1px solid rgba(0,0,0,0.06)',
                          padding: '16px',
                          background: '#ffffff',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#666666', marginBottom: '6px' }}>
                          Target Space
                        </div>
                        {availableSpaces.length > 0 ? (
                          <select
                            value={selectedSpaceId || ''}
                            onChange={(e) => setSelectedSpaceId(e.target.value || null)}
                            style={{
                              width: '100%',
                              borderRadius: '12px',
                              border: '1px solid rgba(0,0,0,0.1)',
                              padding: '10px',
                              fontSize: '13px',
                              fontFamily: 'inherit',
                              background: '#f8f8f8',
                            }}
                          >
                            {availableSpaces.map(space => (
                              <option key={space.id} value={space.id}>
                                {space.label} ({space.widthMeters}m × {space.heightMeters}m)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#999999' }}>
                            Create a space first to scale tables accurately.
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          flex: '1 1 140px',
                          borderRadius: '20px',
                          border: '1px solid rgba(0,0,0,0.06)',
                          padding: '16px',
                          background: '#ffffff',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                        }}
                      >
                        <label
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#666666',
                            marginBottom: '6px',
                          }}
                        >
                          Number of seats
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tableSeats}
                          onChange={(e) => setTableSeats(e.target.value)}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '12px',
                            border: '1px solid rgba(0,0,0,0.12)',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                          }}
                        />
                      </div>
                    </div>

                    {addStatus && (
                      <div style={{ fontSize: '12px', color: addStatus === 'Placed' ? '#1a7f37' : '#666666' }}>{addStatus}</div>
                    )}

                    <button
                      onClick={() => {
                        if (canAddToCanvas && tablePreview && onAddTable && computedSizeString) {
                          const lastSpace = availableSpaces.length ? availableSpaces[availableSpaces.length - 1] : undefined;
                          const effectiveSpaceId = selectedSpaceId || (lastSpace ? lastSpace.id : undefined);
                          setAddStatus('Placing...');
                          try {
                            onAddTable(
                              tableType,
                              computedSizeString,
                              parseInt(tableSeats || '0', 10),
                              tablePreview,
                              effectiveSpaceId
                            );
                            setAddStatus('Placed');
                            setTimeout(() => setAddStatus(null), 1500);
                          } catch (err: any) {
                            console.error('Add to canvas failed:', err);
                            setAddStatus(`Failed: ${err?.message || String(err)}`);
                          }
                        }
                      }}
                      disabled={!canAddToCanvas}
                      style={{
                        width: '100%',
                        padding: '14px 18px',
                        borderRadius: '16px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        background: canAddToCanvas ? '#111111' : '#d9d9d9',
                        color: canAddToCanvas ? '#ffffff' : '#8f8f8f',
                        cursor: canAddToCanvas ? 'pointer' : 'not-allowed',
                        boxShadow: canAddToCanvas ? '0 20px 40px rgba(0,0,0,0.2)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Add table to canvas
                    </button>
                  </div>
                </div>
              )}

              {/* Other windows content */}
              {openWindow !== 'space' && openWindow !== 'tables' && (
                <p style={{ color: '#666666', margin: 0 }}>
                  {structureOptions.find(opt => opt.id === openWindow)?.label || 'Structure'} options will be added here...
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Preset Context Menu */}
      {presetContextMenu && (
        <div
          ref={presetContextMenuRef}
          style={{
            position: 'fixed',
            top: `${presetContextMenu.y}px`,
            left: `${presetContextMenu.x}px`,
            background: '#ffffff',
            borderRadius: '12px',
            border: '2px solid #e0e0e0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 10000,
            minWidth: '150px',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (presetContextMenu.type === 'wall') {
                deleteWallPreset(presetContextMenu.presetId);
              } else {
                deletePreset(presetContextMenu.presetId);
              }
              setPresetContextMenu(null);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: '#e74c3c',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Delete Preset
          </button>
        </div>
          )}

      {/* Wall Maker Window */}
      {showWallMaker && (
        <>
          {console.log('Rendering Wall Maker window, showWallMaker:', showWallMaker)}
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10004,
              pointerEvents: 'auto',
            }}
            onClick={() => {
              console.log('Backdrop clicked, closing Wall Maker');
              setShowWallMaker(false);
            }}
          />
          
          {/* Window */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '75vw',
              height: '75vh',
              minWidth: '800px',
              minHeight: '600px',
              background: 'transparent',
              borderRadius: '30px',
              boxShadow: 'none',
              border: 'none',
              zIndex: 10005,
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              paddingTop: '20px',
            }}
            onClick={(e) => {
              console.log('Window clicked');
              e.stopPropagation();
            }}
          >
            {/* Top Bar - Floating Slightly Above Window */}
            <div
              style={{
                width: 'calc(100% - 32px)',
                marginTop: '0',
                marginLeft: 'auto',
                marginRight: 'auto',
                marginBottom: '5px',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                background: 'rgba(245, 245, 245, 0.95)',
                backdropFilter: 'blur(8px)',
                borderRadius: '30px',
                border: '1px solid rgba(224, 224, 224, 0.8)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                flexShrink: 0,
              }}
            >
              {/* Left side - Tools */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setWallMakerTool('wall')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '14px',
                    background: wallMakerTool === 'wall' ? '#000000' : 'transparent',
                    color: wallMakerTool === 'wall' ? '#ffffff' : '#666666',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    border: wallMakerTool === 'wall' ? 'none' : '1px solid #e0e0e0',
                  }}
                  onMouseEnter={(e) => {
                    if (wallMakerTool !== 'wall') {
                      e.currentTarget.style.background = '#f0f0f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (wallMakerTool !== 'wall') {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  Wall
                </button>
                <button
                  onClick={() => setWallMakerTool('door')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '14px',
                    background: wallMakerTool === 'door' ? '#000000' : 'transparent',
                    color: wallMakerTool === 'door' ? '#ffffff' : '#666666',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    border: wallMakerTool === 'door' ? 'none' : '1px solid #e0e0e0',
                  }}
                  onMouseEnter={(e) => {
                    if (wallMakerTool !== 'door') {
                      e.currentTarget.style.background = '#f0f0f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (wallMakerTool !== 'door') {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  Door
                </button>
                <button
                  onClick={() => setWallMakerTool('pan')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '14px',
                    background: wallMakerTool === 'pan' ? '#000000' : 'transparent',
                    color: wallMakerTool === 'pan' ? '#ffffff' : '#666666',
                    cursor: wallMakerTool === 'pan' ? 'grab' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    border: wallMakerTool === 'pan' ? 'none' : '1px solid #e0e0e0',
                  }}
                  onMouseEnter={(e) => {
                    if (wallMakerTool !== 'pan') {
                      e.currentTarget.style.background = '#f0f0f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (wallMakerTool !== 'pan') {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  Pan
                </button>
              </div>

              {/* Right side - Action Buttons */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {onAddWalls && (
                <button
                  onClick={() => {
                    if (wallMakerWalls.length > 0 && onAddWalls) {
                      onAddWalls(wallMakerWalls, wallMakerDoors);
                      setShowWallMaker(false);
                      setWallMakerWalls([]);
                      setWallMakerDoors([]);
                    }
                  }}
                  disabled={wallMakerWalls.length === 0}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    borderRadius: '14px',
                    background: wallMakerWalls.length === 0 ? '#e5e5e5' : '#000000',
                    color: wallMakerWalls.length === 0 ? '#999999' : '#ffffff',
                    cursor: wallMakerWalls.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (wallMakerWalls.length > 0) {
                      e.currentTarget.style.background = '#333333';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (wallMakerWalls.length > 0) {
                      e.currentTarget.style.background = '#000000';
                    }
                  }}
                >
                  Add to Canvas
                </button>
              )}

              {/* Save as Preset Button */}
              {showWallPresetNameInput ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={wallPresetName}
                    onChange={(e) => setWallPresetName(e.target.value)}
                    placeholder="Preset name..."
                    autoFocus
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #ccc',
                      borderRadius: '12px',
                      fontSize: '12px',
                      width: '150px',
                      outline: 'none',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && wallPresetName.trim()) {
                        saveWallPreset(wallMakerWalls, wallMakerDoors, wallPresetName.trim());
                        setShowWallPresetNameInput(false);
                        setWallPresetName('');
                      } else if (e.key === 'Escape') {
                        setShowWallPresetNameInput(false);
                        setWallPresetName('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (wallPresetName.trim()) {
                        saveWallPreset(wallMakerWalls, wallMakerDoors, wallPresetName.trim());
                        saveWallPreset(wallMakerWalls, wallMakerDoors, wallPresetName.trim());
                        setShowWallPresetNameInput(false);
                        setWallPresetName('');
                      }
                    }}
                    disabled={!wallPresetName.trim()}
                    style={{
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '12px',
                      background: wallPresetName.trim() ? '#000000' : '#e5e5e5',
                      color: wallPresetName.trim() ? '#ffffff' : '#999999',
                      cursor: wallPresetName.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowWallPresetNameInput(false);
                      setWallPresetName('');
                    }}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      background: 'transparent',
                      color: '#666666',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (wallMakerWalls.length > 0) {
                      setShowWallPresetNameInput(true);
                    }
                  }}
                  disabled={wallMakerWalls.length === 0}
                    style={{
                      padding: '6px 14px',
                      border: 'none',
                      borderRadius: '14px',
                      background: wallMakerWalls.length === 0 ? '#e5e5e5' : '#000000',
                    color: wallMakerWalls.length === 0 ? '#999999' : '#ffffff',
                    cursor: wallMakerWalls.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (wallMakerWalls.length > 0) {
                      e.currentTarget.style.background = '#333333';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (wallMakerWalls.length > 0) {
                      e.currentTarget.style.background = '#000000';
                    }
                  }}
                >
                  Save as Preset
                </button>
              )}

              {/* Advanced Settings Button */}
              <button
                onClick={() => setShowWallMakerAdvancedSettings(!showWallMakerAdvancedSettings)}
                style={{
                  padding: '6px 14px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '14px',
                  background: showWallMakerAdvancedSettings ? '#e8f4f8' : 'transparent',
                  color: '#666666',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = showWallMakerAdvancedSettings ? '#e8f4f8' : 'transparent';
                }}
              >
                Advanced Settings {showWallMakerAdvancedSettings ? '▼' : '▶'}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setShowWallMaker(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  background: '#e5e5e5',
                  color: '#666666',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#d0d0d0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#e5e5e5';
                }}
              >
                ×
              </button>
              </div>
            </div>

            {/* Advanced Settings Panel */}
            {showWallMakerAdvancedSettings && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '16px 24px',
                  borderBottom: '1px solid #e0e0e0',
                  background: '#f9f9f9',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  fontSize: '12px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={wallMakerConfig.snapToGrid}
                    onChange={(e) => setWallMakerConfig({ ...wallMakerConfig, snapToGrid: e.target.checked })}
                  />
                  Snap to Grid
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={wallMakerConfig.showGrid}
                    onChange={(e) => setWallMakerConfig({ ...wallMakerConfig, showGrid: e.target.checked })}
                  />
                  Show Grid
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={wallMakerConfig.showMeasurements}
                    onChange={(e) => setWallMakerConfig({ ...wallMakerConfig, showMeasurements: e.target.checked })}
                  />
                  Measurements
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  Grid Size (m):
                  <input
                    type="number"
                    value={(wallMakerConfig.gridSize / 100).toFixed(2)}
                    onChange={(e) => {
                      const sizeMeters = parseFloat(e.target.value);
                      if (!isNaN(sizeMeters) && sizeMeters > 0) {
                        setWallMakerConfig({ ...wallMakerConfig, gridSize: sizeMeters * 100 });
                      }
                    }}
                    step="0.1"
                    style={{ width: '60px', padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: '6px', outline: 'none' }}
                    min="0.05"
                    max="1"
                  />
                </label>
              </div>
            )}

            {/* Wall Maker Canvas */}
            <div 
              ref={(el) => {
                if (el && showWallMaker) {
                  const updateSize = () => {
                    const rect = el.getBoundingClientRect();
                    const newWidth = Math.max(800, rect.width - 80);
                    const newHeight = Math.max(600, rect.height - 200);
                    console.log('Wall Maker container size:', { 
                      containerWidth: rect.width, 
                      containerHeight: rect.height, 
                      newWidth, 
                      newHeight 
                    });
                    if (newWidth > 0 && newHeight > 0) {
                      setWallMakerSize({ width: newWidth, height: newHeight });
                    }
                  };
                  // Multiple attempts to get size
                  setTimeout(updateSize, 0);
                  setTimeout(updateSize, 100);
                  requestAnimationFrame(updateSize);
                  window.addEventListener('resize', updateSize);
                  return () => window.removeEventListener('resize', updateSize);
                }
              }}
              style={{ 
                flex: 1, 
                padding: '0',
                overflow: 'hidden',
                position: 'relative', 
                minHeight: '600px',
                background: '#c0c0c0',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '30px',
                marginTop: '5px'
              }}
            >
              <WallMaker
                width={wallMakerSize.width}
                height={wallMakerSize.height}
                config={wallMakerConfig}
                walls={wallMakerWalls}
                onWallsChange={setWallMakerWalls}
                onClose={() => setShowWallMaker(false)}
                activeTool={wallMakerTool}
                doors={wallMakerDoors}
                onDoorsChange={setWallMakerDoors}
              />
            </div>
          </div>
        </>
      )}
        </>
      );
    };
    
    export default Toolbar;
