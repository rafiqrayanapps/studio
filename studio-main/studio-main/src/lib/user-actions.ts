'use server';

import { adminAuth, adminFirestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

/**
 * Creates a new user account by an Admin.
 * This sets up both Firebase Auth and the Firestore Profile.
 */
export async function createUserByAdmin(data: { email: string; password: string; role: 'admin' | 'editor' | 'pro'; displayName: string }) {
    try {
        // 1. Create user in Firebase Auth
        const userRecord = await adminAuth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.displayName,
        });

        // 2. Create the Whitelist entry
        await adminFirestore.collection('whitelist').doc(data.email.toLowerCase()).set({
            email: data.email.toLowerCase(),
            role: data.role,
            isActivated: true,
            activatedByUid: userRecord.uid,
            createdAt: new Date(),
            activationCode: 'MANUAL_ENTRY'
        });

        // 3. Create User Profile
        await adminFirestore.collection('users').doc(userRecord.uid).set({
            email: data.email.toLowerCase(),
            displayName: data.displayName,
            subscriptionTier: data.role === 'admin' || data.role === 'editor' ? 'free' : 'pro',
            createdAt: new Date(),
            points: 0,
            referralCode: `ADM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            referralCount: 0,
            unlockedProCodes: [],
            deviceFingerprint: 'ADMIN_CREATED'
        });

        revalidatePath('/admin/dashboard');
        return { success: true, uid: userRecord.uid };
    } catch (error: any) {
        console.error('Error creating user by admin:', error);
        return { success: false, error: error.message || 'فشل إنشاء الحساب' };
    }
}

export async function deleteUserAccount(uid: string) {
    if (!uid) {
        return { success: false, error: 'User ID is missing.' };
    }

    try {
        await adminAuth.deleteUser(uid);
        const userProfileRef = adminFirestore.collection('users').doc(uid);
        await userProfileRef.delete();
        revalidatePath('/admin/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting user account:', error);
        return { success: false, error: 'فشل حذف حساب المستخدم.' };
    }
}
