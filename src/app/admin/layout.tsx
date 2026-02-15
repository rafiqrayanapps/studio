'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, isLoading } = useUserProfile();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) {
            return; // Wait for user profile and role to be loaded
        }

        // If not loading, and there's no user or the user is not an admin,
        // redirect them to the home page.
        // We only allow access if they are an admin.
        if (!user || !isAdmin) {
            router.replace('/home');
        }

    }, [user, isAdmin, isLoading, router]);

    // While loading, or if we are about to redirect because the user is not an admin, show a loader.
    if (isLoading || !user || !isAdmin) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // If all checks pass (user is loaded and is an admin), render the children (e.g., the admin dashboard).
    return <>{children}</>;
}
