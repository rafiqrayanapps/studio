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

        const isLoginPage = pathname.startsWith('/login/admin');

        if (!user && !isLoginPage) {
            router.replace('/login/admin');
        }
        if (user && isLoginPage) {
            router.replace('/admin/dashboard');
        }
    }, [user, isUserLoading, router, pathname]);

    if (isUserLoading || (!user && !pathname.startsWith('/login/admin')) || (user && pathname.startsWith('/login/admin'))) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    // Allow rendering children if we are on a login page and not authenticated
    if (!user && (pathname.startsWith('/login/') || pathname.startsWith('/activate/'))) {
        return <>{children}</>;
    }
    
    // For any other case under /admin path, if user is not loaded or not logged in, show loader.
    if(pathname.startsWith('/admin') && (!user || isUserLoading)){
         return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
