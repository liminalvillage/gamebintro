// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The need travels. First the kiosk's "Where should this need travel?" —
// to the public map (the hexagons around yours) and/or to the federation
// (the partners you linked). Then it ripples out, ring by ring, and along
// each link; whoever has it answers. Accept one offer: the handoff, and a
// balance that moves both ways — mutual credit, not debt.

import { drawText } from "../../engine/font";
import { H, W } from "../../engine/screen";
import { CAST, type CharacterId } from "../../art/characters";
import { P } from "../../art/palette";
import {
  disc,
  hexagon,
  line,
  rect,
  ring,
  withAlpha,
  type Ctx,
} from "../../art/paint";
import { hint, inRect, kioskCard, pill } from "../../art/ui";
import { PLAY_OPTIONS } from "../../story/holons";
import {
  askNeed,
  meetNeed,
  offerHours,
  offersFor,
  openNeed,
  type Need,
  type Offer,
} from "../tribe";
import type { Services } from "../types";
import { PlayBase, type PlayInput } from "./types";

type Rect = { x: number; y: number; w: number; h: number };

// the map, left: your hexagon and two rings around it
const MX = 98;
const MY = 112;
const CR = 12;
const STEP = Math.sqrt(3) * CR;
const RIPPLE = 2.4;
const REACH = 3 * STEP;

function cells(): { x: number; y: number; ring: number }[] {
  const out: { x: number; y: number; ring: number }[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k;
    out.push({
      x: MX + Math.cos(a) * STEP,
      y: MY + Math.sin(a) * STEP,
      ring: 1,
    });
  }
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k;
    out.push({
      x: MX + Math.cos(a) * STEP * 2,
      y: MY + Math.sin(a) * STEP * 2,
      ring: 2,
    });
    const b = a + Math.PI / 6;
    out.push({
      x: MX + Math.cos(b) * STEP * Math.sqrt(3),
      y: MY + Math.sin(b) * STEP * Math.sqrt(3),
      ring: 2,
    });
  }
  return out;
}
const CELLS = cells();
/** Which cell each near holon sits on (km 2 → ring 1, farther → ring 2). */
const NEAR_CELL = [0, 3, 8];
/** Partners sit beyond the map's edge, reached by their link. */
const PARTNER_AT = [
  { x: 28, y: 40 },
  { x: 160, y: 46 },
  { x: 30, y: 186 },
];

const who = (from: string): string =>
  from in CAST ? CAST[from as CharacterId].name : from;

export class CastPlay extends PlayBase {
  private stage: "share" | "cast" | "settled" = "share";
  private share = { map: true, federation: true };
  private need: Need;
  private offers: Offer[] = [];
  private shown = 0;
  private ct = 0;
  private picked: Offer | null = null;
  private rows: Rect[] = [];
  private toggles: Rect[] = [];
  private btn: Rect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(s: Services) {
    super("cast", s);
    const t = s.state.tribe;
    this.need =
      openNeed(t) ??
      askNeed(t, PLAY_OPTIONS.needs[0]!.text, PLAY_OPTIONS.needs[0]!.res)!;
  }

  /** When an offer's answer reaches you, in seconds after casting. */
  private arrival(o: Offer): number {
    if (o.via === "tribe") return 0.3;
    if (o.via === "near") {
      const i = PLAY_OPTIONS.nearby.findIndex((n) => n.name === o.from);
      const c = CELLS[NEAR_CELL[i] ?? 0]!;
      return (Math.hypot(c.x - MX, c.y - MY) / REACH) * RIPPLE + 0.2;
    }
    const i = PLAY_OPTIONS.partners.findIndex((p) => p.name === o.from);
    return 1.1 + i * 0.35;
  }

  protected step(dt: number, _t: number, inp: PlayInput): void {
    if (this.stage === "share") {
      let toggle = -1;
      let go = inp.keys.includes("Enter");
      for (const tap of inp.taps) {
        this.toggles.forEach((r, i) => {
          if (inRect(tap, r)) toggle = i;
        });
        if (inRect(tap, this.btn)) go = true;
      }
      if (inp.keys.includes("1")) toggle = 0;
      if (inp.keys.includes("2")) toggle = 1;
      if (toggle === 0) this.share.federation = !this.share.federation;
      if (toggle === 1) this.share.map = !this.share.map;
      if (toggle >= 0) this.s.audio.blip(660);
      if (go && (this.share.map || this.share.federation)) {
        this.offers = offersFor(this.s.state.tribe, this.need, this.share);
        this.stage = "cast";
        this.ct = 0;
        this.shown = 0;
        this.s.audio.blip(880);
      }
      return;
    }
    if (this.stage === "cast") {
      this.ct += dt;
      const before = this.shown;
      this.shown = this.offers.filter((o) => this.arrival(o) <= this.ct).length;
      if (this.shown > before) this.s.audio.blip(1180);
      const settled = this.ct > RIPPLE + 0.4;
      let i = -1;
      for (const tap of inp.taps) {
        this.rows.forEach((r, j) => {
          if (j < this.shown && inRect(tap, r)) i = j;
        });
        if (settled && this.offers.length === 0 && inRect(tap, this.btn))
          this.stage = "share";
      }
      ["1", "2", "3", "4"].forEach((k, j) => {
        if (j < this.shown && inp.keys.includes(k)) i = j;
      });
      const o = this.offers[i];
      if (o) {
        meetNeed(this.need, o);
        this.picked = o;
        this.stage = "settled";
        this.ct = 0;
        this.s.audio.blip(1320);
      }
      return;
    }
    this.ct += dt;
    if (this.ct > 2.2 || (this.ct > 0.8 && inp.adv)) this.finish();
  }

  protected paint(g: Ctx, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.5));
    if (this.stage === "share") return this.paintShare(g, t);
    this.paintMap(g, t);
    this.paintOffers(g, t);
  }

  private paintShare(g: Ctx, t: number): void {
    const x = 36;
    const w = W - 72;
    let y = kioskCard(g, x, 30, w, 156, "WHERE SHOULD THIS NEED TRAVEL?");
    rect(g, x + 8, y, w - 16, 16, withAlpha(P.magenta, 0.1));
    rect(g, x + 8, y, 2, 16, P.magenta);
    drawText(g, "NEED", x + 16, y + 5, P.magenta);
    drawText(g, this.need.text, x + 48, y + 5, P.paper);
    y += 24;
    const links = this.s.state.tribe.links.length;
    const rows: [boolean, string, string][] = [
      [
        this.share.federation,
        "FEDERATION PARTNERS",
        links
          ? `VISIBLE TO ${links} FEDERATED TRIBES`
          : "NO PARTNERS FEDERATED YET",
      ],
      [
        this.share.map,
        "PUBLIC MAP (YOUR HEX)",
        "LIGHTS THE HEXAGONS AROUND YOURS",
      ],
    ];
    this.toggles = [];
    rows.forEach(([on, label, sub], i) => {
      const ry = y + i * 30;
      rect(g, x + 8, ry, w - 16, 26, withAlpha(P.teal, on ? 0.14 : 0.04));
      // the switch
      rect(g, x + 14, ry + 8, 16, 9, on ? P.teal : withAlpha(P.paper, 0.2));
      disc(g, on ? x + 25 : x + 18, ry + 12, 3, on ? P.glass : P.paper);
      drawText(
        g,
        label,
        x + 38,
        ry + 4,
        on ? P.paper : withAlpha(P.paper, 0.6),
      );
      drawText(g, sub, x + 38, ry + 14, withAlpha(P.paper, 0.5));
      drawText(g, `(${i + 1})`, x + w - 14, ry + 9, withAlpha(P.paper, 0.4), {
        align: "right",
      });
      this.toggles.push({ x: x + 8, y: ry, w: w - 16, h: 26 });
    });
    const any = this.share.map || this.share.federation;
    this.btn = pill(g, "SHARE", x + w - 54, 30 + 156 - 20, any);
    hint(g, any ? "TAP SHARE" : "PICK AT LEAST ONE", t);
  }

  private paintMap(g: Ctx, t: number): void {
    const casting = this.stage === "cast";
    const r = casting ? Math.min(1, this.ct / RIPPLE) * REACH : REACH;
    rect(g, 0, 0, 190, H, withAlpha(P.ink, 0.55));
    drawText(g, "THE NEED TRAVELS", MX, 20, P.paper, {
      align: "center",
      shadow: P.ink,
    });
    // federation links, out past the edge of the map
    PLAY_OPTIONS.partners.forEach((p, i) => {
      const at = PARTNER_AT[i]!;
      const linked = this.s.state.tribe.links.includes(p.name);
      line(g, MX, MY, at.x, at.y, withAlpha(P.gold, linked ? 0.45 : 0.12));
      if (linked && this.share.federation && casting) {
        const f = Math.min(1, this.ct / (1.1 + i * 0.35));
        disc(
          g,
          Math.round(MX + (at.x - MX) * f),
          Math.round(MY + (at.y - MY) * f),
          2,
          P.magenta,
        );
      }
      const answered = this.offers.some(
        (o, j) => j < this.shown && o.from === p.name,
      );
      hexagon(
        g,
        at.x,
        at.y,
        9,
        withAlpha(P.ink, 0.85),
        answered ? P.gold : linked ? P.cyan : withAlpha(P.paper, 0.3),
      );
      drawText(
        g,
        p.name,
        at.x,
        at.y + 12,
        linked ? P.cyan : withAlpha(P.paper, 0.4),
        {
          align: "center",
          shadow: P.ink,
        },
      );
    });
    // the hexagons around yours
    CELLS.forEach((c) => {
      const reached = this.share.map && Math.hypot(c.x - MX, c.y - MY) <= r;
      hexagon(
        g,
        Math.round(c.x),
        Math.round(c.y),
        CR - 1,
        withAlpha(reached ? P.magenta : P.ink, reached ? 0.14 : 0.5),
        withAlpha(P.teal, reached ? 0.7 : 0.3),
      );
    });
    PLAY_OPTIONS.nearby.forEach((n, i) => {
      const c = CELLS[NEAR_CELL[i]!]!;
      const answered = this.offers.some(
        (o, j) => j < this.shown && o.from === n.name,
      );
      disc(g, Math.round(c.x), Math.round(c.y), 3, answered ? P.gold : P.paper);
      if (answered) {
        ring(
          g,
          Math.round(c.x),
          Math.round(c.y),
          6 + Math.round(Math.sin(t * 6)),
          withAlpha(P.gold, 0.7),
        );
        drawText(g, n.name, Math.round(c.x), Math.round(c.y) + 8, P.gold, {
          align: "center",
          shadow: P.ink,
        });
      }
    });
    if (this.share.map && casting && r < REACH)
      ring(g, MX, MY, Math.round(r), withAlpha(P.magenta, 0.8));
    // the scale labels
    drawText(g, "2 KM", MX + STEP + 4, MY - STEP - 6, withAlpha(P.paper, 0.45));
    drawText(
      g,
      "6 KM",
      MX + STEP * 2 + 6,
      MY - STEP * 2 + 2,
      withAlpha(P.paper, 0.45),
    );
    // you
    hexagon(g, MX, MY, CR - 1, withAlpha(P.gold, 0.25), P.gold);
    disc(g, MX, MY, 2, P.magenta);
  }

  private paintOffers(g: Ctx, t: number): void {
    const x = 196;
    const w = W - x - 8;
    let y = kioskCard(
      g,
      x,
      30,
      w,
      166,
      this.stage === "settled" ? "ACCEPTED - HANDOFF" : "OFFERS RECEIVED",
    );
    this.rows = [];
    if (this.stage === "settled" && this.picked) {
      const p = this.picked;
      const f = Math.min(1, this.ct / 0.6);
      drawText(g, this.need.text, x + 8, y, P.magenta);
      drawText(g, `FROM ${who(p.from)}`, x + 8, y + 11, P.paper);
      if (f < 1) return;
      y += 32;
      rect(g, x + 8, y, w - 16, 44, withAlpha(P.black, 0.35));
      drawText(g, "MUTUAL CREDIT", x + 14, y + 5, P.goldPale);
      const tribeName = (this.s.state.tribe.name ?? "YOUR TRIBE").toUpperCase();
      drawText(g, tribeName.slice(0, 16), x + 14, y + 17, P.paper);
      drawText(g, "-1", x + w - 14, y + 17, P.magenta, { align: "right" });
      drawText(g, who(p.from).slice(0, 16), x + 14, y + 28, P.paper);
      drawText(g, "+1", x + w - 14, y + 28, P.mint, { align: "right" });
      drawText(
        g,
        "A BALANCE, NOT A DEBT.",
        x + 8,
        y + 54,
        withAlpha(P.paper, 0.7),
      );
      return;
    }
    for (let i = 0; i < this.shown; i++) {
      const o = this.offers[i]!;
      const ry = y + i * 30;
      const r = { x: x + 6, y: ry, w: w - 12, h: 26 };
      rect(g, r.x, r.y, r.w, r.h, withAlpha(P.teal, 0.1));
      rect(
        g,
        r.x,
        r.y,
        2,
        r.h,
        o.via === "federation" ? P.cyan : o.via === "near" ? P.teal : P.gold,
      );
      drawText(g, who(o.from), r.x + 6, r.y + 4, P.paper);
      // how far it is decides how long the handoff takes
      const h = offerHours(o);
      const where =
        o.via === "near"
          ? `${o.km} KM, ${h}H`
          : o.via === "federation"
            ? `LINKED, ${h}H`
            : "OURS, NOW";
      drawText(
        g,
        `${o.what} - ${where}`,
        r.x + 6,
        r.y + 15,
        withAlpha(P.paper, 0.6),
      );
      drawText(
        g,
        `(${i + 1})`,
        r.x + r.w - 4,
        r.y + 4,
        withAlpha(P.teal, 0.9),
        {
          align: "right",
        },
      );
      this.rows.push(r);
    }
    const settled = this.ct > RIPPLE + 0.4;
    if (this.shown === 0)
      drawText(
        g,
        settled ? "NOBODY HAS ANSWERED." : "LISTENING...",
        x + 8,
        y,
        withAlpha(P.paper, 0.6),
      );
    if (settled && this.offers.length === 0) {
      drawText(g, "SHARE IT FURTHER:", x + 8, y + 12, withAlpha(P.paper, 0.6));
      drawText(
        g,
        "LINK TRIBES, OR THE MAP.",
        x + 8,
        y + 22,
        withAlpha(P.paper, 0.6),
      );
      this.btn = pill(g, "SHARE AGAIN", x + 8, y + 36, true);
      hint(g, "TAP SHARE AGAIN", t);
    } else if (this.shown > 0) hint(g, "TAP AN OFFER TO ACCEPT", t);
  }
}
