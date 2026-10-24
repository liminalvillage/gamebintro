// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The places the journey passes through. Each scenery is a stack of
// parallax layers painted once into offscreen canvases (period-wide so they
// tile as the party walks), plus optional live painters for what moves:
// fire, water, airships, the growing map. Everything is generated from a
// seed — no image files.

import { H, hiCanvas, RES, W } from "../engine/screen";
import { irand, noise2d, rng, type Rng } from "../engine/rng";
import { P } from "./palette";
import {
  bands,
  cloud,
  disc,
  dome,
  ellipse,
  figure,
  flame,
  glow,
  hex,
  hexagon,
  hut,
  line,
  pines,
  rect,
  ridge,
  ring,
  roundTree,
  shade,
  tower,
  tri,
  withAlpha,
  ziggurat,
  type Ctx,
} from "./paint";

export type SceneryId =
  | "valley"
  | "village"
  | "overworld"
  | "cradle"
  | "burning"
  | "metropolis"
  | "gameb"
  | "commons"
  | "worldmap"
  | "warp"
  | "void";

export type Layer = { canvas: HTMLCanvasElement; parallax: number };

/** Live state the scene can drive (0..1 phases, intensities). */
export type SceneryParams = { phase: number; fire: number };

export type Scenery = {
  id: SceneryId;
  /** Where feet stand; null = characters float / are not shown. */
  groundY: number | null;
  period: number;
  layers: Layer[];
  /** Painted after the static layers, before the actors. */
  mid?: (g: Ctx, t: number, scroll: number, p: SceneryParams) => void;
  /** Painted after the actors (framing trunks, parapets). */
  front?: (g: Ctx, t: number, scroll: number, p: SceneryParams) => void;
};

const cache = new Map<SceneryId, Scenery>();

export function getScenery(id: SceneryId): Scenery {
  let s = cache.get(id);
  if (!s) {
    s = BUILD[id]();
    cache.set(id, s);
  }
  return s;
}

export function drawScenery(
  g: Ctx,
  s: Scenery,
  t: number,
  scroll: number,
  p: SceneryParams,
): void {
  for (const l of s.layers) {
    const off = -((scroll * l.parallax) % s.period);
    // a hair of overlap hides the seam between tiles at fractional offsets
    g.drawImage(l.canvas, off, 0, s.period + 0.25, H);
    g.drawImage(l.canvas, off + s.period, 0, s.period + 0.25, H);
    if (off > 0) g.drawImage(l.canvas, off - s.period, 0, s.period + 0.25, H);
  }
  s.mid?.(g, t, scroll, p);
}

function layer(
  period: number,
  parallax: number,
  paint: (g: Ctx, r: Rng) => void,
  seed = 1,
): Layer {
  const { canvas, g } = hiCanvas(period, H);
  paint(g, rng(seed));
  return { canvas, parallax };
}

/**
 * Paint a `w`×`h` region sample by sample at the full offscreen resolution
 * (for noise fields: oceans and land, nebulae), so their edges are as fine
 * as the screen instead of one block per logical unit. Soft fields can
 * pass a lower `res` and let the upscale smooth them.
 */
function field(
  g: Ctx,
  w: number,
  h: number,
  fn: (x: number, y: number) => [number, number, number, number] | null,
  res = RES,
): void {
  const { canvas } = hiCanvas(1, 1);
  canvas.width = Math.ceil(w * res);
  canvas.height = Math.ceil(h * res);
  const fg = canvas.getContext("2d")!;
  const img = fg.createImageData(canvas.width, canvas.height);
  const d = img.data;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const c = fn((x + 0.5) / res, (y + 0.5) / res);
      if (!c) continue;
      const o = (y * canvas.width + x) * 4;
      d[o] = c[0];
      d[o + 1] = c[1];
      d[o + 2] = c[2];
      d[o + 3] = c[3];
    }
  }
  fg.putImageData(img, 0, 0);
  g.drawImage(canvas, 0, 0, w, h);
}

function stars(
  g: Ctx,
  r: Rng,
  w: number,
  yMax: number,
  n: number,
  color = P.paper,
): void {
  for (let i = 0; i < n; i++) {
    const x = irand(r, 0, w - 1) + r();
    const y = irand(r, 0, yMax) + r();
    const a = 0.4 + r() * 0.6;
    const size = 0.25 + r() * r() * 0.5;
    g.fillStyle = withAlpha(color, a);
    g.beginPath();
    g.arc(x, y, size, 0, Math.PI * 2);
    g.fill();
    if (r() < 0.12) {
      glow(g, x, y, 3.5, color, 0.35);
      g.fillStyle = withAlpha(color, 0.5);
      g.beginPath();
      g.moveTo(x - 2.5, y);
      g.lineTo(x, y - 0.25);
      g.lineTo(x + 2.5, y);
      g.lineTo(x, y + 0.25);
      g.moveTo(x, y - 2.5);
      g.lineTo(x + 0.25, y);
      g.lineTo(x, y + 2.5);
      g.lineTo(x - 0.25, y);
      g.fill();
    }
  }
}

// ─── the valley: night, the first game ───────────────────────────────────

function valley(): Scenery {
  const period = 768;
  const layers: Layer[] = [
    layer(
      period,
      0,
      (g, r) => {
        bands(g, 0, 0, period, 130, P.nightTop, P.nightLow, 10);
        rect(g, 0, 130, period, H - 130, P.nightLow);
        stars(g, r, period, 95, 140);
      },
      11,
    ),
    layer(period, 0.08, (g) => {
      ridge(g, 21, period, 86, 30, P.khaki, H, 3);
    }),
    layer(period, 0.16, (g, r) => {
      const ys = ridge(g, 22, period, 104, 22, P.olive, H, 3);
      pines(g, r, period, ys, P.pine, 7, 5, 11);
    }),
    layer(period, 0.3, (g, r) => {
      const ys = ridge(g, 23, period, 122, 12, P.oliveDeep, H, 4);
      pines(g, r, period, ys, P.pineDeep, 5, 8, 16);
    }),
    layer(
      period,
      0.5,
      (g, r) => {
        rect(g, 0, 128, period, H - 128, P.meadow);
        for (let i = 0; i < 40; i++)
          rect(g, irand(r, 0, period), irand(r, 130, 160), 2, 1, P.meadowDeep);
        // a camp: three huts and a fire ring
        for (const cx of [300, 326, 316, 640, 662])
          hut(g, cx, 146 + (cx % 3), 12, 12, P.clayDeep, P.sand, P.sandDeep);
        for (const cx of [120, 560]) {
          figure(g, cx, 150, P.ink, P.skinBrown);
          figure(g, cx + 8, 149, P.ink, P.skinBrown);
          figure(g, cx + 3, 155, P.ink, P.skinBrown);
        }
        // grazing herd, silhouette
        for (const cx of [200, 214, 440, 470]) {
          ellipse(g, cx, 141, 6, 3, P.clayDeep);
          rect(g, cx + 5, 139, 3, 3, P.clayDeep);
          rect(g, cx - 4, 143, 1, 3, P.clayDeep);
          rect(g, cx + 3, 143, 1, 3, P.clayDeep);
        }
      },
      31,
    ),
    layer(
      period,
      1,
      (g, r) => {
        // the ledge the party stands on
        const ys = ridge(g, 24, period, 152, 4, P.cliff, H, 2);
        for (let x = 0; x < period; x++) {
          const y = ys[x]!;
          rect(g, x, y, 1, 2, P.meadowDeep);
          if (r() < 0.08) rect(g, x, y - 2, 1, 2, "#a0a84a");
          if (r() < 0.05) rect(g, x, y + irand(r, 6, 40), 2, 1, P.cliffDeep);
        }
        bands(g, 0, 190, period, H - 190, P.cliff, P.cliffDeep, 4);
      },
      41,
    ),
  ];
  const mid = (g: Ctx, t: number, scroll: number) => {
    const off = -((scroll * 0.5) % period);
    for (const base of [off, off + period]) {
      flame(g, base + 125, 157, 5, 7, t, 1);
      flame(g, base + 565, 157, 5, 7, t, 2);
    }
  };
  // the framing trunks stay put (parallax 0): a foreground that scrolled
  // would march across the party as they walk and hide the pioneer
  const bark = layer(
    period,
    0,
    (g, r) => {
      for (const [x0, w] of [
        [0, 24],
        [354, 30],
      ] as [number, number][]) {
        rect(g, x0, 0, w, H, P.trunk);
        for (let y = 0; y < H; y += 2) {
          const wob = Math.round(Math.sin(y / 9) * 2);
          rect(g, x0 + w - 5 + wob, y, 5, 2, "#3a2d40");
          if (r() < 0.25)
            rect(g, x0 + irand(r, 2, w - 6), y, irand(r, 2, 6), 1, "#1d1522");
        }
        for (let y = 20; y < 120; y += 34)
          rect(g, x0 + (x0 === 0 ? w : -14), y, 14, 3, P.trunk);
      }
    },
    47,
  );
  const front = (g: Ctx) => {
    g.drawImage(bark.canvas, 0, 0, period, H);
  };
  return { id: "valley", groundY: 153, period, layers, mid, front };
}

// ─── the village by the river ────────────────────────────────────────────

function village(): Scenery {
  const period = 768;
  const layers: Layer[] = [
    layer(
      period,
      0,
      (g, r) => {
        bands(g, 0, 0, period, 120, P.duskTop, P.duskLow, 10);
        rect(g, 0, 120, period, H - 120, P.duskLow);
        stars(g, r, period, 50, 40);
      },
      12,
    ),
    layer(period, 0.2, (g, r) => {
      const ys = ridge(g, 32, period, 108, 16, "#4a3a5a", H, 3);
      pines(g, r, period, ys, "#2f2a44", 6, 6, 14);
    }),
    layer(
      period,
      0.45,
      (g, r) => {
        rect(g, 0, 118, period, H - 118, "#3b3a3a");
        for (let i = 0; i < 26; i++)
          roundTree(
            g,
            irand(r, 0, period),
            124,
            irand(r, 6, 10),
            "#2b3b3b",
            P.trunk,
            "#345046",
          );
      },
      33,
    ),
    layer(
      period,
      0.75,
      (g, r) => {
        rect(g, 0, 140, period, H - 140, P.sand);
        for (let i = 0; i < 60; i++)
          rect(g, irand(r, 0, period), irand(r, 142, 165), 2, 1, P.sandDeep);
        for (const cx of [60, 100, 150, 420, 470, 520, 700])
          hut(
            g,
            cx,
            150 - (cx % 5),
            22 + (cx % 7),
            24,
            P.clayDeep,
            P.sand,
            P.sandDeep,
          );
        // a stilt house with a railing
        for (const x0 of [250, 600]) {
          rect(g, x0, 126, 44, 18, P.clayDeep);
          rect(g, x0 - 2, 124, 48, 3, P.sand);
          tri(g, x0 + 22, 124, 52, 14, P.sand);
          for (let i = 0; i < 4; i++)
            rect(g, x0 + 4 + i * 11, 144, 2, 10, P.clayDeep);
          for (let i = 0; i < 3; i++)
            rect(g, x0 + 6 + i * 13, 131, 6, 7, P.ink);
        }
        // drying racks and pots
        for (const x0 of [200, 350, 560]) {
          rect(g, x0, 142, 1, 12, P.clayDeep);
          rect(g, x0 + 14, 142, 1, 12, P.clayDeep);
          rect(g, x0, 142, 15, 1, P.clayDeep);
          rect(g, x0 + 3, 143, 3, 5, P.red);
          rect(g, x0 + 8, 143, 3, 6, P.white);
        }
      },
      34,
    ),
    layer(
      period,
      1,
      (g, r) => {
        rect(g, 0, 160, period, H - 160, P.sandDeep);
        const ys = ridge(g, 35, period, 176, 6, P.water, H, 2);
        for (let x = 0; x < period; x++) {
          rect(g, x, ys[x]!, 1, 1, P.waterLight);
          if (r() < 0.03)
            rect(
              g,
              x,
              ys[x]! + irand(r, 4, 30),
              irand(r, 3, 9),
              1,
              P.waterLight,
            );
        }
      },
      36,
    ),
  ];
  const mid = (g: Ctx, t: number) => {
    for (let i = 0; i < 12; i++) {
      const x = (i * 37 + Math.round(t * 6)) % W;
      const y = 184 + ((i * 11) % 28);
      rect(
        g,
        x,
        y,
        6,
        1,
        withAlpha(P.waterLight, 0.5 + 0.4 * Math.sin(t * 2 + i)),
      );
    }
  };
  return { id: "village", groundY: 160, period, layers, mid };
}

// ─── the cradle of civilisation / the same city burning ──────────────────

function city(mood: "dawn" | "ember"): Scenery {
  const period = 768;
  const ember = mood === "ember";
  const skyTop = ember ? P.emberTop : P.dawnTop;
  const skyLow = ember ? P.emberLow : P.dawnLow;
  const clay = ember ? "#6a4a3a" : P.clay;
  const clayDeep = ember ? "#3f2a24" : P.clayDeep;
  const stone = ember ? "#7a6a58" : P.stone;
  const stoneDeep = ember ? "#4f4438" : P.stoneDeep;
  const water = ember ? "#3a1f28" : P.waterLight;
  const layers: Layer[] = [
    layer(
      period,
      0,
      (g, r) => {
        bands(g, 0, 0, period, 125, skyTop, skyLow, 10);
        rect(g, 0, 125, period, H - 125, skyLow);
        if (!ember) disc(g, 300, 70, 14, P.goldPale);
        else stars(g, r, period, 40, 30, "#ff9a7a");
      },
      13,
    ),
    layer(period, 0.08, (g) => {
      ridge(g, 42, period, 100, 26, ember ? "#4a2a2a" : "#d9b98a", H, 3);
    }),
    layer(
      period,
      0.25,
      (g, r) => {
        rect(g, 0, 118, period, H - 118, ember ? "#4a3030" : "#e3c48f");
        for (const cx of [90, 250, 420, 560, 700])
          ziggurat(g, cx, 120, 60 + (cx % 20), 5, clay, clayDeep);
        for (let i = 0; i < 22; i++) {
          const x = irand(r, 0, period);
          rect(g, x, 104, 1, 16, clayDeep);
          for (let k = 0; k < 5; k++)
            line(
              g,
              x,
              104,
              x + Math.cos(k * 1.3) * 7,
              100 + Math.sin(k) * 4,
              ember ? "#3a4a3a" : P.green,
            );
        }
      },
      43,
    ),
    layer(
      period,
      0.5,
      (g, r) => {
        rect(g, 0, 122, period, 18, water);
        for (let i = 0; i < 50; i++)
          rect(
            g,
            irand(r, 0, period),
            irand(r, 124, 138),
            irand(r, 3, 8),
            1,
            ember ? "#5a2f38" : "#6f9fc5",
          );
      },
      44,
    ),
    layer(
      period,
      0.75,
      (g, r) => {
        rect(g, 0, 140, period, H - 140, clay);
        for (let x = 0; x < period; x += 18) {
          const h = irand(r, 10, 26);
          rect(g, x, 140 - h, 16, h, clay);
          rect(g, x + 12, 140 - h, 4, h, clayDeep);
          rect(g, x, 140 - h, 16, 1, stone);
          for (let wy = 140 - h + 3; wy < 138; wy += 6)
            rect(g, x + 4, wy, 3, 4, ember ? "#ff7a2a" : P.ink);
        }
        rect(g, 0, 140, period, 3, stone);
        // market awnings and spears
        for (const x0 of [40, 140, 330, 520, 640]) {
          rect(g, x0, 146, 1, 10, clayDeep);
          rect(g, x0 + 18, 146, 1, 10, clayDeep);
          rect(g, x0, 146, 19, 2, ember ? "#7a2a2a" : P.red);
          rect(g, x0 + 2, 148, 15, 1, P.white);
        }
      },
      45,
    ),
    layer(
      period,
      1,
      (g) => {
        // the rooftop platform the party stands on
        rect(g, 0, 154, period, H - 154, stone);
        rect(g, 0, 154, period, 2, shade(stone, 0.2));
        rect(g, 0, 168, period, 2, stoneDeep);
        for (let x = 10; x < period; x += 60) {
          rect(g, x, 172, 12, 22, stoneDeep);
          rect(g, x + 3, 176, 6, 10, P.ink);
        }
        for (let x = 0; x < period; x += 8) rect(g, x, 150, 4, 4, stone);
      },
      46,
    ),
  ];
  const mid = ember
    ? (g: Ctx, t: number, scroll: number, p: SceneryParams) => {
        const off = -((scroll * 0.75) % period);
        for (const base of [off, off + period]) {
          for (let i = 0; i < 9; i++) {
            const x = base + 20 + i * 86;
            flame(
              g,
              x,
              118 + (i % 3) * 4,
              8 + (i % 3) * 3,
              14 + (i % 4) * 4,
              t,
              i,
            );
            const sm = 0.25 * p.fire;
            for (let k = 0; k < 4; k++)
              disc(
                g,
                x + Math.sin(t * 0.7 + k + i) * 4,
                100 - k * 9 - ((t * 6 + i * 7) % 30),
                4 + k,
                withAlpha("#2a1a1a", sm),
              );
          }
        }
      }
    : undefined;
  return {
    id: ember ? "burning" : "cradle",
    groundY: 154,
    period,
    layers,
    mid,
  };
}

// ─── the metropolis ──────────────────────────────────────────────────────

function metropolis(): Scenery {
  const period = 768;
  const layers: Layer[] = [
    layer(
      period,
      0,
      (g) => {
        bands(g, 0, 0, period, 120, P.hazeTop, P.hazeLow, 10);
        rect(g, 0, 120, period, H - 120, P.hazeLow);
        disc(g, 200, 60, 16, "#fff3c8");
      },
      14,
    ),
    layer(period, 0.06, (g) => {
      ridge(g, 52, period, 96, 22, "#e6cf9a", H, 3);
      for (const cx of [120, 400, 620]) tri(g, cx, 112, 70, 34, "#dcbf86");
    }),
    layer(
      period,
      0.2,
      (g, r) => {
        rect(g, 0, 118, period, H - 118, "#dcc394");
        for (let x = 0; x < period; x += irand(r, 10, 16))
          tower(
            g,
            r,
            x,
            120,
            irand(r, 8, 14),
            irand(r, 20, 70),
            "#e5cf9f",
            "#c8ae7c",
            "#fff6cf",
            0.25,
          );
      },
      53,
    ),
    layer(
      period,
      0.45,
      (g, r) => {
        rect(g, 0, 140, period, H - 140, P.concreteDeep);
        for (let x = 0; x < period; x += irand(r, 16, 26))
          tower(
            g,
            r,
            x,
            142,
            irand(r, 12, 20),
            irand(r, 30, 90),
            P.concrete,
            P.concreteDeep,
            P.window,
            0.5,
          );
      },
      54,
    ),
    layer(
      period,
      1,
      (g) => {
        rect(g, 0, 154, period, H - 154, "#6a5a48");
        rect(g, 0, 150, period, 4, "#8a7a62");
        rect(g, 0, 150, period, 1, "#a69478");
        for (let x = 0; x < period; x += 40) {
          rect(g, x, 160, 24, 14, "#5a4a3a");
          rect(g, x + 4, 164, 6, 6, P.window);
          rect(g, x + 14, 164, 6, 6, P.ink);
        }
      },
      55,
    ),
  ];
  return { id: "metropolis", groundY: 150, period, layers };
}

// ─── Game B: terraces, dome, airships ────────────────────────────────────

function gameb(): Scenery {
  const period = 768;
  const layers: Layer[] = [
    layer(
      period,
      0,
      (g) => {
        bands(g, 0, 0, period, 120, "#f3c98c", "#fbe9c2", 10);
        rect(g, 0, 120, period, H - 120, "#fbe9c2");
        disc(g, 520, 48, 12, "#fff6d8");
      },
      15,
    ),
    layer(period, 0.08, (g) => {
      ridge(g, 62, period, 96, 30, "#e9c597", H, 3);
      ridge(g, 63, period, 112, 18, "#d7ae82", H, 3);
    }),
    layer(
      period,
      0.25,
      (g) => {
        rect(g, 0, 124, period, H - 124, "#a7b35a");
        // the dome on the hill
        for (const cx of [250, 640]) {
          rect(g, cx - 22, 118, 44, 14, "#c9b482");
          dome(g, cx, 118, 30, "#cfeef0", "#6fb8c0");
          rect(g, cx - 10, 110, 20, 8, "#e9d7a8");
        }
        // terraced arcologies: ochre blocks striped with green
        for (const [x0, h] of [
          [150, 60],
          [205, 44],
          [300, 54],
          [360, 70],
          [410, 48],
          [540, 62],
          [600, 46],
          [700, 56],
        ] as [number, number][]) {
          const w = 36;
          tri(g, x0 + w / 2, 124, w + 20, h, "#d9b872");
          for (let y = 124 - h + 6; y < 122; y += 6) {
            const f = (124 - y) / h;
            const half = Math.round(((w + 20) / 2) * (1 - f));
            rect(g, x0 + w / 2 - half, y, half * 2, 2, "#6fa35a");
            for (
              let wx = x0 + w / 2 - half + 2;
              wx < x0 + w / 2 + half - 2;
              wx += 4
            )
              rect(g, wx, y + 3, 2, 2, "#fff2bf");
          }
          rect(g, x0 + w / 2 - 6, 118, 12, 6, "#cfeef0");
        }
      },
      64,
    ),
    layer(
      period,
      0.5,
      (g, r) => {
        const ys = ridge(g, 65, period, 146, 14, "#8fa84f", H, 3);
        for (let x = 0; x < period; x += 1)
          if (r() < 0.1) rect(g, x, ys[x]! + irand(r, 2, 20), 2, 1, "#6f8a3d");
        for (let i = 0; i < 20; i++)
          roundTree(
            g,
            irand(r, 0, period),
            150 + irand(r, 0, 10),
            irand(r, 3, 6),
            "#5f8a46",
            P.trunk,
          );
      },
      66,
    ),
    layer(
      period,
      1,
      (g, r) => {
        const ys = ridge(g, 67, period, 160, 8, "#7f9a45", H, 2);
        for (let x = 0; x < period; x++) {
          rect(g, x, ys[x]!, 1, 2, "#9fb75a");
          if (r() < 0.06) rect(g, x, ys[x]! - 2, 1, 2, "#c7d47a");
        }
        rect(g, 0, 176, period, H - 176, "#5c6a3c");
        for (const cx of [40, 200, 380, 560, 720])
          cloud(g, cx, 196, 60, P.white);
        for (const cx of [120, 300, 470, 650]) cloud(g, cx, 206, 50, "#eef0ea");
      },
      68,
    ),
  ];
  const mid = (g: Ctx, t: number) => {
    for (let i = 0; i < 3; i++) {
      const x = ((t * 7 + i * 150) % (W + 40)) - 20;
      const y = 36 + i * 22 + Math.sin(t + i) * 2;
      ellipse(g, x, y, 7, 3, "#e8d9b4");
      rect(g, x - 3, y + 3, 6, 2, "#8a7a5a");
      rect(g, x - 7, y, 14, 1, "#fff8e0");
    }
  };
  return { id: "gameb", groundY: 160, period, layers, mid };
}

// ─── the commons: the circle where the tribe meets ───────────────────────

function commons(): Scenery {
  const period = W;
  // everything that matters sits above y 148, where the dialogue box starts:
  // the plaza, the circle and the pioneer at its centre stay in view
  const cx = 192;
  const cy = 118;
  const layers: Layer[] = [
    layer(
      period,
      0,
      (g, r) => {
        bands(g, 0, 0, period, 66, "#f6e6c8", "#fbf1dc", 8);
        rect(g, 0, 66, period, H - 66, "#f1e3c4");
        ridge(g, 71, period, 70, 22, "#e3cfa6", 96, 3);
        // bridges arcing in from both sides
        for (const [x0, dir] of [
          [0, 1],
          [W, -1],
        ] as [number, number][]) {
          for (let i = 0; i < 90; i++) {
            const x = x0 + dir * i;
            const y = 74 + Math.round(Math.pow(i / 90, 2) * 26);
            rect(g, x, y, 1, 4, "#c8b58c");
            if (i % 9 === 0) rect(g, x, y - 6, 1, 6, "#b8a47a");
          }
        }
        // two great trees
        roundTree(g, 58, 96, 18, "#5a3a4a", "#4a3328", "#7a4a5c");
        roundTree(g, 328, 94, 20, "#5a3a4a", "#4a3328", "#7a4a5c");
        // the gathering crowd beyond the circle
        for (let i = 0; i < 30; i++)
          figure(
            g,
            irand(r, 20, 360),
            irand(r, 86, 94),
            "#3a3a3a",
            P.skinLight,
          );
        // the plaza and pool
        ellipse(g, cx, cy, 110, 28, "#e8dcc0");
        ellipse(g, cx, cy, 104, 24, "#d9cba8");
        ellipse(g, cx, cy, 58, 13, "#8fc4cf");
        ellipse(g, cx, cy, 48, 9, "#b7e0e6");
        for (let i = 0; i < 8; i++)
          disc(
            g,
            cx + Math.cos(i * 0.8) * 30,
            cy + Math.sin(i * 0.8) * 6,
            2,
            "#6fa35a",
          );
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          figure(
            g,
            Math.round(cx + Math.cos(a) * 70),
            Math.round(cy + 4 + Math.sin(a) * 17),
            P.ink,
            P.skinBrown,
          );
        }
        // the pioneer at the centre, arms wide
        rect(g, cx - 1, cy - 6, 2, 6, P.white);
        rect(g, cx - 4, cy - 5, 8, 1, P.skinBrown);
        rect(g, cx - 1, cy - 8, 2, 2, P.hair);
        // a meadow in the foreground
        bands(g, 0, 150, period, H - 150, "#e9d9b4", "#dcc89c", 4);
        for (let i = 0; i < 120; i++) {
          const x = irand(r, 0, period - 1);
          const y = irand(r, 146, H - 2);
          rect(g, x, y, 1, 2, "#b9a874");
          if (r() < 0.25)
            rect(g, x, y - 1, 1, 1, r() < 0.5 ? "#e07a8a" : "#f6e3a1");
        }
      },
      72,
    ),
  ];
  return { id: "commons", groundY: null, period, layers };
}

// ─── the world mesh ──────────────────────────────────────────────────────

function worldmap(): Scenery {
  const period = W;
  const n = noise2d(81, 32);
  const height = (x: number, y: number) =>
    n(x / 28, y / 28) * 0.7 + n(x / 9 + 5, y / 9 + 5) * 0.3;
  const land: boolean[][] = [];
  for (let y = 0; y < H; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < W; x++) row.push(height(x, y) > 0.56);
    land.push(row);
  }
  const layers: Layer[] = [
    layer(
      period,
      0,
      (g, r) => {
        const ocean = hex(P.ocean);
        const deep = hex("#0f1d38");
        const shore = hex("#2f5a7a");
        const lo = hex(P.land);
        const hi = hex(P.landDeep);
        const sand = hex(P.sand);
        field(g, W, H, (x, y) => {
          const v = height(x, y);
          const e = v - 0.56;
          if (e < 0) {
            // a pale shelf along the coast, darkening into the deep
            const f = Math.min(1, -e / 0.18);
            const [c0, c1, m] =
              f < 0.12
                ? [shore, ocean, f / 0.12]
                : [ocean, deep, (f - 0.12) / 0.88];
            return [
              c0[0] + (c1[0] - c0[0]) * m,
              c0[1] + (c1[1] - c0[1]) * m,
              c0[2] + (c1[2] - c0[2]) * m,
              255,
            ];
          }
          // a soft anti-aliased coastline, a sand rim, then land shading
          const edge = Math.min(1, e / 0.004);
          const rim = Math.max(0, 1 - e / 0.02);
          const f = Math.min(1, e / 0.2);
          const lr = lo[0] + (hi[0] - lo[0]) * f;
          const lg = lo[1] + (hi[1] - lo[1]) * f;
          const lb = lo[2] + (hi[2] - lo[2]) * f;
          const cr = lr + (sand[0] - lr) * rim * 0.6;
          const cg = lg + (sand[1] - lg) * rim * 0.6;
          const cb = lb + (sand[2] - lb) * rim * 0.6;
          return [
            shore[0] + (cr - shore[0]) * edge,
            shore[1] + (cg - shore[1]) * edge,
            shore[2] + (cb - shore[2]) * edge,
            255,
          ];
        });
        for (let i = 0; i < 300; i++)
          rect(
            g,
            irand(r, 0, W),
            irand(r, 0, H),
            1,
            1,
            withAlpha("#2a4a7a", 0.5),
          );
        // faint hexagonal lattice over everything: the scales of the mesh
        const R = 14;
        for (let row = -1; row < H / (R * 1.5) + 1; row++) {
          for (let col = -1; col < W / (R * 1.74) + 1; col++) {
            const cx = col * R * 1.732 + (row % 2 ? R * 0.866 : 0);
            const cy = row * R * 1.5;
            hexagon(g, cx, cy, R, null, withAlpha("#9fd0ff", 0.12));
          }
        }
        for (const cx of [40, 150, 260, 340])
          cloud(g, cx, 20 + (cx % 30), 40, withAlpha(P.white, 0.8));
      },
      82,
    ),
  ];
  const nodes: [number, number][] = [];
  const r = rng(83);
  let tries = 0;
  while (nodes.length < 26 && tries++ < 4000) {
    const x = irand(r, 12, W - 12);
    const y = irand(r, 12, H - 12);
    if (land[y]![x]) nodes.push([x, y]);
  }
  const links: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!;
    const near = nodes
      .map(
        (b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1])] as [number, number],
      )
      .filter(([j]) => j !== i)
      .sort((p, q) => p[1] - q[1])
      .slice(0, 3);
    for (const [j] of near) if (j > i) links.push([i, j]);
  }
  const mid = (g: Ctx, t: number, _s: number, p: SceneryParams) => {
    const lit = Math.floor(p.phase * links.length);
    links.forEach(([i, j], k) => {
      if (k >= lit) return;
      const a = nodes[i]!;
      const b = nodes[j]!;
      line(g, a[0], a[1], b[0], b[1], withAlpha(P.cyan, 0.55));
      const f = (((t * 0.6 + k * 0.13) % 1) + 1) % 1;
      rect(
        g,
        a[0] + (b[0] - a[0]) * f,
        a[1] + (b[1] - a[1]) * f,
        1,
        1,
        P.white,
      );
    });
    const litNodes = Math.floor(p.phase * nodes.length);
    nodes.forEach(([x, y], k) => {
      if (k > litNodes) return;
      const pulse = 2 + Math.round(1.5 + 1.5 * Math.sin(t * 3 + k));
      ring(g, x, y, pulse, withAlpha(P.gold, 0.6));
      disc(g, x, y, 1, P.gold);
    });
  };
  return { id: "worldmap", groundY: null, period, layers, mid };
}

// ─── the warp: between worlds ────────────────────────────────────────────

function warp(): Scenery {
  const period = W;
  const n = noise2d(91, 24);
  const layers: Layer[] = [
    layer(
      period,
      0,
      (g, r) => {
        // the same four tones as soft clouds: several octaves of noise,
        // each turned off the lattice so no grid shows through
        const stops: [number, [number, number, number]][] = [
          [0.3, hex(P.nightTop)],
          [0.44, hex(P.nebulaC)],
          [0.56, hex(P.nebulaA)],
          [0.72, hex(P.nebulaB)],
        ];
        const fbm = (x: number, y: number) => {
          let v = 0;
          let amp = 0.5;
          let f = 1 / 48;
          let sum = 0;
          for (let o = 0; o < 5; o++) {
            const a = 0.6 + o * 1.1;
            const u = (x * Math.cos(a) - y * Math.sin(a)) * f + o * 7.3;
            const w = (x * Math.sin(a) + y * Math.cos(a)) * f + o * 3.1;
            v += n(u, w) * amp;
            sum += amp;
            amp *= 0.5;
            f *= 2.03;
          }
          return v / sum;
        };
        field(
          g,
          W,
          H,
          (x, y) => {
            // a little domain warp swirls the clouds
            const v = fbm(x + fbm(x + 40, y) * 40, y + fbm(x, y + 70) * 30);
            let i = 0;
            while (i < stops.length - 1 && v > stops[i + 1]![0]) i++;
            const [v0, c0] = stops[i]!;
            const [v1, c1] = stops[Math.min(stops.length - 1, i + 1)]!;
            const f =
              v1 > v0 ? Math.max(0, Math.min(1, (v - v0) / (v1 - v0))) : 0;
            const s = f * f * (3 - 2 * f);
            return [
              c0[0] + (c1[0] - c0[0]) * s,
              c0[1] + (c1[1] - c0[1]) * s,
              c0[2] + (c1[2] - c0[2]) * s,
              255,
            ];
          },
          2,
        );
        stars(g, r, W, H, 260);
        for (let i = 0; i < 24; i++) {
          const x = irand(r, 0, W);
          const y = irand(r, 0, H);
          glow(g, x + 0.5, y + 0.5, 6, P.white, 0.3);
          line(g, x - 2.5, y, x + 2.5, y, withAlpha(P.white, 0.7), 0.5);
          line(g, x, y - 2.5, x, y + 2.5, withAlpha(P.white, 0.7), 0.5);
        }
      },
      92,
    ),
  ];
  const mid = (g: Ctx, t: number) => {
    for (let i = 0; i < 30; i++) {
      const s = ((t * (40 + (i % 5) * 20) + i * 97) % (W + 60)) - 30;
      const y = (i * 53) % H;
      rect(
        g,
        s,
        y,
        8 + (i % 4) * 4,
        1,
        withAlpha(P.white, 0.25 + (i % 3) * 0.2),
      );
    }
    const glow = 0.12 + 0.05 * Math.sin(t * 1.5);
    ellipse(g, W / 2, 110, 90, 60, withAlpha(P.magenta, glow));
    ellipse(g, W / 2, 110, 60, 40, withAlpha(P.cyan, glow));
  };
  return { id: "warp", groundY: 140, period, layers, mid };
}

// ─── the overworld: hexagons, tribes, then Game A ────────────────────────

type Hex = {
  cx: number;
  cy: number;
  kind: "grass" | "forest" | "mountain" | "river";
  q: number;
  r: number;
};

function overworld(): Scenery {
  const period = W;
  const R = 13;
  const dx = R * 1.732;
  const dy = R * 1.5;
  const n = noise2d(101, 16);
  const hexes: Hex[] = [];
  for (let row = -1; row <= Math.ceil(H / dy) + 1; row++) {
    for (let col = -1; col <= Math.ceil(W / dx) + 1; col++) {
      const cx = col * dx + (row % 2 ? dx / 2 : 0);
      const cy = row * dy;
      const v = n(cx / 60 + 1, cy / 60 + 1);
      const riv = Math.abs(n(cx / 90 + 7, cy / 90 + 2) - 0.5) < 0.035;
      const kind: Hex["kind"] = riv
        ? "river"
        : v > 0.68
          ? "mountain"
          : v > 0.52
            ? "forest"
            : "grass";
      hexes.push({ cx, cy, kind, q: col, r: row });
    }
  }
  const sorted = [...hexes].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  // settlements: the order tribes appear, then grow into cities
  const rr = rng(102);
  const sites = sorted.filter((h) => h.kind === "grass").sort(() => rr() - 0.5);
  const layers: Layer[] = [
    layer(
      period,
      0,
      (g) => {
        rect(g, 0, 0, W, H, P.olive);
        for (const h of sorted) {
          const base =
            h.kind === "river"
              ? P.waterLight
              : h.kind === "mountain"
                ? "#a8a58a"
                : h.kind === "forest"
                  ? "#6f8a3d"
                  : "#9aa552";
          hexagon(g, h.cx, h.cy, R, base, "#7a8440");
          if (h.kind === "mountain") {
            tri(g, h.cx, h.cy + 5, 14, 11, "#8f8c74");
            tri(g, h.cx, h.cy - 2, 5, 4, P.white);
          } else if (h.kind === "forest") {
            for (const [ox, oy] of [
              [-5, 2],
              [0, -3],
              [5, 3],
              [2, 5],
            ] as [number, number][])
              tri(g, h.cx + ox, h.cy + oy + 2, 5, 6, "#3f5a2c");
          } else if (h.kind === "river") {
            rect(g, h.cx - 6, h.cy, 12, 1, withAlpha(P.white, 0.4));
          }
        }
      },
      103,
    ),
  ];
  const mid = (g: Ctx, t: number, _s: number, p: SceneryParams) => {
    // phase 0..1: tribes appear (up to 12); 1..2: more tribes crowd in (24);
    // 2..3: fields and walls around the oldest; 3..4: armies, fires.
    const ph = p.phase;
    const count = Math.min(
      sites.length,
      Math.floor(ph <= 1 ? ph * 12 : 12 + Math.min(1, ph - 1) * 14),
    );
    for (let i = 0; i < count; i++) {
      const h = sites[i]!;
      const age = ph - (i < 12 ? i / 12 : 1 + (i - 12) / 14);
      if (ph >= 2 && i < 10) {
        const f = Math.min(1, ph - 2);
        hexagon(g, h.cx, h.cy, R - 1, withAlpha("#c9a24f", 0.9 * f), null);
        for (let k = 0; k < 4; k++)
          rect(g, h.cx - 7, h.cy - 5 + k * 3, 14, 1, withAlpha("#8a6a2a", f));
        if (ph >= 2.5) {
          const fw = Math.min(1, (ph - 2.5) * 2);
          rect(g, h.cx - 6, h.cy - 4, 12, 8, withAlpha(P.stoneDeep, fw));
          rect(g, h.cx - 5, h.cy - 3, 10, 6, withAlpha(P.stone, fw));
          rect(g, h.cx - 2, h.cy - 7, 4, 4, withAlpha(P.stoneDeep, fw));
        }
      } else {
        hut(g, h.cx - 4, h.cy + 3, 6, 6, P.clayDeep, P.sand, P.sandDeep);
        hut(g, h.cx + 4, h.cy + 1, 5, 5, P.clayDeep, P.sand, P.sandDeep);
        if (age > 0.3) flame(g, h.cx, h.cy + 6, 3, 4, t, i);
      }
      if (ph >= 3 && i < 10) {
        const f = Math.min(1, ph - 3);
        for (let k = 0; k < 5; k++)
          figure(
            g,
            h.cx - 10 + k * 5,
            h.cy + 12 + (k % 2) * 2,
            withAlpha(P.ink, f),
            withAlpha(P.skinBrown, f),
          );
        if (i % 3 === 0) flame(g, h.cx + 6, h.cy - 6, 6, 9, t, i + 9);
      }
    }
    if (ph >= 3) {
      const f = Math.min(1, ph - 3);
      for (let i = 0; i < 8; i++)
        rect(g, 0, 0, W, H, withAlpha("#5a1a10", 0.012 * f));
    }
  };
  return { id: "overworld", groundY: null, period, layers, mid };
}

function voidScene(): Scenery {
  return {
    id: "void",
    groundY: null,
    period: W,
    layers: [layer(W, 0, (g) => rect(g, 0, 0, W, H, P.black))],
  };
}

const BUILD: Record<SceneryId, () => Scenery> = {
  valley,
  village,
  overworld,
  cradle: () => city("dawn"),
  burning: () => city("ember"),
  metropolis,
  gameb,
  commons,
  worldmap,
  warp,
  void: voidScene,
};
