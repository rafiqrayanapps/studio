'use client';

import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Crown, Sparkles } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { PricingPlan } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const firestore = useFirestore();
  const router = useRouter();

  const plansQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'pricingPlans')) : null,
    [firestore]
  );
  const { data: allPlans, isLoading } = useCollection<PricingPlan>(plansQuery);

  const plans = useMemo(() => {
    if (!allPlans) return [];
    return allPlans.filter(plan => plan.enabled).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allPlans]);

  const handleSubscribeClick = (plan: PricingPlan) => {
    if (plan.link) {
      window.open(plan.link, '_blank');
    } else {
      router.push(`/payment?plan=${encodeURIComponent(plan.name)}`);
    }
  };

  const PlanSkeleton = () => (
    <Card className="flex flex-col rounded-[2.5rem] overflow-hidden">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
        <div className="pt-4">
            <Skeleton className="h-12 w-1/2" />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <li key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-full" />
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
          <Skeleton className="h-12 w-full rounded-2xl" />
      </CardFooter>
    </Card>
  );


  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title="خطط الأسعار" />
      <main className="flex-1 px-6 pt-4 pb-24 -mt-12 z-10">
        <div className="container mx-auto max-w-4xl space-y-10">
          <div className="text-center space-y-3 bg-card/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/20 shadow-xl">
            <div className="bg-primary/10 text-primary w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-2">
                <Crown className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-black text-foreground">ارتقِ بمستوى إبداعك</h2>
            <p className="text-muted-foreground text-sm font-medium max-w-md mx-auto leading-relaxed">
              اختر الخطة المناسبة لك واحصل على وصول غير محدود لجميع الأدوات والملحقات الحصرية للمصممين المحترفين.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {isLoading ? (
              <>
                <PlanSkeleton />
                <PlanSkeleton />
              </>
            ) : (
              plans?.map((plan) => (
                <Card key={plan.id} className={`flex flex-col relative overflow-hidden rounded-[3rem] border-2 transition-all hover:scale-[1.02] duration-500 ${plan.isFeatured ? 'border-primary shadow-2xl shadow-primary/20 ring-4 ring-primary/5' : 'border-white/50 shadow-lg'}`}>
                  {plan.isFeatured && (
                      <div className="absolute top-6 left-[-35px] bg-primary text-primary-foreground text-[10px] font-black py-1 px-10 -rotate-45 shadow-lg">
                          موصى به
                      </div>
                  )}
                  <CardHeader className="pt-10 pb-6">
                    <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-2xl font-black">{plan.name}</CardTitle>
                        {plan.isFeatured && <Sparkles className="h-6 w-6 text-primary animate-pulse" />}
                    </div>
                    <CardDescription className="font-medium">{plan.description}</CardDescription>
                    <div className="pt-6 flex items-baseline gap-1.5">
                      <span className="text-5xl font-black text-primary tracking-tighter">{plan.price}</span>
                      <span className="text-sm font-bold text-muted-foreground">{plan.currency}</span>
                      {plan.frequency && <span className="text-xs text-muted-foreground font-medium">{plan.frequency}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pt-4">
                    <ul className="space-y-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                            <Check className="h-3 w-3 text-primary stroke-[4]" />
                          </div>
                          <span className="text-sm font-bold text-muted-foreground/90">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pb-8 pt-6">
                    {plan.price !== '0' ? (
                        <Button
                          size="lg"
                          className={`w-full h-14 rounded-2xl text-lg font-black shadow-xl transition-all active:scale-95 ${plan.isFeatured ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
                          onClick={() => handleSubscribeClick(plan)}
                        >
                          {plan.link ? 'الذهاب إلى رابط الدفع' : 'اطلب الاشتراك الآن'}
                        </Button>
                    ) : (
                        <div className="w-full text-center py-4 bg-muted/50 rounded-2xl border border-dashed text-xs font-black text-muted-foreground uppercase tracking-widest">
                            الخطة الافتراضية
                        </div>
                    )}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
          
          <div className="text-center pb-10">
              <p className="text-[10px] text-muted-foreground font-medium">جميع الخطط تشمل تحديثات دورية ودعم فني متكامل.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
