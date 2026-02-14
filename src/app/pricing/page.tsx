'use client';

import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

const plans = [
    {
        name: 'الخطة المجانية',
        price: 'مجاناً',
        description: 'ابدأ معنا واستكشف الميزات الأساسية.',
        features: ['الوصول لجميع الأقسام', 'حفظ في المفضلة', 'تنسيق الألوان'],
        isFeatured: false,
    },
    {
        name: 'الخطة الإحترافية',
        price: '٢٥ ر.س',
        frequency: '/شهرياً',
        description: 'احصل على كل شيء بلا حدود.',
        features: ['كل ميزات الخطة المجانية', 'ميزات حصرية قادمة', 'دعم فني مباشر', 'بدون إعلانات'],
        isFeatured: true,
    },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title="خطط الأسعار" />
      <main className="flex-1 px-4 pt-4 pb-24">
        <div className="container mx-auto max-w-2xl space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">اختر الخطة التي تناسبك</h2>
            <p className="text-muted-foreground mt-2">
              قم بالترقية في أي وقت للاستفادة من الميزات المتقدمة.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className={`flex flex-col ${plan.isFeatured ? 'border-primary ring-2 ring-primary' : ''}`}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div>
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.frequency && <span className="text-muted-foreground">{plan.frequency}</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="ml-2 h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className={`w-full ${plan.isFeatured ? 'bg-primary' : 'bg-secondary text-secondary-foreground'}`}>
                    {plan.isFeatured ? 'الترقية الآن' : 'ابدأ مجاناً'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
