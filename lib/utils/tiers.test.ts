// Pin the tier-breakpoint thresholds so any change to belt/pipe rates is a
// deliberate decision, not a silent drift.

import { describe, expect, it } from 'vitest';
import { requiredTier, tierLabel } from './tiers';
import type { SatData } from '../data/types';

const SOLID = 'Desc_IronPlate_C';
const LIQUID = 'Desc_Water_C';

// Minimal stub: requiredTier only reads `data.items[<x>].liquid`. Building a
// real SatData would just be ceremony.
const data = {
  items: {
    [SOLID]: { liquid: false } as never,
    [LIQUID]: { liquid: true } as never,
  },
} as unknown as SatData;

describe('requiredTier — belts', () => {
  it('returns null for non-positive rates', () => {
    expect(requiredTier(SOLID, 0, data)).toBeNull();
    expect(requiredTier(SOLID, -5, data)).toBeNull();
  });
  it.each([
    [30, 1],
    [60, 1],
    [61, 2],
    [120, 2],
    [121, 3],
    [270, 3],
    [271, 4],
    [480, 4],
    [481, 5],
    [780, 5],
    [781, 6],
    [1200, 6],
  ])('rate %i/m → Mk%i', (rate, expected) => {
    const t = requiredTier(SOLID, rate, data)!;
    expect(t.mark).toBe(expected);
    expect(t.parallel).toBe(1);
    expect(t.kind).toBe('belt');
  });
  it('uses parallel Mk6 belts past 1200/m', () => {
    const t = requiredTier(SOLID, 2400, data)!;
    expect(t.mark).toBe(6);
    expect(t.parallel).toBe(2);
    expect(tierLabel(t)).toBe('2× Mk6');
  });
});

describe('requiredTier — pipes', () => {
  it('Mk1 pipe up to 300 m³/m, Mk2 to 600', () => {
    expect(requiredTier(LIQUID, 250, data)!.mark).toBe(1);
    expect(requiredTier(LIQUID, 301, data)!.mark).toBe(2);
    expect(requiredTier(LIQUID, 600, data)!.mark).toBe(2);
  });
  it('parallel Mk2 pipes past 600', () => {
    const t = requiredTier(LIQUID, 1500, data)!;
    expect(t.mark).toBe(2);
    expect(t.parallel).toBe(3); // ceil(1500 / 600)
  });
});
