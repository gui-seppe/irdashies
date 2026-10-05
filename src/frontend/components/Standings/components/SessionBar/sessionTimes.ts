import { SessionState } from '@irdashies/types';
import type { useSessionTimeTiming } from '@irdashies/context';

export interface SessionTimes {
  elapsedTime: number;
  remainingTime: number;
  totalTime: number;
}

/**
 * Elapsed / remaining / total session time as shown by the session bar,
 * handling the race-specific cases (clock frozen until green, timer offset by
 * the green flag, fixed-lap races). Shared with the class header.
 */
export const computeSessionTimes = ({
  sessionType: session,
  time,
  timeRemaining,
  timeTotal,
  state,
  greenFlagTimestamp,
  isFixedLapRace,
  totalRaceTime,
  adjustedRaceTime,
}: ReturnType<typeof useSessionTimeTiming>): SessionTimes => {
  let elapsedTime: number;
  let remainingTime: number;
  let totalTime: number;
  if (session === 'Race') {
    switch (state) {
      case SessionState.GetInCar:
        // Before grid, there is a ~2min countdown
        elapsedTime = time;
        remainingTime = timeRemaining;
        totalTime = time + timeRemaining;
        break;
      case SessionState.Warmup:
      case SessionState.ParadeLaps:
        // Freeze the race timers until green
        elapsedTime = 0;
        if (isFixedLapRace) {
          remainingTime = adjustedRaceTime;
          totalTime = adjustedRaceTime;
        } else {
          remainingTime = timeRemaining;
          totalTime = timeTotal;
        }
        break;
      case SessionState.Racing:
      case SessionState.Checkered:
        // Session timer does not restart at green
        elapsedTime = time - greenFlagTimestamp;
        if (isFixedLapRace) {
          remainingTime = totalRaceTime - elapsedTime;
          totalTime = totalRaceTime;
        } else {
          remainingTime = timeTotal - elapsedTime;
          totalTime = timeTotal;
        }
        break;
      case SessionState.CoolDown:
        elapsedTime = time - greenFlagTimestamp;
        if (isFixedLapRace) {
          remainingTime = adjustedRaceTime - elapsedTime;
          totalTime = adjustedRaceTime;
        } else {
          remainingTime = 0;
          totalTime = timeTotal;
        }
        break;
      default:
        elapsedTime = 0;
        remainingTime = 0;
        totalTime = 0;
        break;
    }
  } else {
    elapsedTime = time;
    remainingTime = timeRemaining;
    totalTime = timeTotal;
  }

  return { elapsedTime, remainingTime, totalTime };
};
