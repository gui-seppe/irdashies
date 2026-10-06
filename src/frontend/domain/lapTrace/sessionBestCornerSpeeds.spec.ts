import { describe, expect, it } from 'vitest';
import type { LapTraceSamples } from '@irdashies/types';
import { cornerSpeedWindows } from './cornerSpeeds';
import {
  SessionBestCornerSpeeds,
  type CornerSpeedFrame,
} from './sessionBestCornerSpeeds';

const TRACK_M = 1000;
// One corner, 400-500 m.
const windows = cornerSpeedWindows([{ start_pct: 0.4, end_pct: 0.5 }], TRACK_M);

/** A lap buffer up to `toM`, one sample per 10 m: 80 m/s, apex `apex` at 450 m. */
const lapSamples = (apex: number, toM: number, fromM = 0): LapTraceSamples => {
  const distances: number[] = [];
  for (let m = fromM; m <= toM; m += 10) distances.push(m);
  const speeds = distances.map((m) =>
    m < 400 || m > 500 ? 80 : apex + Math.abs(m - 450) * 0.5
  );
  const n = distances.length;
  const empty = () => new Float32Array(n);
  return {
    length: n,
    distanceM: Float32Array.from(distances),
    timeSec: empty(),
    throttle: empty(),
    brake: empty(),
    speed: Float32Array.from(speeds),
    gear: empty(),
    absActive: empty(),
  };
};

interface LapOptions {
  apex: number;
  lapTime: number;
  onPitRoad?: boolean;
  fromM?: number;
}

/**
 * Drives one lap (lapSerial = lap number) through the tracker, then crosses
 * the line into the next lap, where the official time arrives a frame late.
 */
const driveLap = (
  tracker: SessionBestCornerSpeeds,
  lap: number,
  { apex, lapTime, onPitRoad = false, fromM = 0 }: LapOptions,
  previousLapTime: number,
  sessionNum = 1
) => {
  const frame = (overrides: Partial<CornerSpeedFrame>): CornerSpeedFrame => ({
    sessionNum,
    lapSerial: lap,
    samples: lapSamples(apex, fromM, fromM),
    onPitRoad,
    lastLapTime: previousLapTime,
    lapCompleted: lap - 1,
    ...overrides,
  });
  for (const toM of [fromM, 300, 520, 990]) {
    tracker.update(frame({ samples: lapSamples(apex, toM, fromM) }));
  }
  // Across the line: new buffer, then the official time lands.
  const next = {
    lapSerial: lap + 1,
    samples: lapSamples(apex, 0),
    lapCompleted: lap,
    onPitRoad: false,
  };
  tracker.update(frame({ ...next, lastLapTime: previousLapTime }));
  tracker.update(frame({ ...next, lastLapTime: lapTime }));
};

describe('SessionBestCornerSpeeds', () => {
  const setup = () => {
    const tracker = new SessionBestCornerSpeeds();
    tracker.setTrack(windows, TRACK_M);
    return tracker;
  };

  it('keeps the corner speeds of the fastest lap of the session', () => {
    const tracker = setup();
    driveLap(tracker, 1, { apex: 30, lapTime: 92 }, -1);
    expect(tracker.bestLapTime).toBe(92);
    expect(tracker.best?.[0]?.minMs).toBeCloseTo(30);

    // Slower lap with a faster apex: not the session best, ignored.
    driveLap(tracker, 2, { apex: 33, lapTime: 93 }, 92);
    expect(tracker.best?.[0]?.minMs).toBeCloseTo(30);

    driveLap(tracker, 3, { apex: 35, lapTime: 91 }, 93);
    expect(tracker.bestLapTime).toBe(91);
    expect(tracker.best?.[0]?.minMs).toBeCloseTo(35);
    expect(tracker.best?.[0]?.maxMs).toBeCloseTo(80);
  });

  it('ignores laps that touched pit road or did not start at the line', () => {
    const tracker = setup();
    driveLap(tracker, 1, { apex: 30, lapTime: 80, onPitRoad: true }, -1);
    expect(tracker.best).toBeNull();
    driveLap(tracker, 2, { apex: 30, lapTime: 80, fromM: 200 }, 80);
    expect(tracker.best).toBeNull();
  });

  it('starts every session without a best', () => {
    const tracker = setup();
    driveLap(tracker, 1, { apex: 30, lapTime: 85 }, -1, 1);
    expect(tracker.best).not.toBeNull();
    const version = tracker.version;

    // Practice -> race: the practice lap no longer counts.
    tracker.update({
      sessionNum: 2,
      lapSerial: 9,
      samples: lapSamples(30, 0),
      onPitRoad: false,
      lastLapTime: -1,
      lapCompleted: 0,
    });
    expect(tracker.best).toBeNull();
    expect(tracker.version).toBeGreaterThan(version);

    driveLap(tracker, 10, { apex: 28, lapTime: 95 }, -1, 2);
    expect(tracker.bestLapTime).toBe(95);
    expect(tracker.best?.[0]?.minMs).toBeCloseTo(28);
  });
});
