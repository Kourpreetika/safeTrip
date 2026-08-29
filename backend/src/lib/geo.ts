/**
 * Distance and route helpers used by tracking.
 *
 * 1. Destination check — if the user is close enough, mark the journey complete.
 * 2. Off-route check — shortest distance from GPS to the planned polyline.
 * 3. ETA — remaining route length divided by recent speed.
 */

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;
// Treat the user as arrived if they are within this radius of the destination.
export const DESTINATION_RADIUS_M = 120;
// If GPS is farther than this from the planned route line, count it as off-route.
export const DEVIATION_THRESHOLD_M = 350;
// Need a few off-route points in a row so one GPS jump does not raise a false alarm.
export const DEVIATION_STREAK_REQUIRED = 3;
export const FALLBACK_SPEED_MPS = 7; // ~25 km/h if the browser does not send speed

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine formula: great-circle distance in metres between two GPS points. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Shortest distance from point P to the line segment AB (in metres). */
export function pointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const ax = a.lng;
  const ay = a.lat;
  const bx = b.lng;
  const by = b.lat;
  const px = p.lng;
  const py = p.lat;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return haversineMeters(p, a);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return haversineMeters(p, { lat: ay + t * dy, lng: ax + t * dx });
}

export function minDistanceToRoute(point: LatLng, route: LatLng[]): number {
  if (route.length === 0) return Number.POSITIVE_INFINITY;
  if (route.length === 1) return haversineMeters(point, route[0]);
  let minDistanceInMeters = Number.POSITIVE_INFINITY;
  for (let i = 0; i < route.length - 1; i++) {
    const distanceInMeters = pointToSegmentMeters(point, route[i], route[i + 1]);
    if (distanceInMeters < minDistanceInMeters) minDistanceInMeters = distanceInMeters;
  }
  return minDistanceInMeters;
}

export function isAtDestination(current: LatLng, dest: LatLng, radiusM = DESTINATION_RADIUS_M): boolean {
  return haversineMeters(current, dest) <= radiusM;
}

export function isOffRoute(point: LatLng, route: LatLng[], thresholdM = DEVIATION_THRESHOLD_M): boolean {
  if (route.length < 2) return false;
  return minDistanceToRoute(point, route) > thresholdM;
}

export function routeLengthMeters(route: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += haversineMeters(route[i], route[i + 1]);
  }
  return total;
}

/**
 * Remaining distance along the polyline: find the nearest vertex, then add up
 * the rest of the segments. If that is tiny, still keep at least half of the
 * straight-line distance to the destination so ETA does not jump to 0 too early.
 */
export function remainingDistanceMeters(point: LatLng, route: LatLng[], dest: LatLng): number {
  if (route.length < 2) return haversineMeters(point, dest);
  let nearestIdx = 0;
  let nearest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < route.length; i++) {
    const d = haversineMeters(point, route[i]);
    if (d < nearest) {
      nearest = d;
      nearestIdx = i;
    }
  }
  let remaining = 0;
  for (let i = nearestIdx; i < route.length - 1; i++) {
    remaining += haversineMeters(route[i], route[i + 1]);
  }
  return Math.max(remaining, haversineMeters(point, dest) * 0.5);
}

export function etaMinutes(remainingM: number, speedMps?: number | null): number {
  const speed = speedMps && speedMps > 1 ? speedMps : FALLBACK_SPEED_MPS;
  return Math.max(1, Math.round(remainingM / speed / 60));
}
