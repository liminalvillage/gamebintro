// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Found the tribe: give the holon a name — typed through the hidden input
// (so phones raise their keyboard), or one of the suggested names.

import { ADVANCE, drawText } from "../../engine/font";
import { H, W } from "../../engine/screen";
import { P } from "../../art/palette";
import { hexagon, rect, withAlpha, type Ctx } from "../../art/paint";
import { frame, hint, inRect } from "../../art/ui";
import { PLAY_OPTIONS } from "../../story/holons";
import { foundTribe, NAME_MAX } from "../tribe";
import type { Services } from "../types";
import { chip, PlayBase, type PlayInput } from "./types";

export class FoundPlay extends PlayBase {
  private name = "";
  private chips: {
    r: { x: number; y: number; w: number; h: number };
    text: string;
  }[] = [];
  private shake = 0;

  constructor(s: Services) {
    super("found", s);
  }

  enter(): void {
    this.s.input.setTextMode(true);
  }

  exit(): void {
    this.s.input.setTextMode(false);
  }

  protected step(dt: number, _t: number, inp: PlayInput): void {
    this.shake = Math.max(0, this.shake - dt * 3);
    for (const ch of inp.typed.chars)
      if (this.name.length < NAME_MAX) this.name += ch;
    if (inp.typed.backspaces)
      this.name = this.name.slice(
        0,
        Math.max(0, this.name.length - inp.typed.backspaces),
      );
    for (const tap of inp.taps)
      for (const c of this.chips)
        if (inRect(tap, c.r)) return this.found(c.text);
    if (inp.typed.submits) this.found(this.name);
  }

  private found(name: string): void {
    if (!foundTribe(this.s.state.tribe, name)) {
      this.shake = 1;
      this.s.audio.sting();
      return;
    }
    this.s.input.setTextMode(false);
    this.finish();
  }

  protected paint(g: Ctx, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.5));
    const name = this.s.state.tribe.name;
    if (name) {
      for (let i = 0; i < 3; i++)
        hexagon(
          g,
          W / 2,
          52,
          14 + i * 8,
          null,
          withAlpha(P.gold, 0.9 - i * 0.3),
        );
      drawText(g, name.toUpperCase(), W / 2, 80, P.gold, {
        align: "center",
        shadow: P.ink,
      });
      drawText(g, "IS FOUNDED", W / 2, 92, P.paper, { align: "center" });
      return;
    }
    drawText(g, "NAME YOUR TRIBE", W / 2, 24, P.paper, {
      align: "center",
      shadow: P.ink,
    });
    const bx = W / 2 - 100 + Math.round(Math.sin(t * 40) * 3 * this.shake);
    frame(g, bx, 40, 200, 22, this.shake > 0 ? P.red : P.gold);
    const shown = `>${this.name.toUpperCase()}`;
    drawText(g, shown, bx + 10, 47, P.terminal);
    if (Math.floor(t * 2) % 2 === 0)
      rect(g, bx + 10 + shown.length * ADVANCE, 46, 5, 9, P.terminal);
    drawText(g, "OR TAP ONE:", W / 2, 76, withAlpha(P.paper, 0.7), {
      align: "center",
    });
    this.chips = [];
    PLAY_OPTIONS.names.forEach((n, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = W / 2 - 110 + col * 112;
      const y = 90 + row * 16;
      this.chips.push({ r: chip(g, n, x, y, P.terminal), text: n });
    });
    hint(g, "TYPE A NAME, THEN ENTER", t);
  }
}
