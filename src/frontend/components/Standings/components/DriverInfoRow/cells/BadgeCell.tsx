import { memo } from 'react';
import {
  DriverRatingBadge,
  type DriverRatingBadgeProps,
} from '../../../../shared/DriverRatingBadge/DriverRatingBadge';
import { RatingChange } from '../../RatingChange/RatingChange';

const PILL_FORMAT: DriverRatingBadgeProps['format'] = 'license-color-rating-bw';

interface BadgeCellProps {
  license?: string;
  rating?: number;
  badgeFormat?: DriverRatingBadgeProps['format'];
  isMinimal?: boolean;
  /**
   * iRating gain to show alongside the badge — inside the pill for the
   * default format, next to it for the others. Undefined hides it.
   */
  iratingChange?: number;
  showIratingChange?: boolean;
  compactMode?: string;
}

export const BadgeCell = memo(
  ({
    license,
    rating,
    badgeFormat,
    isMinimal,
    iratingChange,
    showIratingChange = false,
    compactMode,
  }: BadgeCellProps) => {
    const pxClass =
      compactMode === 'ultra'
        ? ''
        : compactMode === 'compact'
          ? 'px-1'
          : 'px-2';
    const isPill = (badgeFormat ?? PILL_FORMAT) === PILL_FORMAT;
    return (
      <td
        data-column="badge"
        className={`w-auto whitespace-nowrap text-center ${pxClass}`}
      >
        <div className="flex items-center justify-center">
          <DriverRatingBadge
            license={license}
            rating={rating}
            format={badgeFormat}
            isMinimal={isMinimal}
            iratingChange={
              showIratingChange && isPill ? (iratingChange ?? 0) : undefined
            }
          />
          {showIratingChange && !isPill && (
            <RatingChange value={iratingChange} showZero />
          )}
        </div>
      </td>
    );
  }
);

BadgeCell.displayName = 'BadgeCell';
