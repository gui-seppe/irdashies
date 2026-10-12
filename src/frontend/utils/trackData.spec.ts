import { describe, expect, it } from 'vitest';
import { loadTrackData } from './trackData';

/**
 * Covers the name matching, which is the part that can be confidently wrong.
 *
 * The bundle is keyed by iRacing's lowercase slugs, and the near-miss fallback
 * exists for the small drift between two spellings of the same circuit. A
 * match resting on one shared generic word would show another circuit's
 * corners, so that has to come back as no match instead.
 */
describe('loadTrackData', () => {
  it('matches an iRacing track name exactly', () => {
    expect(loadTrackData('nurburgring nordschleife')?.trackId).toBe(
      'nurburgring nordschleife'
    );
    expect(loadTrackData('lagunaseca')?.trackId).toBe('lagunaseca');
    expect(loadTrackData('spa combined')?.trackId).toBe('spa combined');
  });

  it('still bridges the drift it was written for', () => {
    // iRacing says "silverstone gp", the dataset says "silverstone 2019 gp".
    expect(loadTrackData('silverstone gp')?.trackId).toBe(
      'silverstone 2019 gp'
    );
  });

  it('refuses a match that rests on a generic word alone', () => {
    expect(loadTrackData('road imaginary')).toBeNull();
    expect(loadTrackData('international circuit')).toBeNull();
    expect(loadTrackData('daytona road')?.trackId).toBe('daytona 2011 road');
  });

  it('still matches a near miss on a distinctive word', () => {
    expect(loadTrackData('sebring international raceway')?.trackId).toBe(
      'sebring international'
    );
  });

  it('returns null for nothing usable', () => {
    expect(loadTrackData('')).toBeNull();
    expect(loadTrackData('   ')).toBeNull();
  });
});
