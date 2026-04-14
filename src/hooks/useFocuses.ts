/**
 * Returns focuses, reloaded whenever the screen gains focus.
 * Pass `{ includeArchived: true }` to include archived focuses (active first).
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getDb } from '@/lib/db/database';
import { getFocuses, type Db } from '@/lib/db/queries';
import type { Focus } from '@/lib/db/query-types';

export interface UseFocusesResult {
  focuses: Focus[];
  loading: boolean;
  error: Error | null;
}

export function useFocuses(options?: { includeArchived?: boolean }): UseFocusesResult {
  const [focuses, setFocuses] = useState<Focus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        try {
          const db = (await getDb()) as unknown as Db;
          const result = await getFocuses(db, options);
          if (!cancelled) {
            setFocuses(result);
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
    }, [options?.includeArchived])
  );

  return { focuses, loading, error };
}
