'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import type { UserProfile, WhitelistEntry } from '@/lib/definitions';
import { useEffect, useState } from 'react';
import { getDeviceFingerprint } from '@/lib/fingerprint';

export function useUserProfile() {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Auto sign-in anonymously if no user session exists
    useEffect(() => {
        if (!isAuthLoading && !user && !isLoggingOut && auth) {
            signInAnonymously(auth).catch(err => console.error("Anonymous auth failed:", err));
        }
    }, [user, isAuthLoading, auth, isLoggingOut]);

    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    // If a user exists but has no profile document, create one (especially for anonymous/new users)
    useEffect(() => {
        if (firestore && user && !isProfileLoading && !userProfile) {
            const createProfile = async () => {
                const fingerprint = await getDeviceFingerprint();
                // Requirement: Use first 6 chars of fingerprint as the stable referral code
                const myReferralCode = fingerprint.substring(0, 6).toUpperCase();

                setDoc(doc(firestore, 'users', user.uid), {
                    email: user.email || '',
                    displayName: user.displayName || (user.isAnonymous ? 'زائر' : 'مستخدم'),
                    subscriptionTier: 'free',
                    createdAt: serverTimestamp(),
                    points: 0,
                    referralCode: myReferralCode,
                    referralCount: 0,
                    unlockedProCodes: [],
                    referredBy: null,
                    deviceFingerprint: fingerprint
                }, { merge: true });
            };
            createProfile();
        }
    }, [firestore, user, isProfileLoading, userProfile]);

    const whitelistRef = useMemoFirebase(
        () => (firestore && user?.email ? doc(firestore, 'whitelist', user.email.toLowerCase()) : null),
        [firestore, user?.email]
    );

    const { data: whitelistEntry, isLoading: isWhitelistLoading } = useDoc<WhitelistEntry>(whitelistRef);
    
    // Security: Single Device Enforcement
    useEffect(() => {
        if (!firestore || !user || !whitelistEntry || isLoggingOut) return;

        const unsubscribe = onSnapshot(whitelistRef as any, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as WhitelistEntry;
                const currentFingerprint = await getDeviceFingerprint();
                
                if (data.deviceFingerprints && data.deviceFingerprints.length > 0) {
                    const latestFingerprint = data.deviceFingerprints[data.deviceFingerprints.length - 1];
                    if (latestFingerprint !== currentFingerprint) {
                        console.warn("Session started on another device. Signing out...");
                        setIsLoggingOut(true);
                        await auth.signOut();
                        window.location.reload();
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [firestore, user, whitelistEntry, whitelistRef, auth, isLoggingOut]);

    const isAdmin = whitelistEntry?.role === 'admin';
    const isEditor = whitelistEntry?.role === 'editor';

    let isPro = false;
    if (isAdmin || isEditor) {
        isPro = true;
    } else if (userProfile?.subscriptionTier === 'pro') {
        const endDate = userProfile.subscriptionEndDate?.toDate ? userProfile.subscriptionEndDate.toDate() : null;
        if (!endDate || endDate > new Date()) {
             isPro = true;
        }
    }
    
    return { 
        user, 
        userProfile, 
        isPro, 
        isAdmin, 
        isEditor,
        points: userProfile?.points || 0,
        isLoading: isAuthLoading || isProfileLoading || (user?.email ? isWhitelistLoading : false)
    };
}
