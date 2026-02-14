'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, User, Mail, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';

const subscriptionSchema = z.object({
  name: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" }),
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صالح" }),
  whatsapp: z.string().min(9, { message: "الرجاء إدخال رقم واتساب صالح" }),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

export default function SubscriptionForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: '',
      email: '',
      whatsapp: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = (data: SubscriptionFormValues) => {
    if (!firestore) return;

    const subscriptionRequest = {
      ...data,
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(collection(firestore, 'subscriptionRequests'), subscriptionRequest);
    
    toast({
      title: "تم استلام طلبك بنجاح!",
      description: "سنتواصل معك في أقرب وقت ممكن.",
    });

    form.reset();
    router.push('/home'); // Redirect after submission
  };

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الواتساب</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="tel" placeholder="9665xxxxxxxx" {...field} className="pl-10 text-left" dir="ltr" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'إرسال'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
