/**
 * ElectricalDashboard - NASA-style control panel showing all circuits status.
 * Grid of circuit cards with real-time updates, click-to-zoom, and PDF export.
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Download, RefreshCw, AlertTriangle, CheckCircle, XCircle, Radio, Activity } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/card.js';
import { SkeletonCard } from './ui/skeleton.js';
import { Badge } from './ui/badge.js';
import { Progress } from './ui/progress.js';
import { useCircuits, type CircuitSummary } from '../hooks/useCircuits.js';
import type { PowerPoint } from '../types/powerPoint.js';

// ============================================================================
// Types
// ============================================================================

interface ElectricalDashboardProps {
  electricalProjectId: string;
  powerPoints: PowerPoint[];
  onZoomToPoints: (points: { x: number; y: number }[]) => void;
  onClose?: () => void;
}

// ============================================================================
// Status Helpers
// ============================================================================

function getStatusFromPercent(percent: number): 'ok' | 'warning' | 'overload' {
  if (percent >= 95) return 'overload';
  if (percent >= 80) return 'warning';
  return 'ok';
}

function getStatusColor(status: 'ok' | 'warning' | 'overload'): string {
  switch (status) {
    case 'ok': return '#10b981';
    case 'warning': return '#f59e0b';
    case 'overload': return '#ef4444';
  }
}

function getStatusGlow(status: 'ok' | 'warning' | 'overload'): string {
  switch (status) {
    case 'ok': return '0 0 20px rgba(16,185,129,0.4)';
    case 'warning': return '0 0 20px rgba(245,158,11,0.4)';
    case 'overload': return '0 0 20px rgba(239,68,68,0.5)';
  }
}

// ============================================================================
// Circuit Card Component
// ============================================================================

interface CircuitCardProps {
  circuit: CircuitSummary;
  pointCount: number;
  onClick: () => void;
  index: number;
}

const CircuitCard: React.FC<CircuitCardProps> = ({ circuit, pointCount, onClick, index }) => {
  const displayStatus = getStatusFromPercent(circuit.load_percent);
  const statusColor = getStatusColor(displayStatus);
  const progressVariant = displayStatus === 'ok' ? 'success' : displayStatus === 'warning' ? 'warning' : 'destructive';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Card
        variant="dark"
        hoverable
        onClick={onClick}
        style={{
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Status Indicator Light */}
        <motion.div
          animate={{
            boxShadow: [getStatusGlow(displayStatus), getStatusGlow(displayStatus).replace('0.4', '0.2'), getStatusGlow(displayStatus)],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: statusColor,
            border: '2px solid #1a1a2e',
          }}
        />

        <CardHeader style={{ paddingBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Zap size={16} color={statusColor} />
                <span style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'white',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {circuit.name}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                {circuit.standard === 'EU_PT' ? '🇪🇺' : '🇺🇸'} {circuit.breaker_amps}A • {circuit.voltage}V
              </div>
            </div>
            <Badge variant={displayStatus === 'ok' ? 'success' : displayStatus === 'warning' ? 'warning' : 'destructive'}>
              {displayStatus === 'ok' ? 'OK' : displayStatus === 'warning' ? 'WARN' : 'CRIT'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Load Bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Power Load
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: statusColor }}>
                {circuit.load_percent}%
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <Progress value={Math.min(100, circuit.load_percent)} variant={progressVariant} height={6} />
              {/* Grid marks */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                pointerEvents: 'none',
              }}>
                {[20, 40, 60, 80].map((mark) => (
                  <div
                    key={mark}
                    style={{
                      position: 'absolute',
                      left: `${mark}%`,
                      width: '1px',
                      height: '100%',
                      background: 'rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                {circuit.total_watts.toLocaleString()}W
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                {circuit.capacity_watts.toLocaleString()}W
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                OUTLETS
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>
                {circuit.total_outlets}/{circuit.max_outlets}
              </div>
            </div>
            <div style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                POINTS
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>
                {pointCount}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

const ElectricalDashboard: React.FC<ElectricalDashboardProps> = ({
  electricalProjectId,
  powerPoints,
  onZoomToPoints,
  onClose,
}) => {
  const { circuits, isLoading, error, refresh } = useCircuits({ projectId: electricalProjectId });
  const [isExporting, setIsExporting] = useState(false);

  // Compute point counts per circuit
  const pointCountByCircuit = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const point of powerPoints) {
      if (point.circuitId) {
        counts[point.circuitId] = (counts[point.circuitId] || 0) + 1;
      }
    }
    return counts;
  }, [powerPoints]);

  // Summary stats
  const stats = useMemo(() => {
    const total = circuits.length;
    const ok = circuits.filter(c => getStatusFromPercent(c.load_percent) === 'ok').length;
    const warning = circuits.filter(c => getStatusFromPercent(c.load_percent) === 'warning').length;
    const critical = circuits.filter(c => getStatusFromPercent(c.load_percent) === 'overload').length;
    const totalWatts = circuits.reduce((sum, c) => sum + c.total_watts, 0);
    const totalCapacity = circuits.reduce((sum, c) => sum + c.capacity_watts, 0);
    return { total, ok, warning, critical, totalWatts, totalCapacity };
  }, [circuits]);

  // Handle card click - zoom to points
  const handleCircuitClick = (circuitId: string) => {
    const matchingPoints = powerPoints.filter(p => p.circuitId === circuitId);
    if (matchingPoints.length > 0) {
      onZoomToPoints(matchingPoints.map(p => ({ x: p.x, y: p.y })));
    }
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const storedSession = localStorage.getItem('wedboarpro_session');
      const session = storedSession ? JSON.parse(storedSession) : null;
      
      const response = await fetch(`/api/electrical/projects/${electricalProjectId}/export.pdf`, {
        headers: {
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `electrical-summary-${electricalProjectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('PDF export error:', err);
      alert('Failed to export PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60000,
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
        overflow: 'auto',
      }}
    >
      {/* Scanlines Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(245,158,11,0.3)',
                }}
              >
                <Activity size={24} color="white" />
              </motion.div>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>
                  Electrical Control Panel
                </h1>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  Real-time circuit monitoring • {circuits.length} circuits active
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <motion.button
                onClick={refresh}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <RefreshCw size={14} />
                Refresh
              </motion.button>
              <motion.button
                onClick={handleExportPDF}
                disabled={isExporting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isExporting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isExporting ? 0.7 : 1,
                }}
              >
                <Download size={14} />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </motion.button>
              {onClose && (
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </motion.button>
              )}
            </div>
          </div>

          {/* Summary Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Total Circuits
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{stats.total}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>
                <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px', color: '#10b981' }} />
                OK
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{stats.ok}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px', color: '#f59e0b' }} />
                Warning
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>{stats.warning}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>
                <XCircle size={12} style={{ display: 'inline', marginRight: '4px', color: '#ef4444' }} />
                Critical
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{stats.critical}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Total Load
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>
                {(stats.totalWatts / 1000).toFixed(1)}kW
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Capacity
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>
                {(stats.totalCapacity / 1000).toFixed(1)}kW
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && circuits.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 24px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.15)',
          }}>
            <Radio size={48} color="rgba(255,255,255,0.3)" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'white' }}>
              No Circuits Found
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
              Add circuits to this electrical project to monitor them here.
            </p>
          </div>
        )}

        {/* Circuit Cards Grid */}
        {!isLoading && circuits.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            <AnimatePresence>
              {circuits.map((circuit, index) => (
                <CircuitCard
                  key={circuit.id}
                  circuit={circuit}
                  pointCount={pointCountByCircuit[circuit.id] || 0}
                  onClick={() => handleCircuitClick(circuit.id)}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Real-time Indicator */}
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          borderRadius: '9999px',
          background: 'rgba(0,0,0,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.7)',
        }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
            }}
          />
          Real-time monitoring active
        </div>
      </div>
    </motion.div>
  );
};

export default ElectricalDashboard;

