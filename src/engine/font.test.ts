// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  ADVANCE,
  GLYPHS,
  GLYPH_H,
  GLYPH_W,
  hasGlyph,
  measure,
  splitAlpha,
  wrap,
} from "./font";
import {
  CHAPTERS,
  PROLOGUE_OFFER,
  PROLOGUE_QUESTIONS,
  PROLOGUE_REPLIES,
} from "../story/script";
import {
  CREDITS,
  LINKS,
  MESH_IN_HOLONS,
  MOON,
  MOON_TONIGHT,
  PLAY_MEANS,
  PLAY_OPTIONS,
  RESOURCES,
  TRIBE_PAGE,
} from "../story/holons";
import {
  AMULET,
  DRIVES,
  OCTALYSIS_PAGE,
  TEMPT_UI,
  TEMPTATIONS,
} from "../story/octalysis";

describe("bitmap font", () => {
  it("every glyph is exactly 5×7 and uses only # and .", () => {
    for (const [ch, rows] of Object.entries(GLYPHS)) {
      expect(rows.length, `glyph ${JSON.stringify(ch)} height`).toBe(GLYPH_H);
      for (const row of rows) {
        expect(row.length, `glyph ${JSON.stringify(ch)} width`).toBe(GLYPH_W);
        expect(row, `glyph ${JSON.stringify(ch)} chars`).toMatch(/^[#.]+$/);
      }
    }
  });

  it("has a glyph for every character the story uses", () => {
    const texts: string[] = [];
    for (const ch of CHAPTERS)
      for (const b of ch.beats) {
        if ("say" in b) texts.push(b.text);
        if ("card" in b) texts.push(b.card);
      }
    texts.push(
      ...PROLOGUE_QUESTIONS,
      ...PROLOGUE_REPLIES,
      PROLOGUE_OFFER,
      ...MESH_IN_HOLONS,
      ...CREDITS,
    );
    for (const l of LINKS) texts.push(l.label);
    for (const p of Object.values(PLAY_MEANS)) texts.push(p.title, p.line);
    texts.push(...PLAY_OPTIONS.names);
    for (const i of PLAY_OPTIONS.items) texts.push(i.name, i.owner ?? "");
    for (const p of [...PLAY_OPTIONS.partners, ...PLAY_OPTIONS.nearby])
      texts.push(p.name);
    for (const r of Object.values(RESOURCES)) texts.push(r.label, ...r.words);
    for (const q of PLAY_OPTIONS.quests) texts.push(q.title);
    for (const n of PLAY_OPTIONS.needs) texts.push(n.text);
    texts.push(TRIBE_PAGE.title, TRIBE_PAGE.unnamed, TRIBE_PAGE.footer);
    texts.push(...Object.values(TRIBE_PAGE.rows));
    for (const d of Object.values(DRIVES)) texts.push(d.short, d.line);
    texts.push(...Object.values(AMULET));
    const { tally, ...page } = OCTALYSIS_PAGE;
    texts.push(...Object.values(page), tally(0, 7), tally(2, 7));
    for (const tp of Object.values(TEMPTATIONS))
      texts.push(tp.whisper, tp.take, tp.refuse, tp.took, tp.refused);
    texts.push(...Object.values(TEMPT_UI));
    texts.push(MOON.lunation, MOON.day, MOON.of, ...MOON.phases);
    texts.push(...MOON.quarters, MOON_TONIGHT.village);
    texts.push(MOON_TONIGHT.line(1234, 30, 30));
    const missing = new Set<string>();
    for (const t of texts)
      for (const c of t) if (c !== "\n" && !hasGlyph(c)) missing.add(c);
    expect([...missing]).toEqual([]);
  });

  it("every idea's card fits its ribbon", () => {
    // 384 wide, ribbon inset 16 a side, text from 62: 296px, five lines
    for (const [id, p] of Object.entries(PLAY_MEANS))
      expect(wrap(p.line, 296).length, id).toBeLessThanOrEqual(5);
  });

  it("the octalysis page's labels and closing line fit", () => {
    // labels sit 48px left/right of the centred octagon; text column 272px
    for (const d of Object.values(DRIVES))
      expect(192 + 48 + measure(d.short), d.short).toBeLessThanOrEqual(384);
    expect(wrap(OCTALYSIS_PAGE.footer, 272).length).toBeLessThanOrEqual(3);
  });

  it("the amulet's panel fits beside it", async () => {
    // big amulet at x 112, r 44, labels 8px out; text column 236..372
    const { driveAngle } = await import("../art/ui");
    for (const [k, d] of Object.entries(DRIVES)) {
      const c = Math.cos(driveAngle(Number(k) as 1));
      const x = 112 + c * 52;
      const w = measure(d.short);
      const [x0, x1] =
        Math.abs(c) < 0.3
          ? [x - w / 2, x + w / 2]
          : c > 0
            ? [x, x + w]
            : [x - w, x];
      expect(x0, d.short).toBeGreaterThanOrEqual(2);
      expect(x1, d.short).toBeLessThanOrEqual(232);
      expect(wrap(d.line, 136).length, d.short).toBeLessThanOrEqual(6);
    }
    expect(measure(AMULET.title)).toBeLessThanOrEqual(384);
  });

  it("tonight's moon fits above the finale's links", () => {
    // the widest a cycle can print: four digits, day 30 of 30
    expect(
      wrap(MOON_TONIGHT.line(1234, 30, 30), 364).length,
    ).toBeLessThanOrEqual(2);
    expect(wrap(MOON_TONIGHT.village, 364).length).toBeLessThanOrEqual(2);
    for (const p of MOON.phases) expect(measure(p)).toBeLessThanOrEqual(120);
  });

  it("measures and wraps on character cells", () => {
    expect(measure("")).toBe(0);
    expect(measure("ABC")).toBe(3 * ADVANCE - 1);
    expect(wrap("THE JOURNEY TO GAME~B", 60)).toEqual([
      "THE",
      "JOURNEY TO",
      "GAME~B",
    ]);
    expect(wrap("A\nB", 100)).toEqual(["A", "B"]);
    expect(wrap("SUPERCALIFRAGILISTIC", 30)).toEqual([
      "SUPER",
      "CALIF",
      "RAGIL",
      "ISTIC",
    ]);
  });
});

describe("wrapIndent", () => {
  it("fits the first line in the narrower width, the rest in the full width", async () => {
    const { wrapIndent } = await import("./font");
    const lines = wrapIndent("ONE TWO THREE FOUR FIVE SIX", 60, 24);
    expect(lines[0]).toBe("ONE");
    expect(lines.slice(1)).toEqual(["TWO THREE", "FOUR FIVE", "SIX"]);
  });
});

describe("glyph colours", () => {
  it("caches translucent text by its opaque colour", () => {
    // a pulsing hint must not mint a new glyph canvas every frame
    const a = splitAlpha("rgba(243,238,228,0.6123)");
    const b = splitAlpha("rgba(243,238,228,0.9877)");
    expect(a[0]).toBe("rgb(243,238,228)");
    expect(b[0]).toBe(a[0]);
    expect(a[1]).toBeCloseTo(0.6123);
    expect(splitAlpha("#f3eee4")).toEqual(["#f3eee4", 1]);
  });
});
