'use client';

import ProLoginForm from '@/components/auth/ProLoginForm';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function ProLoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-md space-y-6">
            <Card>
                <ProLoginForm />
            </Card>
             <p className="px-8 text-center text-sm text-muted-foreground">
                ليس لديك حساب؟{' '}
                <Link
                    href="/activate/pro"
                    className="underline underline-offset-4 hover:text-primary"
                >
                    قم بتفعيل اشتراكك
                </Link>
            </p>
        </div>
    </div>
  );
}
