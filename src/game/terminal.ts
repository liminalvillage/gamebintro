// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The prologue: a cursor on a black screen. The player asks the questions
// (their own, or one of the film's), the machine answers in riddles, and
// then makes the offer: "Would you like to play Game~B?"

import { ADVANCE, drawText, LINE_H, wrap } from "../engine/font";
import { H, W } from "../engine/screen";
import { portrait } from "../art/characters";
import { P } from "../art/palette";
import { disc, rect, withAlpha } from "../art/paint";
import { drawScenery, getScenery } from "../art/scenery";
import { button, exitChip, fade, glitch, inRect } from "../art/ui";
import {
  PROLOGUE_OFFER,
  PROLOGUE_QUESTIONS,
  PROLOGUE_REPLIES,
} from "../story/script";
import { ChapterScene } from "./chapter";
import { saveState } from "./state";
import { TitleScene } from "./title";
import type { Scene, Services } from "./types";

type Line = { text: string; shown: number; color: string; typing: boolean };

export class TerminalScene implements Scene {
  private lines: Line[] = [];
  private input = "";
  private asked = 0;
  private mode: "ask" | "reply" | "offer" | "refused" | "glitch" | "vision" =
    "ask";
  private timer = 0;
  private cursor = 0;
  private suggestions: string[] = [...PROLOGUE_QUESTIONS];
  private chips: {
    r: { x: number; y: number; w: number; h: number };
    text: string;
  }[] = [];
  private yes = { x: 0, y: 0, w: 0, h: 0 };
  private no = { x: 0, y: 0, w: 0, h: 0 };
  private glitchT = 0;

  constructor(private readonly s: Services) {}

  enter(): void {
    this.s.input.flush();
    this.s.input.setTextMode(true);
    this.s.audio.music("terminal");
    this.push("> ask a question_", P.terminal, false);
    this.lines.pop();
  }

  exit(): void {
    this.s.input.setTextMode(false);
  }

  private push(text: string, color: string, typing = true): Line {
    const l: Line = { text, shown: typing ? 0 : text.length, color, typing };
    this.lines.push(l);
    if (this.lines.length > 9) this.lines.shift();
    return l;
  }

  private submit(q: string): void {
    const text = q.trim();
    if (!text) return;
    this.push(`>${text}`, P.terminal, false);
    this.input = "";
    this.asked++;
    this.suggestions = this.suggestions.filter((s) => s !== text);
    this.mode = "reply";
    this.timer = 0;
    if (this.asked >= 3) {
      this.push(PROLOGUE_OFFER, P.terminal);
    } else {
      this.push(
        PROLOGUE_REPLIES[(this.asked - 1) % PROLOGUE_REPLIES.length]!,
        P.terminal,
      );
    }
  }

  update(dt: number, t: number): void {
    this.cursor = t;
    const typed = this.s.input.consumeTyped();
    const taps = this.s.input.consumeTaps();
    const adv = this.s.input.consumeAdvance();
    if (
      this.s.input.consumeKeys().includes("Escape") ||
      taps.some((p) => inRect(p, this.exitBtn))
    )
      return this.s.go(new TitleScene(this.s));

    // typewriter on the last line
    const last = this.lines[this.lines.length - 1];
    if (last && last.typing && last.shown < last.text.length) {
      last.shown += dt * 40;
      if (last.shown >= last.text.length) last.shown = last.text.length;
      if (adv && this.mode !== "ask") last.shown = last.text.length;
      return;
    }

    if (this.mode === "ask") {
      for (const ch of typed.chars)
        if (this.input.length < 60) this.input += ch;
      if (typed.backspaces)
        this.input = this.input.slice(
          0,
          Math.max(0, this.input.length - typed.backspaces),
        );
      for (const tap of taps) {
        for (const c of this.chips)
          if (inRect(tap, c.r)) return this.submit(c.text);
      }
      if (typed.submits) this.submit(this.input);
      return;
    }
    if (this.mode === "reply") {
      this.timer += dt;
      if (this.asked >= 3) {
        this.mode = "offer";
      } else if (this.timer > 0.4) {
        this.mode = "ask";
      }
      return;
    }
    if (this.mode === "offer") {
      for (const tap of taps) {
        if (inRect(tap, this.yes)) return this.accept();
        if (inRect(tap, this.no)) return this.refuse();
      }
      // typed letters arrive through the hidden input, not the key set
      const letters = typed.chars.map((c) => c.toLowerCase());
      if (letters.includes("y") || typed.submits) return this.accept();
      if (letters.includes("n")) return this.refuse();
      return;
    }
    if (this.mode === "refused") {
      this.timer += dt;
      if (this.timer > 2.2) {
        this.push(PROLOGUE_OFFER, P.terminal);
        this.mode = "offer";
      }
      return;
    }
    if (this.mode === "glitch") {
      this.glitchT += dt;
      if (this.glitchT > 2.4) {
        this.mode = "vision";
        this.timer = 0;
        this.s.audio.music("warp");
      }
      return;
    }
    if (this.mode === "vision") {
      this.timer += dt;
      if (this.timer > 4.5 || (adv && this.timer > 1)) {
        this.s.state.initiated = true;
        this.s.state.chapter = 0;
        saveState(this.s.state);
        this.s.go(new ChapterScene(this.s, 0));
      }
    }
  }

  private accept(): void {
    this.push(">YES", P.terminal, false);
    this.mode = "glitch";
    this.glitchT = 0;
    this.s.audio.sting();
    this.s.audio.stopMusic(0.3);
  }

  private refuse(): void {
    this.push(">NO", P.terminal, false);
    this.push(
      "The parasite thanks you for your loyalty.",
      withAlpha(P.terminal, 0.7),
    );
    this.mode = "refused";
    this.timer = 0;
  }

  draw(g: CanvasRenderingContext2D, t: number): void {
    this.drawPage(g, t);
    this.exitBtn = exitChip(g);
  }

  private exitBtn = { x: 0, y: 0, w: 0, h: 0 };

  private drawPage(g: CanvasRenderingContext2D, t: number): void {
    rect(g, 0, 0, W, H, P.black);
    if (this.mode === "vision") {
      this.drawVision(g, t);
      return;
    }
    const x0 = 14;
    let y = 18;
    const maxW = W - 28;
    for (const l of this.lines) {
      const lines = wrap(l.text, maxW);
      let remaining = Math.floor(l.shown);
      for (const ln of lines) {
        const lim = Math.max(0, Math.min(ln.length, remaining));
        drawText(g, ln, x0, y, l.color, { limit: lim });
        remaining -= ln.length + 1;
        y += LINE_H + 1;
      }
      y += 4;
    }
    if (
      this.mode === "ask" &&
      this.lines.every((l) => l.shown >= l.text.length)
    ) {
      const prompt = `>${this.input}`;
      drawText(g, prompt, x0, y, P.terminal);
      if (Math.floor(this.cursor * 2) % 2 === 0)
        rect(g, x0 + prompt.length * ADVANCE, y - 1, 5, 9, P.terminal);
      // suggested questions as chips along the bottom
      this.chips = [];
      let cy = H - 54;
      let cx = x0;
      for (const q of this.suggestions.slice(0, 4)) {
        const w = q.length * ADVANCE + 8;
        if (cx + w > W - 8) {
          cx = x0;
          cy += 13;
        }
        if (cy > H - 14) break;
        rect(g, cx, cy, w, 11, withAlpha(P.terminal, 0.12));
        rect(g, cx, cy, 1, 11, withAlpha(P.terminal, 0.6));
        drawText(g, q, cx + 4, cy + 2, withAlpha(P.terminal, 0.85));
        this.chips.push({ r: { x: cx, y: cy, w, h: 11 }, text: q });
        cx += w + 6;
      }
      drawText(
        g,
        "TYPE A QUESTION, OR TAP ONE",
        W - 8,
        H - 10,
        withAlpha(P.terminal, 0.5),
        { align: "right" },
      );
    }
    if (this.mode === "offer") {
      const by = Math.min(H - 30, y + 6);
      this.yes = button(
        g,
        "YES",
        W / 2 - 36,
        by,
        Math.floor(t * 2) % 2 === 0,
        P.terminal,
      );
      this.no = button(g, "NO", W / 2 + 36, by, false, P.terminal);
    }
    if (this.mode === "glitch") {
      const k = Math.min(1, this.glitchT / 1.2);
      glitch(g, t, k);
      fade(g, Math.max(0, (this.glitchT - 1.6) / 0.8));
    }
  }

  private drawVision(g: CanvasRenderingContext2D, t: number): void {
    drawScenery(g, getScenery("warp"), t, 0, { phase: 0, fire: 0 });
    const f = Math.min(1, this.timer / 1.5);
    const ids = ["chief", "sage", "matriarch"] as const;
    const xs = [W / 2 - 84, W / 2, W / 2 + 84];
    ids.forEach((id, i) => {
      const spr = portrait(id);
      const scale = 3;
      const x = xs[i]! - (spr.w * scale) / 2;
      const y = 56 + Math.sin(t * 1.5 + i) * 3 + (1 - f) * 30;
      const glow = id === "chief" ? P.red : id === "sage" ? P.gold : P.white;
      disc(g, xs[i]!, y + 34, 40, withAlpha(glow, 0.18 * f));
      g.globalAlpha = f;
      g.drawImage(
        spr.canvas,
        Math.round(x),
        Math.round(y),
        spr.w * scale,
        spr.h * scale,
      );
      g.globalAlpha = 1;
    });
    if (this.timer > 2)
      drawText(g, "YOU HAVE BEEN INITIATED.", W / 2, 176, P.paper, {
        align: "center",
        shadow: P.ink,
      });
    fade(g, Math.max(0, (this.timer - 3.6) / 0.9));
  }
}
