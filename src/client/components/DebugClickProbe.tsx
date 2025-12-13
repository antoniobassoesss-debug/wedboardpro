import React, { useEffect } from 'react';

export const DebugClickProbe: React.FC = () => {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      try {
        // eslint-disable-next-line no-console
        console.log('[GlobalCapture] click', {
          target: (e.target as HTMLElement)?.outerHTML?.slice?.(0, 200),
          clientX: e.clientX,
          clientY: e.clientY,
          elementAtPoint: document.elementFromPoint(e.clientX, e.clientY)?.outerHTML?.slice?.(0, 200),
        });
      } catch (err) {
        // ignore
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  return (
    <button
      onClick={() => {
        // eslint-disable-next-line no-alert
        alert('Debug probe clicked');
      }}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 99999,
        background: '#0f172a',
        color: 'white',
        borderRadius: 999,
        padding: '10px 14px',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      Debug Click Probe
    </button>
  );
};


