import { initializeApp } from 'firebase/app';

// Firebase web config from the console (Project settings > Your apps).
// These values identify the project; they are not secrets. Access is controlled by firestore.rules.
const firebaseConfig = {
  apiKey: 'AIzaSyDUZnLtOFXp8cSjFQuRNfHjg4w4O1hOruo',
  authDomain: 'wedding-site-2027.firebaseapp.com',
  projectId: 'wedding-site-2027',
  storageBucket: 'wedding-site-2027.firebasestorage.app',
  messagingSenderId: '50585727644',
  appId: '1:50585727644:web:be4131c29590b93fdcb359',
};

const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const notConfigured = firebaseConfig.projectId === 'REPLACE_ME';

// On localhost we talk to the emulator suite with a demo project, so nothing touches production.
// Set VITE_USE_PROD=1 in .env to point a local build at the real project.
export const useEmulators = notConfigured || (isLocal && import.meta.env.VITE_USE_PROD !== '1');

export const app = initializeApp(
  useEmulators ? { apiKey: 'demo-key', projectId: 'demo-wedding', authDomain: 'localhost' } : firebaseConfig,
);

// Each page creates its own Firestore instance: the guest page uses the much smaller
// firebase/firestore/lite, the dashboard uses the full SDK for live updates.
export const FIRESTORE_EMULATOR = ['127.0.0.1', 8085];
