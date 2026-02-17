'use client';

import AdminLoginForm from '@/components/auth/AdminLoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-md">
            <Card>
                <AdminLoginForm />
            </Card>
             <p className="px-8 text-center text-sm text-muted-foreground mt-4">
               ليس لديك حساب؟{' '}
            <Button variant="link" asChild className="p-0 h-auto">
                <Link
                    href="/activate"
                    className="underline underline-offset-4 hover:text-primary"
                >
                    فعّل اشتراكك من هنا
                </Link>
            </Button>
            </p>
        </div>
    </div>
  );
}
