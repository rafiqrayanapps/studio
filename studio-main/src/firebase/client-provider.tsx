'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { FirebaseProvider } from './provider';

interface FirebaseClientProviderProps {
  children: React.ReactNode;
}

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  firestore = getFirestore(app);
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  return (
    <FirebaseProvider value={{ app, auth, firestore }}>
      {children}
    </FirebaseProvider>
  );
}
