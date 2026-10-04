import { useGeneralSettings } from '@irdashies/context';
import { SessionBarConfig } from '@irdashies/types';
import {
  DEFAULT_DISPLAY_ORDER,
  SESSION_BAR_ITEM_COMPONENTS,
  isSessionBarItemEnabled,
} from './sessionBarItemRegistry';
import type { SessionBarItemKey } from './sessionBarItemTypes';

interface SessionBarProps {
  settings: SessionBarConfig;
  position?: 'header' | 'footer';
  standalone?: boolean;
  opacity?: number;
  /**
   * Blend with the grouped rows instead of drawing a separate band:
   * - 'attached': part of the same card as the rows (no gap; rounds only its
   *   outer corners), as in Relative.
   * - 'floating': a rounded bar in the row colour, as in Standings.
   */
  variant?: 'attached' | 'floating';
}

const GROUPED_BG = 'bg-[var(--grouped-row-even,rgb(24_24_27/0.92))]';

// Local-only feature slots (git-excluded src/local/). Empty glob => no-op.
// The negative pattern keeps co-located *.spec.tsx test files out of the bundle.
const localSlots = import.meta.glob(
  [
    '../../../../../local/slots/*.tsx',
    '!../../../../../local/slots/*.spec.tsx',
  ],
  { eager: true }
) as Record<string, { default: React.ComponentType }>;

export const SessionBar = ({
  settings: effectiveBarSettings,
  position = 'header',
  opacity = 70,
  standalone = false,
  variant,
}: SessionBarProps) => {
  const generalSettings = useGeneralSettings();

  const isUltra = generalSettings?.compactMode === 'ultra';
  const isCompact = generalSettings?.compactMode === 'compact';

  const pyClass = isUltra ? 'py-0' : isCompact ? 'py-1' : 'py-2';
  const gapClass = isUltra ? 'gap-x-2' : isCompact ? 'gap-x-4' : 'gap-x-6';
  const pxClass = standalone
    ? isUltra
      ? 'px-2'
      : isCompact
        ? 'px-3'
        : 'px-4'
    : isUltra
      ? 'px-1'
      : isCompact
        ? 'px-2'
        : 'px-3';

  // Get display order, fallback to default order
  const displayOrder = (effectiveBarSettings?.displayOrder ||
    DEFAULT_DISPLAY_ORDER[position]) as SessionBarItemKey[];

  const enabledKeys = displayOrder.filter(
    (key) =>
      SESSION_BAR_ITEM_COMPONENTS[key] &&
      isSessionBarItemEnabled(key, effectiveBarSettings, position)
  );

  if (variant && !standalone) {
    const variantPy = isUltra ? 'py-0' : isCompact ? 'py-0.5' : 'py-1.5';
    const shape =
      variant === 'attached'
        ? position === 'header'
          ? 'rounded-t-md'
          : 'rounded-b-md'
        : `rounded-md ${isUltra ? '' : position === 'header' ? 'mb-2' : 'mt-2'}`;
    return (
      <div
        className={`${pxClass} ${variantPy} ${GROUPED_BG} ${shape} flex items-center justify-between gap-x-4 text-sm tabular-nums`}
      >
        {enabledKeys.map((key) => {
          const ItemComponent = SESSION_BAR_ITEM_COMPONENTS[key];
          return (
            <ItemComponent
              key={key}
              settings={effectiveBarSettings}
              standalone={false}
            />
          );
        })}
        {Object.entries(localSlots).map(([path, mod]) => (
          <mod.default key={path} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${pxClass} ${pyClass} bg-slate-900/(--fg-opacity) flex items-center text-sm ${standalone ? `w-full justify-between ${gapClass}` : 'justify-between'} ${!isCompact && !isUltra && !standalone ? (position === 'header' ? 'mb-3' : 'mt-3') : ''}`}
      style={{
        ['--fg-opacity' as string]: `${opacity}%`,
      }}
    >
      {enabledKeys.map((key) => {
        const ItemComponent = SESSION_BAR_ITEM_COMPONENTS[key];
        return (
          <ItemComponent
            key={key}
            settings={effectiveBarSettings}
            standalone={standalone}
          />
        );
      })}
      {Object.entries(localSlots).map(([path, mod]) => (
        <mod.default key={path} />
      ))}
    </div>
  );
};
