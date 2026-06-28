/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { settingsService } from '@/lib/services/settingsService';

export function useCompanyCollection<T>(collectionName: string, companyId?: string | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!companyId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = settingsService.subscribeToCollection(
      companyId,
      collectionName,
      (results) => {
        setData(results as T[]);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, companyId]);

  return { data, loading, error };
}
