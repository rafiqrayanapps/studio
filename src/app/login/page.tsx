'use client';

import AdminLoginForm from '@/components/auth/AdminLoginForm';
import ProActivationForm from '@/components/auth/ProActivationForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-md">
            <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                    <TabsTrigger value="activate">تفعيل الاشتراك</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <Card>
                       <AdminLoginForm />
                    </Card>
                </TabsContent>
                <TabsContent value="activate">
                    <Card>
                        <ProActivationForm />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}

    