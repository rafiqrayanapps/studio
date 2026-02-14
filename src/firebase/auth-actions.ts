'use client';

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import type { UserProfile } from '@/lib/definitions';

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (auth: Auth, firestore: Firestore) => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await createUserProfileDocument(result.user, firestore);
  } catch (error) {
    console.error("Error during Google sign-in:", error);
    // Optionally, handle specific errors like 'auth/popup-closed-by-user'
  }
};

export const createUserProfileDocument = async (userAuth: User, firestore: Firestore) => {
  if (!userAuth) return;

  const userRef = doc(firestore, `users/${userAuth.uid}`);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { displayName, email, photoURL } = userAuth;
    const createdAt = serverTimestamp();

    try {
      const newUserProfile: Omit<UserProfile, 'id'> = {
        displayName: displayName || 'مستخدم جديد',
        email: email || '',
        photoURL: photoURL || '',
        createdAt,
        subscriptionTier: 'free',
      };
      await setDoc(userRef, newUserProfile);
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  }
  return userRef;
};
