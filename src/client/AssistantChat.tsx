import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FormEvent, KeyboardEvent } from 'react';
import { askAssistant } from './api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hi! I can walk you through Layout Maker steps or best practices. Ask me anything!',
};

const AssistantChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [headerSrc, setHeaderSrc] = useState<string | null>(null);
  const [bodySrc, setBodySrc] = useState<string | null>(null);
  const [closeSrc, setCloseSrc] = useState<string | null>(null);
  const [sendSrc, setSendSrc] = useState<string | null>(null);
  const [writingBarSrc, setWritingBarSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = document.createElement('div');
    portalRef.current = el;
    document.body.appendChild(el);
    setIsReady(true);
    return () => {
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
        portalRef.current = null;
      }
      setIsReady(false);
    };
  }, []);

  // Try several filename variants (URL-encoded and simplified) and pick the first that loads.
  useEffect(() => {
    if (!isReady) return;

    const loadImage = (url: string) =>
      new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });

    const pickFirst = async (candidates: string[]) => {
      for (const c of candidates) {
        // absolute path from public
        const path = c;
        // try to load
        // eslint-disable-next-line no-await-in-loop
        const ok = await loadImage(path);
        if (ok) return path;
      }
      return null;
    };

    // header
    pickFirst([
      '/assistant%20chat/assistantchat%3Aheader.svg',
      '/assistant chat/assistantchat:header.svg',
      '/assistant-chat/header.svg',
      '/assistantchat-header.svg',
    ]).then((p) => setHeaderSrc(p));

    // body
    pickFirst([
      '/assistant%20chat/assistentchat%3Abody.svg',
      '/assistant chat/assistentchat:body.svg',
      '/assistant-chat/body.svg',
      '/assistentchat-body.svg',
    ]).then((p) => setBodySrc(p));

    // close
    pickFirst([
      '/assistant%20chat/assistantchat%3Aheaderclosebutton.svg',
      '/assistant chat/assistantchat:headerclosebutton.svg',
      '/assistant-chat/close.svg',
      '/assistantchat-close.svg',
    ]).then((p) => setCloseSrc(p));

    // send
    pickFirst([
      '/assistant%20chat/assistantchat%3Asendmessagebutton.svg',
      '/assistant chat/assistantchat:sendmessagebutton.svg',
      '/assistant-chat/send.svg',
      '/assistantchat-send.svg',
    ]).then((p) => setSendSrc(p));

    // writing bar
    pickFirst([
      '/assistant%20chat/assistentchat%3Awritingbar.svg',
      '/assistant chat/assistentchat:writingbar.svg',
      '/assistant-chat/writingbar.svg',
      '/assistentchat-writingbar.svg',
    ]).then((p) => setWritingBarSrc(p));
  }, [isReady]);

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

  if (!isReady || !portalRef.current) {
    return null;
  }

  if (!isOpen) {
    return createPortal(
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
          onClick={() => setIsOpen(true)}
          style={{
            padding: '14px 22px',
            borderRadius: '999px',
            border: 'none',
            background: '#111111',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 15px 30px rgba(15,23,42,0.35)',
            cursor: 'pointer',
          }}
        >
          Chat with Layout AI
        </button>
      </div>,
      portalRef.current
    );
  }

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: '320px',
          height: '500px',
          borderRadius: '32px',
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 35px 60px rgba(15, 23, 42, 0.35)',
          pointerEvents: 'auto',
          zIndex: 15000,
          overflow: 'hidden',
          display: isOpen ? 'block' : 'none',
        }}
      >
      {/* Decorative SVG assets exported from your XD paste (in public/assistant chat/) */}
      <img
        src="/assistant%20chat/assistantchat%3Aheader.svg"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '56px',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <img
        src="/assistant%20chat/assistentchat%3Abody.svg"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '56px',
          left: 0,
          width: '100%',
          bottom: '56px',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          paddingTop: '20px',
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            padding: '0 4px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>Layout Assistant</div>
            <div style={{ fontSize: '12px', color: '#475467', marginTop: '2px' }}>Ask about spaces or seating</div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
            }}
            aria-label="Close chat"
          >
            <img
              src="/assistant%20chat/assistantchat%3Aheaderclosebutton.svg"
              alt="Close"
              style={{ width: 28, height: 28, display: 'block' }}
            />
          </button>
        </div>

        <div
          ref={messagesRef}
          style={{
            flex: 1,
            padding: '8px 2px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '92%',
              padding: '10px 14px',
              borderRadius:
                message.role === 'user'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
              background:
                message.role === 'user'
                  ? '#111111'
                  : message.role === 'assistant'
                  ? '#f1f5f9'
                  : '#fee2e2',
              color: message.role === 'user' ? '#ffffff' : '#0f172a',
              fontSize: '13px',
              lineHeight: 1.4,
              border: message.role === 'error' ? '1px solid #f87171' : 'none',
            }}
          >
            {message.text}
          </div>
        ))}
        {isSending && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '10px 14px',
              borderRadius: '18px 18px 18px 4px',
              background: '#f1f5f9',
              color: '#0f172a',
              fontSize: '13px',
              lineHeight: 1.4,
              opacity: 0.7,
            }}
          >
            Thinking…
          </div>
        )}
      </div>

        <form
          onSubmit={handleSend}
          style={{
            marginTop: '14px',
            borderRadius: '22px',
            background: 'rgba(255,255,255,0.7)',
            boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask how to size a space or place tables…"
            rows={2}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              resize: 'none',
              fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isSending || !inputValue.trim()}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              border: 'none',
              background: 'transparent',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSending || !inputValue.trim() ? 'not-allowed' : 'pointer',
              opacity: isSending ? 0.7 : 1,
            }}
            aria-label="Send message"
          >
            <img
              src="/assistant%20chat/assistantchat%3Asendmessagebutton.svg"
              alt="Send"
              style={{ width: 30, height: 30, display: 'block' }}
            />
          </button>
        </form>
      </div>
      </div>

      {!isOpen && (
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
            onClick={() => setIsOpen(true)}
            type="button"
            style={{
              padding: '12px 20px',
              borderRadius: '999px',
              border: '1px solid rgba(15, 23, 42, 0.15)',
              background: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 12px 24px rgba(15,23,42,0.15)',
            }}
          >
            Chat with Layout AI
          </button>
        </div>
      )}
    </>,
    portalRef.current
  );
};

export default AssistantChat;


