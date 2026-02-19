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
    const [tempReferralCode, setTempReferralCode] = useState<string | null>(null);
    const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);

    // Initial fingerprint generation
    useEffect(() => {
        getDeviceFingerprint().then(fp => {
            setDeviceFingerprint(fp);
            const stableSuffix = fp.substring(0, 4).toUpperCase();
            setTempReferralCode(`RF-${stableSuffix}`);
        });
    }, []);

    // Auto sign-in anonymously if no user session exists
    useEffect(() => {
        if (!isAuthLoading && !user && !isLoggingOut && auth) {
            signInAnonymously(auth).catch(err => {
                // If this fails, typically Anonymous auth is disabled in Firebase Console
                console.warn("Anonymous auth restricted. Please enable it in Firebase Console if needed.", err);
            });
        }
    }, [user, isAuthLoading, auth, isLoggingOut]);

    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    // Create user profile if it doesn't exist
    useEffect(() => {
        if (firestore && user && !isProfileLoading && deviceFingerprint && tempReferralCode && !userProfile) {
            const createProfile = async () => {
                try {
                    await setDoc(doc(firestore, 'users', user.uid), {
                        email: user.email || '',
                        displayName: user.displayName || (user.isAnonymous ? 'زائر' : 'مستخدم'),
                        subscriptionTier: 'free',
                        createdAt: serverTimestamp(),
                        points: 1, 
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
    
    // Security: Single Device Enforcement
    useEffect(() => {
        if (!firestore || !user || !whitelistEntry || isLoggingOut || !whitelistRef) return;

        const unsubscribe = onSnapshot(whitelistRef as any, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as WhitelistEntry;
                const currentFingerprint = await getDeviceFingerprint();
                
                const fingerprints = data.deviceFingerprints || (data.deviceFingerprint ? [data.deviceFingerprint] : []);
                
                if (fingerprints.length > 0) {
                    const latestFingerprint = fingerprints[fingerprints.length - 1];
                    if (latestFingerprint !== currentFingerprint && fingerprints.includes(currentFingerprint)) {
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
    
    const finalLoading = isAuthLoading || (user && isProfileLoading && !tempReferralCode) || (!!user?.email && isWhitelistLoading);

    return { 
        user, 
        userProfile: userProfile || (user && tempReferralCode ? { 
            referralCode: tempReferralCode, 
            points: userProfile?.points ?? 1, 
            subscriptionTier: 'free' 
        } as any : null), 
        isPro, 
        isAdmin, 
        isEditor,
        points: userProfile?.points ?? (user ? 1 : 0),
        isLoading: finalLoading
    };
}