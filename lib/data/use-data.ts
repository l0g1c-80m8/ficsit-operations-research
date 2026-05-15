'use client';
import { useEffect, useState } from 'react';
import type { SatData } from './types';
import { loadGameData } from './load';

export interface UseGameDataState {
  data: SatData | null;
  loading: boolean;
  error: Error | null;
}

export function useGameData(): UseGameDataState {
  const [state, setState] = useState<UseGameDataState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    loadGameData()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
