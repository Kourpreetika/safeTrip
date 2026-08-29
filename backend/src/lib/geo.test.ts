import { test } from "node:test";
import assert from "node:assert/strict";
import {
  haversineMeters,
  isAtDestination,
  isOffRoute,
  etaMinutes,
  type LatLng,
} from "./geo.ts";

const koramangala: LatLng = { lat: 12.9352, lng: 77.6245 };
const mgRoad: LatLng = { lat: 12.975, lng: 77.6066 };

test("haversine: Koramangala to MG Road is a few kilometres", () => {
  const d = haversineMeters(koramangala, mgRoad);
  assert.ok(d > 3000 && d < 8000, `unexpected distance ${d}`);
});

test("geofence: standing on the destination is arrived", () => {
  assert.equal(isAtDestination(mgRoad, mgRoad), true);
});

test("geofence: start is not the destination", () => {
  assert.equal(isAtDestination(koramangala, mgRoad), false);
});

test("route deviation: point far from the route is off-route", () => {
  const route = [koramangala, mgRoad];
  const airport = { lat: 13.1986, lng: 77.7066 };
  assert.equal(isOffRoute(airport, route), true);
});

test("route deviation: point on the route is on-route", () => {
  const route = [koramangala, mgRoad];
  const mid: LatLng = {
    lat: (koramangala.lat + mgRoad.lat) / 2,
    lng: (koramangala.lng + mgRoad.lng) / 2,
  };
  assert.equal(isOffRoute(mid, route), false);
});

test("ETA is at least one minute", () => {
  assert.ok(etaMinutes(500, 10) >= 1);
});
