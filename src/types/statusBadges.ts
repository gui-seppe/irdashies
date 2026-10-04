/**
 * Whether the status badges column (repair, penalty, slowdown flags) shows in
 * Standings / Relative. It used to be a "Status Badges" option under Driver
 * Name; a config saved before it became its own column keeps that choice.
 */
export const isStatusBadgesEnabled = (config?: {
  statusBadges?: { enabled: boolean };
  driverName?: { showStatusBadges?: boolean };
}): boolean =>
  config?.statusBadges?.enabled ?? config?.driverName?.showStatusBadges ?? true;
