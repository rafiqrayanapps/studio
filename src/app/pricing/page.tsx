'use client';

import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { PricingPlan } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState } from 'react';
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import SubscriptionRequestForm from '@/components/forms/SubscriptionRequestForm';

export default function PricingPage() {
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  const plansQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'pricingPlans'), orderBy('order', 'asc')) : null,
    [firestore]
  );
  const { data: allPlans, isLoading } = useCollection<PricingPlan>(plansQuery);

  const plans = useMemo(() => {
    if (!allPlans) return [];
    return allPlans.filter(plan => plan.enabled);
  }, [allPlans]);


  const handleSubscribeClick = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  const PlanSkeleton = () => (
    <Card className="flex flex-col">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
        <div className="pt-2">
            <Skeleton className="h-10 w-1/2" />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <li key={i} className="flex items-center">
              <Check className="ml-2 h-4 w-4 text-muted" />
              <Skeleton className="h-4 w-full" />
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
          <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );


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
            {isLoading ? (
              <>
                <PlanSkeleton />
                <PlanSkeleton />
              </>
            ) : (
              plans?.map((plan) => (
                <Card key={plan.id} className={`flex flex-col ${plan.isFeatured ? 'border-primary ring-2 ring-primary' : ''}`}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div>
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground ml-1">{plan.currency}</span>
                      {plan.frequency && <span className="text-muted-foreground">{plan.frequency}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center">
                          <Check className="ml-2 h-4 w-4 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {plan.price === '0' ? (
                       <Button asChild className="w-full" variant={plan.isFeatured ? 'default' : 'secondary'}>
                          <Link href={plan.link || '/login'}>
                            ابدأ مجاناً
                          </Link>
                        </Button>
                    ) : (
                       <Button className="w-full" variant={plan.isFeatured ? 'default' : 'secondary'} onClick={() => handleSubscribeClick(plan)}>
                          اطلب الاشتراك
                        </Button>
                    )}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent>
              {selectedPlan && (
                  <SubscriptionRequestForm 
                    planName={selectedPlan.name} 
                    onSuccess={() => setIsDialogOpen(false)}
                  />
              )}
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
