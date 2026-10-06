import type { LapTraceSamples } from '@irdashies/types';
import {
  cornerSpeedExtremes,
  type CornerSpeedExtremes,
  type CornerSpeedWindow,
} from './cornerSpeeds';

/** One frame of what the tracker needs. */
export interface CornerSpeedFrame {
  sessionNum: number | null;
  /** Bumps whenever the recorder starts a new lap buffer. */
  lapSerial: number;
  /** The lap being driven, from the start/finish line. */
  samples: LapTraceSamples;
  onPitRoad: boolean;
  /** LapLastLapTime: lags the line crossing by a few frames. */
  lastLapTime: number;
  lapCompleted: number;
}

/**
 * A lap counts only if its recording began at the line; anything starting
 * further in (joining mid-lap, leaving the pits) is missing its first corner.
 */
const STARTED_AT_LINE_M = 50;

/**
 * Corners ending this close to the line are closed a little early, so the
 * last corner of the lap is never left open by the line crossing.
 */
const LINE_MARGIN_M = 10;

interface LapInProgress {
  lapSerial: number;
  corners: (CornerSpeedExtremes | null)[];
  /** Next corner not yet closed. */
  nextIdx: number;
  startedAtLine: boolean | null;
  touchedPits: boolean;
}

interface PendingLap {
  corners: (CornerSpeedExtremes | null)[];
  lastLapTimeAtBoundary: number;
  lapCompletedAtBoundary: number;
}

/**
 * The driver's fastest complete lap of the current session, kept as the max
 * approach / min apex speed of every corner.
 *
 * Each corner's values are taken as the car leaves it, from the lap buffer
 * the lap-trace recorder fills, so nothing beyond those few numbers per lap
 * is kept. At the line the finished lap waits for its official time
 * (LapLastLapTime changes a few frames after the crossing, sometimes in the
 * crossing frame itself, hence the previous frame's value as the baseline)
 * and replaces the best only if it is faster.
 *
 * A lap is ignored if it did not start at the line, did not reach every
 * corner (a reset or tow ends the buffer early), or touched pit road. A new
 * session starts with no best, so a race is never compared with practice or
 * qualifying laps.
 */
export class SessionBestCornerSpeeds {
  private windows: readonly (CornerSpeedWindow | null)[] = [];
  private trackLengthM = 0;
  private sessionNum: number | null | undefined = undefined;
  private lap: LapInProgress | null = null;
  private pending: PendingLap | null = null;
  private prevLastLapTime = -1;
  private prevLapCompleted = -1;

  /** Per corner, parallel to the windows; null until a lap has counted. */
  best: (CornerSpeedExtremes | null)[] | null = null;
  bestLapTime = Infinity;
  /** Bumps whenever `best` changes. */
  version = 0;

  setTrack(
    windows: readonly (CornerSpeedWindow | null)[],
    trackLengthM: number
  ): void {
    if (windows === this.windows && trackLengthM === this.trackLengthM) return;
    this.windows = windows;
    this.trackLengthM = trackLengthM;
    this.reset();
  }

  update(frame: CornerSpeedFrame): void {
    if (frame.sessionNum !== this.sessionNum) {
      this.sessionNum = frame.sessionNum;
      this.reset();
    }

    if (!this.lap || frame.lapSerial !== this.lap.lapSerial) {
      if (this.lap && this.isComplete(this.lap)) {
        this.pending = {
          corners: this.lap.corners,
          lastLapTimeAtBoundary: this.prevLastLapTime,
          lapCompletedAtBoundary: this.prevLapCompleted,
        };
      }
      this.lap = {
        lapSerial: frame.lapSerial,
        corners: this.windows.map(() => null),
        nextIdx: 0,
        startedAtLine: null,
        touchedPits: false,
      };
    }

    const lap = this.lap;
    const samples = frame.samples;
    if (frame.onPitRoad) lap.touchedPits = true;
    if (lap.startedAtLine === null && samples.length > 0) {
      lap.startedAtLine = samples.distanceM[0] <= STARTED_AT_LINE_M;
    }

    if (samples.length > 0) {
      const carM = samples.distanceM[samples.length - 1];
      while (lap.nextIdx < this.windows.length) {
        const window = this.windows[lap.nextIdx];
        if (window) {
          const closeAtM = Math.min(
            window.cornerEndM,
            this.trackLengthM - LINE_MARGIN_M
          );
          if (carM < closeAtM) break;
          lap.corners[lap.nextIdx] = cornerSpeedExtremes(samples, window);
        }
        lap.nextIdx += 1;
      }
    }

    this.resolvePending(frame);
    this.prevLastLapTime = frame.lastLapTime;
    this.prevLapCompleted = frame.lapCompleted;
  }

  private resolvePending(frame: CornerSpeedFrame): void {
    const pending = this.pending;
    if (!pending) return;
    // A further lap has completed: the time no longer describes this one.
    if (frame.lapCompleted > pending.lapCompletedAtBoundary + 1) {
      this.pending = null;
      return;
    }
    if (frame.lastLapTime === pending.lastLapTimeAtBoundary) return;
    this.pending = null;
    if (frame.lastLapTime > 0 && frame.lastLapTime < this.bestLapTime) {
      this.bestLapTime = frame.lastLapTime;
      this.best = pending.corners;
      this.version += 1;
    }
  }

  private isComplete(lap: LapInProgress): boolean {
    if (lap.touchedPits || lap.startedAtLine !== true) return false;
    if (lap.nextIdx < this.windows.length) return false;
    return this.windows.every(
      (window, idx) => window === null || lap.corners[idx] !== null
    );
  }

  private reset(): void {
    const hadBest = this.best !== null;
    this.lap = null;
    this.pending = null;
    this.best = null;
    this.bestLapTime = Infinity;
    if (hadBest) this.version += 1;
  }
}
