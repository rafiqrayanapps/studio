'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, isEditor, isLoading } = useUserProfile();
    const router = useRouter();

    useEffect(() => {
        // Only redirect once loading is finished
        if (!isLoading) {
            if (!user || user.isAnonymous) {
                router.replace('/login');
            } else if (!isAdmin && !isEditor) {
                // Logged in but not authorized for Admin
                router.replace('/home');
            }
        }
    }, [user, isAdmin, isEditor, isLoading, router]);

    // Show loading while checking permissions
    if (isLoading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="font-black text-muted-foreground animate-pulse text-sm">جاري تأمين الدخول...</p>
            </div>
        );
    }

    // Secondary check: if for some reason we reach here and not authorized, show error
    if (!isAdmin && !isEditor) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center gap-4">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h2 className="text-2xl font-black">غير مصرح لك بالدخول</h2>
                <p className="text-muted-foreground">ليست لديك صلاحيات المسؤول للوصول لهذه الصفحة.</p>
                <button onClick={() => router.replace('/home')} className="mt-4 px-8 py-3 bg-primary text-white rounded-2xl font-black">العودة للرئيسية</button>
            </div>
        );
    }

    return <>{children}</>;
}
