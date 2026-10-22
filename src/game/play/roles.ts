// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Roles: welcome each steward into the tribe; each takes the seat of their
// wisdom. The player already sits in the role they chose. Drawn as the
// kiosk's Roles tab: one row per seat, a pill to fill it.

import { drawText } from "../../engine/font";
import { H, W } from "../../engine/screen";
import { CAST, portrait } from "../../art/characters";
import { P } from "../../art/palette";
import { rect, withAlpha, type Ctx } from "../../art/paint";
import { hint, inRect, kioskCard, pill } from "../../art/ui";
import { allSeated, seatRole, STEWARD_OF, type Steward } from "../tribe";
import type { Wisdom } from "../../story/holons";
import type { Services } from "../types";
import { PlayBase, type PlayInput } from "./types";

const CARDS: { k: Wisdom; title: string; color: string; keys: string[] }[] = [
  { k: "mind", title: "MIND", color: P.cyan, keys: ["1", "m", "M"] },
  { k: "heart", title: "HEART", color: P.magenta, keys: ["2", "h", "H"] },
  { k: "body", title: "BODY", color: P.mint, keys: ["3", "b", "B"] },
];

export class RolesPlay extends PlayBase {
  private rects: {
    r: { x: number; y: number; w: number; h: number };
    k: Wisdom;
  }[] = [];
  private flash: Record<Wisdom, number> = { mind: 0, heart: 0, body: 0 };

  constructor(s: Services) {
    super("roles", s);
  }

  protected step(dt: number, _t: number, inp: PlayInput): void {
    for (const k of CARDS)
      this.flash[k.k] = Math.max(0, this.flash[k.k] - dt * 2);
    const tribe = this.s.state.tribe;
    for (const tap of inp.taps)
      for (const r of this.rects) if (inRect(tap, r.r)) this.seat(r.k);
    for (const c of CARDS)
      if (c.keys.some((k) => inp.keys.includes(k))) this.seat(c.k);
    if (allSeated(tribe)) this.finish();
  }

  private seat(k: Wisdom): void {
    const tribe = this.s.state.tribe;
    if (tribe.seated.includes(k)) return;
    seatRole(tribe, k);
    this.flash[k] = 1;
    this.s.audio.blip(k === "mind" ? 1320 : k === "heart" ? 990 : 660);
  }

  protected paint(g: Ctx, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.45));
    const tribe = this.s.state.tribe;
    const x = 24;
    const w = W - 48;
    let y = kioskCard(
      g,
      x,
      28,
      w,
      156,
      `${(tribe.name ?? "YOUR TRIBE").toUpperCase()} - ROLES`,
      ["TASKS", "LIBRARY", "NEEDS & OFFERS", "ROLES"],
      3,
    );
    const row = (
      who: Steward | "pioneer",
      wisdom: string,
      color: string,
      name: string,
      flash: number,
    ) => {
      rect(g, x + 6, y, w - 12, 24, withAlpha(P.teal, 0.06 + 0.3 * flash));
      rect(g, x + 6, y, 2, 24, color);
      if (who !== "pioneer") {
        rect(g, x + 12, y + 2, 20, 20, CAST[who].backdrop);
        g.drawImage(portrait(who).canvas, x + 13, y + 3, 18, 18);
      } else {
        rect(g, x + 12, y + 2, 20, 20, withAlpha(P.gold, 0.25));
        drawText(g, "YOU", x + 22, y + 8, P.gold, { align: "center" });
      }
      drawText(g, wisdom, x + 40, y + 4, color);
      drawText(g, name, x + 40, y + 14, withAlpha(P.paper, 0.7));
    };
    // your own seat, already taken
    const mine = this.s.state.role;
    row(
      "pioneer",
      mine ? mine.toUpperCase() : "PIONEER",
      P.gold,
      "YOU, THE PIONEER",
      0,
    );
    drawText(g, "SEATED", x + w - 14, y + 9, P.gold, { align: "right" });
    y += 27;
    this.rects = [];
    CARDS.forEach((c, i) => {
      const who: Steward = STEWARD_OF[c.k];
      const seated = tribe.seated.includes(c.k);
      row(who, c.title, c.color, CAST[who].name, this.flash[c.k]);
      if (seated)
        drawText(g, "SEATED", x + w - 14, y + 9, c.color, { align: "right" });
      else {
        const label = `(${i + 1}) SEAT`;
        const on = Math.floor(t * 1.5) % 3 === i;
        pill(g, label, x + w - 14 - (label.length * 6 + 11), y + 6, on);
      }
      this.rects.push({ r: { x: x + 6, y, w: w - 12, h: 24 }, k: c.k });
      y += 27;
    });
    const n = tribe.seated.length;
    drawText(g, `${n + 1} OF 4 PLAYERS PRESENT`, W / 2, 190, P.paper, {
      align: "center",
      shadow: P.ink,
    });
    if (!allSeated(tribe)) hint(g, "TAP EACH SEAT", t);
  }
}
