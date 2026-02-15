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
        </div>
    </div>
  );
}
