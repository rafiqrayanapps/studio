'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import ProActivationForm from '@/components/auth/ProActivationForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { PaymentLinksConfig } from '@/lib/definitions';
import { MessageCircle, CreditCard, Bot } from 'lucide-react'; // Assuming 'Bot' for Telegram, as there's no official one

export default function ProActivationPage() {
    const firestore = useFirestore();
    const paymentLinksRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'paymentLinks') : null, [firestore]);
    const { data: paymentLinks } = useDoc<PaymentLinksConfig>(paymentLinksRef);

    const iconMap: { [key: string]: React.ElementType } = {
        paypalUrl: CreditCard,
        whatsappUrl: MessageCircle,
        telegramUrl: Bot // Using Bot icon for Telegram
    };

    const links = useMemo(() => [
        { key: 'paypalUrl', text: 'الدفع عبر بايبال' },
        { key: 'whatsappUrl', text: 'تواصل عبر واتساب' },
        { key: 'telegramUrl', text: 'تواصل عبر تلجرام' },
    ], []);


  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-md">
             <Card className="mb-6">
                <CardContent className="p-4 space-y-3">
                    <h3 className="text-center font-bold text-lg">للحصول على كود تفعيل</h3>
                     <div className="grid grid-cols-1 gap-3">
                        {links.map(({ key, text }) => {
                            const url = paymentLinks?.[key as keyof PaymentLinksConfig];
                            if (!url) return null;
                            const Icon = iconMap[key];
                            return (
                                <Button asChild key={key} variant="outline" className="justify-start gap-3">
                                    <a href={url} target="_blank" rel="noopener noreferrer">
                                        <Icon className="h-5 w-5 text-primary" />
                                        <span>{text}</span>
                                    </a>
                                </Button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

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
