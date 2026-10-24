// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Back at the desk, and then where this all lands: Holons. The tribe you
// built, the shape its play left on the amulet (the Octalysis octagon), the mesh with
// the real links and tonight's lunation, then the credits. The act already taught each idea by
// doing it, so the ending only sums up. The links are real anchors laid
// over the canvas.

import { drawParagraph, drawText, LINE_H, wrap } from "../engine/font";
import { H, W } from "../engine/screen";
import { CAST } from "../art/characters";
import { P } from "../art/palette";
import { hexagon, rect, withAlpha } from "../art/paint";
import { drawScenery, getScenery } from "../art/scenery";
import {
  amulet,
  button,
  driveLabels,
  exitChip,
  fade,
  glitch,
  hint,
  inRect,
  talisman,
} from "../art/ui";
import {
  CREDITS,
  LINKS,
  MESH_IN_HOLONS,
  MOON_TONIGHT,
  PURPOSES,
  RESOURCES,
  TRIBE_PAGE,
} from "../story/holons";
import { AROUND, OCTALYSIS_PAGE } from "../story/octalysis";
import { driveLevels } from "./drives";
import { lunationAt } from "./lunation";
import { saveState } from "./state";
import { EQUATION_KEYS, ledger, type Tribe } from "./tribe";
import { TitleScene } from "./title";
import type { Scene, Services } from "./types";

type Page = "desk" | "tribe" | "drives" | "mesh" | "credits";
const ORDER: Page[] = ["desk", "tribe", "drives", "mesh", "credits"];

/** The octagon on the drives page. */
const OCT = { x: W / 2, y: 92, r: 40 };

export class FinaleScene implements Scene {
  private page: Page = "desk";
  private timer = 0;
  private shown = 0;
  private meshPhase = 0;
  private anchors: HTMLAnchorElement[] = [];
  private rects: { x: number; y: number; w: number; h: number }[] = [];
  private again = { x: 0, y: 0, w: 0, h: 0 };
  private nextBtn = { x: 0, y: 0, w: 0, h: 0 };
  private creditsY = H;
  /** Characters the tribe page types out in all; a tap finishes it first. */
  private tribeTotal = 0;

  constructor(private readonly s: Services) {}

  enter(): void {
    this.s.input.flush();
    this.s.state.chapter = 0;
    saveState(this.s.state);
    this.s.audio.music("finale");
    this.timer = 0;
  }

  exit(): void {
    this.clearAnchors();
  }

  private clearAnchors(): void {
    for (const a of this.anchors) a.remove();
    this.anchors = [];
  }

  private ensureAnchors(): void {
    if (this.anchors.length) return;
    const host = document.getElementById("links");
    if (!host) return;
    for (const l of LINKS) {
      const a = document.createElement("a");
      a.href = l.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = l.label;
      host.appendChild(a);
      this.anchors.push(a);
    }
  }

  private layoutAnchors(): void {
    this.anchors.forEach((a, i) => {
      const r = this.rects[i];
      if (!r) return;
      const w = this.s.screen.toWindow(r.x, r.y, r.w, r.h);
      a.style.left = `${w.left}px`;
      a.style.top = `${w.top}px`;
      a.style.width = `${w.width}px`;
      a.style.height = `${w.height}px`;
    });
  }

  private goPage(p: Page): void {
    this.page = p;
    this.timer = 0;
    this.shown = 0;
    this.s.input.flush();
    if (p !== "mesh") this.clearAnchors();
    if (p === "credits") this.creditsY = H;
  }

  update(dt: number, t: number): void {
    void t;
    this.timer += dt;
    const taps = this.s.input.consumeTaps();
    const adv = this.s.input.consumeAdvance();
    const keys = this.s.input.consumeKeys();
    if (keys.includes("Escape") || taps.some((p) => inRect(p, this.exitBtn)))
      return this.s.go(new TitleScene(this.s));
    if (this.page === "desk") {
      this.shown += dt * 30;
      if (adv && this.timer > 1.5) this.goPage("tribe");
      return;
    }
    if (this.page === "tribe" || this.page === "drives") {
      this.shown += dt * 60;
      for (const tap of taps)
        if (inRect(tap, this.nextBtn))
          return this.goPage(ORDER[ORDER.indexOf(this.page) + 1]!);
      if (adv && taps.length === 0 && this.timer > 0.6) {
        if (this.page === "tribe" && this.shown < this.tribeTotal)
          this.shown = this.tribeTotal;
        else this.goPage(ORDER[ORDER.indexOf(this.page) + 1]!);
      }
      return;
    }
    if (this.page === "mesh") {
      this.meshPhase = Math.min(1, this.meshPhase + dt / 5);
      this.ensureAnchors();
      this.layoutAnchors();
      for (const tap of taps) {
        if (inRect(tap, this.again)) return this.goPage("credits");
        // link rects: the anchors above the canvas receive the click; nothing to do here
      }
      return;
    }
    if (this.page === "credits") {
      this.creditsY -= dt * 14;
      const end = this.creditsY + CREDITS.length * (LINE_H + 3);
      if (end < 0 || (adv && this.timer > 1)) {
        this.s.go(new TitleScene(this.s));
      }
    }
  }

  draw(g: CanvasRenderingContext2D, t: number): void {
    this.drawPage(g, t);
    this.exitBtn = exitChip(g);
  }

  private exitBtn = { x: 0, y: 0, w: 0, h: 0 };

  private drawPage(g: CanvasRenderingContext2D, t: number): void {
    switch (this.page) {
      case "desk":
        return this.drawDesk(g, t);
      case "tribe":
        return this.drawTribe(g, t);
      case "drives":
        return this.drawDrives(g, t);
      case "mesh":
        return this.drawMesh(g, t);
      case "credits":
        return this.drawCredits(g, t);
    }
  }

  private drawDesk(g: CanvasRenderingContext2D, t: number): void {
    rect(g, 0, 0, W, H, P.black);
    const lines = [
      ">You have been initiated.",
      ">The parasite will wake again. It always does.",
      ">Return to the symbol of wholeness.",
      ">Find the others.",
    ];
    let y = 40;
    let left = Math.floor(this.shown);
    for (const l of lines) {
      const lim = Math.max(0, Math.min(l.length, left));
      drawText(g, l, 20, y, P.terminal, { limit: lim });
      left -= l.length + 8;
      y += 16;
    }
    if (this.timer < 1) glitch(g, t, 1 - this.timer);
    talisman(
      g,
      W - 30,
      36,
      12,
      t,
      withAlpha(P.gold, Math.min(1, this.timer / 2)),
    );
    if (left > 0) hint(g, "TAP", t);
  }

  /** What the second act built, row by row, each named as Holons names it. */
  private drawTribe(g: CanvasRenderingContext2D, t: number): void {
    drawScenery(g, getScenery("gameb"), t * 0.5, 0, { phase: 0, fire: 0 });
    rect(g, 0, 0, W, H, withAlpha(P.ink, 0.72));
    const tr: Tribe = this.s.state.tribe;
    drawText(g, TRIBE_PAGE.title, W / 2, 8, P.gold, {
      align: "center",
      shadow: P.ink,
    });
    for (let i = 0; i < 3; i++)
      hexagon(g, 40, 56, 10 + i * 8, null, withAlpha(P.gold, 0.9 - i * 0.3));
    drawText(g, (tr.name ?? TRIBE_PAGE.unnamed).toUpperCase(), 40, 86, P.gold, {
      align: "center",
      shadow: P.ink,
    });
    if (tr.purpose) {
      drawText(g, TRIBE_PAGE.rows.purpose, 40, 98, P.goldPale, {
        align: "center",
      });
      wrap(PURPOSES[tr.purpose].label, 60).forEach((l, i) =>
        drawText(g, l, 40, 108 + i * LINE_H, P.paper, { align: "center" }),
      );
    }
    const done = tr.quests.filter((q) => q.done);
    const hours = done.reduce((s, q) => s + q.hours, 0);
    const thanks = done.filter((q) => q.appreciated).length;
    const need = tr.needs.find((n) => n.metBy) ?? tr.needs[0];
    const from = (m: string) =>
      m in CAST ? CAST[m as keyof typeof CAST].name : m;
    const bal = ledger(tr);
    const gift = tr.given[0];
    const needRow = !need
      ? "NONE ASKED YET"
      : need.metBy
        ? `${need.text} FROM ${from(need.metBy)}${
            need.via === "federation"
              ? ", ACROSS THE FEDERATION"
              : need.via === "near"
                ? ", A NEARBY HEXAGON"
                : ""
          }.${
            gift ? ` GAVE ${RESOURCES[gift.res].label} TO ${gift.to}.` : ""
          } CREDIT BALANCE ${bal.balance > 0 ? "+" : ""}${bal.balance}.`
        : `${need.text}: STILL OPEN`;
    const eq = tr.equation
      ? EQUATION_KEYS.map(
          (k) => `${k.slice(0, 1).toUpperCase()} ${tr.equation![k]}`,
        ).join("  ")
      : "NOT YET WEIGHED";
    const rows: [string, string][] = [
      [TRIBE_PAGE.rows.needs, needRow],
      [
        TRIBE_PAGE.rows.members,
        `${tr.seated.length + 1} PLAYERS, ${tr.seated.length} STEWARD ROLES SEATED`,
      ],
      [
        TRIBE_PAGE.rows.links,
        tr.links.length ? `LINKED TO ${tr.links.join(", ")}` : "NO LINKS YET",
      ],
      [
        TRIBE_PAGE.rows.quests,
        `${done.length} DONE, ${hours} HOURS, ${thanks} APPRECIATED`,
      ],
      [
        TRIBE_PAGE.rows.library,
        tr.borrowedEver.length
          ? `${tr.borrowedEver.join(", ")} BORROWED AND RETURNED`
          : "NOTHING BORROWED YET",
      ],
      [TRIBE_PAGE.rows.equation, eq],
    ];
    let y = 24;
    let left = Math.floor(this.shown);
    this.tribeTotal = rows.reduce(
      (s, [l, v]) => s + l.length + v.length + 2,
      0,
    );
    rows.forEach(([label, value]) => {
      drawText(g, label, 92, y, P.goldPale, { limit: Math.max(0, left) });
      left -= label.length + 1;
      const n = drawParagraph(g, value, 92, y + LINE_H, W - 104, P.paper, {
        limit: Math.max(0, left),
      });
      left -= value.length + 1;
      y += (n + 1) * LINE_H + 4;
    });
    drawText(g, TRIBE_PAGE.footer, W / 2, H - 20, P.gold, {
      align: "center",
      shadow: P.ink,
    });
    this.nextBtn = button(g, "NEXT ▶", W - 40, H - 44, true);
  }

  /**
   * The shape the act left on the Octalysis octagon: each drive's wedge as
   * full as the tribe woke it, white hat on top, black hat below, and one
   * sentence on what that means. Nothing to operate: look, then go on.
   */
  private drawDrives(g: CanvasRenderingContext2D, t: number): void {
    drawScenery(g, getScenery("commons"), t * 0.5, 0, { phase: 0, fire: 0 });
    rect(g, 0, 0, W, H, withAlpha(P.ink, 0.78));
    drawText(g, OCTALYSIS_PAGE.title, W / 2, 8, P.gold, {
      align: "center",
      shadow: P.ink,
    });
    const lv = driveLevels(this.s.state.tribe);
    const f = Math.min(1, this.timer / 1.2);
    const grown = Object.fromEntries(
      AROUND.map((d) => [d, lv[d] * f]),
    ) as typeof lv;
    amulet(g, OCT.x, OCT.y, OCT.r, grown, t);
    driveLabels(g, OCT.x, OCT.y, OCT.r, lv);
    drawParagraph(g, OCTALYSIS_PAGE.footer, 16, 156, W - 112, P.paper, {
      shadow: P.ink,
    });
    drawText(g, OCTALYSIS_PAGE.credit, 16, H - 12, withAlpha(P.paper, 0.45));
    this.nextBtn = button(g, "NEXT ▶", W - 40, H - 24, true);
  }

  private drawMesh(g: CanvasRenderingContext2D, t: number): void {
    drawScenery(g, getScenery("worldmap"), t, 0, {
      phase: this.meshPhase,
      fire: 0,
    });
    const top = [...MESH_IN_HOLONS, MOON_TONIGHT.village];
    const topH = top.reduce(
      (h, l) => h + wrap(l, W - 20).length * LINE_H + 4,
      18,
    );
    rect(g, 0, 0, W, topH, withAlpha(P.ink, 0.72));
    drawText(g, "THE MESH", W / 2, 6, P.gold, {
      align: "center",
      shadow: P.ink,
    });
    let y = 18;
    top.forEach((l, i) => {
      const col = i === top.length - 1 ? P.goldPale : P.paper;
      const n = drawParagraph(g, l, 10, y, W - 20, col, { shadow: P.ink });
      y += n * LINE_H + 4;
    });
    const moon = lunationAt(Date.now());
    rect(g, 0, H - 68, W, 68, withAlpha(P.ink, 0.78));
    drawParagraph(
      g,
      MOON_TONIGHT.line(moon.index, moon.day, moon.days),
      10,
      H - 64,
      W - 20,
      P.goldPale,
      { shadow: P.ink },
    );
    // three links in a row, then the year in moons beside the credits
    this.rects = [];
    const lit = Math.floor(t * 1.5) % LINKS.length;
    LINKS.forEach((l, i) => {
      const cx = i < 3 ? Math.round(W / 6 + (i * W) / 3) : Math.round(W / 3);
      const by = i < 3 ? H - 40 : H - 20;
      this.rects.push(button(g, l.label, cx, by, lit === i));
    });
    this.again = button(g, "CREDITS", Math.round((2 * W) / 3), H - 20, false);
  }

  private drawCredits(g: CanvasRenderingContext2D, t: number): void {
    drawScenery(g, getScenery("warp"), t * 0.3, 0, { phase: 0, fire: 0 });
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.6));
    CREDITS.forEach((l, i) => {
      const y = Math.round(this.creditsY + i * (LINE_H + 3));
      if (y < -10 || y > H) return;
      const big = i === 0 || l === "THIS GAME" || l === "AFTER THE FILM";
      drawText(g, l, W / 2, y, big ? P.gold : P.paper, {
        align: "center",
        shadow: P.ink,
      });
    });
    fade(g, Math.max(0, 1 - this.timer));
  }
}
