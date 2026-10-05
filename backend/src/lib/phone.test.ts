import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeIndianMobile } from "./phone.ts";
import { alertIntervalMs } from "./smsSchedule.ts";
import { formatTripSms } from "./smsMessage.ts";

test("accepts a 10-digit Indian mobile", () => {
  assert.equal(normalizeIndianMobile("9876543210"), "+919876543210");
});

test("accepts +91 and spaces", () => {
  assert.equal(normalizeIndianMobile("+91 98765 43210"), "+919876543210");
});

test("rejects landline-style and short numbers", () => {
  assert.equal(normalizeIndianMobile("080123456"), null);
  assert.equal(normalizeIndianMobile("12345"), null);
  assert.equal(normalizeIndianMobile("5123456789"), null);
});

test("alert interval follows ETA bands", () => {
  assert.equal(alertIntervalMs(10), 3 * 60 * 1000);
  assert.equal(alertIntervalMs(15), 4 * 60 * 1000);
  assert.equal(alertIntervalMs(40), 4 * 60 * 1000);
  assert.equal(alertIntervalMs(41), 5 * 60 * 1000);
  assert.equal(alertIntervalMs(null), 5 * 60 * 1000);
});

test("trip SMS includes pickup, drop, driver, and tracking link", () => {
  const body = formatTripSms({
    userName: "Priya",
    status: "Trip started",
    startAddress: "Koramangala",
    destAddress: "MG Road, Bengaluru",
    driverName: "Vicky",
    vehicleNumber: "KA01AB1234",
    rideProvider: "Uber",
    rideId: "UB-9",
    etaMinutes: 18,
    lat: 12.9352,
    lng: 77.6245,
    trackUrl: "https://safe-trip-omega.vercel.app/track/abc",
  });
  assert.match(body, /Priya/);
  assert.match(body, /Koramangala/);
  assert.match(body, /MG Road/);
  assert.match(body, /Vicky/);
  assert.match(body, /KA01AB1234/);
  assert.match(body, /Track: https:\/\/safe-trip-omega\.vercel\.app\/track\/abc/);
  assert.match(body, /maps\.google\.com/);
});
