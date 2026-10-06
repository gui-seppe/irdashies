import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getChannelSnapshotStore,
  useLapTraceStore,
  useLovelyTrackData,
} from '@irdashies/context';
import {
  buildTrackCorners,
  type LastCornerLabelStyle,
} from '@irdashies/domain/lapTrace/trackCorners';
import {
  activeCornerIndex,
  cornerSpeedExtremes,
  cornerSpeedWindows,
  type CornerSpeedExtremes,
} from '@irdashies/domain/lapTrace/cornerSpeeds';
import { SessionBestCornerSpeeds } from '@irdashies/domain/lapTrace/sessionBestCornerSpeeds';

export interface CornerSpeeds {
  label: string;
  /** From your fastest complete lap this session; null until there is one. */
  best: CornerSpeedExtremes | null;
  /** This lap so far; null if the corner wasn't recorded this lap. */
  current: CornerSpeedExtremes | null;
}

interface LiveCorner {
  index: number;
  current: CornerSpeedExtremes | null;
}

/**
 * Every frame feeds the session-best tracker, so a corner ending just before
 * the line is closed before the buffer resets there.
 */
const SAMPLE_HZ = 60;

/** The live numbers redraw at most this often (seconds). */
const DISPLAY_INTERVAL_SEC = 0.1;

/** Changes smaller than this (m/s, ~0.4 km/h) don't re-render. */
const SPEED_EPSILON_MS = 0.1;

const sameExtremes = (
  a: CornerSpeedExtremes | null,
  b: CornerSpeedExtremes | null
): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    Math.abs(a.maxMs - b.maxMs) < SPEED_EPSILON_MS &&
    Math.abs(a.minMs - b.minMs) < SPEED_EPSILON_MS);

/**
 * Max approach and min apex speed for the corner being driven, against your
 * fastest complete lap of this session (see SessionBestCornerSpeeds). Read
 * from the lap-trace recorder's buffers, so it needs the recorder running
 * (see LapTraceUpdater).
 *
 * The corner shown is the last one the car entered: its numbers update live
 * through it and then hold along the following straight until the next
 * corner begins.
 *
 * Position is followed through a direct channel subscription rather than a
 * hook (R2.3), and state is only set when the corner or a value changes.
 */
export const useCornerSpeeds = (
  enabled: boolean,
  labelStyle: LastCornerLabelStyle
): CornerSpeeds | null => {
  const { sections } = useLovelyTrackData();
  const trackLengthM = useLapTraceStore((s) => s.trackLengthM);

  const corners = useMemo(
    () => (enabled ? buildTrackCorners(sections, labelStyle) : []),
    [enabled, sections, labelStyle]
  );
  const windows = useMemo(
    () => (trackLengthM > 0 ? cornerSpeedWindows(corners, trackLengthM) : []),
    [corners, trackLengthM]
  );
  const trackerRef = useRef<SessionBestCornerSpeeds | null>(null);
  trackerRef.current ??= new SessionBestCornerSpeeds();
  const [best, setBest] = useState<(CornerSpeedExtremes | null)[] | null>(null);

  const [live, setLive] = useState<LiveCorner | null>(null);
  const liveRef = useRef<LiveCorner | null>(null);
  const windowsRef = useRef(windows);
  windowsRef.current = windows;

  useEffect(() => {
    liveRef.current = null;
    setLive(null);
    if (!enabled || windows.length === 0) return;
    const bridge = window.channelBridge;
    if (!bridge) return;

    const tracker = trackerRef.current;
    if (!tracker) return;
    tracker.setTrack(windows, trackLengthM);
    let bestVersion = -1;
    let lastDisplayTime = -Infinity;

    const store = getChannelSnapshotStore('lap-trace.sample', bridge);
    const selection = store.createSelection((s) => s, Object.is, SAMPLE_HZ);

    const onSample = () => {
      const sample = selection.getSnapshot();
      if (!sample?.isOnTrack) return;
      const { activeLap } = useLapTraceStore.getState();
      const samples = activeLap?.samples;
      if (!activeLap || !samples || samples.length === 0) return;

      tracker.update({
        sessionNum: sample.sessionNum,
        lapSerial: activeLap.lapSerial,
        samples,
        onPitRoad: sample.onPitRoad,
        lastLapTime: sample.lastLapTime,
        lapCompleted: sample.lapCompleted,
      });
      if (tracker.version !== bestVersion) {
        bestVersion = tracker.version;
        setBest(tracker.best);
      }

      const cornerWindows = windowsRef.current;
      const carM = samples.distanceM[samples.length - 1];
      const index = activeCornerIndex(cornerWindows, carM);
      // Before the lap's first corner: keep the last one on screen.
      if (index === -1) return;
      const cornerWindow = cornerWindows[index];
      if (!cornerWindow) return;

      const previousLive = liveRef.current;
      const sameCorner = previousLive?.index === index;
      if (
        sameCorner &&
        sample.sessionTime - lastDisplayTime < DISPLAY_INTERVAL_SEC
      )
        return;
      lastDisplayTime = sample.sessionTime;

      const current = cornerSpeedExtremes(samples, cornerWindow);
      const previous = liveRef.current;
      if (
        previous &&
        previous.index === index &&
        sameExtremes(previous.current, current)
      ) {
        return;
      }
      const next = { index, current };
      liveRef.current = next;
      setLive(next);
    };

    const unsubscribe = selection.subscribe(onSample);
    return () => {
      unsubscribe();
    };
  }, [enabled, windows, trackLengthM]);

  if (!live || !corners[live.index]) return null;
  return {
    label: corners[live.index].label,
    best: best?.[live.index] ?? null,
    current: live.current,
  };
};
