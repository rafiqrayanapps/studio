'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, isLoading } = useUserProfile();
    const router = useRouter();
    const [isAllowed, setIsAllowed] = useState(false);

    useEffect(() => {
        if (isLoading) {
            return; // Still waiting for user data to load
        }

        if (user && isAdmin) {
            // If loading is complete, and the user is an admin, allow access.
            setIsAllowed(true);
        } else {
            // If loading is complete and user is not an admin, redirect.
            router.replace('/login/admin');
        }
    }, [user, isAdmin, isLoading, router]);

    // While waiting for the effect to determine access, show a loader.
    // This prevents rendering children prematurely.
    if (!isAllowed) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // If access is allowed, render the admin dashboard.
    return <>{children}</>;
}
