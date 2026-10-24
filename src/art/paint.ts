// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Brushes: small procedural shapes the sceneries are built from, drawn as
// anti-aliased vector paths in logical units so they stay smooth at the
// screen's native resolution.

import { irand, noise1d, type Rng } from "../engine/rng";

export type Ctx = CanvasRenderingContext2D;

export function px(g: Ctx, x: number, y: number, color: string): void {
  g.fillStyle = color;
  g.fillRect(x, y, 1, 1);
}

export function rect(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

/** Vertical gradient, top to bottom (`steps` is kept for old callers). */
export function bands(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  top: string,
  bottom: string,
  _steps = 8,
): void {
  const grad = g.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(x, y, w, h);
}

export function hex(c: string): [number, number, number] {
  if (c.startsWith("rgb")) {
    const m = c.match(/[\d.]+/g) ?? [];
    return [Number(m[0] ?? 0), Number(m[1] ?? 0), Number(m[2] ?? 0)];
  }
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(
  a: [number, number, number],
  b: [number, number, number],
  f: number,
): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const gg = Math.round(a[1] + (b[1] - a[1]) * f);
  const bb = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r},${gg},${bb})`;
}

export function shade(c: string, f: number): string {
  const [r, g, b] = hex(c);
  const k = f < 0 ? 0 : 255;
  const t = Math.abs(f);
  return `rgb(${Math.round(r + (k - r) * t)},${Math.round(g + (k - g) * t)},${Math.round(b + (k - b) * t)})`;
}

export function withAlpha(c: string, a: number): string {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}

// Shapes keep the footprint the old pixel brushes had: a disc of radius r
// at (cx, cy) covered the pixels cx-r..cx+r, so it is drawn centred on the
// middle of that pixel with half a unit more radius.

/** Filled disc. */
export function disc(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  color: string | CanvasGradient,
): void {
  if (r <= 0) return;
  g.fillStyle = color;
  g.beginPath();
  g.arc(cx + 0.5, cy + 0.5, r + 0.5, 0, Math.PI * 2);
  g.fill();
}

/** Filled ellipse. */
export function ellipse(
  g: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
): void {
  if (rx <= 0 || ry <= 0) return;
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(cx + 0.5, cy + 0.5, rx + 0.5, ry + 0.5, 0, 0, Math.PI * 2);
  g.fill();
}

/** Ring, one unit wide. */
export function ring(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  color: string,
  width = 1,
): void {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.arc(cx + 0.5, cy + 0.5, Math.max(0.5, r), 0, Math.PI * 2);
  g.stroke();
}

/** Line, one unit wide, round ends. */
export function line(
  g: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width = 1,
): void {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(x0 + 0.5, y0 + 0.5);
  g.lineTo(x1 + 0.5, y1 + 0.5);
  g.stroke();
}

/** Soft radial glow: `color` at the centre fading out by radius r. */
export function glow(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha = 0.5,
): void {
  if (r <= 0 || alpha <= 0) return;
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, withAlpha(color, alpha));
  grad.addColorStop(0.4, withAlpha(color, alpha * 0.45));
  grad.addColorStop(1, withAlpha(color, 0));
  g.fillStyle = grad;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
}

/** Triangle (isoceles, apex up) — pines, pyramids, hut roofs. */
export function tri(
  g: Ctx,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  color: string,
): void {
  if (h <= 0) return;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx + 0.5, baseY - h);
  g.lineTo(cx + 0.5 + w / 2, baseY);
  g.lineTo(cx + 0.5 - w / 2, baseY);
  g.closePath();
  g.fill();
}

/** A ridge: fill below a noisy skyline from x=0..w, down to `toY`. */
export function ridge(
  g: Ctx,
  seed: number,
  w: number,
  baseY: number,
  amp: number,
  color: string,
  toY: number,
  detail = 3,
): number[] {
  const n = noise1d(seed, w, detail);
  const ys: number[] = [];
  for (let x = 0; x < w; x++) ys.push(Math.round(baseY - n(x) * amp));
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, toY);
  for (let x = 0; x <= w; x += 0.5) g.lineTo(x, baseY - n(x) * amp);
  g.lineTo(w, toY);
  g.closePath();
  g.fill();
  return ys;
}

/** Pines along a skyline (ys from ridge). */
export function pines(
  g: Ctx,
  r: Rng,
  w: number,
  ys: number[],
  color: string,
  every: number,
  hMin: number,
  hMax: number,
): void {
  for (
    let x = irand(r, 0, every);
    x < w;
    x += irand(r, Math.max(2, every - 3), every + 3)
  ) {
    const h = irand(r, hMin, hMax);
    const base = (ys[x] ?? ys[0] ?? 0) + 2;
    tri(g, x, base, Math.max(3, Math.round(h * 0.6)), h, color);
  }
}

export function roundTree(
  g: Ctx,
  x: number,
  baseY: number,
  r: number,
  canopy: string,
  trunk: string,
  shadeC?: string,
): void {
  rect(g, x - 0.5, baseY - r, 2.5, r + 1, trunk);
  disc(g, x, baseY - r - r * 0.6, r, canopy);
  disc(g, x - r * 0.6, baseY - r - r * 0.2, r * 0.7, canopy);
  disc(g, x + r * 0.6, baseY - r - r * 0.3, r * 0.7, canopy);
  if (shadeC) disc(g, x - r * 0.3, baseY - r - r * 0.9, r * 0.45, shadeC);
}

/** Thatched hut: a cone roof over a short wall. */
export function hut(
  g: Ctx,
  x: number,
  baseY: number,
  w: number,
  h: number,
  wall: string,
  roof: string,
  roofShade: string,
): void {
  rect(g, x - w / 2 + 1, baseY - h * 0.35, w - 2, h * 0.35, wall);
  tri(g, x, baseY - h * 0.3, w + 2, h * 0.7, roof);
  tri(
    g,
    x,
    baseY - h * 0.3,
    Math.round(w * 0.5),
    Math.round(h * 0.5),
    roofShade,
  );
  rect(g, x - 1, baseY - h * 0.25, 2, h * 0.25, roofShade);
}

/** Stepped temple. */
export function ziggurat(
  g: Ctx,
  x: number,
  baseY: number,
  w: number,
  tiers: number,
  color: string,
  shadeC: string,
): void {
  let tw = w;
  let y = baseY;
  const th = Math.max(3, Math.round(w / (tiers * 2.2)));
  for (let i = 0; i < tiers; i++) {
    rect(g, x - tw / 2, y - th, tw, th, color);
    rect(g, x - tw / 2, y - th, Math.round(tw * 0.5), th, shadeC);
    y -= th;
    tw = Math.round(tw * 0.72);
  }
  rect(g, x - 1, baseY - th * tiers - 3, 2, 3, color);
}

/** Tower block with a window grid. */
export function tower(
  g: Ctx,
  r: Rng,
  x: number,
  baseY: number,
  w: number,
  h: number,
  color: string,
  shadeC: string,
  win: string,
  lit = 0.55,
): void {
  rect(g, x, baseY - h, w, h, color);
  rect(
    g,
    x + w - Math.max(1, Math.round(w * 0.25)),
    baseY - h,
    Math.max(1, Math.round(w * 0.25)),
    h,
    shadeC,
  );
  for (let wy = baseY - h + 3; wy < baseY - 2; wy += 4) {
    for (let wx = x + 2; wx < x + w - 2; wx += 3) {
      if (r() < lit) rect(g, wx, wy, 1, 2, win);
    }
  }
}

/** Soft cloud of overlapping discs. */
export function cloud(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  color: string,
): void {
  const r = Math.max(3, Math.round(w / 5));
  disc(g, x, y, r, color);
  disc(g, x + r * 1.4, y - r * 0.4, r * 1.2, color);
  disc(g, x + r * 2.9, y, r, color);
  disc(g, x + r * 1.5, y + r * 0.6, r * 0.9, color);
  disc(g, x + r * 4, y + r * 0.3, r * 0.7, color);
}

/** Geodesic dome: hemisphere with a hex-ish lattice. */
export function dome(
  g: Ctx,
  cx: number,
  baseY: number,
  r: number,
  fill: string,
  lattice: string,
): void {
  const ox = cx + 0.5;
  const oy = baseY + 1;
  g.save();
  g.beginPath();
  g.arc(ox, oy, r + 0.5, Math.PI, 0);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.clip();
  const sheen = g.createRadialGradient(
    ox - r * 0.4,
    oy - r * 0.7,
    0,
    ox,
    oy,
    r * 1.2,
  );
  sheen.addColorStop(0, "rgba(255,255,255,0.35)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sheen;
  g.fillRect(ox - r - 1, oy - r - 1, r * 2 + 2, r + 2);
  g.strokeStyle = lattice;
  g.lineWidth = 0.6;
  g.beginPath();
  for (let y = -r; y <= 0; y += 5) {
    g.moveTo(ox - r - 1, oy + y);
    g.lineTo(ox + r + 1, oy + y);
  }
  for (let a = 0; a <= Math.PI + 1e-6; a += Math.PI / 7) {
    g.moveTo(ox, oy);
    g.lineTo(ox + Math.cos(a) * (r + 1), oy - Math.sin(a) * (r + 1));
  }
  g.stroke();
  g.restore();
}

/** Pointy-top hexagon outline/fill at centre, radius r. */
export function hexagon(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  fill: string | null,
  stroke: string | null,
): void {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    const x = cx + 0.5 + r * Math.cos(a);
    const y = cy + 0.5 + r * Math.sin(a);
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 0.75;
    g.lineJoin = "round";
    g.stroke();
  }
}

/** Filled polygon. */
export function polygon(g: Ctx, pts: [number, number][], color: string): void {
  if (pts.length < 3) return;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0], pts[i]![1]);
  g.closePath();
  g.fill();
}

/** Tiny standing person (for crowds). */
export function figure(
  g: Ctx,
  x: number,
  baseY: number,
  body: string,
  head: string,
): void {
  g.fillStyle = body;
  g.beginPath();
  g.roundRect(x, baseY - 5, 2, 3.2, 0.8);
  g.fill();
  rect(g, x + 0.1, baseY - 2.2, 0.8, 2.2, body);
  rect(g, x + 1.1, baseY - 2.2, 0.8, 2.2, body);
  g.fillStyle = head;
  g.beginPath();
  g.arc(x + 1, baseY - 6.1, 1.1, 0, Math.PI * 2);
  g.fill();
}

/** Flame: flickers with t. */
export function flame(
  g: Ctx,
  x: number,
  baseY: number,
  w: number,
  h: number,
  t: number,
  seed: number,
): void {
  const f =
    0.75 + 0.25 * Math.sin(t * 13 + seed) * Math.cos(t * 7.3 + seed * 2);
  const fh = h * f;
  const sway = Math.sin(t * 9 + seed) * w * 0.15;
  glow(g, x + 0.5, baseY - fh * 0.4, Math.max(w, h) * 1.6, "#ff9a3a", 0.35);
  const tongue = (hw: number, th: number, color: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x + 0.5 - hw, baseY);
    g.quadraticCurveTo(
      x + 0.5 - hw * 1.1,
      baseY - th * 0.45,
      x + 0.5 + sway,
      baseY - th,
    );
    g.quadraticCurveTo(
      x + 0.5 + hw * 1.1,
      baseY - th * 0.45,
      x + 0.5 + hw,
      baseY,
    );
    g.closePath();
    g.fill();
  };
  tongue(w / 2, fh, "#ff7a2a");
  tongue(w * 0.3, fh * 0.62, "#ffd36a");
  tongue(w * 0.12, fh * 0.3, "#fff4d0");
}
