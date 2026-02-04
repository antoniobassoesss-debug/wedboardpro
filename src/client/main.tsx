import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ToastProvider } from './components/ui/toast';

const gridStyles = `
  [data-grid-background="true"] {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background: #e5e5e5 !important;
    z-index: 0 !important;
    pointer-events: none !important;
    overflow: hidden !important;
  }
  
  [data-grid-background="true"] > div {
    position: absolute !important;
    top: -1px !important;
    left: -1px !important;
    right: -1px !important;
    bottom: -1px !important;
    background-image: 
      linear-gradient(to right, #d0d0d0 0.5px, transparent 0.5px),
      linear-gradient(to bottom, #d0d0d0 0.5px, transparent 0.5px),
      linear-gradient(to right, #b0b0b0 1px, transparent 1px),
      linear-gradient(to bottom, #b0b0b0 1px, transparent 1px);
    background-size: 
      20px 20px,
      20px 20px,
      100px 100px,
      100px 100px;
    background-position: 0 0, 0 0, 0 0, 0 0;
  }
  
  [data-a4-canvas="true"] {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    background: #ffffff !important;
    border: 2px solid #cccccc !important;
    border-radius: 4px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
    pointer-events: none !important;
    z-index: 1 !important;
  }
`;

const collisionStyles = `
  @keyframes collision-pulse {
    0%, 100% {
      outline-color: #EF4444;
      outline-width: 2px;
      outline-offset: 2px;
    }
    50% {
      outline-color: #FCA5A5;
      outline-width: 3px;
      outline-offset: 3px;
    }
  }

  .collision-warning {
    animation: collision-pulse 0.5s ease-in-out infinite;
    outline: 2px solid #EF4444;
    outline-offset: 2px;
  }

  .is-dragging-overlapping {
    cursor: not-allowed;
  }

  .is-dragging-overlapping::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(239, 68, 68, 0.2);
    border: 2px dashed #EF4444;
    border-radius: 4px;
    pointer-events: none;
  }
`;

const gridStyleElement = document.createElement('style');
gridStyleElement.textContent = gridStyles;
document.head.appendChild(gridStyleElement);

const collisionStyleElement = document.createElement('style');
collisionStyleElement.textContent = collisionStyles;
document.head.appendChild(collisionStyleElement);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
