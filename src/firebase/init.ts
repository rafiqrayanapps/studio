
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore } from 'firebase/firestore';

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

    // Initialize Firebase App.
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    // Initialize Auth.
    const auth = getAuth(app);
    
    // Initialize Firestore with specific settings to avoid "code=unavailable" errors
    // in restricted environments (like cloud workstations/proxies).
    const firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true, // Key fix for "Could not reach backend"
    });

    // Store the initialized services in the closure.
    firebaseServices = {
      firebaseApp: app,
      auth,
      firestore,
    };

    return firebaseServices;
  };
})();
