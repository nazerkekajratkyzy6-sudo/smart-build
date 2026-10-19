import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Service Worker тіркеу (офлайн жұмыс). Бір файлдық алдын ала қарау нұсқасында өшірулі.
if (import.meta.env.PROD && !import.meta.env.VITE_SINGLE && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}
