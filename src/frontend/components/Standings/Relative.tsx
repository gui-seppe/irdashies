import { useMemo } from 'react';
import { DriverInfoRow } from './components/DriverInfoRow/DriverInfoRow';
import {
  useDrivingState,
  useWeekendInfoNumCarClasses,
  useWeekendInfoTeamRacing,
  useSessionVisibility,
  useGeneralSettings,
  useLapTimesStoreUpdater,
  useLapTimeHistory,
  useFocusCarIdx,
  useTrackStateSnapshot,
  useP2PDisplayStates,
  usePitStopDuration,
  usePitLaneStore,
} from '@irdashies/context';
import {
  useRelativeSettings,
  useDriverRelatives,
  useHighlightColor,
  useDriverTagMap,
  useCompactNameWidth,
} from './hooks';
import { SessionBar } from './components/SessionBar/SessionBar';
import { TitleBar } from './components/TitleBar/TitleBar';
import { useIsSingleMake } from './hooks/useIsSingleMake';
import { calculateLapDeltas } from './hooks';
import { FlagContour } from '@irdashies/utils/FlagContour';
import { getFlag } from '@irdashies/utils/getFlag';
import { getFlagColor } from '@irdashies/utils/getFlagColor';

export const Relative = () => {
  const settings = useRelativeSettings();
  const generalSettings = useGeneralSettings();
  const buffer = settings?.buffer ?? 3;
  const { isDriving } = useDrivingState();
  const standings = useDriverRelatives({
    buffer,
    hideDriversInPitStall: settings?.hideDriversInPitStall ?? false,
    fillWindow: true,
  });
  const hasAnyCountryFlag = useMemo(
    () => standings.some((result) => (result.driver?.flairId ?? 0) > 0),
    [standings]
  );
  const highlightColor = useHighlightColor();
  const { tagMap, hasAnyTag } = useDriverTagMap(settings?.driverTag?.enabled);
  // Compact width: size to the longest name in the session, pinned right.
  const compactWidth = !!settings?.compactWidth?.enabled;
  const { nameWidth, probe: nameWidthProbe } = useCompactNameWidth(
    compactWidth,
    settings?.driverName?.nameFormat,
    settings?.driverName?.removeNumbersFromName ?? false,
    settings?.compactWidth?.maxNameChars
  );
  const numCarClasses = useWeekendInfoNumCarClasses();
  const isMultiClass = (numCarClasses ?? 0) > 1;
  const isSessionVisible = useSessionVisibility(settings?.sessionVisibility);

  const sessionFlags = useTrackStateSnapshot()?.sessionFlags ?? 0;
  const flagInfo = getFlag(sessionFlags);
  const flagContourSetting = settings?.stylingOptions?.flagContour;
  const flagContourEnabled =
    (flagContourSetting?.enabled ?? false) && flagInfo.label !== 'NO FLAG';
  const borderWidth = flagContourSetting?.borderWidth ?? 5;

  const flagColor = getFlagColor(getFlag(sessionFlags).label);

  const p2pDisplayStates = useP2PDisplayStates();

  const lapTimeDeltasEnabled = settings?.lapTimeDeltas?.enabled ?? false;
  useLapTimesStoreUpdater(lapTimeDeltasEnabled);
  const numLapDeltas = settings?.lapTimeDeltas?.numLaps ?? 3;
  const focusCarIdx = useFocusCarIdx();
  const lapTimeHistory = useLapTimeHistory();
  const lapDeltasByCarIdx = useMemo(
    () => calculateLapDeltas(lapTimeHistory, focusCarIdx, lapTimeDeltasEnabled),
    [lapTimeHistory, focusCarIdx, lapTimeDeltasEnabled]
  );

  const pitStopDurations = usePitStopDuration();
  const pitExitPct = usePitLaneStore((s) => s.pitExitPct);
  const pitExitAfterSF = pitExitPct !== null && pitExitPct > 0.85;

  const isSingleMake = useIsSingleMake(
    !!settings?.carManufacturer?.hideIfSingleMake
  );
  const hideCarManufacturer = !!(
    settings?.carManufacturer?.hideIfSingleMake && isSingleMake
  );

  // Check if this is a team racing session
  const isTeamRacing = useWeekendInfoTeamRacing();

  // Determine table border spacing based on compact mode
  const isCompact =
    generalSettings?.compactMode === 'compact' ||
    generalSettings?.compactMode === 'ultra';

  // Header and footer join the rows into one card, so the rows square off
  // the corners that touch them.
  const showHeader = !!(
    settings?.headerBar &&
    (settings.headerBar.enabled ?? false)
  );
  const showFooter = !!(
    settings?.footerBar &&
    (settings.footerBar.enabled ?? true)
  );

  // Always render 2 * buffer + 1 rows (buffer above + player + buffer below)
  const totalRows = 2 * buffer + 1;

  // Memoize findIndex to avoid recalculating on every render
  const playerIndex = useMemo(
    () => standings.findIndex((result) => result.isPlayer),
    [standings]
  );

  // Memoize rows array creation to avoid recreating on every render
  const rows = useMemo(() => {
    // If no player found, return empty rows
    if (playerIndex === -1) {
      return Array.from({ length: totalRows }, (_, index) => (
        <DriverInfoRow
          key={`empty-${index}`}
          carIdx={0}
          classColor={0}
          name="Franz Hermann"
          teamName={
            settings?.teamName?.enabled && isTeamRacing ? '' : undefined
          }
          isPlayer={false}
          hasFastestTime={false}
          hidden={true}
          isMultiClass={false}
          displayOrder={settings?.displayOrder}
          config={settings}
          carNumber={(settings?.carNumber?.enabled ?? true) ? '' : undefined}
          flairId={(settings?.countryFlags?.enabled ?? true) ? 0 : undefined}
          carId={(settings?.carManufacturer?.enabled ?? true) ? 0 : undefined}
          license={undefined}
          rating={undefined}
          currentSessionType=""
          iratingChangeValue={undefined}
          delta={(settings?.delta?.enabled ?? true) ? 0 : undefined}
          fastestTime={settings?.fastestTime?.enabled ? undefined : undefined}
          lastTime={settings?.lastTime?.enabled ? undefined : undefined}
          lastTimeState={settings?.lastTime?.enabled ? undefined : undefined}
          position={settings?.position ? undefined : undefined}
          onPitRoad={false}
          onTrack={true}
          radioActive={false}
          tireCompound={settings?.compound?.enabled ? 0 : undefined}
          numLapDeltasToShow={lapTimeDeltasEnabled ? numLapDeltas : undefined}
          highlightColor={highlightColor}
          dnf={false}
          repair={false}
          penalty={false}
          slowdown={false}
          pitExitAfterSF={pitExitAfterSF}
          hideCarManufacturer={hideCarManufacturer}
          hasAnyDriverTag={hasAnyTag}
          hasAnyCountryFlag={hasAnyCountryFlag}
          compactMode={generalSettings?.compactMode}
          nameWidth={nameWidth}
          groupIndex={index}
          isFirstInGroup={index === 0 && !showHeader}
          isLastInGroup={index === totalRows - 1 && !showFooter}
        />
      ));
    }

    // The window is already filled around the focus car, so rows start at the
    // top; any blank slots (fewer cars than rows) fall at the bottom.
    const resultAt = (index: number) => standings[index];

    // Create an array of fixed size with placeholder rows
    return Array.from({ length: totalRows }, (_, index) => {
      const result = resultAt(index);
      const groupProps = {
        groupIndex: index,
        // Empty slots show as blank rows in the card, so the corners go on
        // the card's ends: the first/last row, unless a bar is attached there.
        isFirstInGroup: index === 0 && !showHeader,
        isLastInGroup: index === totalRows - 1 && !showFooter,
      };

      if (!result) {
        // If no result, render a dummy row with visibility hidden
        return (
          <DriverInfoRow
            key={`placeholder-${index}`}
            carIdx={0}
            classColor={0}
            name="Franz Hermann"
            teamName={
              settings?.teamName?.enabled && isTeamRacing ? '' : undefined
            }
            isPlayer={false}
            hasFastestTime={false}
            hidden={true}
            isMultiClass={false}
            displayOrder={settings?.displayOrder}
            config={settings}
            carNumber={(settings?.carNumber?.enabled ?? true) ? '' : undefined}
            flairId={(settings?.countryFlags?.enabled ?? true) ? 0 : undefined}
            carId={(settings?.carManufacturer?.enabled ?? true) ? 0 : undefined}
            license={undefined}
            rating={undefined}
            currentSessionType=""
            iratingChangeValue={undefined}
            delta={(settings?.delta?.enabled ?? true) ? 0 : undefined}
            fastestTime={settings?.fastestTime?.enabled ? undefined : undefined}
            lastTime={settings?.lastTime?.enabled ? undefined : undefined}
            lastTimeState={settings?.lastTime?.enabled ? undefined : undefined}
            position={settings?.position ? undefined : undefined}
            onPitRoad={false}
            onTrack={true}
            radioActive={false}
            tireCompound={settings?.compound?.enabled ? 0 : undefined}
            lastLap={undefined}
            numLapDeltasToShow={lapTimeDeltasEnabled ? numLapDeltas : undefined}
            highlightColor={highlightColor}
            dnf={false}
            repair={false}
            penalty={false}
            slowdown={false}
            pitExitAfterSF={pitExitAfterSF}
            deltaDecimalPlaces={settings?.delta?.precision}
            hideCarManufacturer={hideCarManufacturer}
            hasAnyDriverTag={hasAnyTag}
            hasAnyCountryFlag={hasAnyCountryFlag}
            compactMode={generalSettings?.compactMode}
            nameWidth={nameWidth}
            {...groupProps}
          />
        );
      }

      return (
        <DriverInfoRow
          key={result.carIdx}
          carIdx={result.carIdx}
          resolvedTag={tagMap.get(result.carIdx)}
          hasAnyDriverTag={hasAnyTag}
          hasAnyCountryFlag={hasAnyCountryFlag}
          classColor={result.carClass.color}
          carNumber={
            (settings?.carNumber?.enabled ?? true)
              ? result.driver?.carNum || ''
              : undefined
          }
          name={result.driver?.name || ''}
          teamName={
            settings?.teamName?.enabled && isTeamRacing
              ? result.driver?.teamName || ''
              : undefined
          }
          isPlayer={result.isPlayer}
          hasFastestTime={result.hasFastestTime}
          position={result.classPosition}
          lap={result.lap}
          onPitRoad={result.onPitRoad}
          onTrack={result.onTrack}
          radioActive={result.radioActive}
          isLapped={result.lappedState === 'behind'}
          isLappingAhead={result.lappedState === 'ahead'}
          flairId={
            (settings?.countryFlags?.enabled ?? true)
              ? result.driver?.flairId
              : undefined
          }
          lastTime={settings?.lastTime?.enabled ? result.lastTime : undefined}
          fastestTime={
            settings?.fastestTime?.enabled ? result.fastestTime : undefined
          }
          lastTimeState={
            settings?.lastTime?.enabled ? result.lastTimeState : undefined
          }
          tireCompound={
            settings?.compound?.enabled ? result.tireCompound : undefined
          }
          carId={result.carId}
          lastPitLap={result.lastPitLap}
          lastLap={result.lastLap}
          carTrackSurface={result.carTrackSurface}
          prevCarTrackSurface={result.prevCarTrackSurface}
          isMultiClass={isMultiClass}
          currentSessionType={result.currentSessionType}
          license={result.driver?.license}
          rating={result.driver?.rating}
          iratingChangeValue={result.iratingChange}
          positionChange={result.positionChange}
          delta={(settings?.delta?.enabled ?? true) ? result.delta : undefined}
          lapTimeDeltas={
            lapTimeDeltasEnabled
              ? (lapDeltasByCarIdx?.[result.carIdx]?.slice(-numLapDeltas) ?? [])
              : undefined
          }
          numLapDeltasToShow={lapTimeDeltasEnabled ? numLapDeltas : undefined}
          displayOrder={settings?.displayOrder}
          config={settings}
          highlightColor={highlightColor}
          dnf={result.dnf}
          repair={result.repair}
          penalty={result.penalty}
          slowdown={result.slowdown}
          pitStopDuration={pitStopDurations[result.carIdx]}
          pitExitAfterSF={pitExitAfterSF}
          deltaDecimalPlaces={settings?.delta?.precision}
          hideCarManufacturer={hideCarManufacturer}
          compactMode={generalSettings?.compactMode}
          nameWidth={nameWidth}
          p2pDisplayState={p2pDisplayStates[result.carIdx]}
          {...groupProps}
        />
      );
    });
  }, [
    standings,
    playerIndex,
    totalRows,
    settings,
    isMultiClass,
    highlightColor,
    hideCarManufacturer,
    p2pDisplayStates,
    isTeamRacing,
    tagMap,
    hasAnyTag,
    hasAnyCountryFlag,
    generalSettings?.compactMode,
    lapTimeDeltasEnabled,
    numLapDeltas,
    lapDeltasByCarIdx,
    nameWidth,
    pitStopDurations,
    pitExitAfterSF,
    showHeader,
    showFooter,
  ]);

  if (!isSessionVisible) return <></>;

  // Show only when on track setting
  if (settings?.showOnlyWhenOnTrack && !isDriving) {
    return <></>;
  }

  // If no player found, render empty table with consistent height
  if (playerIndex === -1) {
    return (
      <FlagContour
        fitWidth={compactWidth}
        compactMode={isCompact}
        flags={{ enabled: flagContourEnabled }}
        flagColor={flagColor}
        backgroundOpacity={settings?.background?.opacity ?? 0}
        borderWidth={borderWidth}
      >
        {nameWidthProbe}
        <TitleBar titleBarSettings={settings?.titleBar} />
        {showHeader && settings?.headerBar && (
          <SessionBar
            settings={settings.headerBar}
            opacity={settings?.foreground?.opacity}
            position="header"
            variant="attached"
          />
        )}
        <table className="w-full table-auto text-sm tabular-nums border-separate border-spacing-0">
          <tbody>{rows}</tbody>
        </table>
        {showFooter && settings?.footerBar && (
          <SessionBar
            settings={settings.footerBar}
            opacity={settings?.foreground?.opacity}
            position="footer"
            variant="attached"
          />
        )}
      </FlagContour>
    );
  }

  return (
    <FlagContour
      fitWidth={compactWidth}
      compactMode={isCompact}
      flags={{ enabled: flagContourEnabled }}
      flagColor={flagColor}
      backgroundOpacity={settings?.background?.opacity ?? 0}
      borderWidth={borderWidth}
    >
      {nameWidthProbe}
      <TitleBar titleBarSettings={settings?.titleBar} />
      {showHeader && settings?.headerBar && (
        <SessionBar
          settings={settings.headerBar}
          opacity={settings?.foreground?.opacity}
          position="header"
          variant="attached"
        />
      )}
      <table className="w-full table-auto text-sm tabular-nums border-separate border-spacing-0">
        <tbody>{rows}</tbody>
      </table>
      {showFooter && settings?.footerBar && (
        <SessionBar
          settings={settings.footerBar}
          opacity={settings?.foreground?.opacity}
          position="footer"
          variant="attached"
        />
      )}
    </FlagContour>
  );
};
