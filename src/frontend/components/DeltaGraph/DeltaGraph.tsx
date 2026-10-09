import { useMemo } from 'react';
import {
  trackStateSelectors,
  useLovelyTrackData,
  useSessionVisibility,
  useTrackStateSelector,
} from '@irdashies/context';
import type { DeltaGraphConfig } from '@irdashies/types';
import { buildTrackCorners } from '@irdashies/domain/lapTrace/trackCorners';
import {
  buildDeltaSegments,
  segmentDeltas,
} from '@irdashies/domain/lapDelta/lapDelta';
import { useLapDelta } from './hooks/useLapDelta';
import { DeltaGraphView } from './components/DeltaGraphView';

type DeltaGraphProps = Partial<DeltaGraphConfig>;

/**
 * Live delta to the session best: iRacing's own delta, traced over the lap,
 * with the time gained or lost in every corner and straight below it.
 */
export const DeltaGraph = ({
  background,
  cornerLabelStyle = 'number',
  showLapTime = true,
  showSessionBest = true,
  showPreviousLap = true,
  showOnlyWhenOnTrack = true,
  sessionVisibility,
}: DeltaGraphProps) => {
  const isSessionVisible = useSessionVisibility(sessionVisibility);
  const isOnTrack = useTrackStateSelector(trackStateSelectors.isOnTrack);
  const { trace, version, delta, currentLapTime, bestLapTime } =
    useLapDelta(isSessionVisible);

  const { sections } = useLovelyTrackData();
  const segments = useMemo(
    () => buildDeltaSegments(buildTrackCorners(sections, cornerLabelStyle)),
    [sections, cornerLabelStyle]
  );
  // Cheap (one pass over the segments), and the trace changes in place, so
  // recomputed on every render rather than memoised on a stale reference.
  const segmentValues = segmentDeltas(segments, trace);

  if (!isSessionVisible) return null;
  if (showOnlyWhenOnTrack && !isOnTrack) return null;

  return (
    <DeltaGraphView
      version={version}
      current={trace.current}
      previous={trace.previous}
      carPct={trace.lastPct}
      segments={segments}
      segmentValues={segmentValues}
      delta={delta}
      currentLapTime={currentLapTime}
      bestLapTime={bestLapTime}
      showLapTime={showLapTime}
      showSessionBest={showSessionBest}
      showPreviousLap={showPreviousLap}
      backgroundOpacity={background?.opacity ?? 80}
    />
  );
};
