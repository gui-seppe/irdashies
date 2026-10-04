import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  useGeneralSettings,
  useSessionDrivers,
  useWeekendInfoSubSessionID,
} from '@irdashies/context';
import {
  DriverName as formatDriverName,
  extractDriverName,
  type DriverNameFormat,
} from '../../shared/DriverName/DriverName';

/**
 * Default upper bound for the name column in compact width mode, in
 * characters, so one very long name can't make the widget huge. Longer names
 * are truncated as usual.
 */
export const DEFAULT_MAX_NAME_CHARS = 20;

// The name cell fades out its last 10% (see DriverNameCell); size the column
// so the longest name ends where the fade begins and stays fully readable.
const NAME_FADE_ALLOWANCE = 0.9;

/**
 * Width of the name column for the "compact width" mode of Standings and
 * Relative: just wide enough for the longest name of any driver registered in
 * the session, whether or not they're currently shown.
 *
 * The width only ever grows within an event, so it stays fixed for the race
 * instead of jumping as drivers scroll in and out of view. It starts over for
 * a new event, or when a font or name-format setting changes the measurement.
 *
 * Returns the CSS width for the name column (undefined when disabled) and a
 * hidden probe element that must be rendered inside the widget, so the names
 * are measured in the widget's own font.
 */
export const useCompactNameWidth = (
  enabled: boolean,
  nameFormat: DriverNameFormat | undefined,
  removeNumbersFromName: boolean,
  maxNameChars = DEFAULT_MAX_NAME_CHARS
): { nameWidth: string | undefined; probe: ReactNode } => {
  const drivers = useSessionDrivers();
  const subSessionId = useWeekendInfoSubSessionID();
  const generalSettings = useGeneralSettings();

  const names = useMemo(() => {
    if (!enabled || !drivers) return [];
    const formatted = drivers
      .filter((driver) => !driver.CarIsPaceCar && !driver.IsSpectator)
      .map((driver) =>
        formatDriverName(
          extractDriverName(driver.UserName ?? '', removeNumbersFromName),
          nameFormat ?? 'name-middlename-surname'
        )
      );
    return [...new Set(formatted)];
  }, [enabled, drivers, nameFormat, removeNumbersFromName]);

  // Anything that changes how wide the same names render resets the latch.
  const measureKey = [
    subSessionId,
    generalSettings?.fontSize,
    generalSettings?.fontType,
    generalSettings?.fontWeight,
    nameFormat,
    removeNumbersFromName,
  ].join('|');

  const probeRef = useRef<HTMLDivElement>(null);
  const latch = useRef({ key: '', px: 0 });
  const [widthPx, setWidthPx] = useState<number>();

  useLayoutEffect(() => {
    if (!enabled) return;
    const measure = () => {
      const probe = probeRef.current;
      if (!probe || names.length === 0) return;
      if (latch.current.key !== measureKey) {
        latch.current = { key: measureKey, px: 0 };
      }
      const px = Math.ceil(
        probe.getBoundingClientRect().width / getScale(probe)
      );
      latch.current.px = Math.max(latch.current.px, px);
      setWidthPx(latch.current.px);
    };
    measure();
    // Web fonts load asynchronously; measure again once they're in.
    let cancelled = false;
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    fonts?.addEventListener?.('loadingdone', measure);
    return () => {
      cancelled = true;
      fonts?.removeEventListener?.('loadingdone', measure);
    };
  }, [enabled, names, measureKey]);

  const probe = enabled ? (
    <div
      aria-hidden
      className="pointer-events-none invisible absolute left-0 top-0 h-0 overflow-hidden"
    >
      <div ref={probeRef} className="w-max text-sm">
        {names.map((name) => (
          <div key={name} className="whitespace-nowrap">
            {name}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const nameWidth =
    enabled && widthPx
      ? // ch is about one average character of the name font.
        `min(${Math.ceil(widthPx / NAME_FADE_ALLOWANCE)}px, ${maxNameChars}ch)`
      : undefined;

  return { nameWidth, probe };
};

/** Undo any CSS transform scale (the Standings "scale" setting). */
const getScale = (element: HTMLElement): number => {
  const width = element.offsetWidth;
  if (!width) return 1;
  return element.getBoundingClientRect().width / width || 1;
};
