'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import type { UserProfile, WhitelistEntry } from '@/lib/definitions';
import { useEffect, useState, useMemo } from 'react';
import { getDeviceFingerprint } from '@/lib/fingerprint';

export function useUserProfile() {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
    const [tempReferralCode, setTempReferralCode] = useState<string | null>(null);

    // 1. Initial fingerprint generation
    useEffect(() => {
        getDeviceFingerprint().then(fp => {
            setDeviceFingerprint(fp);
            const stableSuffix = fp.substring(0, 4).toUpperCase();
            setTempReferralCode(`RF-${stableSuffix}`);
        });
    }, []);

    // 2. Auto sign-in anonymously if no user session exists
    useEffect(() => {
        if (!isAuthLoading && !user && !isLoggingOut && auth) {
            signInAnonymously(auth).catch(err => {
                console.warn("Anonymous auth restricted.", err);
            });
        }
    }, [user, isAuthLoading, auth, isLoggingOut]);

    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    // 3. Create user profile if it doesn't exist
    useEffect(() => {
        if (firestore && user && !isProfileLoading && deviceFingerprint && tempReferralCode && !userProfile) {
            const createProfile = async () => {
                try {
                    await setDoc(doc(firestore, 'users', user.uid), {
                        email: user.email || '',
                        displayName: user.displayName || (user.isAnonymous ? 'زائر' : 'مستخدم'),
                        subscriptionTier: 'free',
                        createdAt: serverTimestamp(),
                        points: 0, 
                        referralCode: tempReferralCode,
                        referralCount: 0,
                        unlockedProCodes: [],
                        referredBy: null,
                        deviceFingerprint: deviceFingerprint
                    });
                } catch (err) {
                    console.error("Failed to auto-create user profile:", err);
                }
            };
            createProfile();
        }
    }, [firestore, user, isProfileLoading, userProfile, deviceFingerprint, tempReferralCode]);

    const whitelistRef = useMemoFirebase(
        () => (firestore && user?.email ? doc(firestore, 'whitelist', user.email.toLowerCase()) : null),
        [firestore, user?.email]
    );

    const { data: whitelistEntry, isLoading: isWhitelistLoading } = useDoc<WhitelistEntry>(whitelistRef);
    
    // 4. Security: Single Device Enforcement (New Session kicks Old Session)
    useEffect(() => {
        if (!firestore || !user || !whitelistEntry || isLoggingOut || !whitelistRef || !deviceFingerprint) return;

        const unsubscribe = onSnapshot(whitelistRef as any, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                // Check 'lastActiveFingerprint' or the last element in 'deviceFingerprints'
                const fingerprints = data.deviceFingerprints || [];
                const latestFingerprint = data.lastActiveFingerprint || (fingerprints.length > 0 ? fingerprints[fingerprints.length - 1] : null);
                
                if (latestFingerprint && latestFingerprint !== deviceFingerprint) {
                    // Someone else logged in from another device
                    console.warn("New session started on another device. Signing out this session...");
                    setIsLoggingOut(true);
                    await auth.signOut();
                    window.location.href = '/login?error=session_expired';
                }
            }
        });

        return () => unsubscribe();
    }, [firestore, user, whitelistEntry, whitelistRef, auth, isLoggingOut, deviceFingerprint]);

    const isAdmin = whitelistEntry?.role === 'admin';
    const isEditor = whitelistEntry?.role === 'editor';

    const isPro = useMemo(() => {
        if (isAdmin || isEditor) return true;
        if (userProfile?.subscriptionTier === 'pro') {
            if (userProfile.subscriptionEndDate) {
                return userProfile.subscriptionEndDate.toDate() > new Date();
            }
            return true;
        }
        return false;
    }, [isAdmin, isEditor, userProfile]);
    
    // Auth is loading, or we have a user but haven't loaded their profile/whitelist yet
    const isLoading = isAuthLoading || (user && !user.isAnonymous && (isProfileLoading || isWhitelistLoading));

    return { 
        user, 
        userProfile, 
        isPro, 
        isAdmin, 
        isEditor,
        points: userProfile?.points ?? 0,
        isLoading
    };
}
