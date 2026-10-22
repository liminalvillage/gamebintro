// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Brushes: small procedural shapes the sceneries are built from. Everything
// is axis-aligned rectangles and scan-filled polygons so the result stays
// crisp at 1:1 pixels.

import { irand, noise1d, type Rng } from "../engine/rng";

export type Ctx = CanvasRenderingContext2D;

export function px(g: Ctx, x: number, y: number, color: string): void {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), 1, 1);
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
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Vertical gradient in `steps` flat bands (pixel art, not a smooth ramp). */
export function bands(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  top: string,
  bottom: string,
  steps = 8,
): void {
  const a = hex(top);
  const b = hex(bottom);
  for (let i = 0; i < steps; i++) {
    const f = i / Math.max(1, steps - 1);
    const c = mix(a, b, f);
    const y0 = Math.round(y + (h * i) / steps);
    const y1 = Math.round(y + (h * (i + 1)) / steps);
    rect(g, x, y0, w, y1 - y0, c);
  }
}

export function hex(c: string): [number, number, number] {
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

/** Filled disc. */
export function disc(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  g.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    g.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
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
  g.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const f = Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)));
    const half = Math.floor(rx * f);
    g.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

/** Ring (1px). */
export function ring(
  g: Ctx,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  g.fillStyle = color;
  let x = r;
  let y = 0;
  let err = 1 - r;
  while (x >= y) {
    const pts = [
      [x, y],
      [y, x],
      [-y, x],
      [-x, y],
      [-x, -y],
      [-y, -x],
      [y, -x],
      [x, -y],
    ];
    for (const [dx, dy] of pts)
      g.fillRect(Math.round(cx + dx!), Math.round(cy + dy!), 1, 1);
    y++;
    if (err < 0) err += 2 * y + 1;
    else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
}

/** Line, Bresenham. */
export function line(
  g: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
): void {
  g.fillStyle = color;
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
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
  g.fillStyle = color;
  for (let i = 0; i < h; i++) {
    const f = i / h;
    const half = Math.round((w / 2) * f);
    g.fillRect(
      Math.round(cx - half),
      Math.round(baseY - h + i),
      half * 2 + 1,
      1,
    );
  }
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
  g.fillStyle = color;
  for (let x = 0; x < w; x++) {
    const y = Math.round(baseY - n(x) * amp);
    ys.push(y);
    g.fillRect(x, y, 1, toY - y);
  }
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
  rect(g, x - 1, baseY - r, 3, r + 1, trunk);
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
  g.fillStyle = fill;
  for (let y = -r; y <= 0; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    g.fillRect(cx - half, baseY + y, half * 2 + 1, 1);
  }
  for (let y = -r; y <= 0; y += 5) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    rect(g, cx - half, baseY + y, half * 2 + 1, 1, lattice);
  }
  for (let a = 0; a <= Math.PI; a += Math.PI / 7) {
    line(g, cx, baseY, cx + Math.cos(a) * r, baseY - Math.sin(a) * r, lattice);
  }
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
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  if (fill) polygon(g, pts, fill);
  if (stroke) {
    for (let i = 0; i < 6; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % 6]!;
      line(g, a[0], a[1], b[0], b[1], stroke);
    }
  }
}

/** Scanline-filled polygon. */
export function polygon(g: Ctx, pts: [number, number][], color: string): void {
  g.fillStyle = color;
  const ys = pts.map((p) => p[1]);
  const y0 = Math.ceil(Math.min(...ys));
  const y1 = Math.floor(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xa = Math.round(xs[i]!);
      const xb = Math.round(xs[i + 1]!);
      g.fillRect(xa, y, Math.max(1, xb - xa), 1);
    }
  }
}

/** Tiny standing person (for crowds). */
export function figure(
  g: Ctx,
  x: number,
  baseY: number,
  body: string,
  head: string,
): void {
  rect(g, x, baseY - 5, 2, 3, body);
  rect(g, x, baseY - 2, 1, 2, body);
  rect(g, x + 1, baseY - 2, 1, 2, body);
  rect(g, x, baseY - 7, 2, 2, head);
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
  tri(g, x, baseY, w, Math.round(h * f), "#ff7a2a");
  tri(
    g,
    x + Math.round(Math.sin(t * 9 + seed)),
    baseY,
    Math.round(w * 0.55),
    Math.round(h * f * 0.6),
    "#ffd36a",
  );
}
