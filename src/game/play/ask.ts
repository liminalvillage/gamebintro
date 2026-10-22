// SPDX-License-Identifier: AGPL-3.0-or-later
//
// A need, said out loud inside the holon just founded. The kiosk's "Ask for
// something" form — typed through the hidden input (so phones raise their
// keyboard), or one of the suggested needs. Once posted, each member looks
// on their own shelf: a tribe alone never holds enough.

import { ADVANCE, drawText } from "../../engine/font";
import { H, W } from "../../engine/screen";
import { CAST, portrait } from "../../art/characters";
import { P } from "../../art/palette";
import { rect, withAlpha, type Ctx } from "../../art/paint";
import { hint, inRect, kioskCard, pill } from "../../art/ui";
import { PLAY_OPTIONS, RESOURCES } from "../../story/holons";
import { askNeed, NEED_MAX, type Need, type Steward } from "../tribe";
import type { Services } from "../types";
import { PlayBase, type PlayInput } from "./types";

type Rect = { x: number; y: number; w: number; h: number };

const X = 36;
const Y = 30;
const CW = W - 72;
const MEMBERS: Steward[] = ["sage", "matriarch", "chief"];
/** Seconds between each member looking on their shelf. */
const LOOK = 0.7;

export class AskPlay extends PlayBase {
  private text = "";
  private need: Need | null = null;
  private chips: { r: Rect; i: number }[] = [];
  private askBtn: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private shake = 0;
  private posted = 0;

  constructor(s: Services) {
    super("ask", s);
  }

  enter(): void {
    this.s.input.setTextMode(true);
  }

  exit(): void {
    this.s.input.setTextMode(false);
  }

  protected step(dt: number, _t: number, inp: PlayInput): void {
    this.shake = Math.max(0, this.shake - dt * 3);
    if (this.need) {
      this.posted += dt;
      const all = 0.6 + MEMBERS.length * LOOK;
      if (this.posted > all + 1.2 || (this.posted > all && inp.adv))
        this.finish();
      else if (inp.adv && this.posted < all) this.posted = all;
      return;
    }
    for (const ch of inp.typed.chars)
      if (this.text.length < NEED_MAX) this.text += ch;
    if (inp.typed.backspaces)
      this.text = this.text.slice(
        0,
        Math.max(0, this.text.length - inp.typed.backspaces),
      );
    for (const tap of inp.taps) {
      for (const c of this.chips)
        if (inRect(tap, c.r)) {
          const o = PLAY_OPTIONS.needs[c.i]!;
          return this.ask(o.text, o.res);
        }
      if (inRect(tap, this.askBtn)) return this.ask(this.text);
    }
    if (inp.typed.submits) this.ask(this.text);
  }

  private ask(
    text: string,
    res?: (typeof PLAY_OPTIONS.needs)[number]["res"],
  ): void {
    const tribe = this.s.state.tribe;
    const n = res ? askNeed(tribe, text, res) : askNeed(tribe, text);
    if (!n) {
      this.shake = 1;
      this.s.audio.sting();
      return;
    }
    this.need = n;
    this.text = n.text;
    this.posted = 0;
    this.s.input.setTextMode(false);
    this.s.audio.blip(880);
  }

  protected paint(g: Ctx, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.5));
    const holon = (this.s.state.tribe.name ?? "YOUR TRIBE").toUpperCase();
    let y = kioskCard(
      g,
      X,
      Y,
      CW,
      150,
      `ASK ${holon}`,
      ["TASKS", "LIBRARY", "NEEDS & OFFERS", "ROLES"],
      2,
    );
    // the field
    const fx = X + 8 + Math.round(Math.sin(t * 40) * 3 * this.shake);
    const fw = CW - 16;
    rect(g, fx, y, fw, 16, withAlpha(P.black, 0.45));
    rect(
      g,
      fx,
      y + 15,
      fw,
      1,
      this.shake > 0 ? P.red : this.need ? P.teal : withAlpha(P.teal, 0.6),
    );
    if (this.text) {
      drawText(g, this.text.toUpperCase(), fx + 5, y + 5, P.paper);
      if (!this.need && Math.floor(t * 2) % 2 === 0)
        rect(g, fx + 5 + this.text.length * ADVANCE, y + 4, 5, 9, P.teal);
    } else {
      drawText(
        g,
        "A LADDER FOR A WEEK, SEEDS, A RIDE...",
        fx + 5,
        y + 5,
        withAlpha(P.paper, 0.35),
      );
      if (Math.floor(t * 2) % 2 === 0) rect(g, fx + 5, y + 4, 1, 9, P.teal);
    }
    y += 24;
    if (this.need) {
      // posted: the need's card, as the board lists it
      rect(g, X + 8, y, CW - 16, 34, withAlpha(P.magenta, 0.1));
      rect(g, X + 8, y, 2, 34, P.magenta);
      drawText(g, "NEED", X + 16, y + 5, P.magenta);
      drawText(g, this.need.text, X + 48, y + 5, P.paper);
      drawText(g, "REQUESTED", X + CW - 14, y + 5, P.goldPale, {
        align: "right",
      });
      drawText(
        g,
        `SHARED WITH ${holon}: 4 MEMBERS SEE IT`,
        X + 16,
        y + 19,
        withAlpha(P.paper, 0.6),
      );
      // each member looks on their own shelf
      MEMBERS.forEach((who, i) => {
        const f = this.posted - 0.6 - i * LOOK;
        if (f < 0) return;
        const cx = X + 8 + i * 100;
        const cy = y + 42;
        rect(g, cx, cy, 20, 20, CAST[who].backdrop);
        g.drawImage(portrait(who).canvas, cx + 1, cy + 1, 18, 18);
        const res = PLAY_OPTIONS.stewardHas[who];
        drawText(
          g,
          `HAS ${RESOURCES[res].label}`,
          cx + 25,
          cy + 2,
          CAST[who].color,
        );
        if (f > 0.35) {
          const hit = this.need!.res === res;
          drawText(
            g,
            hit ? "TOO LITTLE" : "NOT THIS",
            cx + 25,
            cy + 12,
            hit ? P.goldPale : withAlpha(P.paper, 0.55),
          );
        }
      });
      return;
    }
    drawText(g, "OR ONE OF THESE:", X + 8, y, withAlpha(P.paper, 0.6));
    y += 11;
    this.chips = [];
    PLAY_OPTIONS.needs.forEach((n, i) => {
      const cx = X + 8 + (i % 2) * 150;
      const cy = y + Math.floor(i / 2) * 17;
      this.chips.push({ r: pill(g, n.text, cx, cy, false), i });
    });
    this.askBtn = pill(
      g,
      "ASK",
      X + CW - 40,
      Y + 150 - 20,
      this.text.trim().length > 0,
    );
    hint(g, "TYPE WHAT YOU NEED, OR TAP ONE", t);
  }
}
