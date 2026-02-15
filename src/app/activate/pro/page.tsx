'use client';

import ProActivationForm from '@/components/auth/ProActivationForm';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function ProActivationPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-md">
            <Card>
                <ProActivationForm />
            </Card>
            <p className="px-8 text-center text-sm text-muted-foreground mt-4">
             هل لديك حساب بالفعل؟{' '}
            <Link
                href="/login/pro"
                className="underline underline-offset-4 hover:text-primary"
            >
                سجل الدخول من هنا
            </Link>
            </p>
        </div>
    </div>
  );
}
