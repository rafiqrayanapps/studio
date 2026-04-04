'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, Query, DocumentData, CollectionReference } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export const useCollection = <T extends DocumentData>(q: Query | CollectionReference | null) => {
  const [data, setData] = useState<(T & { id: string })[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data: (T & { id: string })[] = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as T & { id: string });
        });
        setData(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        const path = 'path' in q ? q.path : (q as CollectionReference).id;
        const permissionError = new FirestorePermissionError({
          path: path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
        setData(null);
      }
    );

    return () => unsubscribe();
  }, [q]);

  return { data, loading, error };
};
