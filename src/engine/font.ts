// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Text is set in JetBrains Mono, one letter per 6-unit cell (the advance
// the layout was built on), so every measure, wrap and hit box
// stays as it was while the letters render as sharp vector type. The 5×7
// glyph table below stays as the list of characters the story may use (the
// tests hold the script to it) and as the fallback shape for the few marks
// (▶ ● ◆ …) drawn as vectors so they sit exactly in the cell. Dialogue is set
// in capitals like the film; the terminal scene uses the lower case.

export const GLYPH_W = 5;
export const GLYPH_H = 7;
/** Advance per character (glyph + 1px gap). */
export const ADVANCE = 6;
export const LINE_H = 9;

type Rows = readonly [string, string, string, string, string, string, string];

const G: Record<string, Rows> = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["....#", "....#", "....#", "....#", "#...#", "#...#", ".###."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", ".#.#.", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####."],
  c: [".....", ".....", ".####", "#....", "#....", "#....", ".####"],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".####"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".####"],
  f: ["..##.", ".#..#", ".#...", "###..", ".#...", ".#...", ".#..."],
  g: [".....", ".####", "#...#", "#...#", ".####", "....#", ".###."],
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
  i: ["..#..", ".....", ".##..", "..#..", "..#..", "..#..", ".###."],
  j: ["...#.", ".....", "..##.", "...#.", "...#.", "#..#.", ".##.."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#...#", "#...#"],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#"],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
  p: [".....", "####.", "#...#", "#...#", "####.", "#....", "#...."],
  q: [".....", ".####", "#...#", "#...#", ".####", "....#", "....#"],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
  t: [".#...", ".#...", "###..", ".#...", ".#...", ".#..#", "..##."],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#..##", ".##.#"],
  v: [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: [".....", ".....", "#...#", "#...#", "#.#.#", "#.#.#", ".#.#."],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: [".....", "#...#", "#...#", "#...#", ".####", "....#", ".###."],
  z: [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  "'": [".##..", ".##..", "..#..", ".....", ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  "?": [".###.", "#...#", "....#", "..##.", "..#..", ".....", "..#.."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "~": [".....", ".....", ".#..#", "#.#.#", "#..#.", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  ">": ["#....", ".#...", "..#..", "...#.", "..#..", ".#...", "#...."],
  "<": ["....#", "...#.", "..#..", ".#...", "..#..", "...#.", "....#"],
  _: [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "@": [".###.", "#...#", "#.###", "#.#.#", "#.###", "#....", ".###."],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
  "%": ["##..#", "##.#.", "..#..", "..#..", "..#..", ".#.##", "#..##"],
  "*": [".....", "#.#.#", ".###.", "#####", ".###.", "#.#.#", "....."],
  "→": [".....", "..#..", "...#.", "#####", "...#.", "..#..", "....."],
  "←": [".....", "..#..", ".#...", "#####", ".#...", "..#..", "....."],
  "↑": ["..#..", ".###.", "#.#.#", "..#..", "..#..", "..#..", "..#.."],
  "↓": ["..#..", "..#..", "..#..", "..#..", "#.#.#", ".###.", "..#.."],
  "▶": ["#....", "##...", "###..", "####.", "###..", "##...", "#...."],
  "◀": ["....#", "...##", "..###", ".####", "..###", "...##", "....#"],
  "●": [".....", ".###.", "#####", "#####", "#####", ".###.", "....."],
  "○": [".....", ".###.", "#...#", "#...#", "#...#", ".###.", "....."],
  "◆": ["..#..", ".###.", "#####", "#####", ".###.", "..#..", "....."],
  "▮": [".....", ".###.", ".###.", ".###.", ".###.", ".###.", "....."],
  È: [".#...", "#####", "#....", "####.", "#....", "#....", "#####"],
  É: ["...#.", "#####", "#....", "####.", "#....", "#....", "#####"],
  é: ["...#.", "..#..", ".###.", "#...#", "#####", "#....", ".####"],
  è: [".#...", "..#..", ".###.", "#...#", "#####", "#....", ".####"],
  à: [".#...", "..#..", ".###.", "....#", ".####", "#...#", ".####"],
  ù: [".#...", "..#..", "#...#", "#...#", "#...#", "#..##", ".##.#"],
  ò: [".#...", "..#..", ".###.", "#...#", "#...#", "#...#", ".###."],
  ì: [".#...", "..#..", ".##..", "..#..", "..#..", "..#..", ".###."],
};

export const GLYPHS: Readonly<Record<string, Rows>> = G;

export function hasGlyph(ch: string): boolean {
  return ch in G;
}

/** Characters without a glyph fall back to a hollow box, never a crash. */
const FALLBACK: Rows = [
  "#####",
  "#...#",
  "#...#",
  "#...#",
  "#...#",
  "#...#",
  "#####",
];

export function glyphRows(ch: string): Rows {
  return G[ch] ?? FALLBACK;
}

/** Pixel width of a string. */
export function measure(text: string): number {
  return text.length === 0 ? 0 : text.length * ADVANCE - 1;
}

/** Greedy word wrap to `maxWidth` pixels. Keeps explicit newlines. */
export function wrap(text: string, maxWidth: number): string[] {
  const maxChars = Math.max(1, Math.floor((maxWidth + 1) / ADVANCE));
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(" ");
    let line = "";
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (candidate.length <= maxChars) {
        line = candidate;
      } else {
        if (line) out.push(line);
        // A single word longer than the line is hard-cut.
        let rest = w;
        while (rest.length > maxChars) {
          out.push(rest.slice(0, maxChars));
          rest = rest.slice(maxChars);
        }
        line = rest;
      }
    }
    out.push(line);
  }
  return out;
}

/**
 * Wrap with a shorter first line (the dialogue box starts the text after the
 * speaker's name). Returns lines; the first fits `firstWidth` pixels.
 */
export function wrapIndent(
  text: string,
  maxWidth: number,
  firstWidth: number,
): string[] {
  const firstChars = Math.max(1, Math.floor((firstWidth + 1) / ADVANCE));
  const restChars = Math.max(1, Math.floor((maxWidth + 1) / ADVANCE));
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(" ")) {
      const cap = out.length === 0 ? firstChars : restChars;
      const candidate = line ? `${line} ${w}` : w;
      if (candidate.length <= cap) {
        line = candidate;
      } else {
        if (line) out.push(line);
        let rest = w;
        const cap2 = restChars;
        while (rest.length > cap2) {
          out.push(rest.slice(0, cap2));
          rest = rest.slice(cap2);
        }
        line = rest;
      }
    }
    out.push(line);
  }
  return out;
}

// Translucent colours (the pulsing hints, fading "+1"s) are split into
// colour + alpha and drawn through globalAlpha.
export function splitAlpha(color: string): [base: string, alpha: number] {
  const m = /^rgba\(\s*([^,]+),([^,]+),([^,]+),([^)]+)\)$/.exec(color);
  if (!m) return [color, 1];
  const a = Number(m[4]);
  return [
    `rgb(${m[1]!.trim()},${m[2]!.trim()},${m[3]!.trim()})`,
    Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1,
  ];
}

export const FONT_FAMILY =
  '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
const FONT = `700 9.4px ${FONT_FAMILY}`;
/** Baseline below the top of the 7-unit cap cell. */
const BASELINE = 7;

/** Marks drawn as shapes so they fill the cell like the bitmap ones did. */
function drawMark(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
): boolean {
  const cx = x + 2.5;
  const cy = y + 3.5;
  ctx.beginPath();
  switch (ch) {
    case "▶":
      ctx.moveTo(x + 0.2, y + 0.2);
      ctx.lineTo(x + 4.6, cy);
      ctx.lineTo(x + 0.2, y + 6.8);
      break;
    case "◀":
      ctx.moveTo(x + 4.8, y + 0.2);
      ctx.lineTo(x + 0.4, cy);
      ctx.lineTo(x + 4.8, y + 6.8);
      break;
    case "●":
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      break;
    case "○":
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.arc(cx, cy, 1.6, 0, Math.PI * 2, true);
      break;
    case "◆":
      ctx.moveTo(cx, y + 0.2);
      ctx.lineTo(x + 5, y + 3);
      ctx.lineTo(cx, y + 5.8);
      ctx.lineTo(x, y + 3);
      break;
    case "▮":
      ctx.roundRect(x + 1, y + 1, 3, 5, 0.6);
      break;
    default:
      return false;
  }
  ctx.closePath();
  ctx.fill();
  return true;
}

export type TextOpts = {
  /** Draw a 1px shadow one pixel down-right. */
  shadow?: string;
  /** Horizontal alignment relative to x. */
  align?: "left" | "center" | "right";
  /** Only draw the first `limit` characters (typewriter). */
  limit?: number;
};

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  opts: TextOpts = {},
): number {
  const n =
    opts.limit === undefined ? text.length : Math.min(text.length, opts.limit);
  let sx = x;
  if (opts.align === "center") sx = Math.round(x - measure(text) / 2);
  else if (opts.align === "right") sx = x - measure(text);
  const [base, alpha] = splitAlpha(color);
  const [shadowBase, shadowAlpha] = opts.shadow
    ? splitAlpha(opts.shadow)
    : [null, 1];
  const prev = ctx.globalAlpha;
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const pass = (fill: string, a: number, dx: number, dy: number) => {
    ctx.globalAlpha = prev * a;
    ctx.fillStyle = fill;
    for (let i = 0; i < n; i++) {
      const ch = text[i]!;
      if (ch === " ") continue;
      const gx = sx + i * ADVANCE + dx;
      if (!drawMark(ctx, ch, gx, y + dy))
        ctx.fillText(ch, gx + 2.5, y + dy + BASELINE);
    }
  };
  if (shadowBase) pass(shadowBase, shadowAlpha, 0.7, 0.7);
  pass(base, alpha, 0, 0);
  ctx.globalAlpha = prev;
  return sx + n * ADVANCE;
}

/** Draw wrapped lines; returns the number of lines. */
export function drawParagraph(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  color: string,
  opts: TextOpts = {},
): number {
  const lines = wrap(text, maxWidth);
  let remaining = opts.limit ?? Number.POSITIVE_INFINITY;
  lines.forEach((line, i) => {
    const lim = Math.max(0, Math.min(line.length, remaining));
    drawText(ctx, line, x, y + i * LINE_H, color, { ...opts, limit: lim });
    remaining -= line.length + 1; // the swallowed space counts as a tick
  });
  return lines.length;
}
