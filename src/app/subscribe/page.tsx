'use client';

import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { PaymentLinksConfig } from '@/lib/definitions';
import { CheckCircle, Send, MessageSquare } from 'lucide-react';
import { doc } from 'firebase/firestore';
import Link from 'next/link';

export default function SubscribePage() {
    const firestore = useFirestore();
    const paymentLinksRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'paymentLinks') : null, [firestore]);
    const { data: paymentLinksData } = useDoc<PaymentLinksConfig>(paymentLinksRef);

    return (
        <div className="flex min-h-dvh flex-col bg-secondary">
            <Header title="إتمام الطلب" showMenu={false} />
            <main className="flex-1 flex items-center justify-center px-4 pb-24 -mt-24 z-10">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
                           <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl pt-4">تم استلام طلبك بنجاح!</CardTitle>
                        <CardDescription>
                            الخطوة الأخيرة! يرجى التواصل معنا عبر واتساب أو تلجرام وإرسال إثبات الدفع لتفعيل اشتراكك فوراً.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         {paymentLinksData?.whatsappUrl && (
                            <Button asChild className="w-full bg-green-500 hover:bg-green-600 text-white" size="lg">
                                <a href={paymentLinksData.whatsappUrl} target="_blank" rel="noopener noreferrer">
                                    <MessageSquare className="ml-2 h-5 w-5" />
                                    تواصل عبر واتساب
                                </a>
                            </Button>
                        )}
                        {paymentLinksData?.telegramUrl && (
                            <Button asChild className="w-full bg-sky-500 hover:bg-sky-600 text-white" size="lg">
                               <a href={paymentLinksData.telegramUrl} target="_blank" rel="noopener noreferrer">
                                   <Send className="ml-2 h-5 w-5" />
                                   تواصل عبر تلجرام
                               </a>
                           </Button>
                        )}
                         <Button variant="ghost" asChild className="w-full">
                            <Link href="/home">
                                العودة إلى الرئيسية
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
