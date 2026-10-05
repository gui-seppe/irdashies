import type { CornerNameOverlayConfig } from '@irdashies/types';
import {
  trackStateSelectors,
  useSessionVisibility,
  useTrackStateSelector,
} from '@irdashies/context';
import {
  resolveSpeedUnit,
  speedFromMs,
  type SpeedUnit,
} from '@irdashies/utils/units';
import { useCurrentSection } from './hooks/useCurrentSection';
import { useCornerSpeeds, type CornerSpeeds } from './hooks/useCornerSpeeds';

type CornerNameOverlayProps = Partial<CornerNameOverlayConfig>;

export const CornerNameOverlay = ({
  showCornerNumber = true,
  showProgressBar = true,
  showTrackPct = true,
  fontSize = 18,
  opacity = 0.9,
  showCornerSpeeds = false,
  cornerSpeedUnit = 'auto',
  cornerSpeedLabelStyle = 'number',
  cornerSpeedLayout = 'compact',
  sessionVisibility,
}: CornerNameOverlayProps) => {
  const { section, progress, lapDistPct } = useCurrentSection();
  const isSessionVisible = useSessionVisibility(sessionVisibility);
  const cornerSpeeds = useCornerSpeeds(
    showCornerSpeeds && isSessionVisible,
    cornerSpeedLabelStyle
  );
  // Changes essentially never, so this costs no per-frame renders.
  const displayUnits = useTrackStateSelector(trackStateSelectors.displayUnits);
  const speedUnit = resolveSpeedUnit(cornerSpeedUnit, displayUnits);

  if (!isSessionVisible) return null;

  // Compact: just the four numbers, small enough to sit beside the sim's own
  // pedal graph. Always rendered (dashes until there is data) so it holds its
  // place on screen.
  if (showCornerSpeeds && cornerSpeedLayout === 'compact') {
    return (
      <CompactCornerSpeeds
        speeds={cornerSpeeds}
        unit={speedUnit}
        fontSize={fontSize}
        opacity={opacity}
      />
    );
  }

  const hasSection = !!section?.name;
  if (!hasSection && !cornerSpeeds) return null;

  return (
    <div
      className="w-full rounded-sm p-2 relative overflow-hidden"
      style={{ backgroundColor: `rgba(15, 23, 42, ${opacity})` }}
    >
      {section && hasSection && (
        <>
          {/* Main content */}
          <div className="flex items-center gap-2">
            {/* Corner number badge */}
            {showCornerNumber && section.corner_number && (
              <div className="flex items-center justify-center px-1.5 py-0.5 rounded bg-sky-500/30 border border-sky-400/50">
                <span
                  className="text-sky-300 font-bold tabular-nums"
                  style={{ fontSize: `${fontSize - 4}px` }}
                >
                  {section.corner_number}
                </span>
              </div>
            )}

            {/* Section name */}
            <div className="flex flex-col min-w-0">
              <span
                className="text-white font-semibold leading-tight truncate"
                style={{ fontSize: `${fontSize}px` }}
              >
                {section.name}
              </span>
            </div>

            {/* Track percentage */}
            {showTrackPct && (
              <span
                className="text-slate-400 tabular-nums ml-auto"
                style={{ fontSize: `${fontSize - 4}px` }}
              >
                {Math.round(lapDistPct * 100)}%
              </span>
            )}
          </div>

          {/* Progress bar */}
          {showProgressBar && (
            <div className="mt-1.5 h-1 w-full bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full transition-[width] duration-200 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </>
      )}

      {cornerSpeeds && (
        <CornerSpeedsTable
          speeds={cornerSpeeds}
          unit={speedUnit}
          fontSize={fontSize}
          spaced={hasSection}
        />
      )}
    </div>
  );
};

/**
 * Best max, this lap's max, best min, this lap's min, stacked. The best-lap
 * values are the highlighted ones.
 */
export const CompactCornerSpeeds = ({
  speeds,
  unit,
  fontSize,
  opacity,
}: {
  speeds: CornerSpeeds | null;
  unit: SpeedUnit;
  fontSize: number;
  opacity: number;
}) => {
  const format = (ms: number | undefined) =>
    ms === undefined ? '-' : Math.round(speedFromMs(ms, unit)).toString();

  return (
    <div
      className="inline-flex flex-col items-end rounded-sm px-1 py-0.5 leading-tight tabular-nums"
      style={{
        fontSize: `${fontSize}px`,
        backgroundColor: `rgba(15, 23, 42, ${opacity})`,
      }}
    >
      <span className="text-purple-400">{format(speeds?.best?.maxMs)}</span>
      <span className="text-slate-400">{format(speeds?.current?.maxMs)}</span>
      <span className="text-rose-400">{format(speeds?.best?.minMs)}</span>
      <span className="text-slate-400">{format(speeds?.current?.minMs)}</span>
    </div>
  );
};

/** Faster than the reference reads green, slower red. */
const compareClass = (current: number, best: number | undefined): string => {
  if (best === undefined) return 'text-white';
  const diff = Math.round(current) - Math.round(best);
  if (diff > 0) return 'text-green-400';
  if (diff < 0) return 'text-red-400';
  return 'text-white';
};

export const CornerSpeedsTable = ({
  speeds,
  unit,
  fontSize,
  spaced,
}: {
  speeds: CornerSpeeds;
  unit: SpeedUnit;
  fontSize: number;
  spaced: boolean;
}) => {
  const best = speeds.best && {
    max: speedFromMs(speeds.best.maxMs, unit),
    min: speedFromMs(speeds.best.minMs, unit),
  };
  const current = speeds.current && {
    max: speedFromMs(speeds.current.maxMs, unit),
    min: speedFromMs(speeds.current.minMs, unit),
  };
  const format = (value: number | undefined) =>
    value === undefined ? '-' : Math.round(value).toString();

  return (
    <div
      className={`grid grid-cols-[auto_1fr_1fr] items-baseline gap-x-3 tabular-nums ${spaced ? 'mt-1.5' : ''}`}
      style={{ fontSize: `${fontSize - 2}px` }}
    >
      <span className="truncate text-sky-300">{speeds.label}</span>
      <span className="text-right text-[0.75em] uppercase text-slate-400">
        Max
      </span>
      <span className="text-right text-[0.75em] uppercase text-slate-400">
        Min
      </span>

      <span className="text-[0.75em] uppercase text-slate-400">Best</span>
      <span className="text-right text-white">{format(best?.max)}</span>
      <span className="text-right text-white">{format(best?.min)}</span>

      <span className="text-[0.75em] uppercase text-slate-400">Lap</span>
      <span
        className={`text-right ${current ? compareClass(current.max, best?.max) : 'text-white'}`}
      >
        {format(current?.max)}
      </span>
      <span
        className={`text-right ${current ? compareClass(current.min, best?.min) : 'text-white'}`}
      >
        {format(current?.min)}
      </span>
      <span className="col-span-3 text-right text-[0.7em] text-slate-500">
        {unit}
      </span>
    </div>
  );
};
