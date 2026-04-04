import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

// This check is important to prevent re-initializing the app on hot reloads.
if (getApps().length === 0) {
  // When running on Google Cloud (like Firebase Hosting with a backend),
  // credentials are automatically discovered. For local development,
  // you must set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
  app = initializeApp();
} else {
  app = getApps()[0];
}

export const adminAuth: Auth = getAuth(app);
export const adminFirestore = getFirestore(app);
