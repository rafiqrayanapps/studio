'use client';

import AdminLoginForm from '@/components/auth/AdminLoginForm';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-md">
            <Card>
                <AdminLoginForm />
            </Card>
            <p className="px-8 text-center text-sm text-muted-foreground mt-4">
               إذا كنت مسؤولاً جديداً وليس لديك حساب بعد، يمكنك إنشاء حساب من خلال صفحة تفعيل اشتراك برو (باستخدام أي كود مؤقت) ثم تسجيل الدخول هنا لأول مرة للحصول على صلاحيات المسؤول.
            </p>
        </div>
    </div>
  );
}
