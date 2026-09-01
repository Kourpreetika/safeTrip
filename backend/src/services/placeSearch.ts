const PHOTON = "https://photon.komoot.io";
const NOMINATIM = "https://nominatim.openstreetmap.org";
/** minLon, minLat, maxLon, maxLat — mainland India plus nearby islands. */
const INDIA_BBOX = "68.1766451,6.5546079,97.4025615,35.6745457";

export type PlaceHit = {
  label: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
};

type PhotonFeature = {
  geometry?: { coordinates?: number[] };
  properties?: Record<string, string | number | undefined>;
};

function headers(contact: string): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": `SafeTrip/1.0 (${contact})`,
  };
}

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

export function fromPhotonFeature(feature: PhotonFeature): PlaceHit | null {
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
  return {
    title,
    subtitle,
    label: subtitle ? `${title}, ${subtitle}` : title,
    lat,
    lng,
  };
}

function dedupe(hits: PlaceHit[]): PlaceHit[] {
  const seen = new Set<string>();
  const out: PlaceHit[] = [];
  for (const hit of hits) {
    const key = `${hit.title.toLowerCase()}|${hit.lat.toFixed(4)}|${hit.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

async function photonSearch(
  query: string,
  contact: string,
  near?: { lat: number; lng: number },
): Promise<PlaceHit[]> {
  const url = new URL(`${PHOTON}/api/`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "12");
  url.searchParams.set("lang", "en");
  url.searchParams.set("bbox", INDIA_BBOX);
  if (near && Number.isFinite(near.lat) && Number.isFinite(near.lng)) {
    url.searchParams.set("lat", String(near.lat));
    url.searchParams.set("lon", String(near.lng));
  }
  const response = await fetch(url, { headers: headers(contact), signal: AbortSignal.timeout(8000) });
  if (!response.ok) return [];
  const data = (await response.json()) as { features?: PhotonFeature[] };
  return dedupe((data.features ?? []).map(fromPhotonFeature).filter((p): p is PlaceHit => p !== null));
}

async function nominatimPin(pin: string, contact: string): Promise<PlaceHit[]> {
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("postalcode", pin);
  url.searchParams.set("country", "India");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  const response = await fetch(url, { headers: headers(contact), signal: AbortSignal.timeout(8000) });
  if (!response.ok) return [];
  const rows = (await response.json()) as Array<{
    display_name?: string;
    lat: string;
    lon: string;
    address?: { city?: string; town?: string; village?: string; state?: string; postcode?: string };
  }>;
  return dedupe(
    rows.map((row) => {
      const city = row.address?.city || row.address?.town || row.address?.village || "";
      const state = row.address?.state || "";
      const title = `PIN ${pin}`;
      const subtitle = uniqueParts(title, [city, state, row.address?.postcode]);
      return {
        title,
        subtitle: subtitle || row.display_name || "",
        label: subtitle ? `${title}, ${subtitle}` : row.display_name || title,
        lat: Number(row.lat),
        lng: Number(row.lon),
      };
    }),
  );
}

export async function searchIndiaPlaces(
  query: string,
  contact: string,
  near?: { lat: number; lng: number },
): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const photon = await photonSearch(q, contact, near).catch(() => []);
  if (/^\d{6}$/.test(q)) {
    const pinHits = await nominatimPin(q, contact).catch(() => []);
    return dedupe([...pinHits, ...photon]).slice(0, 10);
  }
  return photon.slice(0, 10);
}

export async function reverseIndiaPlace(lat: number, lng: number, contact: string): Promise<string> {
  const url = new URL(`${PHOTON}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  try {
    const response = await fetch(url, { headers: headers(contact), signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const data = (await response.json()) as { features?: PhotonFeature[] };
      const hit = data.features?.[0] ? fromPhotonFeature(data.features[0]) : null;
      if (hit) return hit.label;
    }
  } catch {
    /* try nominatim */
  }
  try {
    const nom = new URL(`${NOMINATIM}/reverse`);
    nom.searchParams.set("lat", String(lat));
    nom.searchParams.set("lon", String(lng));
    nom.searchParams.set("format", "json");
    nom.searchParams.set("zoom", "16");
    const response = await fetch(nom, { headers: headers(contact), signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const data = (await response.json()) as { display_name?: string };
      if (data.display_name) return data.display_name;
    }
  } catch {
    /* fall through */
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
