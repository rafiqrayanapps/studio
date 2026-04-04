'use client';

import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import {
  Category,
  SubscriptionDialog as SubscriptionDialogData,
} from '@/firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function SubscriptionDialog() {
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  const dialogConfigRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'app-config', 'subscription-dialog');
  }, [firestore]);
  const { data: dialogConfig, loading } =
    useDoc<SubscriptionDialogData>(dialogConfigRef);

  useEffect(() => {
    if (loading || !dialogConfig || !dialogConfig.enabled) {
      return;
    }

    const hasBeenShown = sessionStorage.getItem('subscriptionDialogShown');
    if (!hasBeenShown) {
      setIsOpen(true);
      sessionStorage.setItem('subscriptionDialogShown', 'true');
    }
  }, [dialogConfig, loading]);

  if (!dialogConfig) {
    return null;
  }

  const handleSubscribe = () => {
    window.open(dialogConfig.subscribeUrl, '_blank');
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogConfig.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialogConfig.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dialogConfig.cancelText}</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubscribe}>
            {dialogConfig.subscribeText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DesignerCompanionPage() {
  const firestore = useFirestore();

  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'categories'),
      where('parentId', '==', null)
    );
  }, [firestore]);

  const { data: menuItems, loading } = useCollection<Category>(categoriesQuery);

  return (
    <div className="container mx-auto flex flex-col items-center gap-8 px-4 py-8">
      <SubscriptionDialog />
      <Logo />

      <Button
        size="lg"
        className="w-full max-w-xs border border-blue-300 bg-accent text-xl font-bold text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground rounded-xl"
      >
        تقييم التطبيق
      </Button>

      {loading && (
        <div className="grid w-full max-w-lg grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}

      {!loading && menuItems && (
        <div className="grid w-full max-w-lg grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <Link href={`/category/${item.id}`} key={item.id}>
              <Card className="group relative flex aspect-square flex-col items-center justify-center p-4 transition-transform hover:scale-105">
                <div className="absolute top-3 start-3 rounded-full bg-white/20 p-1.5">
                  <Smile className="h-5 w-5 text-white" />
                </div>
                <CardContent className="flex items-center justify-center p-0">
                  <h3 className="text-2xl font-bold text-card-foreground">
                    {item.name}
                  </h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
