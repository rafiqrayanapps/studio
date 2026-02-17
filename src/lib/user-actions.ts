'use server';

import { adminAuth, adminFirestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

export async function deleteUserAccount(uid: string) {
    if (!uid) {
        return { success: false, error: 'User ID is missing.' };
    }

    try {
        // Delete from Firebase Authentication
        await adminAuth.deleteUser(uid);

        // Delete from Firestore user profile collection
        const userProfileRef = adminFirestore.collection('users').doc(uid);
        await userProfileRef.delete();
        
        // Optionally, revalidate paths if user data is shown elsewhere
        revalidatePath('/admin/dashboard');

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting user account:', error);
        
        // Avoid leaking detailed internal errors to the client.
        let errorMessage = 'فشل حذف حساب المستخدم.';
        if (error.code === 'auth/user-not-found') {
            // If user is not in auth, maybe they were already deleted.
            // We can proceed to delete from firestore, or just consider it a success.
            // For simplicity, we'll log it and return success, as the end state is achieved.
            console.warn(`User with UID: ${uid} not found in Firebase Auth. May have been already deleted.`);
            
            // Attempt to delete firestore doc just in case.
            try {
                const userProfileRef = adminFirestore.collection('users').doc(uid);
                await userProfileRef.delete();
                return { success: true };
            } catch (firestoreError: any) {
                return { success: false, error: 'فشل حذف بيانات المستخدم من قاعدة البيانات.' };
            }
        }
        
        return { success: false, error: errorMessage };
    }
}
