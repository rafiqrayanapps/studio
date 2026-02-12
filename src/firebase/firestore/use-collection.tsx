'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

export interface UseCollectionOptions {
  propagateError?: boolean;
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @param {UseCollectionOptions} [options] - Options for the hook.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
    options?: UseCollectionOptions,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  if (memoizedTargetRefOrQuery && !(memoizedTargetRefOrQuery as any).__memo) {
    // Throw an error if the developer forgets to memoize the query.
    // This is a common source of bugs with Firestore hooks.
    throw new Error('The query/reference passed to useCollection must be memoized with useMemoFirebase.');
  }

  const propagateError = options?.propagateError;

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return () => {};
    }

    setIsLoading(true);
    setError(null);

    const activeQuery = memoizedTargetRefOrQuery;

    const unsubscribe = onSnapshot(
      activeQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (snapshotError: FirestoreError) => {
        console.error("useCollection error:", snapshotError);
        let finalError: Error = snapshotError;

        // Only try to create a contextual error if it's a collection,
        // as getting the path from a query is unreliable.
        if (activeQuery.type === 'collection') {
          const path = (activeQuery as CollectionReference).path;
          finalError = new FirestorePermissionError({ operation: 'list', path });
        }
        
        setError(finalError);
        setData(null);
        setIsLoading(false);

        if (propagateError === true && finalError instanceof FirestorePermissionError) {
            throw finalError;
        } else if (propagateError === true) {
            throw snapshotError;
        }
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedTargetRefOrQuery, propagateError]);
  
  return { data, isLoading, error };
}
