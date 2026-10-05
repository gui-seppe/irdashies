import { getStyleColorVar, getTailwindStyle } from '@irdashies/utils/colors';
import type { ClassHeaderStyle } from '@irdashies/types';
import { CarManufacturer } from '../CarManufacturer/CarManufacturer';
import { HelmetIcon } from './HelmetIcon';
import { ClassHeaderSessionTime } from './ClassHeaderSessionTime';
import type { ClassLapEstimate, OrderedColumn } from '../../Standings';

export interface DriverClassHeaderProps {
  className: string | undefined;
  classColor: number | undefined;
  totalDrivers: number | undefined;
  sof: number | undefined;
  estimatedLaps?: ClassLapEstimate;
  highlightColor?: number;
  isMultiClass: boolean;
  colSpan?: number;
  classHeaderStyle?: ClassHeaderStyle;
  compactMode?: string;
  manufacturerCounts?: { carId: number; count: number }[];
  playerManufacturerEntry?: { carId: number; count: number };
  orderedColumns?: OrderedColumn[];
  /** Show the session time remaining (the first class header only). */
  showSessionTime?: boolean;
}

export const DriverClassHeader = ({
  className,
  classColor,
  totalDrivers,
  sof,
  estimatedLaps,
  highlightColor,
  isMultiClass,
  colSpan,
  classHeaderStyle,
  compactMode,
  manufacturerCounts,
  playerManufacturerEntry,
  orderedColumns,
  showSessionTime = false,
}: DriverClassHeaderProps) => {
  if (!className) {
    return (
      <tr>
        <td colSpan={colSpan ? colSpan : 6} className="pb-3"></td>
      </tr>
    );
  }

  const styles = getTailwindStyle(classColor, highlightColor, isMultiClass);
  const classColorVar = getStyleColorVar(styles);
  const showGradient = classHeaderStyle?.className?.colorBackground ?? true;
  const classDividerBottomBorder =
    classHeaderStyle?.classDivider?.bottomBorder ?? false;

  const py = compactMode === 'ultra' ? '' : ' py-0.5';
  const borderClass = classDividerBottomBorder
    ? ` border-b-2 ${styles.borderColor}`
    : '';
  // Gap between the header pill and the class block below it.
  const cellPadding = compactMode === 'ultra' ? 'p-0' : 'p-0 pb-1';

  type HeaderCell =
    | { type: 'bar'; colSpan: number }
    | { type: 'blank'; colSpan: number }
    | { type: 'data'; id: string; label: string; colSpan: number };

  const headerCells: HeaderCell[] = [];
  if (orderedColumns) {
    const segments: { kind: 'identity' | 'data'; columns: OrderedColumn[] }[] =
      [];
    for (const column of orderedColumns) {
      const last = segments[segments.length - 1];
      if (last && last.kind === column.kind) {
        last.columns.push(column);
      } else {
        segments.push({ kind: column.kind, columns: [column] });
      }
    }

    let barPlaced = false;
    segments.forEach((segment) => {
      if (segment.kind === 'data') {
        for (const column of segment.columns) {
          headerCells.push({
            type: 'data',
            id: column.id,
            label: column.label,
            colSpan: column.colSpan,
          });
        }
        return;
      }

      const totalSpan = segment.columns.reduce(
        (sum, column) => sum + column.colSpan,
        0
      );
      if (!barPlaced) {
        barPlaced = true;
        headerCells.push({ type: 'bar', colSpan: totalSpan });
      } else {
        headerCells.push({ type: 'blank', colSpan: totalSpan });
      }
    });
  }

  const manufacturerStats = (() => {
    const stats = classHeaderStyle?.manufacturerStats;
    if (!stats?.enabled) return null;
    if (!manufacturerCounts || manufacturerCounts.length <= 1) return null;

    // undefined → default cap 5; null → All; number → specific cap
    const rawCap = stats.cap;
    const capValue = rawCap !== undefined ? rawCap : 5;

    let visible =
      capValue === null
        ? [...manufacturerCounts]
        : manufacturerCounts.slice(0, capValue);
    const totalHidden = manufacturerCounts.length - visible.length;

    if (
      stats.showPlayerManufacturer &&
      playerManufacturerEntry &&
      totalHidden > 0 &&
      !visible.some((v) => v.carId === playerManufacturerEntry.carId)
    ) {
      visible = [
        ...visible.slice(0, visible.length - 1),
        playerManufacturerEntry,
      ];
    }

    const hidden = manufacturerCounts.length - visible.length;
    return (
      <span className="flex items-center gap-2">
        {visible.map(({ carId, count }) => (
          <span key={carId} className="flex items-center gap-0.5">
            <CarManufacturer carId={carId} />
            <span>{count}</span>
          </span>
        ))}
        {hidden > 0 && <span>+{hidden}</span>}
      </span>
    );
  })();

  const infoContent = (
    <div
      className={`inline-flex items-center gap-3 rounded-md border-l-4 bg-[var(--grouped-row-even,rgb(24_24_27/0.92))] px-2${py} [font-weight:bolder] whitespace-nowrap tabular-nums text-white [text-shadow:1px_1px_1px_rgba(0_0_0/0.35)]`}
      style={{
        borderColor: classColorVar,
        backgroundImage: showGradient
          ? `linear-gradient(90deg, color-mix(in srgb, ${classColorVar} 35%, transparent), transparent 6em)`
          : undefined,
      }}
    >
      <span>{className}</span>
      {classHeaderStyle?.estimatedLaps?.enabled && estimatedLaps && (
        <span>
          {estimatedLaps.currentLap}/
          {estimatedLaps.exact
            ? estimatedLaps.total
            : `≈${estimatedLaps.total.toFixed(2)}`}
        </span>
      )}
      {showSessionTime && <ClassHeaderSessionTime />}
      {!!sof && (
        <span>
          <span>SOF</span>{' '}
          {classHeaderStyle?.compactSof && sof >= 1000
            ? `${(sof / 1000).toFixed(1)}k`
            : sof.toFixed(0)}
        </span>
      )}
      <span className="flex items-center gap-1">
        <HelmetIcon size="1.15em" />
        <span>{totalDrivers}</span>
      </span>
      {manufacturerStats}
    </div>
  );

  if (orderedColumns) {
    return (
      <tr>
        {headerCells.map((cell, index) => {
          if (cell.type === 'bar') {
            return (
              <td
                key="bar"
                colSpan={cell.colSpan}
                className={`${cellPadding}${borderClass}`}
              >
                {infoContent}
              </td>
            );
          }
          if (cell.type === 'blank') {
            return (
              <td
                key={`blank-${index}`}
                colSpan={cell.colSpan}
                className={`${cellPadding}${borderClass}`}
              ></td>
            );
          }
          return (
            <td
              key={cell.id}
              colSpan={cell.colSpan}
              className={`px-1 pt-0 pb-1 align-bottom text-center text-xs font-bold uppercase tracking-wide text-white/85 [text-shadow:0_1px_2px_rgb(0_0_0/0.9),0_0_4px_rgb(0_0_0/0.8)] whitespace-nowrap${borderClass}`}
            >
              {cell.label}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan ?? 4} className={`${cellPadding}${borderClass}`}>
        {infoContent}
      </td>
    </tr>
  );
};
