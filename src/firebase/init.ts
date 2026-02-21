'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore } from 'firebase/firestore';

// نمط Singleton لضمان استقرار خدمات Firebase عبر التطبيق
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
    
    /**
     * تفعيل Long Polling هو الحل الجذري لمشكلة "Could not reach backend".
     * يضمن هذا الإعداد استقرار الاتصال حتى في بيئات التطوير المقيدة أو الشبكات الضعيفة،
     * مما يسمح بتحميل إعدادات الإعلانات فوراً وبدون فشل.
     */
    const firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });

    firebaseServices = {
      firebaseApp: app,
      auth,
      firestore,
    };

    return firebaseServices;
  };
})();
