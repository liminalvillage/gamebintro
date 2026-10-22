// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { lunationAt, phaseBand } from "./lunation";

describe("lunations", () => {
  it("numbers cycles as the bot and liminalvillage.com do", () => {
    // pinned against the site's port of @holons/core's lunationAt
    expect(lunationAt(Date.parse("2026-10-22T12:00:00Z")).index).toBe(83);
    expect(lunationAt(Date.parse("2024-04-08T18:30:00Z")).index).toBe(52);
  });

  it("turns over at the true new moon, not a mean one", () => {
    // the new moon of 29 January 2025 fell at 12:36 UTC
    expect(lunationAt(Date.parse("2025-01-29T12:30:00Z")).index).toBe(61);
    expect(lunationAt(Date.parse("2025-01-29T12:41:00Z")).index).toBe(62);
  });

  it("says where in the cycle a moment falls", () => {
    const ts = Date.parse("2026-10-22T12:00:00Z");
    const l = lunationAt(ts);
    expect(l.from).toBeLessThanOrEqual(ts);
    expect(l.to).toBeGreaterThan(ts);
    expect(l.days).toBeGreaterThanOrEqual(29);
    expect(l.days).toBeLessThanOrEqual(31);
    expect(l.day).toBe(12);
    expect(l.phase).toBeGreaterThan(0.38);
    expect(l.phase).toBeLessThan(0.42);
    expect(phaseBand(l.phase)).toBe(3);
  });

  it("names eight bands, new at both ends", () => {
    expect(phaseBand(0)).toBe(0);
    expect(phaseBand(0.97)).toBe(0);
    expect(phaseBand(0.5)).toBe(4);
    expect(phaseBand(0.25)).toBe(2);
  });
});
