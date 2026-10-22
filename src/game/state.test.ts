// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { freshState, settleWisdom } from "./state";
import { foundTribe } from "./tribe";

describe("wisdom centres", () => {
  it("settle toward rest, higher for the chosen role", () => {
    const s = freshState();
    s.role = "heart";
    s.wisdom = { mind: 0, heart: 0, body: 1 };
    for (let i = 0; i < 400; i++) settleWisdom(s, 0.05);
    expect(s.wisdom.heart).toBeCloseTo(0.85, 2);
    expect(s.wisdom.mind).toBeCloseTo(0.6, 2);
    expect(s.wisdom.body).toBeCloseTo(0.6, 2);
  });
});

describe("fresh state", () => {
  it("starts with an empty tribe that is its own object", () => {
    const a = freshState();
    const b = freshState();
    expect(a.tribe.name).toBeNull();
    foundTribe(a.tribe, "ONE");
    expect(b.tribe.name).toBeNull();
  });
});
