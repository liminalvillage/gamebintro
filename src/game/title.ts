// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Title: three overlapping circles become the ~B mark, then the gold title
// on a starfield, as the film opens.

import { drawText } from "../engine/font";
import { H, W } from "../engine/screen";
import { P } from "../art/palette";
import { disc, rect, withAlpha } from "../art/paint";
import { drawScenery, getScenery } from "../art/scenery";
import { bigTitle, button, inRect } from "../art/ui";
import { CHAPTERS, HOLONS_ACT_START } from "../story/script";
import { ChapterScene } from "./chapter";
import { resetState, saveState } from "./state";
import { TerminalScene } from "./terminal";
import type { Scene, Services } from "./types";

export class TitleScene implements Scene {
  private t0 = 0;
  private started = false;
  constructor(private readonly s: Services) {}

  enter(): void {
    this.s.input.flush();
    this.started = false;
    this.s.audio.music("title");
  }

  update(_dt: number, t: number): void {
    if (!this.started) {
      this.t0 = t;
      this.started = true;
    }
    const st = this.s.state;
    const canContinue = st.initiated && st.chapter < CHAPTERS.length;
    const taps = this.s.input.consumeTaps();
    const adv = this.s.input.consumeAdvance();
    if (t - this.t0 < 1.2) return;
    for (const tap of taps)
      if (inRect(tap, this.btnSkip)) return this.skipIntro();
    if (canContinue) {
      for (const tap of taps) {
        if (inRect(tap, this.btnContinue)) return this.continueJourney();
        if (inRect(tap, this.btnNew)) return this.begin();
      }
      if (adv && taps.length === 0) return this.continueJourney();
    } else if (adv) {
      return this.begin();
    }
  }

  /** Straight to the second act: the tribe, built in Holons. */
  private skipIntro(): void {
    const st = this.s.state;
    resetState(st);
    st.initiated = true;
    st.talisman = true;
    st.chapter = HOLONS_ACT_START;
    saveState(st);
    this.s.go(new ChapterScene(this.s, HOLONS_ACT_START));
  }

  private begin(): void {
    resetState(this.s.state);
    this.s.go(new TerminalScene(this.s));
  }

  private continueJourney(): void {
    this.s.go(new ChapterScene(this.s, this.s.state.chapter));
  }

  private btnContinue = { x: 0, y: 0, w: 0, h: 0 };
  private btnNew = { x: 0, y: 0, w: 0, h: 0 };
  private btnSkip = { x: 0, y: 0, w: 0, h: 0 };

  draw(g: CanvasRenderingContext2D, t: number): void {
    const warp = getScenery("warp");
    drawScenery(g, warp, t * 0.3, 0, { phase: 0, fire: 0 });
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.55));
    const a = Math.min(1, (t - this.t0) / 1.2);
    // the three circles: mind, heart, body overlapping into one
    const cx = W / 2;
    const cy = 54;
    const r = 18;
    const spread = (1 - a) * 30 + 10;
    disc(g, cx - spread, cy + 4, r, withAlpha(P.cyan, 0.45));
    disc(g, cx + spread, cy + 4, r, withAlpha(P.magenta, 0.45));
    disc(g, cx, cy - spread * 0.7, r, withAlpha(P.mint, 0.45));
    if (a >= 1) {
      drawText(g, "~B", cx, cy - 3, P.gold, { align: "center", shadow: P.ink });
    }
    if (a >= 1) {
      drawText(g, "AN INITIATION TO", cx, 92, P.goldPale, {
        align: "center",
        shadow: P.goldDeep,
      });
      bigTitle(g, "GAME~B", cx, 104, t);
      drawText(g, "◀◀", cx - 40, 134, P.goldDeep, { align: "center" });
      drawText(g, "▶▶", cx + 40, 134, P.goldDeep, { align: "center" });
      drawText(g, "A HOLONS INTRODUCTION", cx, 150, P.paper, {
        align: "center",
        shadow: P.ink,
      });
      const st = this.s.state;
      const canContinue = st.initiated && st.chapter < CHAPTERS.length;
      if (canContinue) {
        this.btnContinue = button(g, "CONTINUE", cx - 76, 170, true);
        this.btnNew = button(g, "START OVER", cx + 2, 170, false);
        this.btnSkip = button(g, "SKIP INTRO ▶▶", cx + 98, 170, false);
      } else {
        drawText(
          g,
          "TAP TO BEGIN",
          cx,
          172,
          withAlpha(P.paper, 0.6 + 0.4 * Math.sin(t * 4)),
          { align: "center", shadow: P.ink },
        );
        this.btnSkip = button(g, "SKIP INTRO ▶▶", cx, 186, false);
      }
      drawText(
        g,
        "SPACE / TAP: NEXT   ← →: WALK   M: SOUND",
        cx,
        H - 10,
        withAlpha(P.paper, 0.5),
        { align: "center" },
      );
    }
  }
}
