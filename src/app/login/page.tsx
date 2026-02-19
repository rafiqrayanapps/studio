 'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import AdminLoginForm from '@/components/auth/AdminLoginForm';
import ProLoginForm from '@/components/auth/ProLoginForm';
import ConversionForm from '@/components/auth/ConversionForm';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ShieldCheck, Crown, Coins, Loader2 } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('pro');

  useEffect(() => {
      const tab = searchParams.get('tab');
      if (tab === 'convert') {
          setActiveTab('convert');
      }
  }, [searchParams]);

  return (
    <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary">رفيق المصمم</h1>
            <p className="text-muted-foreground text-sm">اختر طريقة الدخول المناسبة لك</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-3 h-14 bg-card shadow-sm rounded-xl p-1">
                <TabsTrigger value="pro" className="rounded-lg gap-2">
                    <Crown className="h-4 w-4" />
                    <span>دخول</span>
                </TabsTrigger>
                <TabsTrigger value="convert" className="rounded-lg gap-2">
                    <Coins className="h-4 w-4" />
                    <span>تحويل</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="rounded-lg gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>إدارة</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="pro" className="mt-4">
                <Card>
                    <ProLoginForm />
                </Card>
            </TabsContent>

            <TabsContent value="convert" className="mt-4">
                <Card>
                    <ConversionForm />
                </Card>
            </TabsContent>

            <TabsContent value="admin" className="mt-4">
                <Card>
                    <AdminLoginForm 
                        title="دخول الإدارة"
                        description="هذا القسم مخصص للمديرين والمحررين فقط"
                    />
                </Card>
            </TabsContent>
        </Tabs>

        <p className="px-8 text-center text-sm text-muted-foreground">
           ليس لديك كود تفعيل؟{' '}
            <Link
                href="/pricing"
                className="underline underline-offset-4 hover:text-primary font-bold"
            >
                اطلب اشتراكك الآن
            </Link>
        </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
        <Suspense fallback={<Loader2 className="animate-spin text-primary" />}>
            <LoginContent />
        </Suspense>
    </div>
  );
}
