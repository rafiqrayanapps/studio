'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, serverTimestamp, doc, query, orderBy, where } from 'firebase/firestore';
import { Loader2, User, Phone, Mail, Package, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { PaymentLinksConfig, PaymentMethod } from '@/lib/definitions';
import PhoneInput, { isValidPhoneNumber, type Country } from 'react-phone-number-input';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import DynamicIcon from '@/components/ui/dynamic-icon';


const subscriptionRequestSchema = z.object({
  name: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" }),
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  phoneNumber: z.string().refine(isValidPhoneNumber, { message: "الرجاء إدخال رقم هاتف صالح" }),
  planName: z.string(),
});

type SubscriptionRequestFormValues = z.infer<typeof subscriptionRequestSchema>;

interface SubscriptionRequestFormProps {
    planName: string;
    onSuccess: () => void;
}

export default function SubscriptionRequestForm({ planName, onSuccess }: SubscriptionRequestFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>('SA');

  const paymentLinksRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'paymentLinks') : null, [firestore]);
  const { data: paymentLinksData } = useDoc<PaymentLinksConfig>(paymentLinksRef);

  const paymentMethodsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'paymentMethods'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: allPaymentMethods, isLoading: isLoadingPaymentMethods } = useCollection<PaymentMethod>(paymentMethodsQuery);

  const enabledPaymentMethods = useMemo(() => {
      if (!allPaymentMethods) return [];
      return allPaymentMethods.filter(method => method.enabled);
  }, [allPaymentMethods]);

  const filteredPaymentMethods = useMemo(() => {
    if (!enabledPaymentMethods) return [];
    if (!selectedCountry) return enabledPaymentMethods.filter(method => method.country === 'ALL');
    
    // Show methods for the selected country AND global methods
    return enabledPaymentMethods.filter(method => method.country === selectedCountry || method.country === 'ALL');
  }, [enabledPaymentMethods, selectedCountry]);

  const form = useForm<SubscriptionRequestFormValues>({
    resolver: zodResolver(subscriptionRequestSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      planName: planName,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = (data: SubscriptionRequestFormValues) => {
    if (!firestore) return;

    const subscriptionRequest = {
      ...data,
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(collection(firestore, 'subscriptionRequests'), subscriptionRequest);
    
    toast({
      title: "تم استلام طلبك بنجاح!",
      description: "سيتم توجيهك الآن للخطوة التالية.",
    });

    form.reset();
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CardContent className="p-0 space-y-4">
            <div className="space-y-3 pt-4 border-t">
                {paymentLinksData?.paymentInstructions && (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md border space-y-1">
                        <p className="font-bold text-foreground">تعليمات الدفع:</p>
                        <p className="whitespace-pre-wrap">{paymentLinksData.paymentInstructions}</p>
                    </div>
                )}

                <div className="space-y-2">
                    {isLoadingPaymentMethods ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        filteredPaymentMethods.map(method => (
                           method.isUrl ? (
                                <Button key={method.id} variant="outline" asChild className="w-full">
                                    <a href={method.link} target="_blank" rel="noopener noreferrer">
                                        <DynamicIcon name={method.icon} className="ml-2 h-5 w-5" />
                                        {method.name}
                                    </a>
                                </Button>
                            ) : (
                                <div key={method.id} className="space-y-1.5">
                                    <FormLabel className="text-xs flex items-center gap-1.5">
                                        <DynamicIcon name={method.icon} className="h-4 w-4 text-primary" />
                                        <span>{method.name}</span>
                                    </FormLabel>
                                    <div className="flex gap-2">
                                        <p className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm text-left" dir="ltr">{method.link}</p>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            onClick={() => {
                                                navigator.clipboard.writeText(method.link);
                                                toast({ title: "تم النسخ بنجاح" });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        ))
                    )}
                </div>

                <p className="text-center text-sm text-muted-foreground pt-2">
                    **مهم:** بعد الدفع، سجّل بياناتك أدناه.
                </p>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg text-sm">
                <Package className="h-5 w-5 text-primary" />
                <span>الخطة المطلوبة: <strong>{planName}</strong></span>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم الكامل</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input placeholder="مثال: محمد عبدالله" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="email" {...field} className="pl-10 text-left" dir="ltr" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم التواصل (واتساب)</FormLabel>
                  <FormControl>
                    <PhoneInput
                        {...field}
                        international
                        defaultCountry="SA"
                        onCountryChange={setSelectedCountry}
                        placeholder="أدخل رقم الهاتف"
                        dir="ltr"
                        className="SubscriptionRequestForm-phoneInput"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </CardContent>

        <div className="space-y-4 pt-4 border-t">
          <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'تسجيل بيانات الطلب والمتابعة'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
