// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The value equation: four terms that must share 100 points; the tribe's
// standings re-rank live as the player weighs them. Then propose it, and
// the stewards vote. Drawn as the kiosk does it: the equation editor in the
// Flows settings, the Status leaderboard re-ranking beside it.

import { drawText, measure } from "../../engine/font";
import { H, W } from "../../engine/screen";
import { CAST } from "../../art/characters";
import { P } from "../../art/palette";
import { rect, withAlpha, type Ctx } from "../../art/paint";
import { hint, inRect, kioskCard, pill } from "../../art/ui";
import {
  adoptEquation,
  EQUATION_KEYS,
  evenEquation,
  rank,
  rebalance,
  type Equation,
  type EquationKey,
  type Member,
} from "../tribe";
import type { Services } from "../types";
import { PlayBase, type PlayInput } from "./types";

type Rect = { x: number; y: number; w: number; h: number };

const LABEL: Record<EquationKey, string> = {
  hours: "HOURS",
  money: "MONEY",
  participation: "PARTICIPATION",
  appreciation: "APPRECIATION",
};
const COLOR: Record<EquationKey, string> = {
  hours: P.mint,
  money: P.gold,
  participation: P.cyan,
  appreciation: P.magenta,
};
const VOTERS: Exclude<Member, "pioneer">[] = ["sage", "matriarch", "chief"];
const STEP = 10;

export class EquationPlay extends PlayBase {
  private eq: Equation = evenEquation();
  private stage: "weigh" | "vote" = "weigh";
  private votes = 0;
  private voteT = 0;
  private minus: Rect[] = [];
  private plus: Rect[] = [];
  private propose: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private touched = false;

  constructor(s: Services) {
    super("equation", s);
  }

  protected step(dt: number, _t: number, inp: PlayInput): void {
    if (this.stage === "weigh") {
      for (const tap of inp.taps) {
        EQUATION_KEYS.forEach((k, i) => {
          if (inRect(tap, this.minus[i]!)) this.move(k, -STEP);
          if (inRect(tap, this.plus[i]!)) this.move(k, STEP);
        });
        if (this.touched && inRect(tap, this.propose)) this.startVote();
      }
      ["1", "2", "3", "4"].forEach((key, i) => {
        if (inp.keys.includes(key)) this.move(EQUATION_KEYS[i]!, STEP);
      });
      if (
        this.touched &&
        (inp.keys.includes("Enter") || inp.keys.includes(" "))
      )
        this.startVote();
      return;
    }
    this.voteT += dt;
    if (this.votes < VOTERS.length && this.voteT > 0.7) {
      this.voteT = 0;
      this.votes++;
      this.s.audio.blip(880 + this.votes * 110);
    }
    if (this.votes >= VOTERS.length && this.voteT > 0.9) {
      adoptEquation(this.s.state.tribe, this.eq);
      this.finish();
    }
  }

  private move(k: EquationKey, d: number): void {
    const next = rebalance(this.eq, k, d);
    if (next[k] === this.eq[k]) return;
    this.eq = next;
    this.touched = true;
    this.s.audio.blip(d > 0 ? 990 : 660);
  }

  private startVote(): void {
    this.stage = "vote";
    this.votes = 0;
    this.voteT = 0;
  }

  protected paint(g: Ctx, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.55));
    const tribe = this.s.state.tribe;
    const x = 8;
    const w = W - 16;
    const top = kioskCard(
      g,
      x,
      26,
      w,
      168,
      "VALUE EQUATION: WHAT DOES THE TRIBE HONOUR?",
      ["TASKS", "STATUS", "FLOWS", "ROLES"],
      2,
    );
    // the weights, left
    this.minus = [];
    this.plus = [];
    EQUATION_KEYS.forEach((k, i) => {
      const y = top + i * 20;
      drawText(g, LABEL[k], x + 8, y, COLOR[k]);
      drawText(g, `${this.eq[k]}`, x + 138, y, P.paper, { align: "right" });
      rect(g, x + 8, y + 10, 130, 5, withAlpha(P.paper, 0.12));
      rect(g, x + 8, y + 10, Math.round((130 * this.eq[k]) / 100), 5, COLOR[k]);
      const weighing = this.stage === "weigh";
      const m = weighing
        ? pill(g, "-", x + 146, y + 1, false)
        : { x: 0, y: 0, w: 0, h: 0 };
      const p = weighing
        ? pill(g, "+", x + 166, y + 1, false)
        : { x: 0, y: 0, w: 0, h: 0 };
      this.minus.push(m);
      this.plus.push(p);
    });
    // the Status leaderboard, right, re-ranked by the weights
    const sx = x + 194;
    const sw = w - 200;
    rect(g, sx, top - 4, sw, 84, withAlpha(P.black, 0.3));
    drawText(g, "STATUS", sx + 6, top - 1, P.teal);
    rank(tribe, this.eq).forEach((r, i) => {
      const y = top + 11 + i * 17;
      const name = r.who === "pioneer" ? "YOU" : CAST[r.who].name;
      const color = r.who === "pioneer" ? P.gold : CAST[r.who].color;
      drawText(g, `${i + 1}`, sx + 6, y, withAlpha(P.paper, 0.5));
      drawText(g, name, sx + 16, y, color);
      const bw = sw - 22;
      rect(g, sx + 16, y + 9, bw, 3, withAlpha(P.paper, 0.12));
      rect(g, sx + 16, y + 9, Math.round(bw * Math.min(1, r.score)), 3, color);
    });
    const by = top + 86;
    rect(g, x + 6, by - 4, w - 12, 1, withAlpha(P.teal, 0.4));
    if (this.stage === "weigh") {
      if (this.touched) {
        const label = "PROPOSE TO THE TRIBE";
        this.propose = pill(
          g,
          label,
          Math.round(W / 2 - (label.length * 6 + 11) / 2),
          by + 4,
          true,
        );
        hint(g, "TAP PROPOSE WHEN READY", t);
      } else {
        drawText(
          g,
          "GAME A COUNTED ONLY MONEY. MOVE THE WEIGHTS.",
          W / 2,
          by + 7,
          withAlpha(P.paper, 0.75),
          { align: "center" },
        );
        hint(g, "TAP + OR - (1 2 3 4)", t);
      }
      return;
    }
    // the vote: a proposal card, each steward's answer as it comes in
    drawText(g, "PROPOSAL: ADOPT THIS EQUATION", x + 8, by, P.goldPale);
    VOTERS.forEach((v, i) => {
      const vx = x + 8 + i * 120;
      const name = CAST[v].name.replace("THE ", "");
      const ax = vx + measure(name) + 6;
      drawText(g, name, vx, by + 14, CAST[v].color);
      if (i < this.votes) pill(g, "YES", ax, by + 11, true);
      else drawText(g, "...", ax + 4, by + 14, withAlpha(P.paper, 0.5));
    });
    if (this.votes >= VOTERS.length)
      drawText(g, "ADOPTED", x + w - 10, by, P.gold, { align: "right" });
  }
}
