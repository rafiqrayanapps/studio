'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { UserProfile } from '@/firebase/firestore';
import { DEFAULT_ADMIN_EMAIL } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    // جلب بيانات المستخدم من Firestore (مجموعة Users بحرف كبير)
    const userDocRef = useMemo(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'Users', user.uid);
    }, [firestore, user]);

    const { data: userData, loading: docLoading } = useDoc<UserProfile>(userDocRef);

    const isLoading = authLoading || docLoading;
    
    // التحقق: هل هو الحساب الافتراضي أم لديه رتبة admin في Firestore؟
    const isAdmin = user?.email === DEFAULT_ADMIN_EMAIL || userData?.role === 'admin';
    const isEditor = userData?.role === 'editor'; // إذا كان لديك رتبة محرر

    useEffect(() => {
        if (!isLoading) {
            if (!user || user.isAnonymous) {
                router.replace('/login');
            } else if (!isAdmin && !isEditor) {
                // إذا لم يكن أدمن، يتم توجيهه للرئيسية
                router.replace('/');
            }
        }
    }, [user, isAdmin, isEditor, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="font-black text-muted-foreground animate-pulse text-sm">جاري تأمين الدخول...</p>
            </div>
        );
    }

    if (!isAdmin && !isEditor) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center gap-4">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h2 className="text-2xl font-black">غير مصرح لك بالدخول</h2>
                <p className="text-muted-foreground">ليست لديك صلاحيات المسؤول للوصول لهذه الصفحة.</p>
                <button onClick={() => router.replace('/')} className="mt-4 px-8 py-3 bg-primary text-white rounded-2xl font-black">العودة للرئيسية</button>
            </div>
        );
    }

    return <>{children}</>;
}
