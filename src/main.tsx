import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LegalPage } from './components/LegalPages.tsx';
import { legalPageForPath } from './legal/legalConfig.ts';
import './index.css';

// /privacy and /terms are plain pages of their own (no sign-in, no app screens),
// so Google, Apple and Google Play reviewers can open them directly.
const legalPage = legalPageForPath(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  legalPage ? <LegalPage page={legalPage} /> : <App />
);
