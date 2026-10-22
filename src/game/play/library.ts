// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The library of things: a shelf of shared tools — two of the tribe's, two
// on federated partners' shelves, borrowed just the same. Borrow one, bring
// it back.

import { drawText } from "../../engine/font";
import { H, W } from "../../engine/screen";
import { P } from "../../art/palette";
import { line, rect, withAlpha, type Ctx } from "../../art/paint";
import { button, frame, hint, inRect, talisman } from "../../art/ui";
import { PLAY_OPTIONS } from "../../story/holons";
import { borrow, returnItem } from "../tribe";
import type { Services } from "../types";
import { PlayBase, type PlayInput } from "./types";

type Rect = { x: number; y: number; w: number; h: number };

export class LibraryPlay extends PlayBase {
  private rects: Rect[] = [];
  private btn: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private returned = false;
  private glow = 0;

  constructor(s: Services) {
    super("library", s);
  }

  protected step(dt: number, _t: number, inp: PlayInput): void {
    this.glow = Math.max(0, this.glow - dt);
    const tribe = this.s.state.tribe;
    let i = -1;
    for (const tap of inp.taps) {
      this.rects.forEach((r, j) => {
        if (inRect(tap, r)) i = j;
      });
      if (tribe.borrowed && inRect(tap, this.btn)) i = 99;
    }
    ["1", "2", "3", "4"].forEach((k, j) => {
      if (inp.keys.includes(k)) i = j;
    });
    if (
      tribe.borrowed &&
      (inp.keys.includes("Enter") || inp.keys.includes(" "))
    )
      i = 99;
    if (i < 0) return;
    if (!tribe.borrowed) {
      const item = PLAY_OPTIONS.items[i]?.name;
      if (item && borrow(tribe, item)) {
        this.glow = 1;
        this.s.audio.blip(990);
      }
      return;
    }
    const held = PLAY_OPTIONS.items.findIndex(
      (it) => it.name === tribe.borrowed,
    );
    if (i === 99 || i === held) {
      returnItem(tribe);
      this.returned = true;
      this.s.audio.blip(1320);
      this.finish();
    }
  }

  protected paint(g: Ctx, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.5));
    const tribe = this.s.state.tribe;
    drawText(g, "THE LIBRARY OF THINGS", W / 2, 18, P.paper, {
      align: "center",
      shadow: P.ink,
    });
    // the shelf
    const sx = 40;
    const sw = W - 80;
    rect(g, sx, 100, sw, 3, P.trunk);
    rect(g, sx, 103, sw, 1, withAlpha(P.black, 0.5));
    this.rects = [];
    PLAY_OPTIONS.items.forEach(({ name: item, owner }, i) => {
      const w = 64;
      const x = Math.round(sx + 8 + i * 72);
      const y = 36;
      const held = tribe.borrowed === item;
      const free = !tribe.borrowed;
      const active = free && Math.floor(t * 1.5) % 4 === i;
      frame(
        g,
        x,
        y,
        w,
        63,
        held ? P.gold : active ? P.goldPale : P.goldDeep,
        withAlpha(P.ink, held ? 0.92 : 0.75),
      );
      this.drawIcon(g, i, x + w / 2, y + 20, held ? P.gold : P.paper);
      drawText(g, item, x + w / 2, y + 32, held ? P.gold : P.paper, {
        align: "center",
      });
      drawText(
        g,
        owner ? owner.replace("THE ", "") : "OURS",
        x + w / 2,
        y + 41,
        owner ? P.cyan : withAlpha(P.paper, 0.45),
        { align: "center" },
      );
      if (held) {
        drawText(g, "OUT", x + w / 2, y + 50, P.gold, { align: "center" });
      } else {
        drawText(
          g,
          free ? `FREE (${i + 1})` : "FREE",
          x + w / 2,
          y + 50,
          withAlpha(P.paper, 0.5),
          {
            align: "center",
          },
        );
      }
      this.rects.push({ x, y, w, h: 63 });
    });
    // the talisman already on loan to you
    talisman(g, sx + sw - 6, 84, 6, t, withAlpha(P.gold, 0.6));
    if (tribe.borrowed) {
      frame(g, 40, 108, W - 80, 42, P.gold, withAlpha(P.ink, 0.92));
      drawText(g, `${tribe.borrowed}: BORROWED BY YOU`, W / 2, 114, P.gold, {
        align: "center",
      });
      drawText(g, "RETURN BY THE NEXT MOON", W / 2, 124, P.paper, {
        align: "center",
      });
      this.btn = button(
        g,
        "RETURN IT",
        W / 2,
        134,
        Math.floor(t * 2) % 2 === 0,
      );
      hint(g, "TAP RETURN", t);
    } else if (this.returned) {
      drawText(g, "RETURNED WHOLE. THANK YOU.", W / 2, 120, P.goldPale, {
        align: "center",
      });
    } else {
      drawText(
        g,
        "OURS AND OUR PARTNERS': EVERYTHING HERE IS SHARED",
        W / 2,
        120,
        withAlpha(P.paper, 0.7),
        {
          align: "center",
        },
      );
      hint(g, "TAP ONE TO BORROW", t);
    }
  }

  private drawIcon(g: Ctx, i: number, cx: number, cy: number, c: string): void {
    if (i === 0) {
      // saw
      rect(g, cx - 10, cy - 2, 16, 3, c);
      for (let k = 0; k < 8; k++) rect(g, cx - 10 + k * 2, cy + 1, 1, 1, c);
      rect(g, cx + 6, cy - 4, 4, 7, P.sand);
    } else if (i === 1) {
      // ladder
      rect(g, cx - 5, cy - 9, 1, 18, c);
      rect(g, cx + 4, cy - 9, 1, 18, c);
      for (let k = 0; k < 4; k++) rect(g, cx - 5, cy - 7 + k * 5, 10, 1, c);
    } else if (i === 2) {
      // cart
      rect(g, cx - 8, cy - 4, 14, 6, c);
      rect(g, cx - 7, cy + 3, 3, 3, P.sand);
      rect(g, cx + 2, cy + 3, 3, 3, P.sand);
      line(g, cx + 6, cy - 2, cx + 10, cy - 7, c);
    } else {
      // tent
      line(g, cx - 10, cy + 6, cx, cy - 8, c);
      line(g, cx + 10, cy + 6, cx, cy - 8, c);
      rect(g, cx - 10, cy + 6, 21, 1, c);
      line(g, cx, cy - 8, cx, cy + 6, withAlpha(c, 0.5));
    }
  }
}
