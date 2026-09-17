import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));

// MediDocs does not require offline caching. Remove any previously installed
// service worker so stale/corrupt cached app files cannot break navigation.
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(
        registrations.map((registration) => registration.unregister())
      ))
      .then(() => {
        if ('caches' in window) {
          return caches.keys().then((keys) => Promise.all(
            keys.map((key) => caches.delete(key))
          ));
        }
        return undefined;
      })
      .catch((error) => {
        console.warn('MediDocs cache cleanup failed:', error);
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
