import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';

interface AvatarCropEditorProps {
  imageSrc: string;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
}

/**
 * Avatar Crop Editor - Interactive crop UI with zoom slider
 * Uses react-easy-crop for touch-friendly cropping
 */
export function AvatarCropEditor({ imageSrc, onCropComplete }: AvatarCropEditorProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  return (
    <div style={{ position: 'relative', width: '100%', height: 400 }}>
      {/* Cropper Component */}
      <Cropper
        image={imageSrc}
        crop={crop}
        zoom={zoom}
        aspect={1} // Square aspect ratio (1:1)
        cropShape="round" // Circular crop for profile pictures
        showGrid={false} // Hide grid overlay for cleaner UI
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={onCropComplete}
        style={{
          containerStyle: {
            borderRadius: '16px',
            background: '#000',
          },
        }}
      />

      {/* Zoom Slider - Overlaid at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        maxWidth: 300,
        background: 'rgba(0,0,0,0.7)',
        padding: 12,
        borderRadius: 999,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}>
        <span style={{ color: '#fff', fontSize: 14, userSelect: 'none' }}>−</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          aria-label="Zoom slider"
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            outline: 'none',
            background: 'rgba(255,255,255,0.3)',
          }}
        />
        <span style={{ color: '#fff', fontSize: 14, userSelect: 'none' }}>+</span>
      </div>
    </div>
  );
}
