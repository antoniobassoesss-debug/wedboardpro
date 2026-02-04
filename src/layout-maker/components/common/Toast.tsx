/**
 * Toast Notification System
 *
 * Global toast notifications for user feedback.
 */

import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, options?: Partial<Toast>) => string;
  dismissToast: (id: string) => void;
  showSuccess: (message: string, options?: Partial<Toast>) => string;
  showError: (message: string, options?: Partial<Toast>) => string;
  showWarning: (message: string, options?: Partial<Toast>) => string;
  showInfo: (message: string, options?: Partial<Toast>) => string;
  undoableAction: (message: string, onUndo: () => void) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;
const UNDO_DURATION = 6000;

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const TOAST_STYLES: Record<ToastType, string> = {
  info: 'bg-blue-50 text-blue-800 border border-blue-200',
  success: 'bg-green-50 text-green-800 border border-green-200',
  warning: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  error: 'bg-red-50 text-red-800 border border-red-200',
};

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  info: (
    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastType, options?: Partial<Toast>): string => {
    const id = uuidv4();
    const toast: Toast = {
      id,
      message,
      type,
      duration: DEFAULT_DURATION,
      ...options,
    };

    setToasts(prev => [...prev, toast]);

    if (toast.duration && toast.duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        dismissToast(id);
      }, toast.duration);
    }

    return id;
  }, [dismissToast]);

  const showSuccess = useCallback((message: string, options?: Partial<Toast>) => {
    return showToast(message, 'success', options);
  }, [showToast]);

  const showError = useCallback((message: string, options?: Partial<Toast>) => {
    return showToast(message, 'error', options);
  }, [showToast]);

  const showWarning = useCallback((message: string, options?: Partial<Toast>) => {
    return showToast(message, 'warning', options);
  }, [showToast]);

  const showInfo = useCallback((message: string, options?: Partial<Toast>) => {
    return showToast(message, 'info', options);
  }, [showToast]);

  const undoableAction = useCallback((message: string, onUndo: () => void) => {
    const id = showToast(message, 'info', {
      action: {
        label: 'Undo',
        onClick: () => {
          onUndo();
          dismissToast(id);
        },
      },
      duration: UNDO_DURATION,
    });
    return id;
  }, [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, dismissToast, showToast, showSuccess, showError, showWarning, showInfo, undoableAction }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 animate-slide-in ${TOAST_STYLES[toast.type]}`}
          style={{ transform: `translateY(${index * 10}px)` }}
        >
          {TOAST_ICONS[toast.type]}
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="text-sm font-semibold underline hover:opacity-75"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 hover:bg-black/10 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastProvider;
