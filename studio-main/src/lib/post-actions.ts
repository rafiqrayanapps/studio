import { adminFirestore } from './firebase-admin';
import { revalidatePath } from 'next/cache';

export async function deletePost(id: string) {
  try {
    await adminFirestore.collection('posts').doc(id).delete();
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
