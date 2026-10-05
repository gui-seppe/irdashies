import { Meta, StoryObj } from '@storybook/react-vite';
import {
  CompactCornerSpeeds,
  CornerNameOverlay,
  CornerSpeedsTable,
} from './CornerNameOverlay';
import {
  ChannelSnapshotDecorator,
  TelemetryDecorator,
  trackStateStorySnapshot,
} from '@irdashies/storybook';

// Real recorded sessions are used so the bundled-data lookup resolves naturally
// from WeekendInfo.TrackName — no manual store overrides. As the recording
// plays back, the widget cycles through sections in real time.

export default {
  component: CornerNameOverlay,
  title: 'widgets/CornerNameOverlay',
  args: {
    showCornerNumber: true,
    showProgressBar: true,
    showTrackPct: true,
    fontSize: 18,
    opacity: 0.9,
  },
  decorators: [
    ChannelSnapshotDecorator({
      'track-state.snapshot': {
        ...trackStateStorySnapshot,
        lapDistPct: 0.5,
      },
    }),
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} as Meta;

type Story = StoryObj<typeof CornerNameOverlay>;

export const SpaGrandPrix: Story = {
  decorators: [TelemetryDecorator('/test-data/1732274253573')],
};

export const Suzuka: Story = {
  decorators: [TelemetryDecorator('/test-data/1762847139582')],
};

export const Interlagos: Story = {
  decorators: [TelemetryDecorator('/test-data/1747384033336')],
};

export const LimeRockGP: Story = {
  decorators: [TelemetryDecorator('/test-data/1731639076383')],
};

export const LargeFontSize: Story = {
  args: { fontSize: 24 },
  decorators: [TelemetryDecorator('/test-data/1732274253573')],
};

/** The corner speeds block on its own: best lap vs this lap (m/s in, km/h out). */
export const CornerSpeeds: Story = {
  render: () => (
    <div
      className="w-full rounded-sm p-2"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
    >
      <CornerSpeedsTable
        speeds={{
          label: 'T5',
          best: { maxMs: 72.5, minMs: 26.4 },
          current: { maxMs: 73.1, minMs: 25.9 },
        }}
        unit="km/h"
        fontSize={18}
        spaced={false}
      />
    </div>
  ),
};

/** Compact layout: best max, this lap max, best min, this lap min. */
export const CornerSpeedsCompact: Story = {
  render: () => (
    <CompactCornerSpeeds
      speeds={{
        label: 'T5',
        best: { maxMs: 79.2, minMs: 17.8 },
        current: { maxMs: 78.6, minMs: 17.5 },
      }}
      unit="km/h"
      fontSize={18}
      opacity={0.6}
    />
  ),
};
