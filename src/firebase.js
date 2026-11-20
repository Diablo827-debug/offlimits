import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { firebaseConfig } from './firebase-config.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Każde urządzenie dostaje niewidoczne, anonimowe konto (bez rejestracji).
export function ensureAuth() {
  return new Promise((resolve, reject) => {
    const off = onAuthStateChanged(auth, (u) => {
      if (u) { off(); resolve(u); }
    });
    signInAnonymously(auth).catch((e) => { off(); reject(e); });
  });
}
