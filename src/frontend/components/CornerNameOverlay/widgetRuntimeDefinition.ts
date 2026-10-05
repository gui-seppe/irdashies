import type { WidgetRuntimeDefinition } from '../../widgetRuntime';

export default {
  id: 'cornername',
  sessionData: true,
  // lap-trace.sample feeds the recorder behind the corner speeds; it is only
  // read when that option is on.
  channels: ['track-state.snapshot', 'lap-trace.sample'],
  ratePreset: 'driverFocused',
  channelRates: { 'lap-trace.sample': 60 },
} satisfies WidgetRuntimeDefinition;
