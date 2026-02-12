'use client';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function OnlineStatusDetector() {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // This effect runs on the client and handles online/offline events.

    // 1. Check if we just came back from the offline page.
    if (typeof window !== 'undefined' && sessionStorage.getItem('connectionRestored') === 'true') {
      toast({
        title: 'تم استعادة الاتصال',
        description: 'أهلاً بعودتك! أنت متصل بالإنترنت الآن.',
        duration: 5000,
      });
      sessionStorage.removeItem('connectionRestored');
    }

    // 2. Event listener for going online while already in the app.
    const handleOnline = () => {
      toast({
        title: 'تم استعادة الاتصال',
        description: 'أهلاً بعودتك! أنت متصل بالإنترنت الآن.',
        duration: 5000,
      });
    };

    // 3. Event listener for going offline.
    const handleOffline = () => {
       // When the browser detects offline, we navigate to our static offline page.
       // The service worker will intercept this if the page is already offline,
       // but this ensures navigation if the user goes offline while active.
       router.push('/offline.html');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Cleanup listeners on unmount.
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, router]);

  return null; // This component does not render anything.
}
