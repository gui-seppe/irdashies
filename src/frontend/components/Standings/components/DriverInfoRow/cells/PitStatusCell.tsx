import { memo, type CSSProperties, type ReactNode } from 'react';
import { formatTime } from '@irdashies/utils/time';
import { TrackLocation } from '@irdashies/types';
import { DriverStatusBadges, getDisplayedPitLap } from './DriverStatusBadges';

/** Glow + underline behind the cell while a car is in the pits. */
const pitGlowStyle = (color: string): CSSProperties => ({
  backgroundImage: `radial-gradient(ellipse 65% 110% at 50% 100%, color-mix(in srgb, ${color} 60%, transparent), transparent)`,
  boxShadow: `inset 0 -2px 0 ${color}`,
});

interface PitStatusCellProps {
  onPitRoad?: boolean;
  carTrackSurface?: number;
  prevCarTrackSurface?: number;
  lap?: number;
  lastPitLap?: number;
  lastLap?: number;
  currentSessionType?: string;
  dnf?: boolean;
  pitStopDuration?: number | null;
  showPitTime?: boolean;
  pitLapDisplayMode?: string;
  /**
   * True when the pit lane exit is in the last 15% of the lap, meaning the
   * start/finish line is reached very shortly after exiting pits. When true,
   * OUT persists for one extra lap count so it remains visible for a full lap.
   */
  pitExitAfterSF?: boolean;
  isMinimal?: boolean;
  /**
   * Flat style for grouped standings rows: plain text, no outlined badges.
   * PIT glows yellow while moving down the pit lane and red once stopped in
   * the stall.
   */
  plain?: boolean;
  compactMode?: string;
}

export const PitStatusCell = memo(
  ({
    onPitRoad,
    carTrackSurface,
    prevCarTrackSurface,
    lap,
    lastPitLap,
    lastLap,
    currentSessionType,
    dnf,
    pitStopDuration,
    showPitTime = false,
    pitLapDisplayMode,
    pitExitAfterSF,
    isMinimal,
    plain = false,
    compactMode,
  }: PitStatusCellProps) => {
    const widthClass = showPitTime ? 'w-[7rem]' : 'w-[4.5rem]';
    const pxClass = compactMode === 'ultra' ? '' : 'px-1';
    const tow =
      carTrackSurface == 1 &&
      prevCarTrackSurface != undefined &&
      prevCarTrackSurface !== 2 &&
      currentSessionType == 'Race' &&
      !!lastLap;
    const pit =
      onPitRoad &&
      (carTrackSurface == 2 ||
        (carTrackSurface === 1 && prevCarTrackSurface == 2) ||
        prevCarTrackSurface == undefined ||
        currentSessionType != 'Race');
    const lastPit =
      !onPitRoad && !!lastPitLap && lastPitLap > 1 && carTrackSurface != -1;
    const out =
      !onPitRoad &&
      !!lastPitLap &&
      (lastPitLap == lastLap ||
        (!!pitExitAfterSF && lastPitLap + 1 == lastLap)) &&
      carTrackSurface != -1;

    if (plain) {
      // Snug fit for the flat text (e.g. "L19  1:15"), in em so it follows
      // the font size. A cell still grows if its content needs more.
      const plainWidthClass = showPitTime ? 'w-[5.5em]' : 'w-[3.5em]';
      // Whole seconds while the clock is still running (PIT / TOW); tenths
      // once the stop is complete (OUT / last pit lap).
      const liveDuration =
        showPitTime && pitStopDuration
          ? formatTime(pitStopDuration, 'duration')
          : undefined;
      const duration =
        showPitTime && pitStopDuration
          ? formatTime(pitStopDuration, 'pit-duration')
          : undefined;

      let label: ReactNode = null;
      let value: ReactNode = null;
      let textClass = '';
      let style: CSSProperties | undefined;
      if (dnf) {
        label = 'DNF';
        textClass = 'text-red-500';
      } else if (tow) {
        // A tow puts the car straight into its stall, which starts the pit
        // clock, so the same running time shows how long the tow has taken.
        label = 'TOW';
        value = liveDuration;
        textClass = 'text-white';
        style = pitGlowStyle('var(--color-red-500)');
      } else if (pit && currentSessionType === 'Race') {
        // Live pit state only in races. In practice / qualifying a car sat
        // in the pits shows nothing; OUT and the stop time follow as usual.
        label = 'PIT';
        value = liveDuration;
        textClass = 'text-white';
        style = pitGlowStyle(
          carTrackSurface === TrackLocation.InPitStall
            ? 'var(--color-red-500)'
            : 'var(--color-yellow-500)'
        );
      } else if (out) {
        label = 'OUT';
        value = duration;
        textClass = 'text-green-400';
      } else if (lastPit) {
        label = `L${getDisplayedPitLap(lap, lastPitLap, pitLapDisplayMode, pitExitAfterSF) ?? ''}`;
        // Pit time isn't shown for a lap-1 stop, matching the badge style.
        value = lastPitLap && lastPitLap > 1 ? duration : undefined;
        textClass = 'text-yellow-400';
      }

      return (
        <td
          data-column="pitStatus"
          className={`${plainWidthClass} ${compactMode === 'ultra' ? '' : 'px-2'} align-middle whitespace-nowrap ${textClass}`}
          style={style}
        >
          {label && (
            // Label left and time right; a label on its own is centred.
            <div
              className={`flex items-center gap-2 ${value ? 'justify-between' : 'justify-center'}`}
            >
              <span>{label}</span>
              {value && <span>{value}</span>}
            </div>
          )}
        </td>
      );
    }

    return (
      <td
        data-column="pitStatus"
        className={`${widthClass} ${pxClass} text-center align-middle whitespace-nowrap`}
      >
        <DriverStatusBadges
          dnf={dnf}
          tow={tow}
          pit={pit}
          out={out}
          lap={lap}
          lastPit={lastPit}
          lastPitLap={lastPitLap}
          pitStopDuration={pitStopDuration}
          showPitTime={showPitTime}
          pitLapDisplayMode={pitLapDisplayMode}
          pitExitAfterSF={pitExitAfterSF}
          isMinimal={isMinimal}
        />
      </td>
    );
  }
);

PitStatusCell.displayName = 'PitStatusCell';
