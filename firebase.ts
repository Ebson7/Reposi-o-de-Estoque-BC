import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// CRITICAL: Always use named database when configured in firebase-applet-config.json
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Autenticação anônima para conexão segura e persistente
signInAnonymously(auth).catch((err) => {
  console.warn('[Firebase Auth] Conexão anônima inicializada:', err.message);
});
