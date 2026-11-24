import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LegalPage } from './components/LegalPages.tsx';
import { legalPageForPath } from './legal/legalConfig.ts';
import { GoLivePage } from './components/GoLivePage.tsx';
import './index.css';

// /privacy and /terms are plain pages of their own (no sign-in, no app screens),
// so Google, Apple and Google Play reviewers can open them directly.
const legalPage = legalPageForPath(window.location.pathname);

// /go-live is the phone/tablet camera page a bar owner opens from a link.
const isGoLive = window.location.pathname.replace(/\/+$/, '') === '/go-live';

createRoot(document.getElementById('root')!).render(
  isGoLive ? <GoLivePage /> : legalPage ? <LegalPage page={legalPage} /> : <App />
);
