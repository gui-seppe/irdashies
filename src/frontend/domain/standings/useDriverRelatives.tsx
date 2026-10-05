import { useCallback, useMemo } from 'react';
import {
  useSessionStore,
  useFocusCarIdx,
  useRelativeGapsSnapshot,
} from '@irdashies/context';
import { TrackLocation } from '@irdashies/types';
import { useDriverStandings } from './useDriverPositions';
import { Standings } from './createStandings';

export const useDriverRelatives = ({
  buffer,
  hideDriversInPitStall = false,
  fillWindow = false,
}: {
  buffer: number;
  hideDriversInPitStall?: boolean;
  /**
   * Always return up to `2 * buffer + 1` drivers: when there are fewer than
   * `buffer` cars on one side of the focus car, take extra from the other side
   * instead of leaving the window short.
   */
  fillWindow?: boolean;
}) => {
  const drivers = useDriverStandings();
  const snapshot = useRelativeGapsSnapshot();
  const rendererFocusCarIdx = useFocusCarIdx();
  // Keep ordering and deltas on the same processor tick during camera changes.
  const focusCarIdx = snapshot?.focusCarIdx ?? rendererFocusCarIdx;
  const paceCarIdx =
    useSessionStore((s) => s.session?.DriverInfo?.PaceCarIdx) ?? -1;
  const sessionDrivers = useSessionStore((s) => s.session?.DriverInfo?.Drivers);
  // Spectator entries (e.g. your own slot when watching a race you're not
  // entered in) aren't real cars. Team members spectating their own team car
  // are not flagged as spectators, so their car stays visible.
  const spectatorCarIdxs = useMemo(
    () =>
      new Set(
        (sessionDrivers ?? []).filter((d) => d.IsSpectator).map((d) => d.CarIdx)
      ),
    [sessionDrivers]
  );

  const calculateRelativePct = useCallback(
    (opponentIdx: number): number => {
      const relativePct = snapshot?.relativePcts[opponentIdx];
      return relativePct ?? NaN;
    },
    [snapshot?.relativePcts]
  );

  const calculateDelta = useCallback(
    (opponentCarIdx: number) => {
      const delta = snapshot?.deltas[opponentCarIdx];
      return typeof delta === 'number' && Number.isFinite(delta)
        ? delta
        : undefined;
    },
    [snapshot?.deltas]
  );

  const isValidDriver = useCallback(
    (driver: Standings) => {
      // Must be a real car (idx > -1)
      if (driver.carIdx <= -1) return false;

      // Must not be the pace car
      if (driver.carIdx === paceCarIdx) return false;

      // Must not be a spectator slot
      if (spectatorCarIdxs.has(driver.carIdx)) return false;

      // The focus car is always kept, even when sitting in its own pit stall.
      if (driver.carIdx === focusCarIdx) return true;

      // Drivers parked in their pit stall (being serviced, waiting for repairs,
      // or retired to the box) scroll through the relative lap after lap without
      // being raceable. Drivers on pit road — entering or exiting — still show,
      // dimmed, since they rejoin the track shortly.
      if (
        hideDriversInPitStall &&
        driver.carTrackSurface === TrackLocation.InPitStall
      ) {
        return false;
      }

      // Must be on track
      return driver.onTrack;
    },
    [focusCarIdx, paceCarIdx, spectatorCarIdxs, hideDriversInPitStall]
  );

  const standings = useMemo(() => {
    // A. Filter & Map (Calculate Relative Pct immutably)
    const processed = [] as Standings[];
    for (const d of drivers) {
      if (isValidDriver(d)) {
        const relativePct = calculateRelativePct(d.carIdx);

        if (!isNaN(relativePct)) {
          processed.push({
            ...d,
            relativePct,
          });
        }
      }
    }

    // B. Sort (Descending)
    processed.sort((a, b) => b.relativePct - a.relativePct);

    // C. Slice Window
    const playerIdx = processed.findIndex((d) => d.carIdx === focusCarIdx);
    if (playerIdx === -1) return [];

    const windowSize = 2 * buffer + 1;
    const start = Math.max(
      0,
      fillWindow
        ? Math.min(playerIdx - buffer, processed.length - windowSize)
        : playerIdx - buffer
    );
    const end = fillWindow
      ? Math.min(processed.length, start + windowSize)
      : Math.min(processed.length, playerIdx + 1 + buffer);

    const visibleDrivers = processed.slice(start, end);

    // D. Final Map (Attach Delta)
    return visibleDrivers.map((d) => ({
      ...d,
      delta: calculateDelta(d.carIdx),
    }));
  }, [
    buffer,
    fillWindow,
    drivers,
    isValidDriver,
    calculateRelativePct,
    focusCarIdx,
    calculateDelta,
  ]);

  return standings;
};
