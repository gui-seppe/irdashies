import type { Meta, StoryObj } from '@storybook/react-vite';
import { TelemetryDecorator } from '@irdashies/storybook';
import {
  LapDeltaTrace,
  buildDeltaSegments,
  segmentDeltas,
} from '@irdashies/domain/lapDelta/lapDelta';
import { DeltaGraphView } from './components/DeltaGraphView';

const corners = [
  { start_pct: 0.05, end_pct: 0.1, label: 'T1' },
  { start_pct: 0.16, end_pct: 0.22, label: 'T2' },
  { start_pct: 0.3, end_pct: 0.36, label: 'T3' },
  { start_pct: 0.37, end_pct: 0.41, label: 'T4' },
  { start_pct: 0.5, end_pct: 0.58, label: 'T5' },
  { start_pct: 0.66, end_pct: 0.7, label: 'T6' },
  { start_pct: 0.72, end_pct: 0.75, label: 'T7' },
  { start_pct: 0.84, end_pct: 0.9, label: 'T8' },
];
const segments = buildDeltaSegments(corners);

/** A previous lap, then this lap driven to `toPct`. */
const traceTo = (toPct: number) => {
  const trace = new LapDeltaTrace();
  const step = (pct: number, delta: number) =>
    trace.update({ sessionNum: 1, lapDistPct: pct, delta, deltaOk: true });
  for (let pct = 0; pct < 0.999; pct += 0.002) {
    step(pct, 0.25 * Math.sin(pct * 9) + 0.1 * pct);
  }
  for (let pct = 0.001; pct <= toPct; pct += 0.002) {
    step(pct, 0.35 * Math.sin(pct * 7 + 0.6) - 0.2 * pct);
  }
  return trace;
};

const viewProps = (toPct: number) => {
  const trace = traceTo(toPct);
  return {
    version: trace.version,
    current: trace.current,
    previous: trace.previous,
    carPct: trace.lastPct,
    segments,
    segmentValues: segmentDeltas(segments, trace),
    delta: trace.lastDelta,
    currentLapTime: 92.5 * toPct,
    bestLapTime: 92.823,
    showLapTime: true,
    showSessionBest: true,
    showPreviousLap: true,
    backgroundOpacity: 85,
  };
};

const meta: Meta<typeof DeltaGraphView> = {
  component: DeltaGraphView,
  title: 'widgets/DeltaGraph',
  decorators: [
    TelemetryDecorator(),
    (Story) => (
      <div style={{ width: 700, height: 170 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof DeltaGraphView>;

export const LateInTheLap: Story = { args: viewProps(0.93) };

export const EarlyInTheLap: Story = { args: viewProps(0.2) };
