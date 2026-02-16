'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { Loader2, User, Phone, Mail, MessageSquare, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { PaymentLinksConfig } from '@/lib/definitions';

const subscriptionRequestSchema = z.object({
  name: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" }),
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  phoneNumber: z.string().min(9, { message: "الرجاء إدخال رقم هاتف صالح" }),
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
      description: "سنتواصل معك في أقرب وقت ممكن لتأكيد الاشتراك.",
    });

    form.reset();
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CardHeader className="text-center p-0">
            <CardTitle>طلب اشتراك</CardTitle>
            <CardDescription>أكمل بياناتك وسنتواصل معك.</CardDescription>
        </CardHeader>
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
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="tel" placeholder="9665xxxxxxxx" {...field} className="pl-10 text-left" dir="ltr" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </CardContent>
        <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'إرسال الطلب'}
        </Button>

        {paymentLinksData?.whatsappUrl && (
          <>
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">أو</span>
                </div>
            </div>
            <Button variant="outline" asChild className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:text-green-800">
                <a href={paymentLinksData.whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="ml-2 h-5 w-5" />
                    تواصل عبر واتساب
                </a>
            </Button>
          </>
        )}
      </form>
    </Form>
  );
}
