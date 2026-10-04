import { memo } from 'react';
import type { TailwindStyles } from '@irdashies/utils/colors';

interface PositionCellProps {
  position?: number;
  isPlayer: boolean;
  tailwindStyles: TailwindStyles;
  offTrack: boolean;
  showBackground?: boolean;
  /** Bold number without the player background (grouped standings rows). */
  plain?: boolean;
  compactMode?: string;
}

export const PositionCell = memo(
  ({
    position,
    isPlayer,
    offTrack,
    tailwindStyles,
    showBackground = true,
    plain = false,
    compactMode,
  }: PositionCellProps) => {
    // Important so it still wins over a row-level background.
    const positionColor = offTrack
      ? 'bg-yellow-400!'
      : isPlayer && showBackground && !plain
        ? tailwindStyles.classHeader
        : '';
    const textColor = offTrack
      ? 'text-yellow-900'
      : `text-white${plain ? ' [font-weight:bolder]' : ''}`;
    const pxClass =
      compactMode === 'ultra'
        ? 'min-w-[2ch]'
        : compactMode === 'compact'
          ? 'min-w-[3.5ch] px-1'
          : 'min-w-[4ch] px-2';

    return (
      <td
        data-column="position"
        className={`w-auto text-center ${pxClass} whitespace-nowrap ${positionColor} ${textColor}`}
      >
        {position !== undefined && isFinite(position) ? position : ''}
      </td>
    );
  }
);

PositionCell.displayName = 'PositionCell';
