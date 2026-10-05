import type { LapTraceSamples } from '@irdashies/types';

/** Speeds in m/s. */
export interface CornerSpeedExtremes {
  /** Fastest point on the approach, i.e. just before braking. */
  maxMs: number;
  /** Slowest point in the corner, i.e. the apex. */
  minMs: number;
}

export interface CornerSpeedWindow {
  /** Where the approach begins: the end of the previous corner, in metres. */
  approachStartM: number;
  cornerStartM: number;
  cornerEndM: number;
}

/**
 * The window each corner's speeds are measured over, in lap order.
 *
 * The approach runs from the end of the previous corner, so the maximum is the
 * top of the straight leading in, which is where braking starts. The first
 * corner's approach starts at the line: the lap buffer begins there, and the
 * part of the straight before it belongs to the previous lap. Corners that
 * wrap the start/finish line are left out (null), since a lap's samples are
 * split across two buffers there.
 */
export const cornerSpeedWindows = (
  corners: readonly { start_pct: number; end_pct: number }[],
  trackLengthM: number
): (CornerSpeedWindow | null)[] =>
  corners.map((corner, idx) => {
    if (corner.end_pct < corner.start_pct) return null;
    const previous = corners[idx - 1];
    const previousEndM =
      previous && previous.end_pct >= previous.start_pct
        ? previous.end_pct * trackLengthM
        : 0;
    const cornerStartM = corner.start_pct * trackLengthM;
    return {
      approachStartM: Math.min(previousEndM, cornerStartM),
      cornerStartM,
      cornerEndM: corner.end_pct * trackLengthM,
    };
  });

/** First sample index at or past `distanceM` (samples are in lap order). */
const firstIndexAtOrAfter = (
  samples: LapTraceSamples,
  distanceM: number
): number => {
  let lo = 0;
  let hi = samples.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (samples.distanceM[mid] < distanceM) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

/**
 * Max approach speed and min corner speed for one corner, from whatever part
 * of the window the samples cover. For a lap still being driven that is the
 * extremes so far, which settle once the car leaves the corner.
 *
 * The maximum is only searched up to the slowest point, so a car accelerating
 * hard out of a long corner never reports its exit speed as the approach
 * speed. Null until the car has reached the corner itself.
 */
export const cornerSpeedExtremes = (
  samples: LapTraceSamples,
  window: CornerSpeedWindow
): CornerSpeedExtremes | null => {
  const cornerFrom = firstIndexAtOrAfter(samples, window.cornerStartM);
  let minMs = Infinity;
  let minIdx = -1;
  for (let i = cornerFrom; i < samples.length; i += 1) {
    if (samples.distanceM[i] > window.cornerEndM) break;
    const speed = samples.speed[i];
    if (speed < minMs) {
      minMs = speed;
      minIdx = i;
    }
  }
  if (minIdx === -1) return null;

  let maxMs = -Infinity;
  for (
    let i = firstIndexAtOrAfter(samples, window.approachStartM);
    i <= minIdx;
    i += 1
  ) {
    if (samples.speed[i] > maxMs) maxMs = samples.speed[i];
  }
  return { maxMs, minMs };
};

/**
 * Which corner the speeds are shown for: the last one whose start the car has
 * passed. It stays selected along the straight that follows, so its numbers
 * remain readable until the car reaches the next corner. -1 before the lap's
 * first corner.
 */
export const activeCornerIndex = (
  windows: readonly (CornerSpeedWindow | null)[],
  carDistanceM: number
): number => {
  let active = -1;
  for (let i = 0; i < windows.length; i += 1) {
    const window = windows[i];
    if (!window) continue;
    if (window.cornerStartM > carDistanceM) break;
    active = i;
  }
  return active;
};
