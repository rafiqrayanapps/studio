'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import AdminLoginForm from '@/components/auth/AdminLoginForm';
import ProLoginForm from '@/components/auth/ProLoginForm';
import UserSignupForm from '@/components/auth/UserSignupForm';
import ConversionForm from '@/components/auth/ConversionForm';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ShieldCheck, Crown, Coins, Loader2, UserPlus, LogIn, Lock } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('pro');

  useEffect(() => {
      const tab = searchParams.get('tab');
      if (tab === 'convert') {
          setActiveTab('convert');
      } else if (tab === 'signup') {
          setActiveTab('signup');
      } else if (tab === 'admin') {
          setActiveTab('admin');
      }
  }, [searchParams]);

  return (
    <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
            <div className="bg-primary text-primary-foreground w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-xl rotate-3 mb-4">
                <Crown className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter">رفيق المصمم</h1>
            <p className="text-muted-foreground text-sm font-medium">بوابتك لعالم الإبداع والجوائز</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-4 h-14 bg-card shadow-sm rounded-2xl p-1 border">
                <TabsTrigger value="pro" className="rounded-xl gap-1.5 text-[10px] font-bold">
                    <LogIn className="h-3.5 w-3.5" />
                    <span>دخول</span>
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl gap-1.5 text-[10px] font-bold">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>حساب جديد</span>
                </TabsTrigger>
                <TabsTrigger value="convert" className="rounded-xl gap-1.5 text-[10px] font-bold">
                    <Coins className="h-3.5 w-3.5" />
                    <span>تحويل</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="rounded-xl gap-1.5 text-[10px] font-bold">
                    <Lock className="h-3.5 w-3.5" />
                    <span>إدارة</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="pro" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <ProLoginForm />
                </Card>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <UserSignupForm />
                </Card>
            </TabsContent>

            <TabsContent value="convert" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <ConversionForm />
                </Card>
            </TabsContent>

            <TabsContent value="admin" className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <AdminLoginForm 
                        title="دخول الإدارة"
                        description="هذا القسم مخصص للمديرين والمحررين فقط"
                    />
                </Card>
            </TabsContent>
        </Tabs>

        <div className="text-center space-y-4">
            <p className="px-8 text-sm text-muted-foreground font-medium">
               ليس لديك كود تفعيل؟{' '}
                <Link
                    href="/pricing"
                    className="text-primary hover:underline underline-offset-4 font-black"
                >
                    اطلب اشتراكك الآن
                </Link>
            </p>
            
            <div className="flex items-center justify-center gap-4 pt-4 border-t opacity-50">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-black uppercase tracking-widest">التطبيق الرسمي للمصممين</span>
                <div className="h-px flex-1 bg-border" />
            </div>
        </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-6">
        <Suspense fallback={<div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-primary h-10 w-10" /><p className="font-bold text-muted-foreground">جاري التحميل...</p></div>}>
            <LoginContent />
        </Suspense>
    </div>
  );
}
