/**
 * Returns routines, reloaded whenever the screen gains focus.
 * Pass `{ includeArchived: true }` to include archived routines (active first).
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getDb } from '@/lib/db/database';
import { getRoutines, type Db } from '@/lib/db/queries';
import type { Routine } from '@/lib/db/query-types';

export interface UseRoutinesResult {
  routines: Routine[];
  loading: boolean;
  error: Error | null;
}

export function useRoutines(options?: { includeArchived?: boolean }): UseRoutinesResult {
  const includeArchived = options?.includeArchived;
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        try {
          const db = (await getDb()) as unknown as Db;
          const result = await getRoutines(db, includeArchived != null ? { includeArchived } : undefined);
          if (!cancelled) {
            setRoutines(result);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      load();

      return () => {
        cancelled = true;
      };
    }, [includeArchived])
  );

  return { routines, loading, error };
}
