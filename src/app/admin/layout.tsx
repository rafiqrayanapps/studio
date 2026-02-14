'use client';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isUserLoading) return;

        const isLoginPage = pathname === '/login';

        if (!user && !isLoginPage) {
            router.replace('/login');
        }
        if (user && isLoginPage) {
            router.replace('/admin/dashboard');
        }
    }, [user, isUserLoading, router, pathname]);

    if (isUserLoading || (!user && pathname !== '/login') || (user && pathname === '/login')) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return <>{children}</>;
}
