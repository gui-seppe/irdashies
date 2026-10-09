/**
 * Live delta to the session best, traced over the lap and split per corner.
 *
 * The delta itself is iRacing's own LapDeltaToSessionBestLap, so the numbers
 * match the sim's delta bar. This module only remembers it by lap position:
 * a trace for the lap being driven and one for the lap before, from which the
 * time gained or lost in each corner and straight is read off.
 */

/** Lap positions per trace: 0.2% of the lap, about 10 m on a 5 km track. */
export const DELTA_BUCKETS = 500;

/** A move this far (lap fraction) between updates is a reset or tow, not driving. */
const MAX_FILL_GAP = 0.03;

export interface DeltaFrame {
  sessionNum: number | null;
  /** 0..1 */
  lapDistPct: number;
  /** Seconds behind the session best (negative = ahead). */
  delta: number;
  /** iRacing's own validity flag: false with no best lap, off track, etc. */
  deltaOk: boolean;
}

const bucketOf = (pct: number) =>
  Math.min(DELTA_BUCKETS - 1, Math.max(0, Math.floor(pct * DELTA_BUCKETS)));

const emptyTrace = () => new Float32Array(DELTA_BUCKETS).fill(NaN);

export class LapDeltaTrace {
  /** Delta per bucket for the lap being driven; NaN where not recorded. */
  current = emptyTrace();
  /** The completed lap before; null until one has been driven. */
  previous: Float32Array | null = null;
  /** Bumps on every change, for cheap change detection. */
  version = 0;
  /** Last recorded position and delta, NaN/-1 before any. */
  lastPct = -1;
  lastDelta = NaN;

  private sessionNum: number | null | undefined = undefined;
  private lastBucket = -1;

  update(frame: DeltaFrame): void {
    if (frame.sessionNum !== this.sessionNum) {
      this.sessionNum = frame.sessionNum;
      this.current = emptyTrace();
      this.previous = null;
      this.lastBucket = -1;
      this.lastPct = -1;
      this.lastDelta = NaN;
      this.version += 1;
    }

    const pct = frame.lapDistPct;
    if (!(pct >= 0 && pct <= 1)) return;

    // Crossed the line: the lap just driven becomes the previous one, if it
    // was traced through most of the lap.
    if (this.lastPct > 0.9 && pct < 0.1) {
      if (coverage(this.current) > 0.9) this.previous = this.current;
      this.current = emptyTrace();
      this.lastBucket = -1;
      this.version += 1;
    }

    if (!frame.deltaOk || !Number.isFinite(frame.delta)) {
      this.lastPct = pct;
      this.lastBucket = -1;
      return;
    }

    const bucket = bucketOf(pct);
    // Fill buckets skipped since the last update, so a fast car at a low
    // update rate draws a continuous line. Not across a jump, which would
    // invent a stretch of track that was never driven.
    if (
      this.lastBucket >= 0 &&
      bucket > this.lastBucket + 1 &&
      pct - this.lastPct <= MAX_FILL_GAP
    ) {
      const from = this.current[this.lastBucket];
      const steps = bucket - this.lastBucket;
      for (let i = 1; i < steps; i += 1) {
        this.current[this.lastBucket + i] =
          from + ((frame.delta - from) * i) / steps;
      }
    }
    this.current[bucket] = frame.delta;
    this.lastBucket = bucket;
    this.lastPct = pct;
    this.lastDelta = frame.delta;
    this.version += 1;
  }
}

const coverage = (trace: Float32Array): number => {
  let recorded = 0;
  for (const value of trace) if (!Number.isNaN(value)) recorded += 1;
  return recorded / trace.length;
};

/**
 * Delta recorded at a lap position: the nearest bucket at or before it. The
 * lap starts at zero delta, so the line itself reads 0. Null where nothing was
 * recorded close enough to stand for it.
 */
export const deltaAt = (trace: Float32Array, pct: number): number | null => {
  if (pct <= 0) return 0;
  const bucket = bucketOf(pct);
  for (let i = bucket; i >= Math.max(0, bucket - 3); i -= 1) {
    if (!Number.isNaN(trace[i])) return trace[i];
  }
  return null;
};

export interface DeltaSegment {
  startPct: number;
  endPct: number;
  /** Corner label; empty for a straight. */
  label: string;
  isCorner: boolean;
}

/** Gaps between corners shorter than this are not worth a straight box. */
const MIN_STRAIGHT = 0.004;

/**
 * Split the lap into corners and the straights between them, covering 0..1
 * with no gaps. A corner that wraps the start/finish line is split in two so
 * every segment runs forward.
 */
export const buildDeltaSegments = (
  corners: readonly { start_pct: number; end_pct: number; label: string }[]
): DeltaSegment[] => {
  const pieces: DeltaSegment[] = [];
  for (const corner of corners) {
    if (corner.end_pct < corner.start_pct) {
      pieces.push(
        {
          startPct: corner.start_pct,
          endPct: 1,
          label: corner.label,
          isCorner: true,
        },
        { startPct: 0, endPct: corner.end_pct, label: '', isCorner: true }
      );
    } else {
      pieces.push({
        startPct: corner.start_pct,
        endPct: corner.end_pct,
        label: corner.label,
        isCorner: true,
      });
    }
  }
  pieces.sort((a, b) => a.startPct - b.startPct);

  const segments: DeltaSegment[] = [];
  let cursor = 0;
  for (const piece of pieces) {
    const start = Math.max(piece.startPct, cursor);
    if (piece.endPct <= start) continue;
    if (start - cursor >= MIN_STRAIGHT) {
      segments.push({
        startPct: cursor,
        endPct: start,
        label: '',
        isCorner: false,
      });
    } else if (segments.length > 0 && start > cursor) {
      // Too short for its own box: stretch the previous segment over it.
      segments[segments.length - 1].endPct = start;
    }
    segments.push({ ...piece, startPct: start });
    cursor = piece.endPct;
  }
  if (1 - cursor >= MIN_STRAIGHT || segments.length === 0) {
    segments.push({ startPct: cursor, endPct: 1, label: '', isCorner: false });
  } else {
    segments[segments.length - 1].endPct = 1;
  }
  return segments;
};

export interface SegmentDelta {
  /** Seconds lost (positive) or gained (negative) in the segment. */
  value: number | null;
  /** From the lap before, shown until this lap reaches the segment. */
  fromPreviousLap: boolean;
  /** The segment the car is in, still being driven. */
  live: boolean;
}

/**
 * Time gained or lost in each segment: delta at its end minus delta at its
 * start. Segments this lap has driven use this lap; the one the car is in
 * reads live to the current delta; the rest show the previous lap's.
 */
export const segmentDeltas = (
  segments: readonly DeltaSegment[],
  trace: LapDeltaTrace
): SegmentDelta[] => {
  const carPct = trace.lastPct;
  return segments.map((segment) => {
    if (carPct >= segment.endPct) {
      const start = deltaAt(trace.current, segment.startPct);
      const end = deltaAt(trace.current, segment.endPct - 1e-6);
      if (start !== null && end !== null) {
        return { value: end - start, fromPreviousLap: false, live: false };
      }
    } else if (carPct >= segment.startPct) {
      const start = deltaAt(trace.current, segment.startPct);
      if (start !== null && Number.isFinite(trace.lastDelta)) {
        return {
          value: trace.lastDelta - start,
          fromPreviousLap: false,
          live: true,
        };
      }
    }
    if (trace.previous) {
      const start = deltaAt(trace.previous, segment.startPct);
      const end = deltaAt(trace.previous, segment.endPct - 1e-6);
      if (start !== null && end !== null) {
        return { value: end - start, fromPreviousLap: true, live: false };
      }
    }
    return { value: null, fromPreviousLap: false, live: false };
  });
};
