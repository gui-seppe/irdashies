import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PitStatusCell } from './PitStatusCell';

const renderInTable = (component: React.ReactElement) => {
  return render(
    <table>
      <tbody>
        <tr>{component}</tr>
      </tbody>
    </table>
  );
};

describe('PitStatusCell', () => {
  it('renders empty cell with default width when no props are provided', () => {
    const { container } = renderInTable(<PitStatusCell />);

    const td = container.querySelector('td[data-column="pitStatus"]');
    expect(td).toBeTruthy();
    expect(td?.className).toContain('w-[4.5rem]');
    expect(td?.textContent).toBe('');
  });

  it('renders empty cell when hidden', () => {
    const { container } = renderInTable(<PitStatusCell />);

    const td = container.querySelector('td[data-column="pitStatus"]');
    expect(td).toBeTruthy();
    expect(td?.textContent).toBe('');
  });

  it('uses a wider width when showPitTime is enabled', () => {
    const { container } = renderInTable(<PitStatusCell showPitTime={true} />);

    const td = container.querySelector('td[data-column="pitStatus"]');
    expect(td?.className).toContain('w-[7rem]');
  });

  it('shows OUT status when conditions are met', () => {
    const { container } = renderInTable(
      <PitStatusCell
        onPitRoad={false}
        lastPitLap={3}
        lastLap={3}
        carTrackSurface={1}
      />
    );

    expect(container.textContent).toContain('OUT');
  });

  it('does not show OUT when car is off track', () => {
    const { container } = renderInTable(
      <PitStatusCell
        onPitRoad={false}
        lastPitLap={3}
        lastLap={3}
        carTrackSurface={-1}
      />
    );

    expect(container.textContent).not.toContain('OUT');
  });

  describe('pitExitAfterSF — pit exit close to start/finish line', () => {
    it('keeps OUT visible after crossing S/F when pitExitAfterSF is true', () => {
      // Driver pitted on lap 5, has now crossed S/F (lastLap=6) but pit exit
      // was in the last 15% of the lap so OUT should still show
      const { container } = renderInTable(
        <PitStatusCell
          onPitRoad={false}
          lastPitLap={5}
          lastLap={6}
          carTrackSurface={1}
          pitExitAfterSF={true}
        />
      );

      expect(container.textContent).toContain('OUT');
    });

    it('does not keep OUT after two S/F crossings when pitExitAfterSF is true', () => {
      // Driver pitted on lap 5, has now crossed S/F twice (lastLap=7) — OUT
      // should be gone even with pitExitAfterSF
      const { container } = renderInTable(
        <PitStatusCell
          onPitRoad={false}
          lastPitLap={5}
          lastLap={7}
          carTrackSurface={1}
          pitExitAfterSF={true}
        />
      );

      expect(container.textContent).not.toContain('OUT');
    });

    it('does not extend OUT when pitExitAfterSF is false', () => {
      // Normal track: once S/F is crossed, OUT disappears
      const { container } = renderInTable(
        <PitStatusCell
          onPitRoad={false}
          lastPitLap={5}
          lastLap={6}
          carTrackSurface={1}
          pitExitAfterSF={false}
        />
      );

      expect(container.textContent).not.toContain('OUT');
    });
  });

  describe('plain (flat) style', () => {
    const pitCell = (container: HTMLElement) =>
      container.querySelector<HTMLElement>('td[data-column="pitStatus"]');

    it('glows yellow while moving down the pit lane, with the running time', () => {
      const { container } = renderInTable(
        <PitStatusCell
          plain
          showPitTime
          onPitRoad
          carTrackSurface={2}
          pitStopDuration={6}
          currentSessionType="Race"
        />
      );

      const td = pitCell(container);
      expect(td?.textContent).toBe('PIT6');
      expect(td?.style.boxShadow).toContain('--color-yellow-500');
      expect(td?.querySelector('.border-2')).toBeNull();
    });

    it('glows red once stationary in the pit stall', () => {
      const { container } = renderInTable(
        <PitStatusCell
          plain
          showPitTime
          onPitRoad
          carTrackSurface={1}
          prevCarTrackSurface={2}
          pitStopDuration={15}
          currentSessionType="Race"
        />
      );

      const td = pitCell(container);
      expect(td?.textContent).toBe('PIT15');
      expect(td?.style.boxShadow).toContain('--color-red-500');
    });

    it('glows red with the running time while being towed', () => {
      const { container } = renderInTable(
        <PitStatusCell
          plain
          showPitTime
          carTrackSurface={1}
          prevCarTrackSurface={3}
          lastLap={5}
          pitStopDuration={24}
          currentSessionType="Race"
        />
      );

      const td = pitCell(container);
      expect(td?.textContent).toBe('TOW24');
      expect(td?.style.boxShadow).toContain('--color-red-500');
      expect(td?.className).not.toContain('animate-pulse');
    });

    it('shows nothing for a car in the pits outside a race', () => {
      for (const session of ['Practice', 'Open Qualify', 'Lone Qualify']) {
        const { container, unmount } = renderInTable(
          <PitStatusCell
            plain
            showPitTime
            onPitRoad
            carTrackSurface={1}
            prevCarTrackSurface={2}
            pitStopDuration={15}
            currentSessionType={session}
          />
        );
        const td = pitCell(container);
        expect(td?.textContent).toBe('');
        expect(td?.style.boxShadow).toBe('');
        unmount();
      }
    });

    it('still shows OUT outside a race', () => {
      const { container } = renderInTable(
        <PitStatusCell
          plain
          carTrackSurface={3}
          lastPitLap={4}
          lastLap={4}
          currentSessionType="Practice"
        />
      );
      expect(pitCell(container)?.textContent).toBe('OUT');
    });

    it('centres a label shown without a time', () => {
      const { container } = renderInTable(
        <PitStatusCell plain carTrackSurface={3} lastPitLap={4} lastLap={4} />
      );
      const row = pitCell(container)?.firstElementChild;
      expect(row?.className).toContain('justify-center');
    });

    it('shows the last stop lap and time in yellow after the stop', () => {
      const { container } = renderInTable(
        <PitStatusCell
          plain
          showPitTime
          carTrackSurface={3}
          lastPitLap={19}
          lastLap={22}
          lap={22}
          pitStopDuration={35}
        />
      );

      const td = pitCell(container);
      expect(td?.textContent).toBe('L1935.0');
      expect(td?.className).toContain('text-yellow-400');
      expect(td?.style.boxShadow).toBe('');
    });
  });
});
