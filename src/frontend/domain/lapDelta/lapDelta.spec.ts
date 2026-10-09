import { describe, expect, it } from 'vitest';
import {
  DELTA_BUCKETS,
  LapDeltaTrace,
  buildDeltaSegments,
  deltaAt,
  segmentDeltas,
} from './lapDelta';

/** Drive a lap from `from` to `to` in small steps with delta = f(pct). */
const drive = (
  trace: LapDeltaTrace,
  from: number,
  to: number,
  delta: (pct: number) => number,
  sessionNum = 1
) => {
  for (let pct = from; pct <= to + 1e-9; pct += 0.001) {
    trace.update({
      sessionNum,
      lapDistPct: pct,
      delta: delta(pct),
      deltaOk: true,
    });
  }
};

describe('LapDeltaTrace', () => {
  it('records the delta by lap position and fills skipped buckets', () => {
    const trace = new LapDeltaTrace();
    trace.update({ sessionNum: 1, lapDistPct: 0.1, delta: 0.1, deltaOk: true });
    // Ten buckets later in one update: filled in linearly.
    trace.update({
      sessionNum: 1,
      lapDistPct: 0.12,
      delta: 0.3,
      deltaOk: true,
    });
    expect(deltaAt(trace.current, 0.1)).toBeCloseTo(0.1);
    expect(deltaAt(trace.current, 0.11)).toBeCloseTo(0.2);
    expect(deltaAt(trace.current, 0.12)).toBeCloseTo(0.3);
  });

  it('does not fill across a jump or record an invalid delta', () => {
    const trace = new LapDeltaTrace();
    trace.update({ sessionNum: 1, lapDistPct: 0.1, delta: 0.1, deltaOk: true });
    trace.update({ sessionNum: 1, lapDistPct: 0.5, delta: 2, deltaOk: true });
    expect(deltaAt(trace.current, 0.3)).toBeNull();
    trace.update({ sessionNum: 1, lapDistPct: 0.6, delta: 9, deltaOk: false });
    expect(deltaAt(trace.current, 0.6)).toBeNull();
  });

  it('keeps a completed lap as the previous one at the line', () => {
    const trace = new LapDeltaTrace();
    drive(trace, 0, 0.999, (pct) => pct);
    expect(trace.previous).toBeNull();
    trace.update({ sessionNum: 1, lapDistPct: 0.001, delta: 0, deltaOk: true });
    expect(trace.previous).not.toBeNull();
    expect(deltaAt(trace.previous as Float32Array, 0.5)).toBeCloseTo(0.5, 2);
    expect(deltaAt(trace.current, 0.5)).toBeNull();
  });

  it('starts over when the session changes', () => {
    const trace = new LapDeltaTrace();
    drive(trace, 0, 0.999, () => 1);
    trace.update({ sessionNum: 1, lapDistPct: 0.001, delta: 0, deltaOk: true });
    trace.update({ sessionNum: 2, lapDistPct: 0.002, delta: 0, deltaOk: true });
    expect(trace.previous).toBeNull();
    expect(trace.current.length).toBe(DELTA_BUCKETS);
  });
});

describe('buildDeltaSegments', () => {
  it('fills the lap with corners and the straights between them', () => {
    const segments = buildDeltaSegments([
      { start_pct: 0.1, end_pct: 0.2, label: 'T1' },
      { start_pct: 0.5, end_pct: 0.6, label: 'T2' },
    ]);
    expect(segments.map((s) => [s.startPct, s.endPct, s.label])).toEqual([
      [0, 0.1, ''],
      [0.1, 0.2, 'T1'],
      [0.2, 0.5, ''],
      [0.5, 0.6, 'T2'],
      [0.6, 1, ''],
    ]);
  });

  it('splits a corner across the line and absorbs tiny gaps', () => {
    const segments = buildDeltaSegments([
      { start_pct: 0.3, end_pct: 0.4, label: 'T1' },
      { start_pct: 0.401, end_pct: 0.5, label: 'T2' },
      { start_pct: 0.95, end_pct: 0.02, label: 'T3' },
    ]);
    expect(segments.map((s) => [s.startPct, s.endPct, s.label])).toEqual([
      [0, 0.02, ''],
      [0.02, 0.3, ''],
      [0.3, 0.401, 'T1'],
      [0.401, 0.5, 'T2'],
      [0.5, 0.95, ''],
      [0.95, 1, 'T3'],
    ]);
  });
});

describe('segmentDeltas', () => {
  const segments = buildDeltaSegments([
    { start_pct: 0.2, end_pct: 0.4, label: 'T1' },
    { start_pct: 0.6, end_pct: 0.8, label: 'T2' },
  ]);

  it('reads this lap, the live segment, and last lap for the rest', () => {
    const trace = new LapDeltaTrace();
    // Last lap: lost 0.5 s in T2 (0.6-0.8), nothing elsewhere.
    drive(trace, 0, 0.999, (pct) =>
      pct < 0.6 ? 0 : pct < 0.8 ? (pct - 0.6) * 2.5 : 0.5
    );
    // This lap: gained 0.2 s in T1 (0.2-0.4), now halfway through the
    // straight after it, losing 0.1 s so far.
    trace.update({
      sessionNum: 1,
      lapDistPct: 0.0005,
      delta: 0,
      deltaOk: true,
    });
    drive(trace, 0.001, 0.5, (pct) =>
      pct < 0.2 ? 0 : pct < 0.4 ? -(pct - 0.2) : -0.2 + (pct - 0.4)
    );

    const result = segmentDeltas(segments, trace);
    const t1 = result[1];
    expect(t1.fromPreviousLap).toBe(false);
    expect(t1.value).toBeCloseTo(-0.2, 2);

    const straight = result[2];
    expect(straight.live).toBe(true);
    expect(straight.value).toBeCloseTo(0.1, 2);

    const t2 = result[3];
    expect(t2.fromPreviousLap).toBe(true);
    expect(t2.value).toBeCloseTo(0.5, 2);
  });
});
