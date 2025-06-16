import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('🚀 Application starting...');

// Clear any cached data that might be causing issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found');
  throw new Error('Root element not found');
}

console.log('✅ Root element found, rendering app...');

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Error rendering app:', error);
  
  // Fallback: render a simple error message
  rootElement.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      padding: 20px;
    ">
      <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ Application Error</h1>
      <p style="font-size: 1.1rem; margin-bottom: 2rem; max-width: 600px;">
        There was an error loading the application. This is likely due to missing dependencies.
      </p>
      <button 
        onclick="window.location.reload()" 
        style="
          background: rgba(255,255,255,0.2);
          border: 2px solid white;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        "
        onmouseover="this.style.background='rgba(255,255,255,0.3)'"
        onmouseout="this.style.background='rgba(255,255,255,0.2)'"
      >
        🔄 Reload Page
      </button>
      <div style="margin-top: 2rem; font-size: 0.9rem; opacity: 0.8;">
        Error: ${error.message}
      </div>
      <div style="margin-top: 1rem; font-size: 0.8rem; opacity: 0.6;">
        Try running: npm install && npm run dev
      </div>
    </div>
  `;
}