export type LiveRoute = {
  coordinates: number[][];
  durationMin: number;
  distanceMeters: number;
  source: "osrm";
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

/** Live driving route from current position to destination via the OSRM road network. */
export async function fetchLiveRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<LiveRoute | null> {
  try {
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
  } catch {
    return null;
  }
}
