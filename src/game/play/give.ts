// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The credit comes home. A partner you linked to asks, in the tribe's chat,
// for the very thing you opened to it. Offer it — or not now — and watch
// the tribe's mutual credit: what you received from one tribe is settled by
// what you give another. A balance, not a debt; it flows in circles.

import { drawText } from "../../engine/font";
import { H, W } from "../../engine/screen";
import { CAST } from "../../art/characters";
import { P } from "../../art/palette";
import { rect, withAlpha, type Ctx } from "../../art/paint";
import { hint, inRect, kioskCard, tgMessage } from "../../art/ui";
import { RESOURCES } from "../../story/holons";
import { giveTo, holderOf, ledger, partnerNeed, type Gift } from "../tribe";
import type { Services } from "../types";
import { PlayBase, type PlayInput } from "./types";

type Rect = { x: number; y: number; w: number; h: number };

const CHAT = { x: 8, y: 26, w: 226 };

export class GivePlay extends PlayBase {
  private ask = partnerNeed(this.s.state.tribe);
  private choice: "give" | "later" | null = null;
  private gift: Gift | null = null;
  private keys: Rect[] = [];
  private tt = 0;

  constructor(s: Services) {
    super("give", s);
  }

  protected step(dt: number, _t: number, inp: PlayInput): void {
    if (!this.ask) return this.finish();
    if (this.choice) {
      this.tt += dt;
      if (this.tt > 3 || (this.tt > 1.4 && inp.adv)) this.finish();
      return;
    }
    let i = -1;
    for (const tap of inp.taps)
      this.keys.forEach((r, j) => {
        if (inRect(tap, r)) i = j;
      });
    if (inp.keys.includes("1") || inp.keys.includes("Enter")) i = 0;
    if (inp.keys.includes("2")) i = 1;
    if (i === 0) {
      this.gift = giveTo(this.s.state.tribe, this.ask.from, this.ask.res);
      this.choice = "give";
      this.s.audio.blip(1320);
    } else if (i === 1) {
      this.choice = "later";
      this.s.audio.blip(440);
    }
  }

  protected paint(g: Ctx, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.55));
    const a = this.ask;
    if (!a) return;
    const tribe = this.s.state.tribe;
    const label = RESOURCES[a.res].label;
    // the tribe's chat
    rect(
      g,
      CHAT.x,
      CHAT.y - 14,
      CHAT.w,
      H - CHAT.y + 2,
      withAlpha(P.tgChat, 0.95),
    );
    rect(g, CHAT.x, CHAT.y - 14, CHAT.w, 12, withAlpha(P.tgBubble, 1));
    drawText(
      g,
      `${(tribe.name ?? "YOUR TRIBE").toUpperCase()} - 4 MEMBERS`,
      CHAT.x + 6,
      CHAT.y - 12,
      P.paper,
    );
    const kb = tgMessage(
      g,
      CHAT.x + 6,
      CHAT.y + 4,
      CHAT.w - 12,
      [
        { text: `NEW NEED FROM ${a.from}`, color: P.tgName },
        { text: a.text, color: P.paper },
        {
          text: `THEY SAW ${label} ON YOUR SHELF.`,
          color: withAlpha(P.paper, 0.6),
        },
      ],
      this.choice ? [] : ["OFFER IT", "NOT NOW"],
    );
    if (!this.choice) {
      this.keys = kb;
      hint(g, "OFFER IT, OR NOT NOW", t);
    } else {
      const holder = holderOf(a.res);
      const reply =
        this.choice === "give" && holder
          ? [
              { text: `${CAST[holder].name} OFFERED ${label}.` },
              { text: `${a.from} ACCEPTED. THANK YOU!`, color: P.mint },
            ]
          : [{ text: "NO WORRY. WE WILL ASK THE MESH." }];
      const f = Math.min(1, this.tt / 0.5);
      if (f >= 1)
        tgMessage(
          g,
          CHAT.x + 6,
          CHAT.y + 76,
          CHAT.w - 12,
          reply,
          [],
          this.choice === "give" ? "HOLONSBOT" : a.from,
        );
    }
    this.paintLedger(g);
  }

  private paintLedger(g: Ctx): void {
    const tribe = this.s.state.tribe;
    const x = 240;
    const w = W - x - 8;
    let y = kioskCard(g, x, 30, w, 150, "MUTUAL CREDIT");
    const row = (who: string, sub: string, v: string, c: string) => {
      drawText(g, who.slice(0, 14), x + 8, y, P.paper);
      drawText(g, v, x + w - 8, y, c, { align: "right" });
      drawText(g, sub, x + 8, y + 10, withAlpha(P.paper, 0.55));
      y += 26;
    };
    for (const n of tribe.needs)
      if (n.metBy && n.via !== "tribe")
        row(
          n.metBy,
          `GAVE YOU ${n.res ? RESOURCES[n.res].label : "A HAND"}`,
          "-1",
          P.magenta,
        );
    for (const gv of tribe.given)
      row(gv.to, `GOT ${RESOURCES[gv.res].label}`, "+1", P.mint);
    const b = ledger(tribe);
    rect(g, x + 6, y, w - 12, 1, withAlpha(P.teal, 0.5));
    y += 5;
    drawText(g, "BALANCE", x + 8, y, P.goldPale);
    drawText(
      g,
      b.balance > 0 ? `+${b.balance}` : `${b.balance}`,
      x + w - 8,
      y,
      b.balance < 0 ? P.magenta : P.gold,
      {
        align: "right",
      },
    );
    drawText(
      g,
      b.balance === 0
        ? "SETTLED, IN A CIRCLE"
        : this.gift
          ? ""
          : "SETTLED BY GIVING",
      x + 8,
      y + 12,
      withAlpha(P.paper, 0.6),
    );
  }
}
