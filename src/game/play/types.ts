// SPDX-License-Identifier: AGPL-3.0-or-later
//
// A "play" is one Holons feature met by doing it once in the sandbox tribe.
// The chapter hands it the frame's input and lets it draw over the scene;
// when it is done it names the idea in a ribbon and waits for a tap.

import type { Tap } from "../../engine/input";
import { drawParagraph, drawText } from "../../engine/font";
import { H, W } from "../../engine/screen";
import { P } from "../../art/palette";
import { hexagon, rect, withAlpha, type Ctx } from "../../art/paint";
import { frame, hint } from "../../art/ui";
import { PLAY_MEANS, type PlayId } from "../../story/holons";
import { saveState } from "../state";
import type { Services } from "../types";

export type PlayInput = {
  taps: Tap[];
  keys: string[];
  adv: boolean;
  typed: { chars: string[]; backspaces: number; submits: number };
};

export interface Play {
  enter?(): void;
  exit?(): void;
  update(dt: number, t: number, inp: PlayInput): void;
  draw(g: Ctx, t: number): void;
  readonly done: boolean;
}

/** Common shell: the interaction, then the ribbon, then done on a tap. */
export abstract class PlayBase implements Play {
  done = false;
  protected ribbon = -1;
  protected age = 0;

  constructor(
    protected readonly id: PlayId,
    protected readonly s: Services,
  ) {}

  protected abstract step(dt: number, t: number, inp: PlayInput): void;
  protected abstract paint(g: Ctx, t: number): void;

  /** Called by the interaction when the player has done the thing. */
  protected finish(): void {
    if (this.ribbon >= 0) return;
    this.ribbon = 0;
    saveState(this.s.state);
    this.s.audio.chime();
  }

  update(dt: number, t: number, inp: PlayInput): void {
    this.age += dt;
    if (this.ribbon >= 0) {
      this.ribbon += dt;
      if (this.ribbon > 0.8 && inp.adv) this.done = true;
      return;
    }
    this.step(dt, t, inp);
  }

  draw(g: Ctx, t: number): void {
    this.paint(g, t);
    if (this.ribbon >= 0) this.drawRibbon(g, t);
  }

  private drawRibbon(g: Ctx, t: number): void {
    const f = Math.min(1, this.ribbon / 0.4);
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.45 * f));
    const h = 78;
    const y = Math.round(H / 2 - h / 2 - 6 + (1 - f) * 12);
    frame(g, 16, y, W - 32, h, P.gold, withAlpha(P.ink, 0.92 * f));
    if (f < 1) return;
    const info = PLAY_MEANS[this.id];
    for (let i = 0; i < 3; i++)
      hexagon(
        g,
        38,
        y + 30,
        8 + i * 6 + Math.round(Math.sin(t * 2 + i) * 1),
        null,
        withAlpha(i === 0 ? P.gold : P.cyan, 0.9 - i * 0.25),
      );
    drawText(g, info.title, 62, y + 10, P.gold, { shadow: P.ink });
    drawParagraph(g, info.line, 62, y + 24, W - 32 - 56, P.paper);
    if (this.ribbon > 0.8) hint(g, "TAP ▶", t);
  }
}

/** A tappable chip in the terminal's style; returns its rect. */
export function chip(
  g: Ctx,
  text: string,
  x: number,
  y: number,
  color: string,
  active = false,
): { x: number; y: number; w: number; h: number } {
  const w = text.length * 6 + 8;
  rect(g, x, y, w, 11, withAlpha(color, active ? 0.3 : 0.12));
  rect(g, x, y, 1, 11, withAlpha(color, 0.8));
  drawText(g, text, x + 4, y + 2, withAlpha(color, active ? 1 : 0.85));
  return { x, y, w, h: 11 };
}
