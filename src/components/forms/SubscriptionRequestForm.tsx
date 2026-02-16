'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { Loader2, User, Phone, Mail, MessageSquare, Package, CreditCard, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { PaymentLinksConfig } from '@/lib/definitions';
import { useRouter } from 'next/navigation';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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
  const router = useRouter();

  const paymentLinksRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'paymentLinks') : null, [firestore]);
  const { data: paymentLinksData } = useDoc<PaymentLinksConfig>(paymentLinksRef);

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
    router.push('/subscribe');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CardHeader className="text-center p-0">
            <CardTitle>طلب اشتراك</CardTitle>
            <CardDescription>أكمل بياناتك وأرسل إثبات الدفع.</CardDescription>
        </CardHeader>

        {/* Fields */}
        <CardContent className="p-0 space-y-4">
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
                      <Input type="email" placeholder="email@example.com" {...field} className="pl-10 text-left" dir="ltr" />
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

        {/* Payment Instructions & Links */}
        {(paymentLinksData?.paymentInstructions || paymentLinksData?.paypalUrl) && (
            <div className="space-y-3 pt-4 border-t">
                 {paymentLinksData.paymentInstructions && (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md border space-y-1">
                        <p className="font-bold text-foreground">تعليمات الدفع:</p>
                        <p className="whitespace-pre-wrap">{paymentLinksData.paymentInstructions}</p>
                    </div>
                )}
                <p className="text-center text-sm text-muted-foreground">
                    **مهم:** بعد الدفع، سجّل بياناتك أعلاه.
                </p>
                {paymentLinksData.paypalUrl && (
                    <Button variant="outline" asChild className="w-full">
                        <a href={paymentLinksData.paypalUrl} target="_blank" rel="noopener noreferrer">
                            <CreditCard className="ml-2 h-5 w-5 text-blue-600" />
                            الدفع عبر PayPal
                        </a>
                    </Button>
                )}
            </div>
        )}

        {/* Submit Form */}
        <div className="space-y-4 pt-4 border-t">
         
          <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'تسجيل بيانات الطلب والمتابعة'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
