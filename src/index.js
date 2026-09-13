import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Register the production service worker only after the page has loaded.
// Keeping this in the entry point avoids bundling the worker into the React app.
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${process.env.PUBLIC_URL || ''}/service-worker.js`, {
      scope: process.env.PUBLIC_URL || '/',
    }).then((registration) => {
      console.info('MediDocs service worker registered:', registration.scope);
    }).catch((error) => {
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
