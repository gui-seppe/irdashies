import { describe, it, expect } from 'vitest';
import { isStatusBadgesEnabled } from './statusBadges';

describe('isStatusBadgesEnabled', () => {
  it('is on by default', () => {
    expect(isStatusBadgesEnabled(undefined)).toBe(true);
    expect(isStatusBadgesEnabled({})).toBe(true);
  });

  it('keeps the old Driver Name "Status Badges" choice', () => {
    expect(
      isStatusBadgesEnabled({ driverName: { showStatusBadges: false } })
    ).toBe(false);
  });

  it('follows the column toggle once it has been set', () => {
    expect(
      isStatusBadgesEnabled({
        statusBadges: { enabled: true },
        driverName: { showStatusBadges: false },
      })
    ).toBe(true);
    expect(isStatusBadgesEnabled({ statusBadges: { enabled: false } })).toBe(
      false
    );
  });
});
