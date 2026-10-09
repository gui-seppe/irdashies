import type { WidgetRuntimeDefinition } from '../../widgetRuntime';

export default {
  id: 'deltagraph',
  // WeekendInfo, for the bundled track data the corners come from.
  sessionData: true,
  // lap-log carries iRacing's delta to the session best, lap position and lap
  // times; track-state only gates showOnlyWhenOnTrack.
  channels: ['lap-log.snapshot', 'track-state.snapshot'],
  ratePreset: 'informational',
  channelRates: { 'lap-log.snapshot': 25 },
} satisfies WidgetRuntimeDefinition;
