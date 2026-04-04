'use client';

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Crown } from 'lucide-react';

interface UpgradeProDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UpgradeProDialog({ isOpen, onOpenChange }: UpgradeProDialogProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/pricing');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="p-0 gap-0 rounded-2xl overflow-hidden max-w-sm">
        <AlertDialogHeader className="text-center space-y-4 p-6 pb-4">
            <div className="w-16 h-16 bg-yellow-100 text-yellow-500 rounded-full mx-auto flex items-center justify-center">
                <Crown className="w-8 h-8" />
            </div>
          <AlertDialogTitle className="font-bold text-lg">محتوى حصري للمشتركين</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            هذا القسم متاح فقط للمشتركين في خطة "برو". قم بالترقية الآن للوصول إلى هذا المحتوى وجميع الميزات الحصرية.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-row p-0 m-0 w-full border-t !justify-center !space-x-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 rounded-none border-0 m-0 h-12 text-base font-medium text-muted-foreground hover:bg-secondary !mt-0">لاحقاً</Button>
            <div className="w-px bg-border"/>
            <Button variant="ghost" onClick={handleUpgrade} className="flex-1 rounded-none m-0 h-12 text-base font-bold text-primary hover:bg-secondary !mt-0">الترقية الآن</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
