import { memo, useId } from 'react';
import { formatTime } from '@irdashies/utils/time';
import type {
  DeltaSegment,
  SegmentDelta,
} from '@irdashies/domain/lapDelta/lapDelta';

export interface DeltaGraphViewProps {
  /**
   * The traces are updated in place, so their identity never changes; this
   * changes with them and is what lets memo see a new frame.
   */
  version: number;
  current: Float32Array;
  previous: Float32Array | null;
  /** 0..1, -1 when unknown. */
  carPct: number;
  segments: readonly DeltaSegment[];
  segmentValues: readonly SegmentDelta[];
  /** Live delta to the session best; null when iRacing has none. */
  delta: number | null;
  currentLapTime: number;
  bestLapTime: number;
  showLapTime: boolean;
  showSessionBest: boolean;
  showPreviousLap: boolean;
  /** 0..100 */
  backgroundOpacity: number;
}

const WIDTH = 1000;
const HEIGHT = 100;
const MID = HEIGHT / 2;
/** Smallest vertical range, so a near-perfect lap isn't blown up to fill it. */
const MIN_SCALE_SEC = 0.5;
/** Segments narrower than this (lap %) show colour only, no number. */
const MIN_LABELLED_WIDTH = 0.035;

const scaleFor = (traces: (Float32Array | null)[]): number => {
  let max = MIN_SCALE_SEC;
  for (const trace of traces) {
    if (!trace) continue;
    for (const value of trace) {
      if (!Number.isNaN(value)) max = Math.max(max, Math.abs(value));
    }
  }
  return max * 1.1;
};

/** Contiguous recorded runs of a trace as SVG point lists. */
const runsOf = (
  trace: Float32Array,
  scale: number
): { x: number; y: number }[][] => {
  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  for (let i = 0; i < trace.length; i += 1) {
    const value = trace[i];
    if (Number.isNaN(value)) {
      if (run.length > 1) runs.push(run);
      run = [];
      continue;
    }
    run.push({
      x: ((i + 0.5) / trace.length) * WIDTH,
      // Slower (positive delta) plots upwards.
      y: MID - (value / scale) * (MID - 4),
    });
  }
  if (run.length > 1) runs.push(run);
  return runs;
};

const linePath = (runs: { x: number; y: number }[][]) =>
  runs
    .map(
      (run) =>
        `M${run[0].x},${run[0].y}` +
        run
          .slice(1)
          .map((p) => `L${p.x},${p.y}`)
          .join('')
    )
    .join('');

const areaPath = (runs: { x: number; y: number }[][]) =>
  runs
    .map(
      (run) =>
        `M${run[0].x},${MID}` +
        run.map((p) => `L${p.x},${p.y}`).join('') +
        `L${run[run.length - 1].x},${MID}Z`
    )
    .join('');

const formatDelta = (delta: number) =>
  `${delta > 0 ? '+' : delta < 0 ? '-' : ''}${Math.abs(delta).toFixed(2)}`;

const segmentClass = (segment: SegmentDelta): string => {
  if (segment.value === null) return 'bg-slate-600/40';
  const rounded = Math.round(segment.value * 10) / 10;
  const colour =
    rounded > 0
      ? 'bg-red-700/85'
      : rounded < 0
        ? 'bg-green-700/85'
        : 'bg-slate-500/70';
  const dim = segment.fromPreviousLap ? 'opacity-40' : '';
  const live = segment.live ? 'ring-1 ring-inset ring-white/60' : '';
  return `${colour} ${dim} ${live}`;
};

export const DeltaGraphView = memo(
  ({
    current,
    previous,
    carPct,
    segments,
    segmentValues,
    delta,
    currentLapTime,
    bestLapTime,
    showLapTime,
    showSessionBest,
    showPreviousLap,
    backgroundOpacity,
  }: DeltaGraphViewProps) => {
    const clipId = useId();
    const scale = scaleFor([current, showPreviousLap ? previous : null]);
    const currentRuns = runsOf(current, scale);
    const previousRuns =
      showPreviousLap && previous ? runsOf(previous, scale) : [];

    const deltaColour =
      delta === null
        ? 'text-slate-400'
        : delta < 0
          ? 'text-green-400'
          : delta > 0
            ? 'text-red-400'
            : 'text-white';

    return (
      <div
        className="flex h-full w-full flex-col gap-1 rounded-sm bg-slate-900/(--bg-opacity) p-1.5 text-white tabular-nums"
        style={{ ['--bg-opacity' as string]: `${backgroundOpacity}%` }}
      >
        <div className="flex items-baseline gap-3 px-0.5">
          {showLapTime && (
            <span className="text-base">
              {currentLapTime > 0 ? formatTime(currentLapTime, 'full') : '-'}
            </span>
          )}
          {showSessionBest && (
            <span className="text-xs text-slate-400">
              SB{' '}
              <span className="text-slate-200">
                {bestLapTime > 0 ? formatTime(bestLapTime, 'full') : '-'}
              </span>
            </span>
          )}
          <span className={`ml-auto text-xl leading-none ${deltaColour}`}>
            {delta === null ? '-' : formatDelta(delta)}
          </span>
        </div>

        <svg
          className="min-h-0 w-full flex-1"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
        >
          <defs>
            <clipPath id={`${clipId}-above`}>
              <rect x={0} y={0} width={WIDTH} height={MID} />
            </clipPath>
            <clipPath id={`${clipId}-below`}>
              <rect x={0} y={MID} width={WIDTH} height={MID} />
            </clipPath>
          </defs>
          {segments.map((segment, idx) =>
            segment.isCorner ? (
              <rect
                key={idx}
                x={segment.startPct * WIDTH}
                y={0}
                width={(segment.endPct - segment.startPct) * WIDTH}
                height={HEIGHT}
                className="fill-white/6"
              />
            ) : null
          )}
          <line
            x1={0}
            x2={WIDTH}
            y1={MID}
            y2={MID}
            className="stroke-white/25"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {previousRuns.length > 0 && (
            <path
              d={linePath(previousRuns)}
              fill="none"
              className="stroke-slate-300/50"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={areaPath(currentRuns)}
            clipPath={`url(#${clipId}-above)`}
            className="fill-red-600/45"
          />
          <path
            d={areaPath(currentRuns)}
            clipPath={`url(#${clipId}-below)`}
            className="fill-green-600/45"
          />
          <path
            d={linePath(currentRuns)}
            clipPath={`url(#${clipId}-above)`}
            fill="none"
            className="stroke-red-500"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={linePath(currentRuns)}
            clipPath={`url(#${clipId}-below)`}
            fill="none"
            className="stroke-green-500"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          {carPct >= 0 && (
            <line
              x1={carPct * WIDTH}
              x2={carPct * WIDTH}
              y1={0}
              y2={HEIGHT}
              className="stroke-white/70"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        <div className="flex text-[0.7rem] leading-tight text-slate-300">
          {segments.map((segment, idx) => (
            <span
              key={idx}
              className="truncate px-px text-center"
              style={{ width: `${(segment.endPct - segment.startPct) * 100}%` }}
            >
              {segment.label}
            </span>
          ))}
        </div>

        <div className="flex h-5 text-xs">
          {segments.map((segment, idx) => {
            const value = segmentValues[idx];
            const width = segment.endPct - segment.startPct;
            return (
              <div
                key={idx}
                className="h-full px-px"
                style={{ width: `${width * 100}%` }}
              >
                <div
                  className={`flex h-full items-center justify-center overflow-hidden rounded-xs ${value ? segmentClass(value) : 'bg-slate-600/40'}`}
                >
                  {value?.value != null && width >= MIN_LABELLED_WIDTH
                    ? Math.abs(value.value).toFixed(1)
                    : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

DeltaGraphView.displayName = 'DeltaGraphView';
