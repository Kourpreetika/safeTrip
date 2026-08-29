import { config } from "../config.ts";

export type LiveRoute = {
  coordinates: number[][];
  durationMin: number;
  distanceMeters: number;
  source: "google_traffic" | "google" | "osrm";
  hasTraffic: boolean;
};

function downsample(points: number[][], maxPoints = 400): number[][] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const out: number[][] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** Google encoded polyline → [lat, lng] pairs. */
export function decodePolyline(encoded: string): number[][] {
  const points: number[][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return downsample(points);
}

async function googleRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<LiveRoute | null> {
  const key = config.googleMapsApiKey;
  if (!key) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${fromLat},${fromLng}`);
  url.searchParams.set("destination", `${toLat},${toLng}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("alternatives", "true");
  url.searchParams.set("departure_time", "now");
  url.searchParams.set("traffic_model", "best_guess");
  url.searchParams.set("key", key);
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    status?: string;
    routes?: Array<{
      overview_polyline?: { points: string };
      legs?: Array<{
        distance: { value: number };
        duration: { value: number };
        duration_in_traffic?: { value: number };
      }>;
    }>;
  };
  if (data.status !== "OK" || !data.routes?.length) return null;

  let best = data.routes[0];
  let bestSec = Number.POSITIVE_INFINITY;
  for (const route of data.routes) {
    const leg = route.legs?.[0];
    if (!leg) continue;
    const sec = leg.duration_in_traffic?.value ?? leg.duration.value;
    if (sec < bestSec) {
      bestSec = sec;
      best = route;
    }
  }
  const leg = best.legs?.[0];
  const poly = best.overview_polyline?.points;
  if (!leg || !poly) return null;
  const hasTraffic = Boolean(leg.duration_in_traffic);
  return {
    coordinates: decodePolyline(poly),
    durationMin: Math.max(1, Math.round(bestSec / 60)),
    distanceMeters: leg.distance.value,
    source: hasTraffic ? "google_traffic" : "google",
    hasTraffic,
  };
}

async function osrmRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<LiveRoute | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&alternatives=true`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
      geometry: { coordinates: number[][] };
    }>;
  };
  const routes = data.routes ?? [];
  if (routes.length === 0) return null;
  const best = routes.reduce((a, b) => (a.duration < b.duration ? a : b));
  return {
    coordinates: downsample(best.geometry.coordinates.map(([lng, lat]) => [lat, lng])),
    durationMin: Math.max(1, Math.round(best.duration / 60)),
    distanceMeters: best.distance,
    source: "osrm",
    hasTraffic: false,
  };
}

/**
 * Live driving route from current position to destination.
 * Prefers Google Directions (duration in traffic) when GOOGLE_MAPS_API_KEY is set.
 * Otherwise uses OSRM road network times — not a guessed straight-line ETA.
 */
export async function fetchLiveRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<LiveRoute | null> {
  try {
    const google = await googleRoute(fromLat, fromLng, toLat, toLng);
    if (google) return google;
  } catch (err) {
    console.warn("Google Directions failed, trying OSRM:", err);
  }
  try {
    return await osrmRoute(fromLat, fromLng, toLat, toLng);
  } catch {
    return null;
  }
}
