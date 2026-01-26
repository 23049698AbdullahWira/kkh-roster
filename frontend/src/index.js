// frontend/src/index.js
// Entry point for the React frontend application.
// This file mounts <App /> into the DOM and wraps it with BrowserRouter
// so that React Router (Routes/Route/Navigate) works correctly.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';  // React Router v6+ browser router
import './index.css';                              // Global styles (if you have them)
import App from './App';                           // Your main App component

// Create the root React rendering target,
// using the HTML element with id="root" from public/index.html.
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the application wrapped in React.StrictMode and BrowserRouter.
// BrowserRouter provides the routing context required for <Routes> and <Route>
// in App.js to work, and enables URL paths like /admin/home, /user/home, etc.
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
