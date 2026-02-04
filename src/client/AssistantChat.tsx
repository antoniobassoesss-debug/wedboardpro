import React, { useState, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { askAssistant } from './api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'error' | 'system';
  text: string;
  createdAt: Date;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hi! I can help you design and optimize this layout. Ask me about spaces, seating, or guest flow.',
  createdAt: new Date(),
};

interface AssistantChatProps {
  initialOpen?: boolean;
}

const AssistantChat: React.FC<AssistantChatProps> = ({ initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      const response = await askAssistant(trimmed);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.answer,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'error',
          text: message,
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  if (!isOpen) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          pointerEvents: 'auto',
          zIndex: 15000,
        }}
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            padding: '10px 18px',
            borderRadius: 999,
            border: '1px solid rgba(15,23,42,0.16)',
            background: '#ffffff',
            color: '#111111',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(15,23,42,0.20)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: '999px',
              background: '#111111',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            AI
          </span>
          AI Assistant
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 88,
        right: 24,
        bottom: 24,
        width: 360,
        maxWidth: '90vw',
        borderRadius: 20,
        border: '1px solid rgba(15,23,42,0.08)',
        background: '#ffffff',
        boxShadow: '0 20px 50px rgba(15,23,42,0.2)',
        pointerEvents: 'auto',
        zIndex: 15000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: '#111111',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            AI
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            AI Assistant
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Minimize assistant"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9l7 7H5l7-7" />
          </svg>
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={messagesRef}
        style={{
          flex: 1,
          padding: '16px 20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: '#fafafa',
        }}
      >
        {messages.map((message) => {
          const isUser = message.role === 'user';
          const isError = message.role === 'error';

          return (
            <div
              key={message.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser ? '#111111' : isError ? '#fef2f2' : '#f1f5f9',
                  color: isUser ? '#ffffff' : '#0f172a',
                  fontSize: 13,
                  lineHeight: 1.5,
                  border: isError ? '1px solid #fecaca' : 'none',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message.text}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '10px 14px',
              borderRadius: '16px 16px 16px 4px',
              background: '#f1f5f9',
              color: '#64748b',
              fontSize: 13,
            }}
          >
            Thinking...
          </div>
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '16px 20px',
          background: '#ffffff',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 10,
            borderRadius: 24,
            border: '1px solid #e2e8f0',
            padding: '6px 6px 6px 16px',
            background: '#f8fafc',
          }}
        >
          <textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something..."
            rows={1}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              resize: 'none',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              outline: 'none',
              color: '#0f172a',
              padding: '8px 0',
              lineHeight: 1.4,
            }}
          />
          <button
            type="submit"
            disabled={isSending || !inputValue.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: !isSending && inputValue.trim() ? '#111111' : '#e2e8f0',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 500,
              cursor: !isSending && inputValue.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssistantChat;
