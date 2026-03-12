import { useState, useEffect } from 'react';
import { getDb } from '@/lib/db/database';
import { getEntryTypes, type Db } from '@/lib/db/queries';
import type { EntryType } from '@/lib/db/query-types';

export interface UseEntryTypesResult {
  entryTypes: EntryType[];
  loading: boolean;
  error: Error | null;
}

export function useEntryTypes(): UseEntryTypesResult {
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = await getDb() as unknown as Db;
        const types = await getEntryTypes(db);
        if (!cancelled) {
          setEntryTypes(types);
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
  }, []);

  return { entryTypes, loading, error };
}
