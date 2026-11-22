import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

// Firebase web config for the Bar Tap project.
// (Web API keys are not secret: access is controlled by firestore.rules and Auth settings.)
const firebaseConfig = {
  apiKey: 'AIzaSyC3rekZGPi6se5MtSc4m-KVh9o2PAqwCPY',
  authDomain: 'gen-lang-client-0654676948.firebaseapp.com',
  projectId: 'gen-lang-client-0654676948',
  storageBucket: 'gen-lang-client-0654676948.firebasestorage.app',
  messagingSenderId: '141765488529',
  appId: '1:141765488529:web:74b610b47df367d2947430',
  measurementId: 'G-GHELFF9C0L',
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ignoreUndefinedProperties lets us save objects that have optional (undefined) fields.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

// Analytics only runs in browsers that support it (not in some iframes / private modes).
export let analytics: Analytics | null = null;
export const analyticsReady: Promise<Analytics | null> = isSupported()
  .then((ok) => {
    if (ok) analytics = getAnalytics(app);
    return analytics;
  })
  .catch(() => null);
