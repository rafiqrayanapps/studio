'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Loading from '@/app/loading';
import { isAdminUser } from '@/lib/utils';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdminUser(user.email)) {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || !isAdminUser(user.email)) {
    return <Loading />;
  }

  return <>{children}</>;
}
