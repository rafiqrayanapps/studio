'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { SubscriptionDialogConfig } from '@/lib/definitions';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import useLocalStorage from '@/hooks/use-local-storage';
import { useLocale } from '@/hooks/use-locale';

const DIALOG_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

export default function SubscriptionDialog() {
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [lastShown, setLastShown] = useLocalStorage<number>('subscriptionDialogLastShown', 0);
  const { t } = useLocale();

  const subscriptionDialogRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'subscriptionDialog') : null, [firestore]);
  const { data: config, isLoading } = useDoc<SubscriptionDialogConfig>(subscriptionDialogRef);

  useEffect(() => {
    if (config?.enabled && !isLoading) {
      const now = new Date().getTime();
      // Show if 10 minutes have passed since last shown
      if (now - lastShown > DIALOG_INTERVAL) {
        setIsOpen(true);
      }
    }
    // We only want this to run when config or loading state changes, or when lastShown is updated from another tab.
  }, [config, isLoading, lastShown]);

  const handleClose = () => {
    setIsOpen(false);
    setLastShown(new Date().getTime());
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };
  
  if (isLoading || !config?.enabled || !isOpen) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent dir="rtl" className="p-0 gap-0 rounded-2xl overflow-hidden max-w-sm">
        <AlertDialogHeader className="text-center space-y-2 p-6 pb-4">
          <AlertDialogTitle className="font-bold text-lg">{config.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm whitespace-pre-wrap">
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-row p-0 m-0 w-full border-t !justify-center !space-x-0">
            <Button variant="ghost" onClick={handleClose} className="flex-1 rounded-none border-0 m-0 h-12 text-base font-medium text-primary hover:bg-secondary !mt-0">{t('cancel')}</Button>
            <div className="w-px bg-border"/>
            <Button variant="ghost" asChild className="flex-1 rounded-none m-0 h-12 text-base font-bold text-primary hover:bg-secondary !mt-0">
                <a href={config.link} target="_blank" rel="noopener noreferrer" onClick={handleClose}>{t('subscribe')}</a>
            </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
