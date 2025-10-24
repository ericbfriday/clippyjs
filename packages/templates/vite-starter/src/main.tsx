import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClippyProvider } from '@clippyjs/react';
import App from './App.tsx';
import './App.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClippyProvider maxAgents={3}>
      <App />
    </ClippyProvider>
  </StrictMode>,
);
