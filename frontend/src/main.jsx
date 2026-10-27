import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './App.jsx';
import './style.css';

class AppErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('CampusFix render error:', error, info.componentStack); }
  render() {
    if (this.state.error) return <main role="alert" style={{ maxWidth: 680, margin: '12vh auto', padding: 24, fontFamily: 'sans-serif', color: '#20231f' }}><h1>This page hit a display error</h1><p>Reload the page to try again.</p>{import.meta.env.DEV && <pre style={{ whiteSpace: 'pre-wrap', color: '#8f352c' }}>{this.state.error.message}</pre>}<button onClick={() => window.location.reload()}>Reload</button></main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppErrorBoundary><App /></AppErrorBoundary>
      <ToastContainer position="bottom-right" theme="light" autoClose={2800} />
    </BrowserRouter>
  </React.StrictMode>
);
