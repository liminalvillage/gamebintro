// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Interface furniture: the gold-framed dialogue box with a portrait, the
// three wisdom orbs, the talisman, the parasite, the Octalysis octagon, and
// the two diagram overlays (the class pyramid of Game A, the nested scales
// of Game B).

import { H, W } from "../engine/screen";
import { drawText, LINE_H, measure, wrapIndent } from "../engine/font";
import { drawSprite } from "../engine/sprite";
import { AROUND, DRIVES, type DriveId } from "../story/octalysis";
import { CAST, portrait, type CharacterId } from "./characters";
import { P } from "./palette";
import {
  disc,
  hexagon,
  line,
  polygon,
  rect,
  ring,
  tri,
  withAlpha,
  type Ctx,
} from "./paint";

export const BOX = { x: 12, y: 152, w: W - 24, h: 58 } as const;

/** Ornamental gold frame with notched corners and side diamonds. */
export function frame(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color = P.goldDeep,
  fill: string | null = withAlpha(P.ink, 0.86),
): void {
  if (fill) {
    rect(g, x + 2, y, w - 4, h, fill);
    rect(g, x, y + 2, w, h - 4, fill);
  }
  // notched border
  rect(g, x + 3, y, w - 6, 1, color);
  rect(g, x + 3, y + h - 1, w - 6, 1, color);
  rect(g, x, y + 3, 1, h - 6, color);
  rect(g, x + w - 1, y + 3, 1, h - 6, color);
  for (const [cx, cy, sx, sy] of [
    [x, y, 1, 1],
    [x + w - 1, y, -1, 1],
    [x, y + h - 1, 1, -1],
    [x + w - 1, y + h - 1, -1, -1],
  ] as [number, number, number, number][]) {
    rect(g, cx + sx * 1, cy + sy * 2, 1, 1, color);
    rect(g, cx + sx * 2, cy + sy * 1, 1, 1, color);
  }
  // side diamonds
  const my = Math.round(y + h / 2);
  for (const dx of [x - 1, x + w]) {
    rect(g, dx, my - 2, 1, 5, color);
    rect(g, dx + (dx < x ? -1 : 1), my - 1, 1, 3, color);
    rect(g, dx + (dx < x ? -2 : 2), my, 1, 1, color);
  }
  // top centre jewel
  const mx = Math.round(x + w / 2);
  rect(g, mx - 1, y - 1, 3, 1, color);
  rect(g, mx, y - 2, 1, 1, P.gold);
}

/**
 * The dialogue box. `shown` is the typewriter count; returns the total
 * character count so the caller knows when the line is complete.
 */
export function dialogue(
  g: Ctx,
  who: CharacterId,
  text: string,
  shown: number,
  blink: boolean,
): number {
  const c = CAST[who];
  frame(g, BOX.x, BOX.y, BOX.w, BOX.h);
  // portrait
  const px = BOX.x + 6;
  const py = BOX.y + 6;
  rect(g, px, py, 46, 46, c.backdrop);
  rect(g, px, py, 46, 1, P.goldPale);
  rect(g, px, py + 45, 46, 1, P.goldDeep);
  rect(g, px, py, 1, 46, P.goldPale);
  rect(g, px + 45, py, 1, 46, P.goldDeep);
  const spr = portrait(who);
  // portraits are 22px; draw them 2× for the 46px frame
  g.imageSmoothingEnabled = false;
  g.drawImage(spr.canvas, px + 1, py + 1, 44, 44);
  // name, then the text flowing on from it (capitals, like the film)
  const tx = px + 54;
  const ty = py + 2;
  const name = `${c.name}:`;
  drawText(g, name, tx, ty, c.color);
  const nameW = measure(name) + 6;
  const maxW = BOX.x + BOX.w - 8 - tx;
  const lines = wrapIndent(text.toUpperCase(), maxW, maxW - nameW);
  let left = shown;
  lines.forEach((line, i) => {
    const lim = Math.max(0, Math.min(line.length, left));
    drawText(g, line, i === 0 ? tx + nameW : tx, ty + i * LINE_H, P.paper, {
      limit: lim,
    });
    left -= line.length + 1;
  });
  if (shown >= text.length && blink) {
    drawText(g, "▶", BOX.x + BOX.w - 12, BOX.y + BOX.h - 10, P.gold);
  }
  return text.length;
}

/** Small prompt at the bottom-right ("TAP", "HOLD → TO WALK"). */
export function hint(g: Ctx, text: string, t: number): void {
  const a = 0.6 + 0.4 * Math.sin(t * 4);
  drawText(g, text, W - 8, H - 10, withAlpha(P.paper, a), {
    align: "right",
    shadow: P.ink,
  });
}

export type WisdomState = { mind: number; heart: number; body: number };

/** The three wisdom centres, top-right. Values 0..1 = how open each is. */
export function wisdomOrbs(
  g: Ctx,
  w: WisdomState,
  t: number,
  x = W - 44,
  y = 8,
): void {
  const items: [keyof WisdomState, string, string][] = [
    ["mind", P.cyan, "M"],
    ["heart", P.magenta, "H"],
    ["body", P.mint, "B"],
  ];
  items.forEach(([k, color, label], i) => {
    const cx = x + i * 14;
    const v = w[k];
    const r = 4;
    ring(g, cx, y + 4, r + 1, withAlpha(color, 0.35));
    disc(g, cx, y + 4, r, withAlpha(color, 0.15 + 0.85 * v));
    if (v > 0.7) {
      const s = 0.5 + 0.5 * Math.sin(t * 5 + i);
      ring(g, cx, y + 4, r + 2 + Math.round(s), withAlpha(color, 0.25 * s));
    }
    drawText(g, label, cx - 2, y + 12, withAlpha(color, 0.9));
  });
}

/** A drive's colour: gold for the white hat, magenta for the black. */
export function driveColor(d: DriveId): string {
  const hat = DRIVES[d].hat;
  return hat === "white" ? P.gold : hat === "black" ? P.magenta : P.cyan;
}

/** Centre angle (radians) of the octagon side drive `d` sits on. */
export function driveAngle(d: DriveId): number {
  return (Math.PI / 4) * AROUND.indexOf(d) - Math.PI / 2;
}

/**
 * The Octalysis octagon: one wedge per drive, filled outward as far as the
 * drive is woken (0..1). `focus` outlines one wedge; `lit` pulses one.
 */
export function octagon(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  levels: Record<DriveId, number>,
  t: number,
  opts: { focus?: DriveId | null; lit?: DriveId[] } = {},
): void {
  const at = (a: number, rr: number): [number, number] => [
    cx + Math.cos(a) * rr,
    cy + Math.sin(a) * rr,
  ];
  const half = Math.PI / 8;
  for (const d of AROUND) {
    const a = driveAngle(d);
    const c = driveColor(d);
    polygon(g, [[cx, cy], at(a - half, r), at(a + half, r)], withAlpha(c, 0.1));
    const v = Math.max(0, Math.min(1, levels[d]));
    const pulse = opts.lit?.includes(d) ? 0.25 + 0.25 * Math.sin(t * 6) : 0;
    if (v > 0)
      polygon(
        g,
        [[cx, cy], at(a - half, r * v), at(a + half, r * v)],
        withAlpha(c, 0.55 + 0.3 * v + pulse),
      );
  }
  for (const d of AROUND) {
    const a = driveAngle(d);
    const [x0, y0] = at(a - half, r);
    const [x1, y1] = at(a + half, r);
    const focus = opts.focus === d;
    line(g, x0, y0, x1, y1, focus ? P.white : withAlpha(P.goldPale, 0.6));
    if (focus) {
      line(g, cx, cy, x0, y0, P.white);
      line(g, cx, cy, x1, y1, P.white);
    }
  }
}

/** The symbol of wholeness: a hexagon holding a circle holding a point. */
export function talisman(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  t: number,
  color = P.gold,
): void {
  hexagon(g, cx, cy, r, null, color);
  ring(g, cx, cy, Math.max(2, Math.round(r * 0.6)), color);
  const s = 0.5 + 0.5 * Math.sin(t * 3);
  disc(g, cx, cy, 1, withAlpha(P.white, 0.5 + 0.5 * s));
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    rect(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1, P.white);
  }
}

/** The parasite in the world: an electric sphere with a magenta core. */
export function parasite(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  t: number,
  intensity: number,
): void {
  if (r <= 0) return;
  const k = Math.max(0, Math.min(1, intensity));
  disc(g, cx, cy, r + 6, withAlpha(P.cyanDeep, 0.1 * k));
  for (let i = 0; i < 4; i++) {
    const rr = Math.round(
      r * (0.55 + i * 0.18) + Math.sin(t * 6 + i * 1.7) * 1.5,
    );
    ring(g, cx, cy, rr, withAlpha(i % 2 ? P.cyan : "#8a6cff", 0.25 + 0.5 * k));
  }
  disc(g, cx, cy, Math.max(1, Math.round(r * 0.35)), withAlpha(P.magenta, 0.9));
  disc(g, cx, cy, Math.max(1, Math.round(r * 0.18)), P.white);
  // arcs
  const arcs = 2 + Math.round(k * 5);
  for (let i = 0; i < arcs; i++) {
    const a = t * 2.5 + i * 1.3 + Math.sin(t * 11 + i) * 0.4;
    let x = cx;
    let y = cy;
    for (let s = 0; s < 5; s++) {
      const nx =
        x + Math.cos(a + Math.sin(t * 17 + s * 3 + i) * 0.6) * (r * 0.35);
      const ny =
        y + Math.sin(a + Math.cos(t * 13 + s * 2 + i) * 0.6) * (r * 0.35);
      line(g, x, y, nx, ny, withAlpha(P.cyan, 0.9));
      x = nx;
      y = ny;
    }
  }
  // eye-shaped field lines (the lens the film draws it in)
  for (let i = 1; i <= 2; i++) {
    const ex = r + 10 * i;
    const ey = Math.round(r * 0.55 * i);
    for (let a = 0; a < Math.PI * 2; a += 0.12) {
      rect(
        g,
        cx + Math.cos(a) * ex,
        cy + Math.sin(a) * ey,
        1,
        1,
        withAlpha(P.cyan, 0.2 * k),
      );
    }
  }
}

/** The class pyramid of Game A: tiers, labels, little figures. */
export function pyramidDiagram(g: Ctx, f: number): void {
  const tiers = [
    "THE RULER",
    "NOBLES & PRIESTS",
    "SOLDIERS",
    "SCRIBES",
    "MERCHANTS",
    "CRAFTSPEOPLE",
    "FARMERS & SLAVES",
  ];
  const cx = W / 2;
  const baseY = 170;
  const hgt = 120;
  const wid = 200;
  rect(g, 0, 0, W, H, withAlpha(P.dawnTop, 0.35 * f));
  tri(g, cx, baseY, wid, hgt, withAlpha("#d9b98a", f));
  const th = hgt / tiers.length;
  tiers.forEach((label, i) => {
    const y = baseY - hgt + th * (i + 1);
    const show = f * tiers.length > i + 0.2;
    if (!show) return;
    rect(
      g,
      cx - (wid / 2) * ((i + 1) / tiers.length),
      Math.round(y),
      wid * ((i + 1) / tiers.length),
      1,
      "#9a7a4a",
    );
    drawText(g, label, cx, Math.round(y - th + 2), P.ink, { align: "center" });
    const count = Math.min(12, 1 + i * 2);
    for (let k = 0; k < count; k++) {
      const fx = cx - (count - 1) * 4 + k * 8;
      rect(g, fx, Math.round(y - 4), 2, 3, i === 0 ? P.gold : P.ink);
      rect(g, fx, Math.round(y - 6), 2, 2, P.skinLight);
    }
  });
  drawText(g, "GAME A", cx, 24, P.ink, { align: "center" });
}

/** Nested hexagons: the scales cooperation must span. */
export function scalesDiagram(g: Ctx, f: number, t: number): void {
  const scales = [
    "PLAYER",
    "NEIGHBOURHOOD",
    "VILLAGE",
    "TRIBE",
    "CITY",
    "BIOREGION",
    "GLOBE",
    "GALAXY",
  ];
  rect(g, 0, 0, W, H, withAlpha(P.nightTop, 0.5 * Math.min(1, f * 2)));
  const cx = W / 2;
  const cy = H / 2 - 4;
  const n = Math.min(scales.length, Math.floor(f * scales.length + 0.001));
  for (let i = 0; i < n; i++) {
    const r = 8 + i * 12;
    const col = i === n - 1 ? P.gold : withAlpha(P.cyan, 0.35 + 0.08 * i);
    hexagon(g, cx, cy, r + Math.round(Math.sin(t * 2 + i) * 0.5), null, col);
    const label = scales[i]!;
    const lx = cx + r + 6;
    const ly = cy - r + 4 + (i % 2 ? 10 : 0);
    const tx = i % 2 ? cx - r - 6 - measure(label) : lx;
    drawText(g, label, tx, Math.round(ly), i === n - 1 ? P.gold : P.paper, {
      shadow: P.ink,
    });
  }
  disc(g, cx, cy, 2, P.gold);
}

/** Vertical fade to black, 0 = clear, 1 = black. */
export function fade(g: Ctx, a: number): void {
  if (a <= 0) return;
  rect(g, 0, 0, W, H, withAlpha(P.black, Math.min(1, a)));
}

/** Horizontal-tear glitch, like a signal losing lock. */
export function glitch(g: Ctx, t: number, strength: number): void {
  if (strength <= 0) return;
  const n = Math.round(6 + strength * 18);
  for (let i = 0; i < n; i++) {
    const y = Math.floor(((Math.sin(t * 31 + i * 7.1) + 1) / 2) * H);
    const h = 1 + Math.floor(((Math.sin(t * 17 + i * 3.3) + 1) / 2) * 6);
    const dx = Math.round(Math.sin(t * 23 + i) * 24 * strength);
    try {
      const img = g.getImageData(0, y, W, h);
      g.putImageData(img, dx, y);
    } catch {
      /* tainted/unsupported — skip */
    }
    rect(g, 0, y, W, 1, withAlpha(i % 2 ? P.cyan : P.magenta, 0.25 * strength));
  }
}

/** Gold "GAME~B" style title lettering, 3× the font, with a sheen. */
export function bigTitle(
  g: Ctx,
  text: string,
  cx: number,
  y: number,
  t: number,
  color = P.gold,
): void {
  const scale = 3;
  const w = measure(text) * scale;
  const x0 = Math.round(cx - w / 2);
  const off = document.createElement("canvas");
  off.width = measure(text) + 1;
  off.height = 8;
  const og = off.getContext("2d")!;
  drawText(og, text, 0, 0, color);
  g.imageSmoothingEnabled = false;
  g.drawImage(
    off,
    0,
    0,
    off.width,
    off.height,
    x0 + scale,
    y + scale,
    off.width * scale,
    off.height * scale,
  );
  const sheenX = x0 + ((t * 60) % (w + 40)) - 20;
  g.save();
  g.globalCompositeOperation = "source-atop";
  g.restore();
  // shadow pass first, then the lit letters on top
  const og2 = document.createElement("canvas");
  og2.width = off.width;
  og2.height = off.height;
  const gg = og2.getContext("2d")!;
  drawText(gg, text, 0, 0, P.goldDeep);
  g.drawImage(
    og2,
    0,
    0,
    off.width,
    off.height,
    x0 + scale,
    y + scale,
    off.width * scale,
    off.height * scale,
  );
  g.drawImage(
    off,
    0,
    0,
    off.width,
    off.height,
    x0,
    y,
    off.width * scale,
    off.height * scale,
  );
  rect(g, sheenX, y, 2, 8 * scale, withAlpha(P.white, 0.35));
}

/** Button-like label with a frame; returns its hit rectangle. */
export function button(
  g: Ctx,
  text: string,
  cx: number,
  y: number,
  active: boolean,
  color = P.gold,
): { x: number; y: number; w: number; h: number } {
  const w = measure(text) + 16;
  const x = Math.round(cx - w / 2);
  frame(
    g,
    x,
    y,
    w,
    15,
    active ? P.gold : P.goldDeep,
    withAlpha(P.ink, active ? 0.95 : 0.7),
  );
  drawText(g, text, cx, y + 4, active ? color : P.paper, { align: "center" });
  return { x, y, w, h: 15 };
}

export function inRect(
  p: { x: number; y: number },
  r: { x: number; y: number; w: number; h: number },
): boolean {
  return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
}

export { drawSprite };

type Box = { x: number; y: number; w: number; h: number };

/**
 * A kiosk panel: dark teal glass, the holon's tabs as pills on top (the
 * active one filled), a title under them. Returns the y where content starts.
 */
export function kioskCard(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  tabs: string[] = [],
  active = -1,
): number {
  rect(g, x + 1, y, w - 2, h, withAlpha(P.glass, 0.95));
  rect(g, x, y + 1, w, h - 2, withAlpha(P.glass, 0.95));
  rect(g, x + 1, y, w - 2, 1, withAlpha(P.teal, 0.5));
  rect(g, x + 1, y + h - 1, w - 2, 1, withAlpha(P.tealDeep, 0.7));
  rect(g, x, y + 1, 1, h - 2, withAlpha(P.tealDeep, 0.7));
  rect(g, x + w - 1, y + 1, 1, h - 2, withAlpha(P.tealDeep, 0.7));
  let cy = y + 5;
  if (tabs.length) {
    let tx = x + 6;
    tabs.forEach((tab, i) => {
      const tw = measure(tab) + 8;
      const on = i === active;
      rect(g, tx + 1, cy, tw - 2, 11, on ? P.teal : withAlpha(P.teal, 0.12));
      rect(g, tx, cy + 1, tw, 9, on ? P.teal : withAlpha(P.teal, 0.12));
      drawText(g, tab, tx + 4, cy + 2, on ? P.glass : withAlpha(P.teal, 0.85));
      tx += tw + 4;
    });
    cy += 15;
  }
  if (title) {
    drawText(g, title, x + 8, cy, P.paper);
    cy += 12;
  }
  return cy;
}

/** A kiosk pill button (filled teal when it is the one to press). */
export function pill(
  g: Ctx,
  text: string,
  x: number,
  y: number,
  on: boolean,
): Box {
  const w = measure(text) + 12;
  rect(g, x + 1, y, w - 2, 13, on ? P.teal : withAlpha(P.teal, 0.14));
  rect(g, x, y + 1, w, 11, on ? P.teal : withAlpha(P.teal, 0.14));
  drawText(g, text, x + 6, y + 3, on ? P.glass : P.teal);
  return { x, y, w, h: 13 };
}

/**
 * A Telegram message from the bot: the sender in blue, the lines, a clock,
 * and an inline keyboard under the bubble. Returns the keyboard's rects.
 */
export function tgMessage(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  lines: { text: string; color?: string }[],
  buttons: string[] = [],
  sender = "HOLONSBOT",
): Box[] {
  const h = 16 + lines.length * LINE_H + 8;
  rect(g, x + 2, y, w - 2, h, P.tgBubble);
  rect(g, x + 1, y + 1, w, h - 2, P.tgBubble);
  // the bubble's tail, bottom-left
  rect(g, x - 2, y + h - 3, 3, 3, P.tgBubble);
  drawText(g, sender, x + 7, y + 5, P.tgName);
  lines.forEach((l, i) =>
    drawText(g, l.text, x + 7, y + 16 + i * LINE_H, l.color ?? P.paper),
  );
  drawText(g, "12:00", x + w - 6, y + h - 9, withAlpha(P.tgName, 0.6), {
    align: "right",
  });
  const out: Box[] = [];
  if (!buttons.length) return out;
  const gap = 3;
  const bw = Math.floor((w - gap * (buttons.length - 1)) / buttons.length);
  buttons.forEach((b, i) => {
    const bx = x + 1 + i * (bw + gap);
    const by = y + h + 3;
    rect(g, bx + 1, by, bw - 2, 14, withAlpha(P.tgButton, 0.92));
    rect(g, bx, by + 1, bw, 12, withAlpha(P.tgButton, 0.92));
    drawText(g, b, bx + bw / 2, by + 4, P.white, { align: "center" });
    out.push({ x: bx, y: by, w: bw, h: 14 });
  });
  return out;
}

/** The way out, top-right, on every screen; returns its hit rectangle. */
export function exitChip(g: Ctx): Box {
  const r = { x: W - 34, y: 3, w: 31, h: 13 };
  rect(g, r.x + 1, r.y, r.w - 2, r.h, withAlpha(P.ink, 0.75));
  rect(g, r.x, r.y + 1, r.w, r.h - 2, withAlpha(P.ink, 0.75));
  rect(g, r.x + 1, r.y, r.w - 2, 1, withAlpha(P.paper, 0.35));
  drawText(g, "EXIT", r.x + r.w / 2, r.y + 3, withAlpha(P.paper, 0.85), {
    align: "center",
  });
  // a generous target for thumbs
  return { x: r.x - 6, y: 0, w: r.w + 9, h: r.h + 7 };
}
