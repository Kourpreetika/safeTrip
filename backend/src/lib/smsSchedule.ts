/** Alert cadence from the latest live ETA. */
export function alertIntervalMs(etaMinutes: number | null): number {
  if (etaMinutes == null || etaMinutes > 40) return 5 * 60 * 1000;
  if (etaMinutes < 15) return 3 * 60 * 1000;
  return 4 * 60 * 1000;
}

export function shouldSendScheduledAlert(lastAt: Date | null, etaMinutes: number | null, now = Date.now()): boolean {
  if (!lastAt) return true;
  return now - lastAt.getTime() >= alertIntervalMs(etaMinutes);
}
