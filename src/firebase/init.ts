'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore } from 'firebase/firestore';

export const initializeFirebase = (() => {
  let firebaseServices: {
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  } | null = null;

  return () => {
    if (firebaseServices) {
      return firebaseServices;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    // تفعيل إعدادات الاتصال القصوى لضمان جلب البيانات حتى في أصعب ظروف الشبكة
    const firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true,
    });

    firebaseServices = {
      firebaseApp: app,
      auth,
      firestore,
    };

    return firebaseServices;
  };
})();
