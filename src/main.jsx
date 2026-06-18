import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './preview-glass.css';
import './settings-polish.css';
import './budget-allocation.css';
import './playful-professional.css';
import './navigation-fix.css';
import './notifications.css';
import './settings-menu.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
