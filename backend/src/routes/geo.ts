import { Router } from "express";
import { config } from "../config.ts";
import { fetchLiveRoute } from "../services/routingService.ts";
import { reverseIndiaPlace, searchIndiaPlaces } from "../services/placeSearch.ts";

const router = Router();

router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const nearLat = Number(req.query.nearLat);
  const nearLng = Number(req.query.nearLng);
  const near = Number.isFinite(nearLat) && Number.isFinite(nearLng) ? { lat: nearLat, lng: nearLng } : undefined;
  if (q.length < 2) {
    res.json({ results: [] });
    return;
  }
  try {
    const results = await searchIndiaPlaces(q, config.appContact, near);
    res.json({ results });
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
  const label = await reverseIndiaPlace(lat, lng, config.appContact);
  res.json({ label });
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
