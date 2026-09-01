'use client';
import { useEffect, useState } from 'react';
import type { MapMarkers } from './markers';
import { loadMapMarkers } from './markers';

export interface UseMapMarkersState {
  markers: MapMarkers | null;
  loading: boolean;
  error: Error | null;
}

/** Mirrors useGameData() — module-level promise cache means every consumer
 *  shares one fetch. */
export function useMapMarkers(): UseMapMarkersState {
  const [state, setState] = useState<UseMapMarkersState>({
    markers: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    loadMapMarkers()
      .then((markers) => alive && setState({ markers, loading: false, error: null }))
      .catch((error) => alive && setState({ markers: null, loading: false, error }));
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
