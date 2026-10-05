import { describe, expect, it } from 'vitest';
import type { LapTraceSamples } from '@irdashies/types';
import {
  activeCornerIndex,
  cornerSpeedExtremes,
  cornerSpeedWindows,
} from './cornerSpeeds';

/** One sample every 10 m with the given speeds (m/s). */
const samplesOf = (speeds: number[]): LapTraceSamples => {
  const n = speeds.length;
  const empty = () => new Float32Array(n);
  return {
    length: n,
    distanceM: Float32Array.from(speeds, (_, i) => i * 10),
    timeSec: empty(),
    throttle: empty(),
    brake: empty(),
    speed: Float32Array.from(speeds),
    gear: empty(),
    absActive: empty(),
  };
};

// 1000 m track: corner A 100-200 m, corner B 500-600 m, one wrapping the line.
const corners = [
  { start_pct: 0.1, end_pct: 0.2 },
  { start_pct: 0.5, end_pct: 0.6 },
  { start_pct: 0.95, end_pct: 0.02 },
];

describe('cornerSpeedWindows', () => {
  it('runs each approach from the previous corner, skipping wrapping corners', () => {
    expect(cornerSpeedWindows(corners, 1000)).toEqual([
      { approachStartM: 0, cornerStartM: 100, cornerEndM: 200 },
      { approachStartM: 200, cornerStartM: 500, cornerEndM: 600 },
      null,
    ]);
  });
});

describe('cornerSpeedExtremes', () => {
  const window = { approachStartM: 200, cornerStartM: 500, cornerEndM: 600 };
  // Accelerate to 80 at 450 m, brake to an apex of 30 at 550 m, then exit
  // faster than the approach (90) before the corner ends.
  const speeds = Array.from({ length: 70 }, (_, i) => {
    const m = i * 10;
    if (m <= 450) return 40 + (m - 200 > 0 ? (m - 200) * 0.16 : 0);
    if (m <= 550) return 80 - (m - 450) * 0.5;
    return 30 + (m - 550) * 1.2;
  });

  it('takes the top of the approach and the apex, ignoring the exit', () => {
    const result = cornerSpeedExtremes(samplesOf(speeds), window);
    expect(result?.maxMs).toBeCloseTo(80);
    expect(result?.minMs).toBeCloseTo(30);
  });

  it('reports the extremes so far while the corner is being driven', () => {
    // Car at 520 m: braking, apex not reached yet.
    const partial = cornerSpeedExtremes(samplesOf(speeds.slice(0, 53)), window);
    expect(partial?.maxMs).toBeCloseTo(80);
    expect(partial?.minMs).toBeCloseTo(45);
  });

  it('is null before the car reaches the corner', () => {
    expect(
      cornerSpeedExtremes(samplesOf(speeds.slice(0, 45)), window)
    ).toBeNull();
  });
});

describe('activeCornerIndex', () => {
  const windows = cornerSpeedWindows(corners, 1000);

  it('holds the last corner started until the next one begins', () => {
    expect(activeCornerIndex(windows, 50)).toBe(-1);
    expect(activeCornerIndex(windows, 150)).toBe(0);
    expect(activeCornerIndex(windows, 450)).toBe(0);
    expect(activeCornerIndex(windows, 500)).toBe(1);
    expect(activeCornerIndex(windows, 990)).toBe(1);
  });
});
