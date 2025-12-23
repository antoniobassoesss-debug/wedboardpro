/**
 * useElectricalAssistantChat - Local chat state for the embedded electrical assistant.
 * Can be upgraded to Supabase-backed `electrical_chats` later.
 */
import { useState, useCallback } from 'react';

export interface ElectricalChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface UseElectricalAssistantChatReturn {
  messages: ElectricalChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

export const useElectricalAssistantChat = (): UseElectricalAssistantChatReturn => {
  const [messages, setMessages] = useState<ElectricalChatMessage[]>([
    {
      id: 'system-1',
      role: 'system',
      content: 'I\'m your electrical planning assistant. Ask me about circuit sizing, load calculations, breaker selection, and compliance with EU/PT (RTE BT) or US (NEC) standards.',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ElectricalChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Call the assistant API with electrical context
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[ELECTRICAL CONTEXT] ${content.trim()}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from assistant');
      }

      const data = await response.json();
      const assistantMessage: ElectricalChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'I couldn\'t generate a response.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err?.message || 'Failed to send message');
      const errorMessage: ElectricalChatMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'system-1',
        role: 'system',
        content: 'I\'m your electrical planning assistant. Ask me about circuit sizing, load calculations, breaker selection, and compliance with EU/PT (RTE BT) or US (NEC) standards.',
        timestamp: new Date(),
      },
    ]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearChat };
};

