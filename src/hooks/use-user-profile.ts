'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
            setTempReferralCode(fp.substring(0, 6).toUpperCase());
        });
    }, []);

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

    // If a user exists but has no profile document or missing referralCode, create/update one
    useEffect(() => {
        if (firestore && user && !isProfileLoading && deviceFingerprint) {
            const createOrUpdateProfile = async () => {
                try {
                    const code = deviceFingerprint.substring(0, 6).toUpperCase();

                    if (!userProfile) {
                        // Create initial profile for anonymous or new user
                        await setDoc(doc(firestore, 'users', user.uid), {
                            email: user.email || '',
                            displayName: user.displayName || (user.isAnonymous ? 'زائر' : 'مستخدم'),
                            subscriptionTier: 'free',
                            createdAt: serverTimestamp(),
                            points: 1, // Welcome point
                            referralCode: code,
                            referralCount: 0,
                            unlockedProCodes: [],
                            referredBy: null,
                            deviceFingerprint: deviceFingerprint
                        });
                    } else if (!userProfile.referralCode) {
                        // Update existing profile if code is missing
                        await updateDoc(doc(firestore, 'users', user.uid), {
                            referralCode: code,
                            deviceFingerprint: deviceFingerprint
                        });
                    }
                } catch (err) {
                    console.error("Failed to manage user profile:", err);
                }
            };
            createOrUpdateProfile();
        }
    }, [firestore, user, isProfileLoading, userProfile, deviceFingerprint]);

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
    
    return { 
        user, 
        userProfile: userProfile || (user && tempReferralCode ? { 
            referralCode: tempReferralCode, 
            points: 1, 
            subscriptionTier: 'free' 
        } as any : null), 
        isPro, 
        isAdmin, 
        isEditor,
        points: userProfile?.points ?? (user ? 1 : 0),
        // Important: Wait for whitelist loading to prevent premature redirects in admin layout
        isLoading: isAuthLoading || (user && isProfileLoading && !tempReferralCode) || (user?.email ? isWhitelistLoading : false)
    };
}
