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
  text: 'Hi! I can help you design and optimize this layout – ask about spaces, seating, or flow.',
  createdAt: new Date(),
};

interface AssistantChatProps {
  // Optional external control in the future – for now internal toggle is used
  initialOpen?: boolean;
}

const AssistantChat: React.FC<AssistantChatProps> = ({ initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('[AssistantChat] mounted');
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
        error instanceof Error ? error.message : 'Something went wrong while contacting the assistant.';
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

  // Empty state friendly text
  const isEmpty = messages.length === 1 && messages[0].id === INITIAL_MESSAGE.id;

  // Simple formatter for timestamps (optional)
  const formatTime = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  // Collapsed launcher button
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
          Ask Layout AI
        </button>
      </div>
    );
  }

  // Docked panel on the right side
  return (
    <div
      style={{
        position: 'fixed',
        top: 88,
        right: 24,
        bottom: 24,
        width: 360,
        maxWidth: '90vw',
        borderRadius: 24,
        border: '1px solid rgba(15,23,42,0.08)',
        background: '#fbfbfb',
        boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
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
          padding: '14px 16px 10px',
          borderBottom: '1px solid rgba(148,163,184,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
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
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            AI
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Layout AI Assistant</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Ask about tables, spaces, and guest flow for this layout.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close assistant"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 999,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, color: '#6b7280' }}>×</span>
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={messagesRef}
        style={{
          flex: 1,
          padding: '12px 14px 8px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {isEmpty && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 16,
              background: '#e5e7eb',
              color: '#111827',
              fontSize: 13,
              maxWidth: '100%',
            }}
          >
            I’m here to help with this specific layout. Try asking:
            <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: 12 }}>
              <li>“Suggest a layout for 120 guests with a dance floor.”</li>
              <li>“How can I improve the flow between ceremony and dinner?”</li>
            </ul>
          </div>
        )}

        {messages.map((message) => {
          if (message.role === 'system') {
            return (
              <div
                key={message.id}
                style={{
                  alignSelf: 'center',
                  fontSize: 11,
                  color: '#6b7280',
                  padding: '4px 8px',
                }}
              >
                {message.text}
              </div>
            );
          }

          const isUser = message.role === 'user';
          const isError = message.role === 'error';

          return (
            <div
              key={message.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '92%',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser ? '#111827' : isError ? '#fee2e2' : '#f3f4f6',
                  color: isUser ? '#ffffff' : '#111827',
                  fontSize: 13,
                  lineHeight: 1.5,
                  border: isError ? '1px solid #f97373' : 'none',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message.text}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#9ca3af',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                {formatTime(message.createdAt)}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '8px 11px',
              borderRadius: '16px 16px 16px 4px',
              background: '#f3f4f6',
              color: '#111827',
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              opacity: 0.9,
            }}
          >
            <span
              style={{
                width: 16,
                height: 4,
                borderRadius: 999,
                background:
                  'radial-gradient(circle at 0% 50%, #9ca3af 0, #9ca3af 15%, transparent 16%), radial-gradient(circle at 50% 50%, #9ca3af 0, #9ca3af 15%, transparent 16%), radial-gradient(circle at 100% 50%, #9ca3af 0, #9ca3af 15%, transparent 16%)',
                backgroundSize: '4px 4px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: '0 0, 50% 0, 100% 0',
              }}
            />
            Assistant is thinking…
          </div>
        )}
      </div>

      {/* Quick prompt chips */}
      <div
        style={{
          padding: '6px 14px 4px',
          borderTop: '1px solid rgba(148,163,184,0.18)',
          background: '#f9fafb',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        {[
          'Suggest a layout structure',
          'Improve table arrangement',
          'Check flow between areas',
        ].map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setInputValue(label);
            }}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 11,
              background: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '8px 12px 10px',
          background: '#ffffff',
          borderTop: '1px solid rgba(148,163,184,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            borderRadius: 16,
            border: '1px solid rgba(148,163,184,0.5)',
            padding: '6px 8px 6px 10px',
            background: '#f9fafb',
          }}
        >
          <textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI about this layout…"
            rows={2}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              resize: 'none',
              fontFamily:
                'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
              outline: 'none',
              color: '#111827',
            }}
          />
          <button
            type="submit"
            disabled={isSending || !inputValue.trim()}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '6px 12px',
              background: isSending || !inputValue.trim() ? '#e5e7eb' : '#111827',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: isSending || !inputValue.trim() ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            aria-label="Send message"
          >
            <span>Send</span>
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setMessages([INITIAL_MESSAGE])}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#6b7280',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Clear conversation
          </button>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>Enter to send · Shift+Enter for new line</span>
        </div>
      </form>
    </div>
  );
};

export default AssistantChat;


