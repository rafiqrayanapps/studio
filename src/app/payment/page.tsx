'use client';

import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import type { PaymentLinksConfig, PaymentMethod } from '@/lib/definitions';
import { doc, query, collection, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import SubscriptionRequestForm from '@/components/forms/SubscriptionRequestForm';
import { Skeleton } from '@/components/ui/skeleton';
import DynamicIcon from '@/components/ui/dynamic-icon';
import { ArrowLeft, Handshake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

function PaymentPageContent() {
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const planName = searchParams.get('plan') || '';
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<string>('SA');

    const paymentLinksRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'paymentLinks') : null, [firestore]);
    const { data: paymentLinksData, isLoading: isLoadingLinks } = useDoc<PaymentLinksConfig>(paymentLinksRef);

    const paymentMethodsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'paymentMethods'), orderBy('order', 'asc')) : null, [firestore]);
    const { data: allPaymentMethods, isLoading: isLoadingMethods } = useCollection<PaymentMethod>(paymentMethodsQuery);

    const filteredPaymentMethods = useMemo(() => {
        if (!allPaymentMethods) return [];
        const enabledMethods = allPaymentMethods.filter(method => method.enabled);
        if (!selectedCountry) return enabledMethods.filter(method => method.country === 'ALL');
        return enabledMethods.filter(method => method.country === selectedCountry || method.country === 'ALL');
    }, [allPaymentMethods, selectedCountry]);

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        toast({
            title: "تم استلام طلبك بنجاح!",
            description: "شكراً لك. سيتم مراجعة طلبك وتفعيل الاشتراك قريباً.",
        });
        router.push('/home');
    }

    if (!planName) {
        return (
             <div className="text-center">
                <p className="text-destructive">لم يتم تحديد خطة. الرجاء العودة واختيار خطة أولاً.</p>
                <Button asChild variant="link"><Link href="/pricing">العودة إلى خطط الأسعار</Link></Button>
            </div>
        );
    }
    
    return (
        <>
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">إتمام الاشتراك في خطة "{planName}"</CardTitle>
                    <CardDescription>
                        يرجى اتباع الإرشادات التالية لإكمال عملية الدفع وتسجيل بياناتك.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isLoadingLinks ? <Skeleton className="h-24 w-full" /> : paymentLinksData?.paymentInstructions && (
                        <div className="text-sm text-muted-foreground bg-muted p-4 rounded-xl border space-y-1">
                            <p className="font-bold text-foreground text-base">⚠️ تعليمات هامة:</p>
                            <p className="whitespace-pre-wrap leading-relaxed">{paymentLinksData.paymentInstructions}</p>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                         {isLoadingMethods ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            filteredPaymentMethods.map(method => (
                                <Button key={method.id} variant="outline" asChild className="w-full h-12 text-base">
                                    <a href={method.link} target="_blank" rel="noopener noreferrer">
                                        <DynamicIcon name={method.icon} className="ml-2 h-5 w-5" />
                                        {method.name}
                                    </a>
                                </Button>
                            ))
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-3 pt-6 border-t">
                    <Button onClick={() => setIsFormOpen(true)} className="w-full" size="lg">
                         <Handshake className="ml-2 h-5 w-5" />
                        لقد قمت بالدفع، أريد تسجيل بياناتي
                    </Button>
                    <Button variant="ghost" asChild className="w-full">
                        <Link href="/pricing">
                            <ArrowLeft className="ml-2 h-4 w-4" />
                            العودة
                        </Link>
                    </Button>
                </CardFooter>
            </Card>

            <AlertDialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>تسجيل بيانات الطلب</AlertDialogTitle>
                      <AlertDialogDescription>
                      الخطوة الأخيرة! أكمل بياناتك لنوثق طلب اشتراكك في خطة "{planName}".
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <SubscriptionRequestForm 
                    planName={planName} 
                    onSuccess={handleFormSuccess}
                  />
              </AlertDialogContent>
           </AlertDialog>
        </>
    );
}


export default function PaymentPage() {
    return (
        <div className="flex min-h-dvh flex-col bg-secondary">
            <Header title="إرشادات الدفع" showMenu={false} />
            <main className="flex-1 flex items-center justify-center px-4 pb-24 -mt-20 z-10">
                <Suspense fallback={<Skeleton className="h-96 w-full max-w-md"/>}>
                    <PaymentPageContent />
                </Suspense>
            </main>
        </div>
    );
}
