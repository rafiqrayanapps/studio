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
                        status: 'approved', // Anonymous or auto-created guest profiles are approved by default
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

    // 4. Security: Single Device Enforcement & Account Guard
    useEffect(() => {
        if (!firestore || !user || user.isAnonymous || !userProfile || !deviceFingerprint || isLoggingOut) return;

        const userRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userRef, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as UserProfile;
                
                // Kicked by single device logic
                if (data.deviceFingerprint && data.deviceFingerprint !== deviceFingerprint) {
                    setIsLoggingOut(true);
                    try {
                        await auth.signOut();
                        window.location.href = '/login?error=session_expired';
                    } catch (e) {
                        console.error("Error signing out:", e);
                    }
                }

                // Kicked if admin rejects account while active
                if (data.status === 'rejected') {
                    setIsLoggingOut(true);
                    try {
                        await auth.signOut();
                        window.location.href = '/login';
                    } catch (e) {}
                }
            }
        });

        return () => unsubscribe();
    }, [firestore, user, userProfile, deviceFingerprint, auth, isLoggingOut]);

    const whitelistRef = useMemoFirebase(
        () => (firestore && user?.email ? doc(firestore, 'whitelist', user.email.toLowerCase()) : null),
        [firestore, user?.email]
    );

    const { data: whitelistEntry, isLoading: isWhitelistLoading } = useDoc<WhitelistEntry>(whitelistRef);
    
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
    
    // An account is viewable only if approved or it's a guest
    const isAccountActive = userProfile?.status === 'approved' || (user && user.isAnonymous);

    const isLoading = isAuthLoading || (user && !user.isAnonymous && (isProfileLoading || isWhitelistLoading));

    return { 
        user, 
        userProfile, 
        isPro, 
        isAdmin, 
        isEditor,
        isAccountActive,
        points: userProfile?.points ?? 0,
        isLoading
    };
}
