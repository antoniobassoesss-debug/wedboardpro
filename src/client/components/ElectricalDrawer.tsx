/**
 * ElectricalDrawer - Right-side sliding drawer for electrical point configuration.
 * Glassmorphism backdrop, country toggle, breaker selector, and embedded AI chat.
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PowerPoint } from '../types/powerPoint';
import type { ElectricalStandard } from '../types/electrical';
import { useElectricalAssistantChat } from '../hooks/useElectricalAssistantChat';
import ElectricalBreakerCalculator from './ElectricalBreakerCalculator.js';

interface ElectricalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  powerPoint: PowerPoint | null;
  onUpdate: (updated: PowerPoint) => void;
  onDelete: (id: string) => void;
}

const ElectricalDrawer: React.FC<ElectricalDrawerProps> = ({
  isOpen,
  onClose,
  powerPoint,
  onUpdate,
  onDelete,
}) => {
  const [showChat, setShowChat] = useState(false);
  const { messages, isLoading, sendMessage, clearChat } = useElectricalAssistantChat();
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  if (!powerPoint) return null;

  const handleCalculatorChange = (data: { standard: ElectricalStandard; breakerAmps: number; voltage: number }) => {
    onUpdate({
      ...powerPoint,
      standard: data.standard,
      breaker_amps: data.breakerAmps,
      voltage: data.voltage,
    });
  };

  const handleLabelChange = (label: string) => {
    onUpdate({ ...powerPoint, label });
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    await sendMessage(chatInput);
    setChatInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with glassmorphism */}
          <motion.div
            className="electrical-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 50000,
            }}
          />

          {/* Drawer panel */}
          <motion.div
            className="electrical-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '420px',
              maxWidth: '90vw',
              height: '100vh',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
              zIndex: 50001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                background: 'linear-gradient(180deg, rgba(245,158,11,0.08) 0%, transparent 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>⚡</span>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
                      Power Point
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                      Configure electrical settings
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#6b7280',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {/* Label Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={powerPoint.label || ''}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="e.g., DJ Booth, Stage Left..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#f59e0b';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Electrical Breaker Calculator - Toggle, Breaker, Capacity, Progress */}
              <div style={{ marginBottom: '24px' }}>
                <ElectricalBreakerCalculator
                  circuitId={powerPoint.circuitId || null}
                  initialStandard={powerPoint.standard}
                  initialBreakerAmps={powerPoint.breaker_amps}
                  onChange={handleCalculatorChange}
                />
              </div>

              {/* AI Assistant Button */}
              <motion.button
                onClick={() => setShowChat(!showChat)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: showChat
                    ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                  marginBottom: showChat ? '16px' : '24px',
                }}
              >
                <span style={{ fontSize: '18px' }}>🤖</span>
                {showChat ? 'Hide AI Electrical Assistant' : 'Open AI Electrical Assistant'}
              </motion.button>

              {/* Chat Panel */}
              <AnimatePresence>
                {showChat && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        borderRadius: '12px',
                        border: '1px solid rgba(124,58,237,0.2)',
                        background: 'white',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Chat Messages */}
                      <div
                        style={{
                          height: '240px',
                          overflow: 'auto',
                          padding: '16px',
                          background: 'linear-gradient(180deg, rgba(124,58,237,0.02) 0%, white 100%)',
                        }}
                      >
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            style={{
                              marginBottom: '12px',
                              display: 'flex',
                              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <div
                              style={{
                                maxWidth: '85%',
                                padding: '10px 14px',
                                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                background: msg.role === 'user'
                                  ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                                  : msg.role === 'system'
                                  ? 'rgba(0,0,0,0.04)'
                                  : 'white',
                                color: msg.role === 'user' ? 'white' : '#374151',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                border: msg.role === 'assistant' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                              }}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {isLoading && (
                          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div
                              style={{
                                padding: '10px 14px',
                                borderRadius: '12px 12px 12px 4px',
                                background: 'white',
                                border: '1px solid rgba(0,0,0,0.06)',
                                fontSize: '13px',
                                color: '#9ca3af',
                              }}
                            >
                              Thinking...
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input */}
                      <div
                        style={{
                          padding: '12px',
                          borderTop: '1px solid rgba(0,0,0,0.06)',
                          display: 'flex',
                          gap: '8px',
                        }}
                      >
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendChat();
                            }
                          }}
                          placeholder="Ask about electrical planning..."
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(0,0,0,0.1)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={handleSendChat}
                          disabled={isLoading || !chatInput.trim()}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#7c3aed',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: isLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                            opacity: isLoading || !chatInput.trim() ? 0.5 : 1,
                          }}
                        >
                          Send
                        </button>
                      </div>

                      {/* Clear Chat */}
                      <div style={{ padding: '8px 12px 12px', textAlign: 'center' }}>
                        <button
                          onClick={clearChat}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            fontSize: '12px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Clear conversation
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(0,0,0,0.08)',
                display: 'flex',
                gap: '12px',
              }}
            >
              <button
                onClick={() => onDelete(powerPoint.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #ef4444',
                  background: 'white',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                Delete Point
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                }}
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ElectricalDrawer;

