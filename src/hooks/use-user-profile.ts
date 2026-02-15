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
        () => (firestore && user?.email ? doc(firestore, 'whitelist', user.email.toLowerCase()) : null),
        [firestore, user?.email]
    );

    const { data: whitelistEntry, isLoading: isWhitelistLoading } = useDoc<WhitelistEntry>(whitelistRef);
    
    // Hardcoded check for the first admin to solve the chicken/egg problem.
    const isSuperAdmin = user?.email?.toLowerCase() === 'artbag.rayanapp@gmail.com';

    const isAdmin = isSuperAdmin || whitelistEntry?.role === 'admin';

    let isPro = false;
    if (isAdmin) {
        // Admins have all pro privileges
        isPro = true;
    } else if (userProfile?.subscriptionTier === 'pro') {
        const endDate = userProfile.subscriptionEndDate?.toDate();
        // If there's no end date, it's a permanent subscription.
        // If there is an end date, check if it's in the future.
        if (!endDate || endDate > new Date()) {
             isPro = true;
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
