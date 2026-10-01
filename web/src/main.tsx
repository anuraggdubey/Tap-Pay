import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/globals.css';
import './styles/phantom-effects.css';
import './styles/premium-motion.css';
import './styles/responsive.css';
import './styles/waitlist.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
