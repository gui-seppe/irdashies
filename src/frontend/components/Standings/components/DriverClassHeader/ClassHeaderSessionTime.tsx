import { memo } from 'react';
import { useSessionTimeTiming } from '@irdashies/context';
import { formatTotalTime } from '../SessionBar/formatTotalTime';
import { computeSessionTimes } from '../SessionBar/sessionTimes';

/** iRacing's "no limit" session time (IRSDK_UNLIMITED_TIME), one week. */
const UNLIMITED_SESSION_SECONDS = 604800;

/**
 * Session time remaining for the class header, e.g. "32:41/35m". Uses the same
 * timing as the session bar, so the two always agree.
 */
export const ClassHeaderSessionTime = memo(() => {
  const timing = useSessionTimeTiming();
  const { remainingTime, totalTime } = computeSessionTimes(timing);

  if (
    !(totalTime > 0) ||
    totalTime >= UNLIMITED_SESSION_SECONDS ||
    !(remainingTime >= 0)
  ) {
    return null;
  }

  const remaining = formatTotalTime(remainingTime, 'minimal', false, 'none');
  const total = formatTotalTime(totalTime, 'minimal', true, 'minimal').replace(
    ' ',
    ''
  );
  const approx =
    timing.sessionType === 'Race' && timing.state >= 2 && timing.isFixedLapRace
      ? '~'
      : '';

  return (
    <span>
      {remaining}
      <span>
        /{approx}
        {total}
      </span>
    </span>
  );
});

ClassHeaderSessionTime.displayName = 'ClassHeaderSessionTime';
