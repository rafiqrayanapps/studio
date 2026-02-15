'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile, WhitelistEntry } from '@/lib/definitions';

export function useUserProfile() {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const whitelistRef = useMemoFirebase(
        () => (firestore && user?.email ? doc(firestore, 'whitelist', user.email) : null),
        [firestore, user?.email]
    );

    const { data: whitelistEntry, isLoading: isWhitelistLoading } = useDoc<WhitelistEntry>(whitelistRef);
    
    const isAdmin = whitelistEntry?.role === 'admin';

    let isPro = false;
    if (isAdmin) {
        // Admins have all pro privileges
        isPro = true;
    } else if (userProfile?.subscriptionTier === 'pro') {
        // For pro users, check if their subscription is still valid
        if (userProfile.subscriptionEndDate && typeof userProfile.subscriptionEndDate.toDate === 'function') {
            if (userProfile.subscriptionEndDate.toDate() > new Date()) {
                isPro = true;
            }
        }
    }
    
    return { 
        user, 
        userProfile, 
        isPro, 
        isAdmin, 
        isLoading: isAuthLoading || isProfileLoading || isWhitelistLoading 
    };
}
