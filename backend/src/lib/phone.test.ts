import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeIndianMobile } from "./phone.ts";
import { smsIntervalMs } from "./smsSchedule.ts";

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

test("SMS interval follows ETA bands", () => {
  assert.equal(smsIntervalMs(10), 3 * 60 * 1000);
  assert.equal(smsIntervalMs(15), 4 * 60 * 1000);
  assert.equal(smsIntervalMs(40), 4 * 60 * 1000);
  assert.equal(smsIntervalMs(41), 5 * 60 * 1000);
  assert.equal(smsIntervalMs(null), 5 * 60 * 1000);
});
