// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Seeded randomness so every background paints the same way on every device
// (the art is generated, not stored — a seed IS the asset).

export type Rng = () => number;

/** mulberry32 — small, fast, good enough for scenery. */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [lo, hi]. */
export function irand(r: Rng, lo: number, hi: number): number {
  return lo + Math.floor(r() * (hi - lo + 1));
}

/** Smooth 1-D value noise in [0,1], periodic over `period` samples. */
export function noise1d(
  seed: number,
  period: number,
  octaves = 3,
): (x: number) => number {
  const r = rng(seed);
  const tables: number[][] = [];
  for (let o = 0; o < octaves; o++) {
    const n = Math.max(2, Math.round(period / Math.pow(2, 4 - o)));
    const t: number[] = [];
    for (let i = 0; i < n; i++) t.push(r());
    tables.push(t);
  }
  return (x: number) => {
    let v = 0;
    let amp = 1;
    let sum = 0;
    for (let o = 0; o < octaves; o++) {
      const t = tables[o]!;
      const n = t.length;
      const p = ((((x / period) * n) % n) + n) % n;
      const i = Math.floor(p);
      const f = p - i;
      const s = f * f * (3 - 2 * f);
      const a = t[i]!;
      const b = t[(i + 1) % n]!;
      v += (a + (b - a) * s) * amp;
      sum += amp;
      amp *= 0.5;
    }
    return v / sum;
  };
}

/** Smooth 2-D value noise in [0,1] on an integer lattice of `size` cells. */
export function noise2d(
  seed: number,
  size: number,
): (x: number, y: number) => number {
  const r = rng(seed);
  const t = new Float32Array(size * size);
  for (let i = 0; i < t.length; i++) t[i] = r();
  const at = (x: number, y: number) =>
    t[(((y % size) + size) % size) * size + (((x % size) + size) % size)]!;
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  };
}
