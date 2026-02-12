'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// This is a safer singleton pattern using a closure.
export const initializeFirebase = (() => {
  let firebaseServices: {
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  } | null = null;

  return () => {
    // If services are already initialized, return them.
    if (firebaseServices) {
      return firebaseServices;
    }

    // Initialize Firebase.
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    // Store the initialized services in the closure.
    firebaseServices = {
      firebaseApp: app,
      auth,
      firestore,
    };

    return firebaseServices;
  };
})();
