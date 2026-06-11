import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { useTabletStore } from './state/tabletStore';
import { useLandStore } from './state/landStore';
import { useUiStore } from './state/uiStore';
import './styles/index.css';

// dev 전용: 콘솔 디버깅용 스토어 노출
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__pg = {
    tablets: useTabletStore,
    lands: useLandStore,
    ui: useUiStore,
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
