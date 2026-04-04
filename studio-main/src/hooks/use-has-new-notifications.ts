'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Notification } from '@/lib/definitions';
import useLocalStorage from '@/hooks/use-local-storage';

export function useHasNewNotifications(): boolean {
  const firestore = useFirestore();
  const [hasNew, setHasNew] = useState(false);
  const [lastSeenTimestamp] = useLocalStorage<number | null>('lastSeenNotificationTimestamp', null);

  const latestNotificationQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'), limit(1)) : null,
    [firestore]
  );
  const { data: latestNotification, isLoading } = useCollection<Notification>(latestNotificationQuery);

  useEffect(() => {
    if (isLoading || !latestNotification) {
      return;
    }

    if (latestNotification.length === 0) {
      setHasNew(false);
      return;
    }

    const latestTimestamp = latestNotification[0].createdAt?.seconds;
    if (latestTimestamp) {
      // If lastSeenTimestamp is null, it means the user has never seen notifications, so it's new.
      // Otherwise, check if the latest notification is newer.
      if (lastSeenTimestamp === null || latestTimestamp > lastSeenTimestamp) {
        setHasNew(true);
      } else {
        setHasNew(false);
      }
    }

  }, [latestNotification, lastSeenTimestamp, isLoading]);

  return hasNew;
}
