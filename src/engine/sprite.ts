// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Sprites are ASCII pixel maps: one character per pixel, a key mapping each
// character to a colour, '.' for transparent. They are rasterised once into
// a high-resolution offscreen canvas and blitted from there.
//
// The rasteriser does not blow the pixels up into squares. Each source pixel
// spreads its colour as a small gaussian; every output sample takes the
// colour with the strongest pull and blends into the runner-up across the
// boundary. Staircases become curves, single-pixel details (eyes, buttons)
// survive as dots, and the silhouette is anti-aliased, so the same hand-made
// maps read as smooth illustration at any size.

import { RES } from "./screen";

export type Sprite = {
  w: number;
  h: number;
  canvas: HTMLCanvasElement;
  /** Mirrored copy, built lazily. */
  flipped?: HTMLCanvasElement;
};

export type PixelMap = {
  rows: readonly string[];
  key: Readonly<Record<string, string>>;
};

let probe: CanvasRenderingContext2D | null = null;

/** Any CSS colour → [r, g, b, a] (0..255). */
function rgba(color: string): [number, number, number, number] {
  probe ??= (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    return c.getContext("2d", { willReadFrequently: true })!;
  })();
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0]!, d[1]!, d[2]!, d[3]!];
}

const SIGMA = 0.62;
const REACH = 2;

/**
 * Rasterise a pixel map at `scale` device pixels per map pixel (defaults to
 * enough for portraits shown at three times their size).
 */
export function rasterise(map: PixelMap, scale = RES * 3): Sprite {
  const h = map.rows.length;
  const w = Math.max(...map.rows.map((r) => r.length));
  // palette: index 0 is transparent
  const colors: [number, number, number, number][] = [[0, 0, 0, 0]];
  const slot = new Map<string, number>();
  const idx = new Int16Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = map.rows[y]!;
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? ".";
      const color = ch === "." ? undefined : map.key[ch];
      if (!color) continue;
      let k = slot.get(color);
      if (k === undefined) {
        k = colors.length;
        colors.push(rgba(color));
        slot.set(color, k);
      }
      idx[y * w + x] = k;
    }
  }
  const S = Math.max(1, Math.round(scale));
  const OW = w * S;
  const OH = h * S;
  const canvas = document.createElement("canvas");
  canvas.width = OW;
  canvas.height = OH;
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(OW, OH);
  const out = img.data;
  const score = new Float32Array(colors.length);
  const inv = 1 / (2 * SIGMA * SIGMA);
  for (let oy = 0; oy < OH; oy++) {
    const v = (oy + 0.5) / S;
    const py = Math.floor(v);
    for (let ox = 0; ox < OW; ox++) {
      const u = (ox + 0.5) / S;
      const px = Math.floor(u);
      score.fill(0);
      for (let y = py - REACH; y <= py + REACH; y++) {
        const dy = y + 0.5 - v;
        for (let x = px - REACH; x <= px + REACH; x++) {
          const dx = x + 0.5 - u;
          const k = x < 0 || y < 0 || x >= w || y >= h ? 0 : idx[y * w + x]!;
          score[k]! += Math.exp(-(dx * dx + dy * dy) * inv);
        }
      }
      let a = 0;
      let b = 0;
      for (let k = 1; k < score.length; k++) {
        if (score[k]! > score[a]!) {
          b = a;
          a = k;
        } else if (k !== a && score[k]! > score[b]!) b = k;
      }
      if (b === a) b = a === 0 ? 1 : 0;
      const sa = score[a]!;
      const sb = score[b] ?? 0;
      const f = Math.min(1, 0.5 + ((sa - sb) / (sa + sb + 1e-6)) * 4);
      const ca = colors[a]!;
      const cb = colors[b] ?? ca;
      const aa = (ca[3] / 255) * f;
      const ab = (cb[3] / 255) * (1 - f);
      const al = aa + ab;
      const o = (oy * OW + ox) * 4;
      if (al <= 0) continue;
      out[o] = (ca[0] * aa + cb[0] * ab) / al;
      out[o + 1] = (ca[1] * aa + cb[1] * ab) / al;
      out[o + 2] = (ca[2] * aa + cb[2] * ab) / al;
      out[o + 3] = al * 255;
    }
  }
  g.putImageData(img, 0, 0);
  return { w, h, canvas };
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  s: Sprite,
  x: number,
  y: number,
  flip = false,
): void {
  // hard pixel edges: the cast is pixel art
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  if (!flip) {
    ctx.drawImage(s.canvas, x, y, s.w, s.h);
    ctx.imageSmoothingEnabled = smooth;
    return;
  }
  if (!s.flipped) {
    const c = document.createElement("canvas");
    c.width = s.canvas.width;
    c.height = s.canvas.height;
    const g = c.getContext("2d")!;
    g.translate(c.width, 0);
    g.scale(-1, 1);
    g.drawImage(s.canvas, 0, 0);
    s.flipped = c;
  }
  ctx.drawImage(s.flipped, x, y, s.w, s.h);
  ctx.imageSmoothingEnabled = smooth;
}

/**
 * A walking frame: rows from `legStart` down get sheared outward — the
 * left half of the leg area steps back, the right half forward — which
 * reads as a stride without drawing a second body.
 */
export function strideRows(
  rows: readonly string[],
  legStart: number,
  split: number,
  amount = 2,
): string[] {
  const h = rows.length;
  const len = Math.max(1, h - legStart);
  return rows.map((row, y) => {
    if (y < legStart) return row;
    const d = Math.round(((y - legStart) / len) * amount);
    if (d === 0) return row;
    const left = row.slice(0, split);
    const right = row.slice(split);
    const l = left.slice(d) + ".".repeat(d); // shift left part left
    const r = ".".repeat(d) + right.slice(0, Math.max(0, right.length - d)); // shift right part right
    return l + r;
  });
}

/** Expand a pixel map `n`× (nearest neighbour) — for big portraits. */
export function scaleRows(rows: readonly string[], n: number): string[] {
  const out: string[] = [];
  for (const row of rows) {
    const big = row
      .split("")
      .map((c) => c.repeat(n))
      .join("");
    for (let i = 0; i < n; i++) out.push(big);
  }
  return out;
}
