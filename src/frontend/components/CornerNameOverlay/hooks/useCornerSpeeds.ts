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

export interface CornerSpeeds {
  label: string;
  /** From the reference lap (your best by default); null without one. */
  best: CornerSpeedExtremes | null;
  /** This lap so far; null if the corner wasn't recorded this lap. */
  current: CornerSpeedExtremes | null;
}

interface LiveCorner {
  index: number;
  current: CornerSpeedExtremes | null;
}

/** Updates per second. Plenty for numbers, and cheap next to the 60 Hz feed. */
const UPDATE_HZ = 10;

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
 * Max approach and min apex speed for the corner being driven, against the
 * reference lap. Read from the lap-trace recorder's buffers, so it needs the
 * recorder running (see LapTraceUpdater).
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
  const referenceLap = useLapTraceStore((s) => s.referenceLap);
  const trackLengthM = useLapTraceStore((s) => s.trackLengthM);

  const corners = useMemo(
    () => (enabled ? buildTrackCorners(sections, labelStyle) : []),
    [enabled, sections, labelStyle]
  );
  const windows = useMemo(
    () => (trackLengthM > 0 ? cornerSpeedWindows(corners, trackLengthM) : []),
    [corners, trackLengthM]
  );
  const best = useMemo(
    () =>
      windows.map((window) =>
        window && referenceLap
          ? cornerSpeedExtremes(referenceLap.samples, window)
          : null
      ),
    [windows, referenceLap]
  );

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

    const store = getChannelSnapshotStore('lap-trace.sample', bridge);
    const selection = store.createSelection((s) => s, Object.is, UPDATE_HZ);

    const onSample = () => {
      const sample = selection.getSnapshot();
      if (!sample?.isOnTrack) return;
      const { activeLap } = useLapTraceStore.getState();
      const samples = activeLap?.samples;
      if (!samples || samples.length === 0) return;

      const cornerWindows = windowsRef.current;
      const carM = samples.distanceM[samples.length - 1];
      const index = activeCornerIndex(cornerWindows, carM);
      // Before the lap's first corner: keep the last one on screen.
      if (index === -1) return;
      const cornerWindow = cornerWindows[index];
      if (!cornerWindow) return;

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
  }, [enabled, windows]);

  if (!live || !corners[live.index]) return null;
  return {
    label: corners[live.index].label,
    best: best[live.index] ?? null,
    current: live.current,
  };
};
