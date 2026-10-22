// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Sprites are ASCII pixel maps: one character per pixel, a key mapping each
// character to a colour, '.' for transparent. They are rasterised once into
// an offscreen canvas and blitted from there.

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

export function rasterise(map: PixelMap): Sprite {
  const h = map.rows.length;
  const w = Math.max(...map.rows.map((r) => r.length));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d")!;
  for (let y = 0; y < h; y++) {
    const row = map.rows[y]!;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === ".") continue;
      const color = map.key[ch];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(x, y, 1, 1);
    }
  }
  return { w, h, canvas };
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  s: Sprite,
  x: number,
  y: number,
  flip = false,
): void {
  if (!flip) {
    ctx.drawImage(s.canvas, Math.round(x), Math.round(y));
    return;
  }
  if (!s.flipped) {
    const c = document.createElement("canvas");
    c.width = s.w;
    c.height = s.h;
    const g = c.getContext("2d")!;
    g.translate(s.w, 0);
    g.scale(-1, 1);
    g.drawImage(s.canvas, 0, 0);
    s.flipped = c;
  }
  ctx.drawImage(s.flipped, Math.round(x), Math.round(y));
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
