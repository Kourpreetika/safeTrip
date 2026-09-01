import { api } from "../api/client";

export type Place = {
  label: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
};

const PHOTON = "https://photon.komoot.io";
const INDIA_BBOX = "68.1766451,6.5546079,97.4025615,35.6745457";

type PhotonFeature = {
  geometry?: { coordinates?: number[] };
  properties?: Record<string, string | number | undefined>;
};

function uniqueParts(title: string, parts: (string | undefined)[]): string {
  const seen = new Set([title.trim().toLowerCase()]);
  const out: string[] = [];
  for (const part of parts) {
    const text = part?.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out.join(", ");
}

function fromPhoton(feature: PhotonFeature): Place | null {
  const props = feature.properties ?? {};
  const cc = String(props.countrycode ?? "").toUpperCase();
  if (cc && cc !== "IN") return null;
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < 6.4 || lat > 37.2 || lng < 67.9 || lng > 97.6) return null;
  const name = String(props.name ?? "").trim();
  const street = String(props.street ?? "").trim();
  const house = String(props.housenumber ?? "").trim();
  const title = name || [house, street].filter(Boolean).join(" ") || String(props.city ?? props.state ?? "Place in India");
  const subtitle = uniqueParts(title, [
    name && street ? street : undefined,
    String(props.locality ?? ""),
    String(props.district ?? ""),
    String(props.city ?? props.town ?? props.village ?? ""),
    String(props.state ?? ""),
    String(props.postcode ?? ""),
  ]);
  return { title, subtitle, label: subtitle ? `${title}, ${subtitle}` : title, lat, lng };
}

function normalize(row: Partial<Place> & { lat: number; lng: number; label: string }): Place {
  return {
    label: row.label,
    title: row.title || row.label.split(",")[0]?.trim() || row.label,
    subtitle: row.subtitle || row.label.split(",").slice(1).join(",").trim(),
    lat: row.lat,
    lng: row.lng,
  };
}

async function photonSearch(query: string, near?: { lat: number; lng: number }): Promise<Place[]> {
  const url = new URL(`${PHOTON}/api/`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "12");
  url.searchParams.set("lang", "en");
  url.searchParams.set("bbox", INDIA_BBOX);
  if (near) {
    url.searchParams.set("lat", String(near.lat));
    url.searchParams.set("lon", String(near.lng));
  }
  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) return [];
  const data = (await response.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const feature of data.features ?? []) {
    const place = fromPhoton(feature);
    if (!place) continue;
    const key = `${place.title.toLowerCase()}|${place.lat.toFixed(4)}|${place.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
  }
  return out.slice(0, 10);
}

export async function searchIndiaPlaces(query: string, near?: { lat: number; lng: number }): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ q });
  if (near) {
    params.set("nearLat", String(near.lat));
    params.set("nearLng", String(near.lng));
  }
  try {
    const data = await api<{ results: Place[] }>(`/api/geo/search?${params.toString()}`);
    if (data.results?.length) return data.results.map(normalize);
  } catch {
    /* Photon below still works if the API search is empty or down */
  }
  return photonSearch(q, near);
}

export async function reverseIndiaPlace(lat: number, lng: number): Promise<string> {
  try {
    const data = await api<{ label: string }>(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
    if (data.label && !/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(data.label)) return data.label;
  } catch {
    /* Photon reverse */
  }
  try {
    const url = new URL(`${PHOTON}/reverse`);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (response.ok) {
      const data = (await response.json()) as { features?: PhotonFeature[] };
      const hit = data.features?.[0] ? fromPhoton(data.features[0]) : null;
      if (hit) return hit.label;
    }
  } catch {
    /* fall through */
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
