/**
 * ElectricalAIChat - Premium chat interface for validating and adding electrical loads.
 * Parses natural language, validates against EU/US standards, and persists to Supabase.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Send, AlertTriangle, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { browserSupabaseClient } from '../browserSupabaseClient.js';
import type { ElectricalStandard, CircuitStatus } from '../types/electrical.js';

// ============================================================================
// Types
// ============================================================================

interface ParsedLoad {
  label: string;
  wattsPerUnit: number;
  quantity: number;
  outletsPerUnit: number;
  kind: string;
}

interface ValidationResult {
  isValid: boolean;
  status: CircuitStatus;
  newTotalWatts: number;
  newTotalOutlets: number;
  pMax: number;
  pSafe: number;
  maxOutlets: number;
  suggestions: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  parsedLoad?: ParsedLoad;
  validation?: ValidationResult;
  confirmed?: boolean;
}

interface ElectricalAIChatProps {
  circuitId: string | null;
  standard: ElectricalStandard;
  breakerAmps: number;
  voltage: number;
  maxOutlets: number;
  currentWatts: number;
  currentOutlets: number;
  onConfirmed?: () => void;
}

// ============================================================================
// Appliance Rules (Hardcoded Intelligence)
// ============================================================================

interface ApplianceRule {
  patterns: RegExp[];
  wattsPerUnit: number;
  outletsPerUnit: number;
  kind: string;
  label: string;
}

const APPLIANCE_RULES: ApplianceRule[] = [
  // Portuguese / EU patterns
  { patterns: [/tomadas?/i, /outlets?\s*eu/i], wattsPerUnit: 600, outletsPerUnit: 1, kind: 'outlet', label: 'EU Outlet' },
  { patterns: [/forno/i, /oven/i], wattsPerUnit: 3500, outletsPerUnit: 1, kind: 'appliance', label: 'Oven' },
  { patterns: [/ar\s*condicionado/i, /ac\b/i, /air\s*condition/i], wattsPerUnit: 1500, outletsPerUnit: 1, kind: 'appliance', label: 'Air Conditioner' },
  { patterns: [/luzes?/i, /lights?/i, /lamp/i], wattsPerUnit: 10, outletsPerUnit: 0, kind: 'lighting', label: 'Light' },
  { patterns: [/microondas/i, /microwave/i], wattsPerUnit: 1200, outletsPerUnit: 1, kind: 'appliance', label: 'Microwave' },
  { patterns: [/frigor[ií]fico/i, /fridge/i, /refrigerator/i], wattsPerUnit: 150, outletsPerUnit: 1, kind: 'appliance', label: 'Refrigerator' },
  { patterns: [/m[áa]quina\s*de\s*lavar/i, /washing\s*machine/i, /washer/i], wattsPerUnit: 2000, outletsPerUnit: 1, kind: 'appliance', label: 'Washing Machine' },
  { patterns: [/secador/i, /dryer/i, /hair\s*dryer/i], wattsPerUnit: 1800, outletsPerUnit: 1, kind: 'appliance', label: 'Dryer' },
  { patterns: [/chaleira/i, /kettle/i], wattsPerUnit: 2200, outletsPerUnit: 1, kind: 'appliance', label: 'Electric Kettle' },
  { patterns: [/torradeira/i, /toaster/i], wattsPerUnit: 800, outletsPerUnit: 1, kind: 'appliance', label: 'Toaster' },
  { patterns: [/computador/i, /computer/i, /pc\b/i, /desktop/i], wattsPerUnit: 300, outletsPerUnit: 1, kind: 'electronics', label: 'Computer' },
  { patterns: [/tv\b/i, /televis[ãa]o/i, /television/i], wattsPerUnit: 100, outletsPerUnit: 1, kind: 'electronics', label: 'TV' },
  { patterns: [/dj\s*(booth|set|equipment)?/i], wattsPerUnit: 800, outletsPerUnit: 2, kind: 'event', label: 'DJ Equipment' },
  { patterns: [/som/i, /speakers?/i, /sound\s*system/i], wattsPerUnit: 500, outletsPerUnit: 1, kind: 'event', label: 'Sound System' },
  // US / kitchen patterns (higher wattage)
  { patterns: [/kitchen\s*outlets?/i, /cozinha\s*tomadas?/i], wattsPerUnit: 2000, outletsPerUnit: 1, kind: 'outlet', label: 'Kitchen Outlet' },
  { patterns: [/outlets?/i, /plugs?/i, /sockets?/i], wattsPerUnit: 600, outletsPerUnit: 1, kind: 'outlet', label: 'Outlet' },
];

// ============================================================================
// Parsing Logic
// ============================================================================

function parseElectricalIntent(text: string): ParsedLoad | null {
  const normalized = text.toLowerCase().trim();
  
  // Extract quantity (number at start or after "add")
  const quantityMatch = normalized.match(/(?:add\s+)?(\d+)\s*/);
  const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;
  
  // Find matching appliance rule
  for (const rule of APPLIANCE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) {
        return {
          label: rule.label,
          wattsPerUnit: rule.wattsPerUnit,
          quantity,
          outletsPerUnit: rule.outletsPerUnit,
          kind: rule.kind,
        };
      }
    }
  }
  
  return null;
}

// ============================================================================
// Validation Logic
// ============================================================================

function validateLoad(
  parsed: ParsedLoad,
  currentWatts: number,
  currentOutlets: number,
  breakerAmps: number,
  voltage: number,
  maxOutlets: number
): ValidationResult {
  const addedWatts = parsed.wattsPerUnit * parsed.quantity;
  const addedOutlets = parsed.outletsPerUnit * parsed.quantity;
  
  const newTotalWatts = currentWatts + addedWatts;
  const newTotalOutlets = currentOutlets + addedOutlets;
  
  const pMax = breakerAmps * voltage;
  const pSafe = Math.floor(pMax * 0.8);
  
  const suggestions: string[] = [];
  let status: CircuitStatus = 'ok';
  let isValid = true;
  
  // Check outlets
  if (newTotalOutlets > maxOutlets) {
    isValid = false;
    status = 'overload';
    suggestions.push(`Reduce to ${Math.max(0, maxOutlets - currentOutlets)} ${parsed.label}(s) to stay within ${maxOutlets} outlet limit`);
    suggestions.push('Consider splitting loads across multiple circuits');
  }
  
  // Check wattage
  if (newTotalWatts > pMax) {
    isValid = false;
    status = 'overload';
    const maxUnits = Math.floor((pMax - currentWatts) / parsed.wattsPerUnit);
    if (maxUnits > 0) {
      suggestions.push(`Reduce to ${maxUnits} ${parsed.label}(s) to avoid overload`);
    } else {
      suggestions.push('This circuit is already at capacity');
    }
    suggestions.push('Upgrade to a higher amperage breaker if wiring supports it');
  } else if (newTotalWatts > pSafe) {
    status = 'warning';
    const safeUnits = Math.floor((pSafe - currentWatts) / parsed.wattsPerUnit);
    suggestions.push(`Consider reducing to ${Math.max(1, safeUnits)} for optimal safety margin`);
    suggestions.push('Circuit will work but is above 80% recommended load');
  }
  
  if (isValid && status === 'ok') {
    suggestions.push('Load is within safe limits');
  }
  
  return {
    isValid,
    status,
    newTotalWatts,
    newTotalOutlets,
    pMax,
    pSafe,
    maxOutlets,
    suggestions,
  };
}

// ============================================================================
// Typewriter Hook
// ============================================================================

function useTypewriter(text: string, speed: number = 20) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsComplete(true);
      return;
    }
    
    setDisplayedText('');
    setIsComplete(false);
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed]);
  
  return { displayedText, isComplete };
}

// ============================================================================
// Confetti Component
// ============================================================================

const Confetti: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#fbbf24'][Math.floor(Math.random() * 5)],
  }));
  
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -10, x: `${p.x}%`, opacity: 1, scale: 1 }}
          animate={{ y: 150, opacity: 0, scale: 0.5, rotate: 360 }}
          transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: p.color,
          }}
        />
      ))}
    </div>
  );
};

// ============================================================================
// Chat Bubble Component
// ============================================================================

interface ChatBubbleProps {
  message: ChatMessage;
  onConfirm?: () => void;
  isConfirming?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onConfirm, isConfirming }) => {
  const isUser = message.role === 'user';
  const { displayedText, isComplete } = useTypewriter(
    isUser ? message.content : message.content,
    isUser ? 0 : 15
  );
  
  const showConfetti = message.validation?.status === 'ok' && message.confirmed;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
        position: 'relative',
      }}
    >
      <Confetti show={showConfetti} />
      
      <motion.div
        animate={message.validation?.status === 'overload' && !message.confirmed ? {
          x: [0, -8, 8, -8, 8, 0],
        } : {}}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: '85%',
          padding: '14px 18px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
            : 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.1) 100%)',
          color: isUser ? 'white' : '#1f2937',
          boxShadow: isUser
            ? '0 4px 12px rgba(59,130,246,0.3)'
            : '0 2px 8px rgba(0,0,0,0.06)',
          border: isUser ? 'none' : '1px solid rgba(245,158,11,0.2)',
        }}
      >
        {/* Message Content */}
        <div style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {isUser ? message.content : (displayedText || message.content)}
          {!isUser && !isComplete && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{ marginLeft: '2px' }}
            >
              |
            </motion.span>
          )}
        </div>
        
        {/* Validation Card (for AI responses) */}
        {!isUser && message.validation && isComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.2 }}
            style={{ marginTop: '12px' }}
          >
            {/* Status Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '10px',
                background: message.validation.status === 'ok'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : message.validation.status === 'warning'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
              }}
            >
              {message.validation.status === 'ok' ? (
                <><CheckCircle size={14} /> OK</>
              ) : message.validation.status === 'warning' ? (
                <><AlertTriangle size={14} /> Warning</>
              ) : (
                <><XCircle size={14} /> Overload</>
              )}
            </div>
            
            {/* Load Summary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '10px',
                fontSize: '12px',
              }}
            >
              <div style={{ background: 'rgba(0,0,0,0.04)', padding: '8px 10px', borderRadius: '8px' }}>
                <div style={{ color: '#6b7280' }}>Power</div>
                <div style={{ fontWeight: 600 }}>
                  {message.validation.newTotalWatts.toLocaleString()}W / {message.validation.pMax.toLocaleString()}W
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.04)', padding: '8px 10px', borderRadius: '8px' }}>
                <div style={{ color: '#6b7280' }}>Outlets</div>
                <div style={{ fontWeight: 600 }}>
                  {message.validation.newTotalOutlets} / {message.validation.maxOutlets}
                </div>
              </div>
            </div>
            
            {/* Suggestions */}
            {message.validation.suggestions.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                {message.validation.suggestions.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                      marginBottom: '4px',
                    }}
                  >
                    <span style={{ color: '#f59e0b' }}>•</span>
                    {s}
                  </div>
                ))}
              </div>
            )}
            
            {/* Confirm Button */}
            {message.validation.isValid && !message.confirmed && onConfirm && (
              <motion.button
                onClick={onConfirm}
                disabled={isConfirming}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isConfirming ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  opacity: isConfirming ? 0.7 : 1,
                }}
              >
                {isConfirming ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Sparkles size={14} />
                    CONFIRM & ADD TO CIRCUIT
                  </>
                )}
              </motion.button>
            )}
            
            {/* Confirmed Badge */}
            {message.confirmed && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  background: 'rgba(16,185,129,0.1)',
                  borderRadius: '10px',
                  color: '#059669',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <CheckCircle size={16} />
                Added to circuit!
              </div>
            )}
          </motion.div>
        )}
        
        {/* Timestamp */}
        <div
          style={{
            fontSize: '10px',
            color: isUser ? 'rgba(255,255,255,0.7)' : '#9ca3af',
            marginTop: '6px',
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const ElectricalAIChat: React.FC<ElectricalAIChatProps> = ({
  circuitId,
  standard,
  breakerAmps,
  voltage,
  maxOutlets,
  currentWatts,
  currentOutlets,
  onConfirmed,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmingMessageId, setConfirmingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'ai',
        content: `Hi! I'm your electrical assistant. Tell me what you want to add to this circuit.\n\nExamples:\n• "add 4 outlets"\n• "4 tomadas"\n• "add 2 ovens"\n• "10 lights"`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);
  
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    
    // Parse intent
    const parsed = parseElectricalIntent(trimmed);
    
    let aiMessage: ChatMessage;
    
    if (parsed) {
      const validation = validateLoad(
        parsed,
        currentWatts,
        currentOutlets,
        breakerAmps,
        voltage,
        maxOutlets
      );
      
      const addedWatts = parsed.wattsPerUnit * parsed.quantity;
      const statusEmoji = validation.status === 'ok' ? '✅' : validation.status === 'warning' ? '⚠️' : '❌';
      
      aiMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: `${statusEmoji} Adding ${parsed.quantity}× ${parsed.label} (${addedWatts.toLocaleString()}W total)`,
        timestamp: new Date(),
        parsedLoad: parsed,
        validation,
      };
    } else {
      aiMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: `I couldn't understand that. Try something like:\n• "add 4 outlets"\n• "add 1 oven"\n• "10 lights"\n• "2 AC units"`,
        timestamp: new Date(),
      };
    }
    
    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setInput('');
  }, [input, currentWatts, currentOutlets, breakerAmps, voltage, maxOutlets]);
  
  const handleConfirm = useCallback(async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message?.parsedLoad || !circuitId) return;
    
    setIsConfirming(true);
    setConfirmingMessageId(messageId);
    
    try {
      // Get session
      if (!browserSupabaseClient) throw new Error('Supabase not available');
      
      const storedSession = localStorage.getItem('wedboarpro_session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session?.access_token && session?.refresh_token) {
          await browserSupabaseClient.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        }
      }
      
      // Insert load into electrical_loads
      const { error } = await browserSupabaseClient
        .from('electrical_loads')
        .insert({
          circuit_id: circuitId,
          label: message.parsedLoad.label,
          watts: message.parsedLoad.wattsPerUnit,
          quantity: message.parsedLoad.quantity,
          outlets_per_unit: message.parsedLoad.outletsPerUnit,
          kind: message.parsedLoad.kind,
          meta: {},
        });
      
      if (error) throw error;
      
      // Mark message as confirmed
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, confirmed: true } : m))
      );
      
      // Notify parent to refresh
      onConfirmed?.();
    } catch (err: any) {
      console.error('Failed to save load:', err);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'ai',
          content: `❌ Failed to save: ${err?.message || 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsConfirming(false);
      setConfirmingMessageId(null);
    }
  }, [messages, circuitId, onConfirmed]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const suggestions = ['4 outlets', '1 oven', '10 lights', '2 AC units'];
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'linear-gradient(180deg, rgba(251,191,36,0.03) 0%, rgba(255,255,255,0) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255,255,255,0.8)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={18} color="white" />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
            Electrical AI
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            {standard === 'EU_PT' ? '🇪🇺 EU/PT' : '🇺🇸 US'} • {breakerAmps}A • {voltage}V
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
        }}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              onConfirm={
                message.validation?.isValid && !message.confirmed
                  ? () => handleConfirm(message.id)
                  : undefined
              }
              isConfirming={isConfirming && confirmingMessageId === message.id}
            />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Suggestions */}
      {messages.length <= 2 && (
        <div
          style={{
            padding: '0 16px 12px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {suggestions.map((s) => (
            <motion.button
              key={s}
              onClick={() => setInput(`add ${s}`)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '6px 12px',
                borderRadius: '9999px',
                border: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.08)',
                color: '#d97706',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + {s}
            </motion.button>
          ))}
        </div>
      )}
      
      {/* Input Area */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(255,255,255,0.9)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Try "add 4 outlets" or "1 oven"...'
          rows={1}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(0,0,0,0.1)',
            background: 'white',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            minHeight: '44px',
            maxHeight: '100px',
          }}
        />
        <motion.button
          onClick={handleSend}
          disabled={!input.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            border: 'none',
            background: input.trim()
              ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
              : 'rgba(0,0,0,0.08)',
            color: input.trim() ? 'white' : '#9ca3af',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Send size={18} />
        </motion.button>
      </div>
      
      {/* No Circuit Warning */}
      {!circuitId && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <AlertTriangle size={40} color="#f59e0b" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', marginBottom: '6px' }}>
            No Circuit Linked
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            This power point isn't connected to a Supabase circuit yet.
            <br />
            Loads won't be saved.
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectricalAIChat;

