import { Router } from "express";
import { config } from "../config.ts";
import { fetchLiveRoute } from "../services/routingService.ts";

const router = Router();

function nominatimHeaders(): HeadersInit {
  return {
    "User-Agent": `SafeTrip/1.0 (${config.appContact})`,
    Accept: "application/json",
  };
}

type NominatimHit = {
  display_name: string;
  lat: string;
  lon: string;
  address?: { postcode?: string; city?: string; town?: string; village?: string; state?: string };
};

function toResult(r: NominatimHit) {
  const pin = r.address?.postcode;
  const label = pin && !r.display_name.includes(pin) ? `${r.display_name} — PIN ${pin}` : r.display_name;
  return { label, lat: Number(r.lat), lng: Number(r.lon) };
}

async function nominatimSearch(params: URLSearchParams): Promise<NominatimHit[]> {
  params.set("format", "json");
  params.set("addressdetails", "1");
  urlLimit(params);
  params.set("countrycodes", "in");
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const response = await fetch(url, { headers: nominatimHeaders() });
  if (!response.ok) return [];
  return (await response.json()) as NominatimHit[];
}

function urlLimit(params: URLSearchParams) {
  if (!params.has("limit")) params.set("limit", "8");
}

router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) {
    res.json({ results: [] });
    return;
  }
  try {
    let hits: NominatimHit[] = [];
    if (/^\d{6}$/.test(q)) {
      const pinParams = new URLSearchParams();
      pinParams.set("postalcode", q);
      pinParams.set("country", "India");
      hits = await nominatimSearch(pinParams);
      if (hits.length === 0) {
        const qParams = new URLSearchParams();
        qParams.set("q", `${q}, India`);
        hits = await nominatimSearch(qParams);
      }
    } else {
      const qParams = new URLSearchParams();
      qParams.set("q", q.toLowerCase().includes("india") ? q : `${q}, India`);
      hits = await nominatimSearch(qParams);
    }
    res.json({ results: hits.map(toResult) });
  } catch {
    res.status(502).json({ error: "Location search is temporarily unavailable. Try again in a moment." });
  }
});

router.get("/reverse", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng are required." });
    return;
  }
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "16");
    const response = await fetch(url, { headers: nominatimHeaders() });
    const data = (await response.json()) as NominatimHit;
    res.json({ label: data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
  } catch {
    res.json({ label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
  }
});

router.get("/route", async (req, res) => {
  const fromLat = Number(req.query.fromLat);
  const fromLng = Number(req.query.fromLng);
  const toLat = Number(req.query.toLat);
  const toLng = Number(req.query.toLng);
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    res.status(400).json({ error: "Valid coordinates are required." });
    return;
  }
  const route = await fetchLiveRoute(fromLat, fromLng, toLat, toLng);
  if (!route) {
    res.status(502).json({
      error: "Could not calculate a road route right now. Check the locations and try again.",
      fallback: true,
    });
    return;
  }
  res.json({
    distanceMeters: route.distanceMeters,
    durationMin: route.durationMin,
    coordinates: route.coordinates,
    source: route.source,
    hasTraffic: route.hasTraffic,
  });
});

export default router;
