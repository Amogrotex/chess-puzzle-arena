import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './store/AppContext';
import { I18nProvider } from './lib/i18n';
import { PieceSetProvider } from './lib/pieceSet';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <PieceSetProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </PieceSetProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
