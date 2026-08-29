/** SMS cadence from the latest live ETA (not a fixed schedule). */
export function smsIntervalMs(etaMinutes: number | null): number {
  if (etaMinutes == null || etaMinutes > 40) return 5 * 60 * 1000;
  if (etaMinutes < 15) return 3 * 60 * 1000;
  return 4 * 60 * 1000;
}
