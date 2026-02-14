'use client';
import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Notification } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellRing } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import useLocalStorage from '@/hooks/use-local-storage';
import { safeFormatFirebaseTimestamp } from '@/lib/date-utils';
import { useLocale } from '@/hooks/use-locale';

export default function NotificationsPage() {
  const firestore = useFirestore();
  const [, setLastSeenTimestamp] = useLocalStorage<number | null>('lastSeenNotificationTimestamp', null);
  const { t } = useLocale();

  const notificationsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')) : null,
    [firestore]
  );
  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const latestNotificationQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'), limit(1)) : null,
    [firestore]
  );
  const { data: latestNotification } = useCollection<Notification>(latestNotificationQuery);

  useEffect(() => {
    // When the user visits this page, update the last seen timestamp.
    if (latestNotification && latestNotification.length > 0) {
      const latestTimestamp = latestNotification[0].createdAt?.seconds;
      if (latestTimestamp) {
        setLastSeenTimestamp(latestTimestamp);
      }
    }
  }, [latestNotification, setLastSeenTimestamp]);

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title={t('notifications')} />
      <main className="flex-1 px-4 pt-4 pb-24">
        <div className="container mx-auto max-w-2xl space-y-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-1/4 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </CardContent>
              </Card>
            ))
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notif) => (
              <Card key={notif.id} className="bg-card">
                <CardHeader className="flex-row items-start gap-4 space-y-0">
                  <div className="bg-primary/10 text-primary p-2 rounded-full">
                    <BellRing className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>{notif.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {safeFormatFirebaseTimestamp(notif.createdAt)}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{notif.description}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center text-muted-foreground p-12 mt-10 bg-card rounded-2xl">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-bold text-lg">{t('noNewNotifications')}</h3>
              <p className="mt-1">{t('weWillNotify')}</p>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
