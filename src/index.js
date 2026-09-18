import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Register the service worker so the app shell, static assets and the cached
// resource index remain usable when connectivity is intermittent.
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((error) => {
        console.warn('MediDocs service worker registration failed:', error);
      });
  });
}

window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason && typeof reason === 'object') {
    const message = reason.message || reason.code || '';
    if (message.includes('securetoken.googleapis.com') ||
        message.includes('Cloud Firestore backend') ||
        message.includes('client is offline') ||
        message.includes('ERR_CONNECTION_CLOSED')) {
      console.warn('Firebase connectivity issue detected. The app will continue in offline mode.');
      return;
    }
  }
  console.error('Unhandled promise rejection caught:', reason);
});

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
