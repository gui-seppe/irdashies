import { memo } from 'react';
import { DriverStatusBadges } from './DriverStatusBadges';

interface StatusBadgesCellProps {
  repair?: boolean;
  penalty?: boolean;
  slowdown?: boolean;
  isMinimal?: boolean;
  compactMode?: string;
}

/**
 * Repair / penalty / slowdown flags as their own column, so they can be
 * placed anywhere in the row instead of only after the driver name.
 */
export const StatusBadgesCell = memo(
  ({
    repair,
    penalty,
    slowdown,
    isMinimal,
    compactMode,
  }: StatusBadgesCellProps) => (
    <td
      data-column="statusBadges"
      // Room for one flag, so the columns don't shift when one appears.
      className={`min-w-[1.75em] whitespace-nowrap align-middle ${compactMode === 'ultra' ? '' : 'px-1'}`}
    >
      <DriverStatusBadges
        repair={repair}
        penalty={penalty}
        slowdown={slowdown}
        isMinimal={isMinimal}
        className="justify-center"
      />
    </td>
  )
);

StatusBadgesCell.displayName = 'StatusBadgesCell';
