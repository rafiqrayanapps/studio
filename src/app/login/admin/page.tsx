'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();

  // Redirect to the main unified login page
  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-bold text-muted-foreground text-center">جاري توجيهك لصفحة الدخول الموحدة...</p>
        </div>
    </div>
  );
}
