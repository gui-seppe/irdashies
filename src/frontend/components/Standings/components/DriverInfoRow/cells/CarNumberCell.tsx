import { memo } from 'react';
import type { TailwindStyles } from '@irdashies/utils/colors';

interface CarNumberCellProps {
  carNumber?: string;
  tailwindStyles: TailwindStyles;
  showBackground?: boolean;
  showBorder?: boolean;
  /** Italic number with no badge or '#' (grouped standings rows). */
  plain?: boolean;
  compactMode?: string;
}

export const CarNumberCell = memo(
  ({
    carNumber,
    tailwindStyles,
    showBackground = true,
    showBorder = true,
    plain = false,
    compactMode,
  }: CarNumberCellProps) => {
    if (plain) {
      return (
        <td
          data-column="carNumber"
          className={`w-auto text-right whitespace-nowrap ${compactMode === 'ultra' ? 'pl-1' : 'pl-3 pr-1.5'}`}
        >
          {/* Small muted '#' and a class-tinted italic number, so it doesn't
              read as a second position column. */}
          <span className="inline-flex min-w-[3.5ch] items-baseline justify-end italic font-bold">
            <span className="mr-px text-[0.75em] font-semibold text-white/40">
              #
            </span>
            <span
              style={{
                color:
                  'color-mix(in srgb, var(--class-color, currentColor) 55%, currentColor)',
              }}
            >
              {carNumber}
            </span>
          </span>
        </td>
      );
    }
    const colorClass = showBackground
      ? tailwindStyles.driverIcon
      : showBorder
        ? tailwindStyles.borderColor
        : '';
    const borderClass = showBorder ? 'border-l-4' : '';
    const pxClass = compactMode === 'ultra' ? '' : 'px-1';

    return (
      <td
        data-column="carNumber"
        className={`w-auto ${colorClass} ${borderClass} text-white text-right ${pxClass} whitespace-nowrap`}
      >
        <span className="inline-block min-w-[4ch]">{`#${carNumber}`}</span>
      </td>
    );
  }
);

CarNumberCell.displayName = 'CarNumberCell';
