import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { PitStatusCell } from './PitStatusCell';

type PitStatusCellProps = ComponentProps<typeof PitStatusCell>;

const ROWS: { name: string; props: PitStatusCellProps }[] = [
  {
    name: 'Pit lane (moving)',
    props: { onPitRoad: true, carTrackSurface: 2, pitStopDuration: 6 },
  },
  {
    name: 'In pit stall (stationary)',
    props: { onPitRoad: true, carTrackSurface: 1, pitStopDuration: 15 },
  },
  {
    name: 'Out lap',
    props: { carTrackSurface: 3, lastPitLap: 20, lastLap: 20, lap: 20 },
  },
  {
    name: 'After stop',
    props: {
      carTrackSurface: 3,
      lastPitLap: 19,
      lastLap: 22,
      lap: 22,
      pitStopDuration: 35,
    },
  },
  {
    name: 'Towing',
    props: { carTrackSurface: 1, prevCarTrackSurface: 3, lastLap: 5 },
  },
  { name: 'DNF', props: { dnf: true } },
];

const PitStates = ({ plain }: { plain: boolean }) => (
  <table className="border-separate border-spacing-0 text-sm text-white tabular-nums">
    <tbody>
      {ROWS.map(({ name, props }, index) => (
        <tr
          key={name}
          className={index % 2 ? 'bg-zinc-800/90' : 'bg-zinc-900/90'}
        >
          <td className="px-3 py-1 text-white/60">{name}</td>
          <PitStatusCell
            currentSessionType="Race"
            showPitTime
            plain={plain}
            {...props}
          />
        </tr>
      ))}
    </tbody>
  </table>
);

const meta: Meta<typeof PitStates> = {
  component: PitStates,
  title: 'widgets/Standings/components/PitStatusCell',
};

export default meta;
type Story = StoryObj<typeof PitStates>;

export const Flat: Story = { args: { plain: true } };

export const Badges: Story = { args: { plain: false } };
