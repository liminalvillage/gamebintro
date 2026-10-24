// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The cast, as high-resolution pixel art. Each traveller is painted into the
// same box their old pixel map filled (feet on the bottom edge, facing right,
// instruments where the glows in the chapter expect them), with light from
// the upper left, then baked down to a fine pixel grid (see pixelArt below). Portraits are the same painting framed on the head and shoulders;
// only the parasite, who never walks, has a portrait of its own.

import { RES } from "../engine/screen";
import type { Sprite } from "../engine/sprite";
import type { CharacterId } from "./characters";
import { P } from "./palette";
import { shade, withAlpha } from "./paint";

type G = CanvasRenderingContext2D;
type Pt = [number, number];

// ─── brushes ────────────────────────────────────────────────────────────

/**
 * Gradient stops as hard bands (cel shading, as pixel art shades): each
 * colour holds until halfway to the next, then switches.
 */
function banded(gr: CanvasGradient, stops: [number, string][]): CanvasGradient {
  stops.forEach(([o, c], i) => {
    const prev = stops[i - 1];
    const next = stops[i + 1];
    const from = prev ? (prev[0] + o) / 2 : 0;
    const to = next ? (o + next[0]) / 2 : 1;
    gr.addColorStop(from, c);
    gr.addColorStop(to, c);
  });
  return gr;
}

function lin(
  g: G,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: [number, string][],
): CanvasGradient {
  return banded(g.createLinearGradient(x0, y0, x1, y1), stops);
}

function rad(
  g: G,
  x: number,
  y: number,
  r: number,
  stops: [number, string][],
): CanvasGradient {
  return banded(g.createRadialGradient(x, y, 0, x, y, r), stops);
}

/** Light-to-dark gradient across a box, lit from the upper left. */
function lit(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  k = 0.22,
): CanvasGradient {
  return lin(g, x, y, x + w, y + h * 0.15, [
    [0, shade(base, k)],
    [0.5, base],
    [1, shade(base, -k)],
  ]);
}

function fill(g: G, style: string | CanvasGradient, path: () => void): void {
  g.beginPath();
  path();
  g.fillStyle = style;
  g.fill();
}

function ell(
  g: G,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  style: string | CanvasGradient,
  rot = 0,
): void {
  fill(g, style, () => g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2));
}

function poly(g: G, pts: Pt[], style: string | CanvasGradient): void {
  fill(g, style, () => {
    g.moveTo(pts[0]![0], pts[0]![1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.closePath();
  });
}

/** A closed shape through `pts` with rounded corners (quadratic midpoints). */
function blob(g: G, pts: Pt[], style: string | CanvasGradient): void {
  fill(g, style, () => {
    const n = pts.length;
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = mid(pts[n - 1]!, pts[0]!);
    g.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const m = mid(p, pts[(i + 1) % n]!);
      g.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    g.closePath();
  });
}

/** A tapered capsule from a (width wa) to b (width wb): arms, legs, staffs. */
function limb(
  g: G,
  a: Pt,
  b: Pt,
  wa: number,
  wb: number,
  style: string | CanvasGradient,
): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ang = Math.atan2(dy, dx);
  fill(g, style, () => {
    g.moveTo(a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2);
    g.lineTo(b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2);
    g.arc(b[0], b[1], wb / 2, ang + Math.PI / 2, ang - Math.PI / 2, true);
    g.lineTo(a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2);
    g.arc(a[0], a[1], wa / 2, ang - Math.PI / 2, ang + Math.PI / 2, true);
    g.closePath();
  });
}

function stroke(
  g: G,
  color: string,
  width: number,
  path: () => void,
  cap: CanvasLineCap = "round",
): void {
  g.beginPath();
  path();
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = cap;
  g.lineJoin = "round";
  g.stroke();
}

/** A leg from hip to ankle with a knee between, for standing and striding. */
function leg(
  g: G,
  hip: Pt,
  ankle: Pt,
  w: number,
  style: string | CanvasGradient,
): void {
  const knee: Pt = [
    (hip[0] + ankle[0]) / 2 + (ankle[0] > hip[0] ? 0.4 : -0.2),
    (hip[1] + ankle[1]) / 2,
  ];
  limb(g, hip, knee, w, w * 0.88, style);
  limb(g, knee, ankle, w * 0.88, w * 0.72, style);
}

/** Small almond eye with a highlight, looking right. */
function eye(g: G, x: number, y: number, s = 1, iris = "#1a1018"): void {
  ell(g, x, y, 0.62 * s, 0.42 * s, "#f4ede4");
  ell(g, x + 0.12 * s, y, 0.36 * s, 0.4 * s, iris);
  ell(g, x + 0.24 * s, y - 0.14 * s, 0.11 * s, 0.11 * s, "#ffffff");
  stroke(g, "#1a1018", 0.22 * s, () => {
    g.moveTo(x - 0.65 * s, y - 0.12 * s);
    g.quadraticCurveTo(x, y - 0.62 * s, x + 0.66 * s, y - 0.1 * s);
  });
}

// ─── the pioneer ────────────────────────────────────────────────────────

function pioneer(g: G, stride: number): void {
  const skin = P.skinBrown;
  const skinD = shade(skin, -0.25);
  const pants = "#2b2436";
  // back arm
  limb(g, [3.3, 15.4], [2.6, 21.2], 1.5, 1.2, skinD);
  ell(g, 2.6, 21.6, 0.75, 0.85, skinD);
  // legs (back, then front)
  const sp = stride * 2.2;
  leg(g, [5.4, 23.5], [5.2 - sp, 36.6], 2.1, shade(pants, -0.2));
  leg(g, [7.6, 23.5], [7.8 + sp, 36.6], 2.2, lit(g, 6, 23, 4, 14, pants, 0.15));
  // shoes
  for (const [x, back] of [
    [5.2 - sp, true],
    [7.8 + sp, false],
  ] as [number, boolean][]) {
    blob(
      g,
      [
        [x - 1.1, 36.2],
        [x + 0.6, 36.1],
        [x + 2.2, 38.6],
        [x + 2.0, 39.9],
        [x - 1.2, 39.9],
      ],
      back
        ? shade(P.ink, 0.05)
        : lin(g, x, 36, x, 40, [
            [0, "#3a3346"],
            [1, P.ink],
          ]),
    );
    poly(
      g,
      [
        [x - 1.2, 39.3],
        [x + 2.1, 39.3],
        [x + 2.0, 39.9],
        [x - 1.2, 39.9],
      ],
      "#0b0810",
    );
  }
  // hips
  poly(
    g,
    [
      [4.1, 21.8],
      [9.1, 21.8],
      [9.2, 25.4],
      [6.9, 25.4],
      [6.5, 24.4],
      [6.1, 25.4],
      [4.0, 25.4],
    ],
    pants,
  );
  // torso: the white top, lit from the left
  blob(
    g,
    [
      [3.0, 14.4],
      [6.2, 13.2],
      [9.6, 14.4],
      [9.2, 19.0],
      [8.9, 23.0],
      [4.0, 23.0],
      [3.6, 19.0],
    ],
    lin(g, 3, 0, 10, 0, [
      [0, "#ffffff"],
      [0.55, P.white],
      [1, "#cfc8bc"],
    ]),
  );
  // fold shadow and hem
  stroke(g, withAlpha("#8f877a", 0.55), 0.35, () => {
    g.moveTo(7.6, 16.5);
    g.quadraticCurveTo(8.2, 19.5, 7.8, 22.4);
  });
  // red collar and sleeve trim
  stroke(g, P.red, 0.9, () => {
    g.moveTo(4.4, 13.7);
    g.quadraticCurveTo(6.2, 15.3, 8.1, 13.7);
  });
  // front arm with a short sleeve
  limb(
    g,
    [9.2, 15.3],
    [9.7, 21.0],
    1.6,
    1.25,
    lit(g, 8.5, 15, 2, 7, skin, 0.15),
  );
  ell(g, 9.8, 21.5, 0.8, 0.9, skin);
  blob(
    g,
    [
      [8.4, 14.1],
      [10.1, 14.3],
      [10.5, 17.0],
      [8.6, 17.2],
    ],
    "#f0ebe2",
  );
  stroke(g, P.red, 0.55, () => {
    g.moveTo(8.5, 16.9);
    g.lineTo(10.5, 16.8);
  });
  blob(
    g,
    [
      [3.9, 14.3],
      [2.4, 14.6],
      [2.2, 17.1],
      [3.9, 17.0],
    ],
    "#e6e0d6",
  );
  stroke(g, P.red, 0.55, () => {
    g.moveTo(2.2, 16.9);
    g.lineTo(3.9, 16.9);
  });
  // neck
  limb(g, [6.3, 11.4], [6.2, 13.6], 1.9, 1.8, skinD);
  // head
  const face = lin(g, 4, 4, 9, 9, [
    [0, shade(skin, 0.14)],
    [0.5, skin],
    [1, skin],
  ]);
  blob(
    g,
    [
      [4.0, 6.0],
      [8.6, 4.9],
      [10.0, 7.4],
      [10.4, 9.6],
      [9.6, 11.6],
      [7.4, 12.6],
      [5.0, 11.6],
      [3.8, 9.0],
    ],
    face,
  );
  // nose and lips
  poly(
    g,
    [
      [9.6, 8.4],
      [10.8, 9.9],
      [9.7, 10.2],
    ],
    shade(skin, -0.05),
  );
  ell(g, 10.0, 10.1, 0.35, 0.2, withAlpha(skinD, 0.8));
  stroke(g, "#4a2a20", 0.35, () => {
    g.moveTo(8.6, 11.1);
    g.quadraticCurveTo(9.2, 11.4, 9.7, 11.0);
  });
  ell(g, 8.3, 9.8, 0.9, 0.55, withAlpha("#d9786a", 0.28));
  eye(g, 8.6, 8.4, 0.95);
  stroke(g, "#1a1420", 0.32, () => {
    g.moveTo(7.8, 7.0);
    g.quadraticCurveTo(8.6, 6.6, 9.4, 7.0);
  });
  // ear
  ell(g, 5.0, 9.3, 0.6, 0.85, shade(skin, -0.08));
  stroke(g, withAlpha(skinD, 0.8), 0.2, () =>
    g.arc(5.05, 9.3, 0.35, -1.2, 1.4),
  );
  // hair: swept back to a high bun
  const hair = lin(g, 3, 0, 9, 10, [
    [0, "#3a2f44"],
    [0.5, P.hair],
    [1, "#0d0a12"],
  ]);
  blob(
    g,
    [
      [3.2, 10.8],
      [3.0, 6.0],
      [5.0, 3.8],
      [8.2, 3.9],
      [10.0, 6.4],
      [9.0, 6.6],
      [7.0, 6.0],
      [5.6, 7.0],
      [4.7, 8.4],
      [4.4, 11.2],
    ],
    hair,
  );
  ell(g, 5.6, 2.2, 2.1, 2.0, hair);
  ell(g, 5.8, 4.0, 1.1, 0.6, "#0d0a12");
  stroke(g, withAlpha("#8a7aa0", 0.5), 0.3, () => {
    g.moveTo(4.2, 1.2);
    g.quadraticCurveTo(5.2, 0.3, 6.6, 0.8);
  });
  stroke(g, withAlpha("#8a7aa0", 0.4), 0.3, () => {
    g.moveTo(4.0, 5.6);
    g.quadraticCurveTo(5.6, 4.4, 7.8, 4.7);
  });
}

// ─── the chief ──────────────────────────────────────────────────────────

function chief(g: G, stride: number): void {
  const skin = P.skinDark;
  const skinD = shade(skin, -0.28);
  const pants = "#1c1824";
  const sp = stride * 2.4;
  // legs and boots
  leg(g, [8.6, 30], [8.4 - sp, 41.5], 3.6, shade(pants, -0.1));
  leg(
    g,
    [13.2, 30],
    [13.4 + sp, 41.5],
    3.7,
    lit(g, 11, 30, 5, 12, pants, 0.18),
  );
  for (const [x, back] of [
    [8.4 - sp, true],
    [13.4 + sp, false],
  ] as [number, boolean][]) {
    // calf wraps
    limb(g, [x, 38.2], [x, 40.8], 3.1, 2.9, back ? skinD : skin);
    stroke(g, withAlpha(P.ink, 0.45), 0.3, () => {
      g.moveTo(x - 1.4, 39.0);
      g.lineTo(x + 1.4, 39.4);
      g.moveTo(x - 1.4, 40.2);
      g.lineTo(x + 1.4, 40.6);
    });
    blob(
      g,
      [
        [x - 1.8, 41.0],
        [x + 1.2, 41.0],
        [x + 3.2, 43.4],
        [x + 3.0, 44.9],
        [x - 2.0, 44.9],
      ],
      back
        ? "#100d16"
        : lin(g, x, 41, x, 45, [
            [0, "#3a3346"],
            [1, P.ink],
          ]),
    );
  }
  // trousers
  poly(
    g,
    [
      [6.4, 23.4],
      [15.6, 23.4],
      [16.0, 31.6],
      [11.8, 31.6],
      [11.0, 28.0],
      [10.2, 31.6],
      [6.0, 31.6],
    ],
    lit(g, 6, 24, 10, 8, pants, 0.2),
  );
  // back arm (left) with striped band
  limb(g, [4.2, 15.6], [3.4, 22.6], 3.6, 2.8, skinD);
  ell(g, 3.5, 23.2, 1.5, 1.3, skinD);
  // torso: broad bare chest
  blob(
    g,
    [
      [4.6, 14.6],
      [11.0, 13.6],
      [17.4, 14.6],
      [16.0, 19.0],
      [15.2, 23.6],
      [6.8, 23.6],
      [6.0, 19.0],
    ],
    lin(g, 5, 0, 17, 0, [
      [0, shade(skin, 0.22)],
      [0.5, skin],
      [1, shade(skin, -0.22)],
    ]),
  );
  // muscle shading
  stroke(g, withAlpha(skinD, 0.7), 0.35, () => {
    g.moveTo(8.2, 17.6);
    g.quadraticCurveTo(10.8, 18.8, 11.0, 17.0);
    g.moveTo(11.4, 17.0);
    g.quadraticCurveTo(12.0, 18.8, 14.4, 17.6);
    g.moveTo(11.1, 19.4);
    g.lineTo(11.1, 22.6);
  });
  // gold belt and buckle
  blob(
    g,
    [
      [6.4, 21.8],
      [15.6, 21.8],
      [15.8, 24.0],
      [6.2, 24.0],
    ],
    lin(g, 0, 21.8, 0, 24, [
      [0, P.goldPale],
      [0.5, P.gold],
      [1, P.goldDeep],
    ]),
  );
  blob(
    g,
    [
      [10.0, 21.6],
      [12.2, 21.6],
      [12.4, 24.2],
      [9.8, 24.2],
    ],
    P.goldDeep,
  );
  ell(g, 11.1, 22.9, 0.55, 0.6, P.cyan);
  // the crystal sword, held point up in the near hand
  const blade = lin(g, 19.2, 0, 21.2, 0, [
    [0, "#e9fdff"],
    [0.45, P.cyan],
    [1, P.cyanDeep],
  ]);
  poly(
    g,
    [
      [20.2, 1.4],
      [21.2, 3.4],
      [21.0, 19.6],
      [19.6, 19.6],
      [19.4, 3.4],
    ],
    blade,
  );
  stroke(g, withAlpha("#ffffff", 0.85), 0.25, () => {
    g.moveTo(20.0, 3.4);
    g.lineTo(20.0, 19.2);
  });
  limb(
    g,
    [18.0, 20.2],
    [22.0, 20.2],
    1.0,
    1.0,
    lin(g, 0, 19.6, 0, 20.8, [
      [0, P.goldPale],
      [1, P.goldDeep],
    ]),
  );
  limb(g, [20.3, 20.6], [20.3, 23.8], 1.0, 0.9, P.goldDeep);
  ell(g, 20.3, 24.2, 0.7, 0.7, P.gold);
  // near arm, gripping the hilt
  limb(
    g,
    [17.2, 15.6],
    [19.0, 22.0],
    3.7,
    2.9,
    lit(g, 16, 15, 4, 8, skin, 0.18),
  );
  ell(g, 19.8, 22.4, 1.5, 1.35, skin);
  stroke(g, withAlpha(skinD, 0.8), 0.25, () => {
    g.moveTo(19.0, 21.8);
    g.lineTo(21.0, 21.9);
    g.moveTo(19.0, 22.8);
    g.lineTo(21.0, 22.9);
  });
  // striped red and white shoulder bands
  for (const [cx, near] of [
    [3.8, false],
    [17.3, true],
  ] as [number, boolean][]) {
    g.save();
    g.beginPath();
    g.ellipse(cx, 17.4, 2.7, 3.6, near ? -0.2 : 0.15, 0, Math.PI * 2);
    g.clip();
    for (let i = 0; i < 5; i++)
      poly(
        g,
        [
          [cx - 3, 13.6 + i * 1.6],
          [cx + 3, 13.2 + i * 1.6],
          [cx + 3, 14.0 + i * 1.6],
          [cx - 3, 14.4 + i * 1.6],
        ],
        i % 2 ? P.white : P.red,
      );
    ell(g, cx + 1.2, 18.4, 2.2, 3.6, withAlpha(P.ink, near ? 0.12 : 0.3));
    g.restore();
  }
  // neck
  limb(g, [11.0, 11.8], [11.0, 14.6], 3.6, 3.8, skinD);
  // head
  blob(
    g,
    [
      [6.6, 5.0],
      [14.6, 4.6],
      [16.0, 8.0],
      [15.4, 11.0],
      [11.0, 12.4],
      [6.8, 11.0],
      [6.0, 8.0],
    ],
    lin(g, 6, 3, 12, 9, [
      [0, shade(skin, 0.16)],
      [0.5, skin],
      [1, skin],
    ]),
  );
  ell(g, 6.8, 8.4, 0.75, 1.05, shade(skin, -0.08));
  stroke(g, withAlpha(skinD, 0.8), 0.22, () =>
    g.arc(6.85, 8.4, 0.42, -1.2, 1.4),
  );
  poly(
    g,
    [
      [15.6, 7.8],
      [16.7, 9.4],
      [15.6, 9.7],
    ],
    shade(skin, -0.05),
  );
  eye(g, 13.6, 7.6, 1.05);
  eye(g, 10.2, 7.6, 0.95);
  stroke(g, P.hair, 0.5, () => {
    g.moveTo(9.0, 6.4);
    g.lineTo(11.2, 6.3);
    g.moveTo(12.6, 6.3);
    g.lineTo(14.8, 6.5);
  });
  // the great beard: dark curls from cheek to chest
  const beard = lin(g, 5, 8, 16, 15, [
    [0, "#2a2234"],
    [0.5, P.hair],
    [1, "#08060c"],
  ]);
  blob(
    g,
    [
      [6.0, 8.6],
      [7.6, 9.8],
      [11.0, 10.4],
      [14.6, 9.6],
      [16.0, 8.8],
      [17.0, 11.6],
      [15.4, 14.2],
      [11.0, 15.4],
      [6.4, 14.0],
      [5.0, 11.0],
    ],
    beard,
  );
  for (const [x, y] of [
    [6.6, 11.6],
    [8.6, 13.4],
    [11.0, 14.2],
    [13.6, 13.2],
    [15.4, 11.4],
    [9.0, 11.2],
    [12.8, 11.0],
  ] as Pt[])
    stroke(g, withAlpha("#5a4a6a", 0.5), 0.3, () => {
      g.arc(x, y, 0.8, Math.PI * 1.1, Math.PI * 1.9);
    });
  // mouth peeking through
  stroke(g, "#5a2e24", 0.45, () => {
    g.moveTo(11.6, 10.9);
    g.quadraticCurveTo(12.8, 11.4, 14.0, 10.8);
  });
  // gold headband with a gem
  blob(
    g,
    [
      [6.2, 3.6],
      [15.2, 3.4],
      [15.4, 5.4],
      [6.2, 5.6],
    ],
    lin(g, 0, 3.4, 0, 5.6, [
      [0, P.goldPale],
      [0.5, P.gold],
      [1, P.goldDeep],
    ]),
  );
  ell(g, 12.4, 4.5, 0.75, 0.8, P.red);
  ell(g, 12.2, 4.2, 0.25, 0.25, "#ffd0d0");
  // the leaf crown
  for (let i = 0; i < 8; i++) {
    const x = 6.4 + i * 1.22;
    const h = 2.6 + (i % 2) * 0.8 + Math.sin(i * 1.3) * 0.3;
    const tilt = (i - 3.5) * 0.18;
    blob(
      g,
      [
        [x - 0.7, 3.8],
        [x + tilt - 0.1, 3.6 - h * 0.6],
        [x + tilt * 1.6, 3.6 - h],
        [x + tilt + 0.5, 3.6 - h * 0.5],
        [x + 0.8, 3.8],
      ],
      i % 2 ? P.green : P.mint,
    );
  }
}

// ─── the sage ───────────────────────────────────────────────────────────

function sage(g: G): void {
  const robe = P.grey;
  const robeD = P.greyDeep;
  // the staff behind the near hand
  limb(
    g,
    [18.4, 15.4],
    [18.6, 37.0],
    0.9,
    0.8,
    lin(g, 18, 0, 19.2, 0, [
      [0, P.cyan],
      [1, P.cyanDeep],
    ]),
  );
  // robe: long and flaring to the hem
  const body = lin(g, 4, 0, 15, 0, [
    [0, shade(robe, 0.3)],
    [0.5, robe],
    [1, shade(robe, -0.2)],
  ]);
  blob(
    g,
    [
      [7.8, 12.0],
      [12.2, 12.0],
      [14.2, 14.0],
      [14.4, 24.0],
      [14.8, 34.0],
      [15.0, 43.6],
      [3.8, 43.6],
      [4.0, 34.0],
      [5.0, 24.0],
      [5.6, 14.0],
    ],
    body,
  );
  // deep folds
  for (const [x0, x1] of [
    [8.2, 7.2],
    [11.6, 12.4],
    [9.8, 9.6],
  ] as [number, number][])
    stroke(g, withAlpha(robeD, 0.55), 0.4, () => {
      g.moveTo(x0, 18);
      g.quadraticCurveTo((x0 + x1) / 2 + 0.6, 30, x1, 43.2);
    });
  stroke(g, withAlpha("#ffffff", 0.35), 0.35, () => {
    g.moveTo(6.4, 16);
    g.quadraticCurveTo(5.6, 30, 5.0, 43);
  });
  // sash and hem
  blob(
    g,
    [
      [4.8, 28.6],
      [14.4, 28.6],
      [14.6, 30.2],
      [4.6, 30.2],
    ],
    lin(g, 0, 28.6, 0, 30.2, [
      [0, robe],
      [1, robeD],
    ]),
  );
  blob(
    g,
    [
      [3.8, 42.6],
      [15.0, 42.6],
      [15.1, 43.9],
      [3.7, 43.9],
    ],
    robeD,
  );
  poly(
    g,
    [
      [5.6, 43.9],
      [7.0, 43.9],
      [7.0, 45],
      [5.4, 45],
    ],
    P.hair,
  );
  poly(
    g,
    [
      [12.0, 43.9],
      [13.4, 43.9],
      [13.6, 45],
      [12.0, 45],
    ],
    P.hair,
  );
  // jade pendant on the chest
  stroke(g, withAlpha(P.goldDeep, 0.9), 0.3, () => {
    g.moveTo(7.6, 12.4);
    g.quadraticCurveTo(9.8, 15.2, 12.2, 12.4);
  });
  ell(
    g,
    9.9,
    15.0,
    1.5,
    1.2,
    lin(g, 8.4, 14, 11.4, 16, [
      [0, "#c8ffe4"],
      [0.5, P.mint],
      [1, P.green],
    ]),
  );
  ell(g, 9.4, 14.6, 0.4, 0.3, withAlpha("#ffffff", 0.8));
  // near sleeve reaching to the staff
  blob(
    g,
    [
      [12.6, 13.6],
      [14.6, 15.0],
      [17.4, 21.0],
      [17.0, 23.6],
      [14.6, 23.4],
      [12.8, 19.0],
    ],
    lit(g, 12, 13, 6, 11, robe, 0.25),
  );
  ell(g, 17.8, 22.4, 1.1, 1.0, P.skinLight);
  // the orb
  const glowR = rad(g, 18.4, 14.0, 3.4, [
    [0, withAlpha(P.cyan, 0.6)],
    [1, withAlpha(P.cyan, 0)],
  ]);
  ell(g, 18.4, 14.0, 3.4, 3.4, glowR);
  ell(
    g,
    18.4,
    14.0,
    1.6,
    1.6,
    rad(g, 17.9, 13.4, 2.0, [
      [0, "#ffffff"],
      [0.5, "#dffbff"],
      [1, P.cyan],
    ]),
  );
  stroke(g, withAlpha(P.gold, 0.9), 0.3, () => {
    g.ellipse(18.4, 14.0, 2.1, 0.7, -0.3, 0, Math.PI * 2);
  });
  // long black hair falling behind the mask
  const hair = lin(g, 5, 4, 15, 13, [
    [0, "#3a2f44"],
    [0.5, P.hair],
    [1, "#08060c"],
  ]);
  blob(
    g,
    [
      [6.0, 4.6],
      [14.0, 4.6],
      [15.0, 9.0],
      [14.6, 13.2],
      [12.6, 12.0],
      [10.0, 12.6],
      [7.4, 12.0],
      [5.4, 13.2],
      [5.0, 9.0],
    ],
    hair,
  );
  // the white mask
  blob(
    g,
    [
      [7.4, 5.2],
      [12.6, 5.2],
      [13.0, 8.2],
      [12.0, 11.0],
      [10.0, 11.8],
      [8.0, 11.0],
      [7.0, 8.2],
    ],
    lin(g, 7, 0, 13, 0, [
      [0, "#ffffff"],
      [0.6, P.white],
      [1, "#cfc8bc"],
    ]),
  );
  // eye slits and the gold mouth
  for (const x of [8.8, 11.4])
    blob(
      g,
      [
        [x - 0.8, 7.6],
        [x, 7.0],
        [x + 0.8, 7.5],
        [x, 8.1],
      ],
      P.hair,
    );
  blob(
    g,
    [
      [9.0, 9.4],
      [11.0, 9.4],
      [10.6, 10.2],
      [9.4, 10.2],
    ],
    lin(g, 0, 9.4, 0, 10.2, [
      [0, P.goldPale],
      [1, P.goldDeep],
    ]),
  );
  stroke(g, withAlpha("#9a9488", 0.6), 0.25, () => {
    g.moveTo(10.0, 6.0);
    g.lineTo(10.0, 8.8);
  });
  // gold crown with two curving horns
  const gold = lin(g, 7, 0, 13, 5, [
    [0, P.goldPale],
    [0.5, P.gold],
    [1, P.goldDeep],
  ]);
  blob(
    g,
    [
      [6.8, 3.4],
      [13.2, 3.4],
      [13.0, 5.4],
      [7.0, 5.4],
    ],
    gold,
  );
  blob(
    g,
    [
      [7.6, 3.6],
      [6.8, 1.6],
      [7.4, 0.0],
      [8.2, 1.4],
      [9.0, 3.6],
    ],
    gold,
  );
  blob(
    g,
    [
      [11.0, 3.6],
      [11.8, 1.4],
      [12.6, 0.0],
      [13.2, 1.6],
      [12.4, 3.6],
    ],
    gold,
  );
  ell(g, 10.0, 3.0, 0.9, 1.1, gold);
  ell(g, 10.0, 3.0, 0.45, 0.55, P.mint);
}

// ─── the matriarch ──────────────────────────────────────────────────────

function matriarch(g: G): void {
  const skin = P.skinDark;
  const pink = P.magenta;
  const deep = P.magentaDeep;
  // the cloud she rides
  const puffs: [number, number, number][] = [
    [4.4, 45.4, 2.4],
    [8.0, 44.2, 3.0],
    [11.6, 45.0, 2.6],
    [14.0, 46.2, 1.9],
    [6.2, 47.0, 2.2],
    [10.0, 47.2, 2.3],
  ];
  for (const [x, y, r] of puffs) ell(g, x, y + 0.5, r, r * 0.8, "#b9b0d0");
  for (const [x, y, r] of puffs)
    ell(
      g,
      x,
      y,
      r,
      r * 0.78,
      rad(g, x - r * 0.4, y - r * 0.5, r * 1.6, [
        [0, "#ffffff"],
        [1, "#dcd6ea"],
      ]),
    );
  // the gown sweeping back in the wind
  const gown = lin(g, 14, 16, 2, 42, [
    [0, shade(pink, 0.25)],
    [0.45, pink],
    [1, deep],
  ]);
  fill(g, gown, () => {
    g.moveTo(8.6, 15.4);
    g.lineTo(13.0, 15.4);
    g.quadraticCurveTo(13.6, 19.0, 13.2, 22.8);
    g.quadraticCurveTo(17.4, 27.0, 21.2, 30.0);
    g.quadraticCurveTo(19.0, 34.6, 14.0, 38.4);
    g.quadraticCurveTo(10.0, 42.6, 4.6, 42.2);
    g.quadraticCurveTo(2.0, 40.6, 1.2, 37.6);
    g.quadraticCurveTo(4.6, 35.4, 5.4, 30.0);
    g.quadraticCurveTo(7.4, 25.8, 8.6, 22.8);
    g.quadraticCurveTo(8.0, 19.0, 8.6, 15.4);
    g.closePath();
  });
  // folds and the ruffled hem
  for (const [a, b, c] of [
    [
      [10.4, 24.0],
      [9.0, 33.0],
      [5.6, 40.6],
    ],
    [
      [12.0, 24.4],
      [14.0, 32.0],
      [10.8, 40.0],
    ],
    [
      [13.6, 25.0],
      [17.6, 29.6],
      [16.4, 34.4],
    ],
  ] as [Pt, Pt, Pt][])
    stroke(g, withAlpha(deep, 0.65), 0.45, () => {
      g.moveTo(a[0], a[1]);
      g.quadraticCurveTo(b[0], b[1], c[0], c[1]);
    });
  stroke(g, withAlpha("#ffc2e4", 0.6), 0.35, () => {
    g.moveTo(9.6, 23.4);
    g.quadraticCurveTo(7.0, 31.0, 3.4, 37.6);
  });
  stroke(g, withAlpha(deep, 0.9), 0.6, () => {
    g.moveTo(1.4, 37.8);
    g.quadraticCurveTo(3.0, 41.6, 4.8, 42.0);
    g.quadraticCurveTo(10.0, 42.4, 14.0, 38.4);
  });
  // waist sash
  blob(
    g,
    [
      [8.2, 21.6],
      [13.4, 21.6],
      [13.4, 23.2],
      [8.2, 23.2],
    ],
    deep,
  );
  ell(g, 9.0, 22.4, 0.7, 0.7, P.goldPale);
  // arms
  limb(g, [8.0, 16.4], [6.6, 21.0], 1.4, 1.1, shade(skin, -0.25));
  limb(
    g,
    [13.6, 16.4],
    [14.8, 21.0],
    1.4,
    1.1,
    lit(g, 13, 16, 2, 5, skin, 0.15),
  );
  ell(g, 6.5, 21.4, 0.7, 0.75, shade(skin, -0.25));
  ell(g, 14.9, 21.4, 0.7, 0.75, skin);
  // neck
  limb(g, [10.6, 13.2], [10.6, 15.8], 1.8, 1.9, shade(skin, -0.25));
  // the cloud of white hair, behind and around the face
  const hair: [number, number, number][] = [
    [7.0, 6.0, 2.8],
    [10.6, 4.4, 3.2],
    [14.4, 6.0, 2.8],
    [5.6, 9.2, 2.4],
    [16.0, 9.4, 2.3],
    [6.2, 12.2, 2.0],
    [15.6, 12.4, 1.9],
    [8.4, 3.6, 2.0],
    [12.8, 3.6, 2.0],
  ];
  for (const [x, y, r] of hair) ell(g, x + 0.3, y + 0.4, r, r, "#c8c0b4");
  for (const [x, y, r] of hair)
    ell(
      g,
      x,
      y,
      r,
      r,
      rad(g, x - r * 0.4, y - r * 0.4, r * 1.5, [
        [0, "#ffffff"],
        [0.7, P.white],
        [1, "#d8d0c4"],
      ]),
    );
  // face
  blob(
    g,
    [
      [7.6, 7.4],
      [14.6, 7.2],
      [15.0, 10.4],
      [13.4, 13.2],
      [11.0, 14.2],
      [8.6, 13.2],
      [7.2, 10.4],
    ],
    lin(g, 7, 6, 12, 11, [
      [0, shade(skin, 0.16)],
      [0.5, skin],
      [1, skin],
    ]),
  );
  // a fringe of hair over the brow
  for (const [x, r] of [
    [8.4, 1.4],
    [10.6, 1.6],
    [12.8, 1.5],
    [14.6, 1.2],
  ] as [number, number][])
    ell(
      g,
      x,
      7.0,
      r,
      r * 0.85,
      rad(g, x - 0.4, 6.4, r * 1.6, [
        [0, "#ffffff"],
        [1, "#e4ddd2"],
      ]),
    );
  eye(g, 10.0, 9.6, 0.95);
  eye(g, 13.4, 9.6, 1.0);
  stroke(g, "#5a2a3e", 0.25, () => {
    g.moveTo(9.2, 8.4);
    g.quadraticCurveTo(10.0, 8.0, 10.8, 8.4);
    g.moveTo(12.6, 8.4);
    g.quadraticCurveTo(13.4, 8.0, 14.2, 8.4);
  });
  poly(
    g,
    [
      [12.0, 10.0],
      [12.7, 11.4],
      [11.8, 11.6],
    ],
    shade(skin, -0.12),
  );
  // magenta lips, a soft blush
  blob(
    g,
    [
      [10.6, 12.2],
      [11.6, 11.9],
      [12.8, 12.2],
      [11.7, 12.9],
    ],
    deep,
  );
  ell(g, 11.5, 12.1, 0.5, 0.15, withAlpha("#ffc2e4", 0.7));
  ell(g, 9.4, 11.0, 0.8, 0.5, withAlpha(pink, 0.25));
  ell(g, 14.0, 11.0, 0.7, 0.45, withAlpha(pink, 0.25));
  // earrings
  ell(g, 7.3, 12.0, 0.45, 0.6, P.gold);
  // the crystal crown
  for (const [x, h, w] of [
    [8.6, 2.0, 0.9],
    [10.6, 3.2, 1.1],
    [12.6, 2.0, 0.9],
  ] as [number, number, number][]) {
    poly(
      g,
      [
        [x, 2.0 - h],
        [x + w, 1.6],
        [x, 2.8],
        [x - w, 1.6],
      ],
      lin(g, x - w, 0, x + w, 0, [
        [0, "#ffb2dd"],
        [0.5, pink],
        [1, deep],
      ]),
    );
    stroke(g, withAlpha("#ffffff", 0.7), 0.15, () => {
      g.moveTo(x, 2.0 - h + 0.2);
      g.lineTo(x, 2.6);
    });
  }
  blob(
    g,
    [
      [7.4, 1.8],
      [13.8, 1.8],
      [13.6, 2.8],
      [7.6, 2.8],
    ],
    lin(g, 0, 1.8, 0, 2.8, [
      [0, "#ff8acb"],
      [1, deep],
    ]),
  );
}

// ─── the parasite (portrait only) ───────────────────────────────────────

function parasite(g: G): void {
  const red = "#c8323c";
  const deep = "#6a1420";
  // spikes
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.05 + i * 0.11);
    const r0 = 8.2;
    const r1 = 11 + (i % 2) * 1.2;
    const cx = 10.5;
    const cy = 12;
    poly(
      g,
      [
        [cx + Math.cos(a - 0.12) * r0, cy + Math.sin(a - 0.12) * r0],
        [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1],
        [cx + Math.cos(a + 0.12) * r0, cy + Math.sin(a + 0.12) * r0],
      ],
      deep,
    );
  }
  // body
  blob(
    g,
    [
      [2.0, 8.0],
      [6.0, 2.6],
      [15.0, 2.6],
      [19.6, 8.0],
      [20.0, 16.0],
      [21.0, 22.0],
      [0.0, 22.0],
      [1.0, 16.0],
    ],
    rad(g, 8.0, 7.0, 16, [
      [0, "#ff6a6a"],
      [0.45, red],
      [1, deep],
    ]),
  );
  // tendrils at the base
  for (const x of [2.4, 6.8, 11.2, 15.6])
    blob(
      g,
      [
        [x - 1.2, 18.4],
        [x + 1.4, 18.6],
        [x + 0.6, 22.0],
        [x - 0.6, 22.0],
      ],
      withAlpha(deep, 0.8),
    );
  // eyes
  for (const x of [6.6, 14.2]) {
    ell(
      g,
      x,
      7.4,
      2.2,
      2.1,
      rad(g, x - 0.6, 6.6, 2.6, [
        [0, "#fff2b0"],
        [0.6, P.gold],
        [1, P.goldDeep],
      ]),
    );
    ell(g, x + 0.3, 7.6, 0.9, 1.5, P.ink);
    ell(g, x - 0.2, 6.7, 0.35, 0.35, "#ffffff");
    stroke(g, deep, 0.6, () => {
      g.moveTo(x - 2.4, 4.8);
      g.lineTo(x + 2.0, 5.8);
    });
  }
  // the grinning mouth
  blob(
    g,
    [
      [4.0, 12.0],
      [17.0, 12.0],
      [15.6, 15.6],
      [5.4, 15.6],
    ],
    "#2a0a10",
  );
  for (let i = 0; i < 6; i++) {
    const x = 5.0 + i * 2.0;
    poly(
      g,
      [
        [x, 12.0],
        [x + 1.6, 12.0],
        [x + 0.8, 13.6],
      ],
      P.white,
    );
    if (i < 5)
      poly(
        g,
        [
          [x + 1.0, 15.6],
          [x + 2.6, 15.6],
          [x + 1.8, 14.2],
        ],
        "#e8e0d4",
      );
  }
  stroke(g, withAlpha("#ffb0b0", 0.5), 0.4, () => {
    g.moveTo(4.0, 5.0);
    g.quadraticCurveTo(6.0, 2.6, 9.6, 2.8);
  });
}

// ─── baking ─────────────────────────────────────────────────────────────

export type Pose = { stride: number };

const PAINTERS: Record<
  Exclude<CharacterId, "parasite">,
  { w: number; h: number; paint: (g: G, pose: Pose) => void }
> = {
  pioneer: { w: 12, h: 40, paint: (g, p) => pioneer(g, p.stride) },
  chief: { w: 22, h: 45, paint: (g, p) => chief(g, p.stride) },
  sage: { w: 20, h: 45, paint: (g) => sage(g) },
  matriarch: { w: 22, h: 49, paint: (g) => matriarch(g) },
};

/** Head-and-shoulders crop of each figure for its 22×22 portrait. */
const CROP: Record<
  Exclude<CharacterId, "parasite">,
  [number, number, number]
> = {
  pioneer: [-2.6, -0.4, 17.5],
  chief: [1.5, -1.0, 20],
  sage: [1.5, -0.8, 17],
  matriarch: [1.0, -0.8, 19.5],
};

// Pixel art, high resolution: each figure is painted on a fine grid (PPU
// art pixels per logical unit, or a fixed grid for portraits) and then made
// to behave like hand-placed pixels. It is painted at SUPER× that grid,
// posterised so the shading falls into bands, and every art pixel takes the
// most common colour of its block, so no pixel is a blend of two. A 1px
// dark outline goes round the silhouette, and the result is blown up with
// hard edges so the pixels stay crisp on screen.

const PPU = 3;
const SUPER = 4;
const STEP = 22;
const OUTLINE: [number, number, number] = [20, 12, 28];

function pixelArt(
  w: number,
  h: number,
  pw: number,
  ph: number,
  paint: (g: G) => void,
  density = RES * 2,
): HTMLCanvasElement {
  // paint at SUPER× the art grid
  const big = document.createElement("canvas");
  big.width = pw * SUPER;
  big.height = ph * SUPER;
  const bg = big.getContext("2d", { willReadFrequently: true })!;
  bg.scale((pw * SUPER) / w, (ph * SUPER) / h);
  paint(bg);
  const src = bg.getImageData(0, 0, big.width, big.height).data;
  // each art pixel: the most common posterised colour of its block
  const px = new Uint8ClampedArray(pw * ph * 4);
  const count = new Map<number, number>();
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      count.clear();
      let solid = 0;
      for (let sy = 0; sy < SUPER; sy++) {
        for (let sx = 0; sx < SUPER; sx++) {
          const o = ((y * SUPER + sy) * big.width + x * SUPER + sx) * 4;
          if (src[o + 3]! < 128) continue;
          solid++;
          const q = (c: number) =>
            Math.min(255, Math.round(src[o + c]! / STEP) * STEP);
          const key = (q(0) << 16) | (q(1) << 8) | q(2);
          count.set(key, (count.get(key) ?? 0) + 1);
        }
      }
      if (solid * 2 < SUPER * SUPER) continue;
      let best = 0;
      let n = -1;
      for (const [k, c] of count)
        if (c > n) {
          n = c;
          best = k;
        }
      const o = (y * pw + x) * 4;
      px[o] = (best >> 16) & 255;
      px[o + 1] = (best >> 8) & 255;
      px[o + 2] = best & 255;
      px[o + 3] = 255;
    }
  }
  // 1px outline on the transparent pixels touching the figure
  const out = new Uint8ClampedArray(px);
  const solidAt = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < pw && y < ph && px[(y * pw + x) * 4 + 3]! > 0;
  for (let y = 0; y < ph; y++)
    for (let x = 0; x < pw; x++) {
      if (solidAt(x, y)) continue;
      if (
        solidAt(x - 1, y) ||
        solidAt(x + 1, y) ||
        solidAt(x, y - 1) ||
        solidAt(x, y + 1)
      ) {
        const o = (y * pw + x) * 4;
        out[o] = OUTLINE[0];
        out[o + 1] = OUTLINE[1];
        out[o + 2] = OUTLINE[2];
        out[o + 3] = 255;
      }
    }
  const small = document.createElement("canvas");
  small.width = pw;
  small.height = ph;
  small.getContext("2d")!.putImageData(new ImageData(out, pw, ph), 0, 0);
  // blow up with hard edges, to about the screen's density
  const k = Math.max(1, Math.round((density * w) / pw));
  const up = document.createElement("canvas");
  up.width = pw * k;
  up.height = ph * k;
  const ug = up.getContext("2d")!;
  ug.imageSmoothingEnabled = false;
  ug.drawImage(small, 0, 0, up.width, up.height);
  return up;
}

export function paintActor(
  id: Exclude<CharacterId, "parasite">,
  pose: Pose,
): Sprite {
  const p = PAINTERS[id];
  // a pixel of margin all round so the outline is never clipped
  const pw = p.w * PPU + 2;
  const ph = p.h * PPU + 2;
  const m = 1 / PPU;
  const canvas = pixelArt(p.w + 2 * m, p.h + 2 * m, pw, ph, (g) => {
    g.translate(m, m);
    p.paint(g, pose);
  });
  return { w: p.w, h: p.h, canvas: trim(canvas, pw, ph, 1) };
}

/** Crop `px` art pixels of margin back off a blown-up canvas. */
function trim(
  c: HTMLCanvasElement,
  pw: number,
  ph: number,
  px: number,
): HTMLCanvasElement {
  const k = c.width / pw;
  const out = document.createElement("canvas");
  out.width = (pw - 2 * px) * k;
  out.height = (ph - 2 * px) * k;
  out.getContext("2d")!.drawImage(c, -px * k, -px * k);
  return out;
}

/** Portraits sit on a 64×64 art grid (the old ones were 22×22). */
const PORTRAIT_GRID = 64;

export function paintPortrait(id: CharacterId): Sprite {
  const n = PORTRAIT_GRID;
  if (id === "parasite")
    return { w: 22, h: 22, canvas: pixelArt(22, 22, n, n, parasite, RES * 6) };
  const p = PAINTERS[id];
  const [x, y, size] = CROP[id];
  const k = 22 / size;
  return {
    w: 22,
    h: 22,
    canvas: pixelArt(
      22,
      22,
      n,
      n,
      (g) => {
        g.scale(k, k);
        g.translate(-x, -y);
        p.paint(g, { stride: 0 });
      },
      RES * 6,
    ),
  };
}
