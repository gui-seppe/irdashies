import { useEffect, useRef, useState } from 'react';
import { getChannelSnapshotStore } from '@irdashies/context';
import { LapDeltaTrace } from '@irdashies/domain/lapDelta/lapDelta';

export interface LapDeltaState {
  /** Mutated in place; `version` changes whenever it does. */
  trace: LapDeltaTrace;
  version: number;
  delta: number | null;
  currentLapTime: number;
  bestLapTime: number;
}

/** lap-log.snapshot publishes at 25 Hz; every update feeds the trace. */
const SAMPLE_HZ = 25;
/** Redraws at most this often (seconds of session time). */
const DRAW_INTERVAL_SEC = 0.1;

/**
 * Follows iRacing's delta to the session best and traces it over the lap.
 *
 * Read through a direct channel subscription (R2.3): the trace takes every
 * update, while the widget re-renders at most ten times a second.
 */
export const useLapDelta = (enabled: boolean): LapDeltaState => {
  const traceRef = useRef<LapDeltaTrace | null>(null);
  traceRef.current ??= new LapDeltaTrace();
  const trace = traceRef.current;

  const [view, setView] = useState({
    version: 0,
    delta: null as number | null,
    currentLapTime: 0,
    bestLapTime: 0,
  });

  useEffect(() => {
    if (!enabled) return;
    const bridge = window.channelBridge;
    if (!bridge) return;

    const store = getChannelSnapshotStore('lap-log.snapshot', bridge);
    const selection = store.createSelection((s) => s, Object.is, SAMPLE_HZ);
    let lastDrawTime = -Infinity;

    const onSnapshot = () => {
      const snapshot = selection.getSnapshot();
      if (!snapshot) return;
      trace.update({
        sessionNum: snapshot.sessionNum,
        lapDistPct: snapshot.lapDistPct,
        delta: snapshot.deltaToSessionBestLap,
        deltaOk: snapshot.deltaToSessionBestLapOk,
      });
      if (Math.abs(snapshot.sessionTime - lastDrawTime) < DRAW_INTERVAL_SEC)
        return;
      lastDrawTime = snapshot.sessionTime;
      setView({
        version: trace.version,
        delta: snapshot.deltaToSessionBestLapOk
          ? snapshot.deltaToSessionBestLap
          : null,
        currentLapTime: snapshot.currentLapTime,
        bestLapTime: snapshot.bestLapTime,
      });
    };

    return selection.subscribe(onSnapshot);
  }, [enabled, trace]);

  return { trace, ...view };
};
