'use client';

import React, { useEffect, ReactNode, useState } from 'react';
import { initializeFirebase } from './init';
import { FirebaseProvider } from './provider';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<{
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  } | null>(null);

  useEffect(() => {
    // This effect runs only once on the client to initialize Firebase services
    // and enable Firestore persistence.
    const init = async () => {
      const { firebaseApp, auth, firestore } = initializeFirebase();
      try {
        // Must be called before any other Firestore operations to ensure data is cached locally.
        await enableIndexedDbPersistence(firestore);
      } catch (err: any) {
        if (err.code == 'failed-precondition') {
          // This is a common, non-critical error in multi-tab environments.
          // The app will continue with in-memory caching for this tab.
          console.warn(
            'Firestore persistence failed, likely due to multiple tabs open.'
          );
        } else {
          console.error('An unexpected error occurred while enabling Firestore persistence:', err);
        }
      }
      // Make services available to the rest of the app.
      setServices({ firebaseApp, auth, firestore });
    };

    init();
  }, []); // Empty dependency array ensures this runs only once.

  // Until persistence is enabled and services are ready, we don't render the app.
  // This prevents race conditions where Firestore is used before persistence is on.
  // The app's splash screen will cover this brief initialization period.
  if (!services) {
    return null;
  }

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
