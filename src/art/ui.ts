// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Interface furniture: the gold-framed dialogue box with a portrait, the
// three wisdom orbs, the talisman, the parasite, the Octalysis octagon, and
// the three diagram overlays (the class pyramid of Game A, the nested scales
// of Game B, the lunation it keeps time by).

import { H, hiCanvas, W } from "../engine/screen";
import {
  drawParagraph,
  drawText,
  LINE_H,
  measure,
  wrapIndent,
} from "../engine/font";
import { drawSprite } from "../engine/sprite";
import { MOON } from "../story/holons";
import {
  AROUND,
  DRIVES,
  TEMPT_UI,
  TEMPTATIONS,
  temptationOf,
  type DriveId,
  type TemptId,
} from "../story/octalysis";
import { CAST, portrait, type CharacterId } from "./characters";
import { P } from "./palette";
import {
  disc,
  glow,
  hexagon,
  line,
  polygon,
  rect,
  ring,
  shade,
  tri,
  withAlpha,
  type Ctx,
} from "./paint";

export const BOX = { x: 12, y: 152, w: W - 24, h: 58 } as const;

/** Ornamental gold frame: a rounded glass panel, a double gold rule, side diamonds. */
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
    g.fillStyle = fill;
    g.beginPath();
    g.roundRect(x, y, w, h, 3);
    g.fill();
    // a faint sheen down the glass
    const sheen = g.createLinearGradient(0, y, 0, y + h);
    sheen.addColorStop(0, "rgba(255,255,255,0.07)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(0,0,0,0.18)");
    g.fillStyle = sheen;
    g.fill();
  }
  g.lineJoin = "round";
  g.strokeStyle = color;
  g.lineWidth = 1;
  g.beginPath();
  g.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 3);
  g.stroke();
  g.strokeStyle = withAlpha(color, 0.45);
  g.lineWidth = 0.4;
  g.beginPath();
  g.roundRect(x + 2, y + 2, w - 4, h - 4, 2);
  g.stroke();
  // side diamonds
  const my = y + h / 2;
  for (const [dx, sx] of [
    [x + 0.5, -1],
    [x + w - 0.5, 1],
  ] as [number, number][]) {
    polygon(
      g,
      [
        [dx, my - 3],
        [dx + sx * 3, my],
        [dx, my + 3],
        [dx - sx * 0.5, my],
      ],
      color,
    );
    disc(g, dx + sx * 1 - 0.5, my - 0.5, 0.6, P.goldPale);
  }
  // top centre jewel
  const mx = x + w / 2;
  polygon(
    g,
    [
      [mx - 3, y + 0.5],
      [mx, y - 2.5],
      [mx + 3, y + 0.5],
      [mx, y + 2],
    ],
    color,
  );
  glow(g, mx, y - 0.5, 4, P.gold, 0.5);
  disc(g, mx - 0.5, y - 1, 0.8, P.goldPale);
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
  g.save();
  g.beginPath();
  g.roundRect(px, py, 46, 46, 2.5);
  const bd = g.createRadialGradient(px + 23, py + 18, 2, px + 23, py + 23, 34);
  bd.addColorStop(0, shade(c.backdrop, 0.25));
  bd.addColorStop(1, shade(c.backdrop, -0.35));
  g.fillStyle = bd;
  g.fill();
  g.clip();
  const spr = portrait(who);
  // portraits are 22px; drawn 2× for the 46px frame
  g.drawImage(spr.canvas, px + 1, py + 1, 44, 44);
  g.restore();
  g.lineWidth = 1;
  g.strokeStyle = P.goldDeep;
  g.beginPath();
  g.roundRect(px + 0.5, py + 0.5, 45, 45, 2.5);
  g.stroke();
  g.strokeStyle = withAlpha(P.goldPale, 0.6);
  g.lineWidth = 0.4;
  g.beginPath();
  g.roundRect(px + 1.4, py + 1.4, 43.2, 43.2, 2);
  g.stroke();
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
    glow(g, cx + 0.5, y + 4.5, r * 3, color, 0.35 * v);
    ring(g, cx, y + 4, r + 1, withAlpha(color, 0.35), 0.6);
    disc(g, cx, y + 4, r, withAlpha(shade(color, -0.55), 0.5 + 0.4 * v));
    const orb = g.createRadialGradient(
      cx - 0.8,
      y + 2.8,
      0.3,
      cx + 0.5,
      y + 4.5,
      r + 0.5,
    );
    orb.addColorStop(0, withAlpha(shade(color, 0.6), 0.2 + 0.8 * v));
    orb.addColorStop(0.6, withAlpha(color, 0.15 + 0.85 * v));
    orb.addColorStop(1, withAlpha(shade(color, -0.3), 0.1 + 0.7 * v));
    disc(g, cx, y + 4, r, orb);
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
 * drive is woken (0..1). `focus` outlines one wedge; `lit` pulses one;
 * `pulled` reddens the rim of the drives Game A pulled from below.
 */
export function octagon(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  levels: Record<DriveId, number>,
  t: number,
  opts: { focus?: DriveId | null; lit?: DriveId[]; pulled?: DriveId[] } = {},
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
    // pulled from below by Game A: the face goes dark, cracked in red
    if (opts.pulled?.includes(d)) {
      const flick = 0.75 + 0.25 * Math.sin(t * 5 + d);
      polygon(
        g,
        [[cx, cy], at(a - half, r), at(a + half, r)],
        withAlpha(P.ink, 0.7),
      );
      const crack = [0.95, 0.75, 0.55, 0.35].map((k, i) =>
        at(a + (i % 2 ? 0.12 : -0.08), r * k),
      );
      for (let i = 1; i < crack.length; i++)
        line(
          g,
          ...crack[i - 1]!,
          ...crack[i]!,
          withAlpha(P.red, flick),
          Math.max(0.6, r / 30),
        );
      line(
        g,
        ...at(a - half, r),
        ...at(a + half, r),
        withAlpha(P.red, flick),
        Math.max(1, r / 18),
      );
    }
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

/**
 * The talisman woken in the act: the eight-faced octagon with the symbol
 * of wholeness' ring and point at its heart.
 */
export function amulet(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  levels: Record<DriveId, number>,
  t: number,
  opts: { focus?: DriveId | null; lit?: DriveId[]; pulled?: DriveId[] } = {},
): void {
  octagon(g, cx, cy, r, levels, t, opts);
  ring(g, cx, cy, Math.max(2, Math.round(r * 0.3)), withAlpha(P.gold, 0.8));
  const s = 0.5 + 0.5 * Math.sin(t * 3);
  disc(g, cx, cy, 1, withAlpha(P.white, 0.5 + 0.5 * s));
}

/**
 * The drives' names around an octagon, dim while asleep, red where Game A
 * pulled them; returns each
 * label's box so a tap on a name can pick its drive.
 */
export function driveLabels(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  levels: Record<DriveId, number>,
  focus: DriveId | null = null,
  pulled: DriveId[] = [],
): { d: DriveId; box: Box }[] {
  return AROUND.map((d) => {
    const a = driveAngle(d);
    const c = Math.cos(a);
    const x = cx + c * (r + 8);
    const y = cy + Math.sin(a) * (r + 8) - 3;
    const align = Math.abs(c) < 0.3 ? "center" : c > 0 ? "left" : "right";
    const w = measure(DRIVES[d].short);
    const color =
      focus === d
        ? P.white
        : pulled.includes(d)
          ? P.red
          : withAlpha(driveColor(d), levels[d] > 0 ? 1 : 0.4);
    drawText(g, DRIVES[d].short, x, y, color, { align, shadow: P.ink });
    const x0 = align === "center" ? x - w / 2 : align === "left" ? x : x - w;
    return { d, box: { x: x0 - 3, y: y - 3, w: w + 6, h: 13 } };
  });
}

/** The drive whose wedge holds point `p`, if it is on the octagon. */
export function driveAt(
  cx: number,
  cy: number,
  r: number,
  p: { x: number; y: number },
): DriveId | null {
  if (Math.hypot(p.x - cx, p.y - cy) > r + 4) return null;
  const a = Math.atan2(p.y - cy, p.x - cx) + Math.PI / 2;
  const i = Math.round(a / (Math.PI / 4));
  return AROUND[((i % 8) + 8) % 8]!;
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
  glow(g, cx + 0.5, cy + 0.5, r * 1.8, color, 0.25);
  hexagon(g, cx, cy, r, null, color);
  ring(g, cx, cy, Math.max(2, Math.round(r * 0.6)), color);
  const s = 0.5 + 0.5 * Math.sin(t * 3);
  disc(g, cx, cy, 1, withAlpha(P.white, 0.5 + 0.5 * s));
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    disc(
      g,
      cx + Math.cos(a) * r - 0.5,
      cy + Math.sin(a) * r - 0.5,
      0.7,
      P.white,
    );
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
  glow(g, cx + 0.5, cy + 0.5, r * 2.2 + 8, P.cyanDeep, 0.35 * k + 0.1);
  glow(g, cx + 0.5, cy + 0.5, r * 0.9, P.magenta, 0.5);
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
      line(g, x, y, nx, ny, withAlpha(P.cyan, 0.35), 1.6);
      line(g, x, y, nx, ny, withAlpha(P.white, 0.9), 0.5);
      x = nx;
      y = ny;
    }
  }
  // eye-shaped field lines (the lens the film draws it in)
  for (let i = 1; i <= 2; i++) {
    const ex = r + 10 * i;
    const ey = Math.round(r * 0.55 * i);
    g.strokeStyle = withAlpha(P.cyan, 0.25 * k);
    g.lineWidth = 0.6;
    g.setLineDash([1.5, 2]);
    g.beginPath();
    g.ellipse(cx + 0.5, cy + 0.5, ex, ey, 0, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
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

/** A moon `phase` of the way through its cycle: lit from the right waxing, the left waning. */
export function moonFace(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  phase: number,
  lit: string,
): void {
  disc(g, cx, cy, r, withAlpha(P.nightLow, 0.9));
  // lit limb on one side, the terminator an ellipse across the face
  const c = Math.cos(2 * Math.PI * phase);
  const ox = cx + 0.5;
  const oy = cy + 0.5;
  const R = r + 0.5;
  g.save();
  g.translate(ox, oy);
  if (phase >= 0.5) g.scale(-1, 1);
  g.fillStyle = lit;
  g.beginPath();
  g.arc(0, 0, R, -Math.PI / 2, Math.PI / 2);
  if (c >= 0)
    g.ellipse(
      0,
      0,
      Math.max(0.01, R * c),
      R,
      0,
      Math.PI / 2,
      -Math.PI / 2,
      true,
    );
  else
    g.ellipse(
      0,
      0,
      Math.max(0.01, -R * c),
      R,
      0,
      Math.PI / 2,
      (Math.PI * 3) / 2,
    );
  g.closePath();
  g.fill();
  g.restore();
}

/**
 * One lunation as a ring of eight moons, new at the top, turning clockwise;
 * tonight's band ringed in gold, the cycle's number and day in the middle,
 * and what the tribe does at each quarter beside it.
 */
export function moonDiagram(
  g: Ctx,
  f: number,
  t: number,
  now: { index: number; day: number; days: number; band: number },
): void {
  rect(g, 0, 0, W, H, withAlpha(P.nightTop, 0.75 * Math.min(1, f * 2)));
  const cx = W / 2;
  const cy = 74;
  const R = 46;
  const n = Math.min(8, Math.floor(f * 8 + 0.001));
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const x = Math.round(cx + Math.cos(a) * R);
    const y = Math.round(cy + Math.sin(a) * R);
    const here = i === now.band && f >= 1;
    if (here) ring(g, x, y, 10 + Math.round(Math.sin(t * 3) * 0.6), P.gold);
    moonFace(g, x, y, 7, i / 8, here ? P.goldPale : withAlpha(P.stone, 0.85));
    if (i % 2) continue;
    const label = MOON.quarters[i / 2]!;
    const col = here ? P.gold : P.paper;
    if (i === 0)
      drawText(g, label, x, y - 20, col, { align: "center", shadow: P.ink });
    else if (i === 4)
      drawText(g, label, x, y + 12, col, { align: "center", shadow: P.ink });
    else
      drawText(
        g,
        label,
        i === 2 ? x + 14 : x - 14 - measure(label),
        y - 3,
        col,
        { shadow: P.ink },
      );
  }
  if (f < 1) return;
  drawText(g, `${MOON.lunation} ${now.index}`, cx, cy - 8, P.gold, {
    align: "center",
    shadow: P.ink,
  });
  drawText(
    g,
    `${MOON.day} ${now.day} ${MOON.of} ${now.days}`,
    cx,
    cy + 2,
    P.paper,
    {
      align: "center",
      shadow: P.ink,
    },
  );
  drawText(g, MOON.phases[now.band]!, cx, cy + R + 22, P.goldPale, {
    align: "center",
    shadow: P.ink,
  });
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
    // copy the band sideways in device pixels
    const k = g.getTransform().a;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(g.canvas, 0, y * k, W * k, h * k, dx * k, y * k, W * k, h * k);
    g.restore();
    rect(g, 0, y, W, 1, withAlpha(i % 2 ? P.cyan : P.magenta, 0.25 * strength));
  }
}

type TitleArt = {
  /** Halo, extruded shadow and lit letters, baked once. */
  art: HTMLCanvasElement;
  /** The letter shapes alone, to mask the sheen. */
  mask: HTMLCanvasElement;
  /** Scratch canvas the sheen is composited in each frame. */
  sheen: { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D };
};
const titleCache = new Map<string, TitleArt>();
const PAD = 8;

function titleArt(text: string, color: string, scale: number): TitleArt {
  const key = `${text}\u0000${color}`;
  let t = titleCache.get(key);
  if (t) return t;
  const w = measure(text) * scale + PAD * 2;
  const h = 8 * scale + PAD * 2;
  const letters = (g: Ctx, fill: string, dx: number, dy: number) => {
    g.save();
    g.translate(PAD + dx, PAD + dy);
    g.scale(scale, scale);
    drawText(g, text, 0, 0, fill);
    g.restore();
  };
  const art = hiCanvas(w, h);
  // a warm halo, a deep extruded shadow, then the lit letters
  art.g.save();
  art.g.shadowColor = withAlpha(color, 0.45);
  art.g.shadowBlur = 6 * art.g.getTransform().a;
  letters(art.g, shade(color, -0.45), scale, scale);
  art.g.restore();
  letters(art.g, shade(color, -0.25), scale * 0.5, scale * 0.5);
  letters(art.g, color, 0, 0);
  const mask = hiCanvas(w, h);
  letters(mask.g, P.white, 0, 0);
  t = { art: art.canvas, mask: mask.canvas, sheen: hiCanvas(w, h) };
  titleCache.set(key, t);
  return t;
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
  const a = titleArt(text, color, scale);
  const bw = w + PAD * 2;
  const bh = 8 * scale + PAD * 2;
  g.drawImage(a.art, x0 - PAD, y - PAD, bw, bh);
  // the sheen sweeps across inside the letter shapes only
  const { canvas, g: sg } = a.sheen;
  sg.save();
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.globalCompositeOperation = "source-over";
  sg.clearRect(0, 0, canvas.width, canvas.height);
  sg.drawImage(a.mask, 0, 0);
  sg.globalCompositeOperation = "source-in";
  const k = canvas.width / bw;
  const sx = (((t * 60) % (w + 40)) - 20 + PAD) * k;
  const grad = sg.createLinearGradient(sx - 10 * k, 0, sx + 10 * k, 0);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.7)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  sg.fillStyle = grad;
  sg.fillRect(0, 0, canvas.width, canvas.height);
  sg.restore();
  g.drawImage(canvas, x0 - PAD, y - PAD, bw, bh);
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

/**
 * What the player answered when Game A whispered through drive `d`, under
 * the drive's text in the amulet's panel and on the finale's octagon.
 */
export function drawAnswer(
  g: Ctx,
  tempted: Partial<Record<TemptId, "a" | "b">>,
  d: DriveId,
  x: number,
  y: number,
  w: number,
): void {
  const id = temptationOf(d);
  const ans = id ? tempted[id] : undefined;
  if (!id || !ans) return;
  const tp = TEMPTATIONS[id];
  const took = ans === "a";
  drawText(
    g,
    took ? TEMPT_UI.took : TEMPT_UI.refused,
    x,
    y,
    took ? P.red : P.gold,
  );
  drawParagraph(g, took ? tp.take : tp.refuse, x, y + LINE_H + 2, w, P.paper, {
    shadow: P.ink,
  });
}
