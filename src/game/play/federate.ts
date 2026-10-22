// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Federation, as a handshake. Your hexagon in the middle, three partner
// tribes around it, each showing what it would open to you. Tap one: it
// opens its shelf, and you choose what of yours to open in return. Your
// half of the link goes out, theirs comes back — and their things fly
// down into the "in reach" shelf, which grows with every link.

import { drawText, measure } from "../../engine/font";
import { H, W } from "../../engine/screen";
import { CAST } from "../../art/characters";
import { P } from "../../art/palette";
import {
  disc,
  hexagon,
  line,
  rect,
  withAlpha,
  type Ctx,
} from "../../art/paint";
import { hint, inRect, kioskCard, pill } from "../../art/ui";
import { PLAY_OPTIONS, RESOURCES, type Resource } from "../../story/holons";
import { federate, inReach, openNeed, type Steward } from "../tribe";
import type { Services } from "../types";
import { PlayBase, type PlayInput } from "./types";

type Rect = { x: number; y: number; w: number; h: number };

type Partner = {
  name: string;
  has: Resource[];
  x: number;
  y: number;
  /** idle → asked (you chose) → linked; `t` times the handshake + the flight. */
  state: "idle" | "asked" | "linked";
  t: number;
};

const CX = W / 2;
const CY = 92;
const R = 14;
const SPOTS = [
  { x: CX + 112, y: 54 },
  { x: CX + 112, y: 126 },
  { x: CX - 120, y: 90 },
];
const YOURS: Steward[] = ["sage", "matriarch", "chief"];
/** Your half takes this long to arrive, theirs as long again. */
const HALF = 0.6;
const FLY = 0.8;
const SHELF_Y = 160;

export class FederatePlay extends PlayBase {
  private ps: Partner[] = PLAY_OPTIONS.partners.map((p, i) => ({
    name: p.name,
    has: p.has,
    x: SPOTS[i]!.x,
    y: SPOTS[i]!.y,
    state: this.s.state.tribe.links.includes(p.name) ? "linked" : "idle",
    t: 9,
  }));
  /** The partner whose shelf is open, waiting for your half. */
  private asking: Partner | null = null;
  private picks: Rect[] = [];
  private card: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private lastLink = 0;

  constructor(s: Services) {
    super("federate", s);
  }

  protected step(dt: number, _t: number, inp: PlayInput): void {
    const tribe = this.s.state.tribe;
    if (this.asking) {
      let i = -1;
      let outside = false;
      for (const tap of inp.taps) {
        this.picks.forEach((r, j) => {
          if (inRect(tap, r)) i = j;
        });
        if (i < 0 && !inRect(tap, this.card)) outside = true;
      }
      ["1", "2", "3"].forEach((k, j) => {
        if (inp.keys.includes(k)) i = j;
      });
      if (i >= 0) {
        const who = YOURS[i]!;
        this.asking.state = "asked";
        this.asking.t = 0;
        this.pending.set(this.asking, PLAY_OPTIONS.stewardHas[who]);
        this.asking = null;
        this.s.audio.blip(880);
      } else if (outside || inp.keys.includes("Escape")) this.asking = null;
    } else {
      let pick: Partner | undefined;
      for (const tap of inp.taps)
        for (const p of this.ps)
          if (Math.hypot(tap.x - p.x, tap.y - p.y) <= R + 12) pick = p;
      ["1", "2", "3"].forEach((k, j) => {
        if (inp.keys.includes(k)) pick = this.ps[j];
      });
      if (pick && pick.state === "idle") {
        this.asking = pick;
        this.s.audio.blip(660);
      }
    }
    for (const p of this.ps) {
      p.t += dt;
      if (p.state === "asked" && p.t >= HALF * 2) {
        federate(tribe, p.name, this.pending.get(p)!);
        p.state = "linked";
        p.t = 0;
        this.lastLink = 0;
        this.s.audio.blip(1320);
      }
    }
    this.lastLink += dt;
    if (this.ps.every((p) => p.state === "linked") && this.lastLink > FLY + 0.6)
      this.finish();
  }

  private pending = new Map<Partner, Resource>();

  protected paint(g: Ctx, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.ink, 0.45));
    const tribe = this.s.state.tribe;
    const need = openNeed(tribe);
    drawText(g, "LINK TO THE TRIBES AROUND YOU", W / 2, 20, P.paper, {
      align: "center",
      shadow: P.ink,
    });
    if (need)
      drawText(g, `YOUR NEED: ${need.text}`, W / 2, 31, P.magenta, {
        align: "center",
        shadow: P.ink,
      });
    // the halves of each link
    for (const p of this.ps) {
      if (p.state === "idle") continue;
      const mine = p.state === "linked" ? 1 : Math.min(1, p.t / HALF);
      line(g, CX, CY, CX + (p.x - CX) * mine, CY + (p.y - CY) * mine, P.gold);
      const theirs =
        p.state === "linked" ? 1 : Math.max(0, (p.t - HALF) / HALF);
      if (theirs > 0)
        line(
          g,
          p.x,
          p.y + 2,
          p.x + (CX - p.x) * theirs,
          p.y + 2 + (CY - p.y) * theirs,
          P.cyan,
        );
      const mx = Math.round(CX + (p.x - CX) * 0.62);
      const my = Math.round(CY + (p.y - CY) * 0.62) - 10;
      if (p.state === "asked")
        drawText(
          g,
          theirs > 0 ? `${p.name} SAYS YES` : "YOUR HALF...",
          mx,
          my,
          theirs > 0 ? P.cyan : P.goldPale,
          { align: "center", shadow: P.ink },
        );
    }
    // the partners, each showing what it would open
    this.ps.forEach((p, i) => {
      const linked = p.state === "linked";
      hexagon(g, p.x, p.y, R, withAlpha(P.ink, 0.8), linked ? P.cyan : P.paper);
      if (p.state === "idle" && !this.asking && Math.floor(t * 1.5) % 3 === i)
        hexagon(g, p.x, p.y, R + 4, null, withAlpha(P.gold, 0.6));
      drawText(
        g,
        linked ? "LINKED" : `(${i + 1})`,
        p.x,
        p.y - 3,
        linked ? P.cyan : withAlpha(P.paper, 0.6),
        {
          align: "center",
        },
      );
      drawText(g, p.name, p.x, p.y + R + 4, linked ? P.cyan : P.paper, {
        align: "center",
        shadow: P.ink,
      });
      const opens = p.has.map((r) => RESOURCES[r].label).join(" + ");
      const caption = linked ? `SHARES ${opens}` : `HAS ${opens}`;
      // centred under the hexagon, but kept on screen
      const half = measure(caption) / 2;
      drawText(
        g,
        caption,
        Math.round(Math.max(4 + half, Math.min(W - 4 - half, p.x))),
        p.y + R + 13,
        linked ? P.goldPale : withAlpha(P.paper, 0.6),
        { align: "center", shadow: P.ink },
      );
    });
    // you
    for (let i = 0; i < 3; i++)
      hexagon(
        g,
        CX,
        CY,
        R + i * 5 + Math.round(Math.sin(t * 2 + i)),
        null,
        withAlpha(P.gold, 0.9 - i * 0.3),
      );
    hexagon(g, CX, CY, R, withAlpha(P.ink, 0.8), P.gold);
    drawText(
      g,
      (tribe.name ?? "YOUR TRIBE").toUpperCase(),
      CX,
      CY + R + 8,
      P.gold,
      {
        align: "center",
        shadow: P.ink,
      },
    );
    this.paintShelf(g, t);
    if (this.asking) this.paintAsk(g, this.asking);
    else if (this.ps.some((p) => p.state === "idle"))
      hint(g, "TAP A TRIBE TO LINK", t);
  }

  /** The shelf of everything in reach, growing as their things fly in. */
  private paintShelf(g: Ctx, t: number): void {
    const tribe = this.s.state.tribe;
    const need = openNeed(tribe);
    const reach = inReach(tribe);
    rect(g, 4, SHELF_Y, W - 8, H - SHELF_Y - 14, withAlpha(P.glass, 0.92));
    rect(g, 4, SHELF_Y, W - 8, 1, withAlpha(P.teal, 0.6));
    const found = reach.find(
      (r) => r.res === need?.res && r.via === "federation",
    );
    drawText(g, `IN REACH: ${reach.length} THINGS`, 10, SHELF_Y + 4, P.teal);
    if (found)
      drawText(
        g,
        `${found.from} HAS ${RESOURCES[found.res].label}!`,
        W - 10,
        SHELF_Y + 4,
        P.gold,
        {
          align: "right",
        },
      );
    let x = 10;
    const y = SHELF_Y + 16;
    for (const r of reach) {
      const label = RESOURCES[r.res].label;
      const w = measure(label) + 8;
      const p = this.ps.find((q) => q.name === r.from);
      const f = p ? Math.min(1, p.t / FLY) : 1;
      // flying in from the partner's hexagon
      const ex = Math.round(p ? p.x + (x - p.x) * f : x);
      const ey = Math.round(p ? p.y + (y - p.y) * f : y);
      const hit = need?.res === r.res && r.via === "federation";
      const col = r.via === "tribe" ? P.paper : hit ? P.gold : P.cyan;
      rect(
        g,
        ex,
        ey,
        w,
        11,
        withAlpha(col, hit && f >= 1 ? 0.3 + 0.15 * Math.sin(t * 6) : 0.14),
      );
      drawText(g, label, ex + 4, ey + 2, col);
      if (f < 1) disc(g, ex - 2, ey + 5, 1, P.goldPale);
      x += w + 3;
    }
  }

  /** Their shelf, open; you choose what of yours to open in return. */
  private paintAsk(g: Ctx, p: Partner): void {
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.4));
    const x = 56;
    const w = W - 112;
    const h = 112;
    const y0 = 40;
    this.card = { x, y: y0, w, h };
    let y = kioskCard(g, x, y0, w, h, `${p.name} OPENS ITS SHELF TO YOU`);
    let cx = x + 8;
    for (const r of p.has) cx += pill(g, RESOURCES[r].label, cx, y, true).w + 4;
    y += 20;
    drawText(g, "A LINK HAS TWO HALVES. WHAT WILL YOU", x + 8, y, P.paper);
    drawText(g, "OPEN OF YOURS TO THEM?", x + 8, y + 10, P.paper);
    y += 24;
    this.picks = [];
    YOURS.forEach((who, i) => {
      const res = PLAY_OPTIONS.stewardHas[who];
      const r = pill(
        g,
        `(${i + 1}) ${RESOURCES[res].label}`,
        x + 8 + i * 88,
        y,
        false,
      );
      drawText(
        g,
        CAST[who].name.replace("THE ", ""),
        r.x + 2,
        y + 16,
        withAlpha(CAST[who].color, 0.8),
      );
      this.picks.push({ ...r, h: 26 });
    });
    hint(g, "CHOOSE WHAT YOU OPEN (1 2 3)", 0);
  }
}
