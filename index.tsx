
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Diagnostic log (won't show key, just status)
console.log("LocalLink System: Checking environment...");
if (process.env.API_KEY) {
  console.log("LocalLink System: Environment variables detected.");
} else {
  console.warn("LocalLink System: API_KEY not detected in browser process.");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
