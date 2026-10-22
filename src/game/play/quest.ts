// SPDX-License-Identifier: AGPL-3.0-or-later
//
// A quest, start to finish: post one, invite a steward, do the work,
// appreciate the one who helped. Once posted, the quest is the bot's
// message in the tribe's chat, its buttons the inline keyboard under it;
// the small ledger at the bottom shows what the tribe now remembers.

import { drawParagraph, drawText } from "../../engine/font";
import { H, W } from "../../engine/screen";
import { CAST, portrait } from "../../art/characters";
import { P } from "../../art/palette";
import { rect, withAlpha, type Ctx } from "../../art/paint";
import { frame, hint, inRect, tgMessage } from "../../art/ui";
import { PLAY_OPTIONS, RESOURCES, type Wisdom } from "../../story/holons";
import {
  appreciate,
  completeQuest,
  inviteHelper,
  postQuest,
  STEWARD_OF,
  type Quest,
  type Steward,
} from "../tribe";
import type { Services } from "../types";
import { PlayBase, type PlayInput } from "./types";

const COLOR: Record<Wisdom, string> = {
  mind: P.cyan,
  heart: P.magenta,
  body: P.mint,
};
const STEWARDS: Steward[] = ["sage", "matriarch", "chief"];
const KEYS = [
  ["1", "m", "M"],
  ["2", "h", "H"],
  ["3", "b", "B"],
];

type Rect = { x: number; y: number; w: number; h: number };

export class QuestPlay extends PlayBase {
  private stage: "pick" | "invite" | "work" | "thank" = "pick";
  private quest: Quest | null = null;
  private hours = 0;
  private work = -1;
  private rects: Rect[] = [];
  private btn: Rect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(s: Services) {
    super("quest", s);
  }

  /** The body's quest is the handoff, when another holon met the need. */
  private get options(): typeof PLAY_OPTIONS.quests {
    const n = this.s.state.tribe.needs.find(
      (x) => x.metBy && x.via !== "tribe",
    );
    if (!n) return PLAY_OPTIONS.quests;
    const title = n.res
      ? `FETCH ${RESOURCES[n.res].label} FROM ${n.metBy}`
      : `MEET ${n.metBy} FOR THE HANDOFF`;
    return PLAY_OPTIONS.quests.map((q) =>
      q.wisdom === "body" ? { ...q, title, hours: 3 } : q,
    );
  }

  protected step(dt: number, _t: number, inp: PlayInput): void {
    const tribe = this.s.state.tribe;
    const picked = (): number => {
      for (const tap of inp.taps)
        for (let i = 0; i < this.rects.length; i++)
          if (inRect(tap, this.rects[i]!)) return i;
      for (let i = 0; i < KEYS.length; i++)
        if (KEYS[i]!.some((k) => inp.keys.includes(k))) return i;
      return -1;
    };
    if (this.stage === "pick") {
      const i = picked();
      const opt = this.options[i];
      if (opt) {
        this.quest = postQuest(tribe, opt.title, opt.wisdom);
        this.hours = opt.hours;
        this.stage = "invite";
        this.s.audio.blip(880);
      }
      return;
    }
    if (this.stage === "invite" && this.quest) {
      const i = picked();
      const who = STEWARDS[i];
      if (who) {
        inviteHelper(this.quest, who);
        this.stage = "work";
        this.work = -1;
        this.s.audio.blip(990);
      }
      return;
    }
    if (this.stage === "work" && this.quest) {
      if (this.work >= 0) {
        this.work += dt / 1.4;
        if (this.work >= 1) {
          completeQuest(this.quest, this.hours);
          this.stage = "thank";
          this.s.audio.blip(1320);
        }
        return;
      }
      for (const tap of inp.taps) if (inRect(tap, this.btn)) this.work = 0;
      if (inp.keys.includes("Enter") || inp.keys.includes(" ")) this.work = 0;
      return;
    }
    if (this.stage === "thank" && this.quest) {
      let go = inp.keys.includes("Enter") || inp.keys.includes(" ");
      for (const tap of inp.taps) if (inRect(tap, this.btn)) go = true;
      if (go && appreciate(this.quest)) this.finish();
    }
  }

  protected paint(g: Ctx, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.5));
    const q = this.quest;
    const title =
      this.stage === "pick"
        ? "WHICH QUEST IS YOURS TO DO?"
        : this.stage === "invite"
          ? "WHO WILL JOIN YOU?"
          : this.stage === "work"
            ? "DO THE WORK"
            : "WHO HELPED? SAY THANKS";
    drawText(g, title, W / 2, 18, P.paper, { align: "center", shadow: P.ink });
    this.rects = [];
    if (this.stage === "pick") {
      this.options.forEach((o, i) => {
        const w = 112;
        const x = Math.round(W / 2 - 172 + i * 116);
        const y = 40;
        const active = Math.floor(t * 1.5) % 3 === i;
        frame(g, x, y, w, 70, active ? P.gold : P.goldDeep);
        drawText(g, o.wisdom.toUpperCase(), x + w / 2, y + 8, COLOR[o.wisdom], {
          align: "center",
        });
        drawParagraph(g, o.title, x + 8, y + 22, w - 16, P.paper);
        drawText(
          g,
          `${o.hours} HOURS`,
          x + w / 2,
          y + 48,
          withAlpha(P.paper, 0.7),
          {
            align: "center",
          },
        );
        drawText(g, `(${i + 1})`, x + w / 2, y + 58, withAlpha(P.paper, 0.5), {
          align: "center",
        });
        this.rects.push({ x, y, w, h: 70 });
      });
      hint(g, "TAP ONE", t);
      return;
    }
    if (!q) return;
    // the posted quest, as the bot posts it in the tribe's chat
    const people = q.helper ? `YOU, THE ${q.helper.toUpperCase()}` : "YOU";
    const keys =
      this.stage === "work" && this.work < 0
        ? ["COMPLETE"]
        : this.stage === "thank"
          ? ["● APPRECIATE"]
          : [];
    const kb = tgMessage(
      g,
      28,
      30,
      W - 56,
      [
        { text: q.title, color: COLOR[q.wisdom] },
        {
          text: `${this.hours} HOURS   ${q.done ? "DONE" : "OPEN"}   ${people}`,
          color: withAlpha(P.paper, 0.75),
        },
      ],
      keys,
    );
    if (kb[0] && this.stage !== "invite") this.btn = kb[0];
    if (this.stage === "invite") {
      STEWARDS.forEach((who, i) => {
        const x = Math.round(W / 2 - 172 + i * 116);
        const y = 96;
        const w = 112;
        const fit = STEWARD_OF[q.wisdom] === who;
        const active = Math.floor(t * 1.5) % 3 === i;
        frame(g, x, y, w, 50, fit || active ? P.gold : P.goldDeep);
        rect(g, x + 6, y + 6, 24, 24, CAST[who].backdrop);
        g.drawImage(portrait(who).canvas, x + 7, y + 7, 22, 22);
        drawText(
          g,
          CAST[who].name.replace("THE ", ""),
          x + 36,
          y + 8,
          CAST[who].color,
        );
        if (fit) drawText(g, "KNOWS THIS", x + 36, y + 18, P.gold);
        drawText(g, `TAP (${i + 1})`, x + 36, y + 36, withAlpha(P.paper, 0.5));
        this.rects.push({ x, y, w, h: 50 });
      });
      hint(g, "WHO TAPS JOIN WITH YOU?", t);
      return;
    }
    if (this.stage === "work") {
      const f = Math.max(0, Math.min(1, this.work));
      rect(g, W / 2 - 80, 104, 160, 8, withAlpha(P.paper, 0.2));
      rect(g, W / 2 - 80, 104, Math.round(160 * f), 8, COLOR[q.wisdom]);
      if (this.work < 0) hint(g, "TAP COMPLETE", t);
      else drawText(g, "WORKING...", W / 2, 118, P.paper, { align: "center" });
      return;
    }
    // thank
    const who = q.helper!;
    rect(g, W / 2 - 80, 98, 24, 24, CAST[who].backdrop);
    g.drawImage(portrait(who).canvas, W / 2 - 79, 99, 22, 22);
    drawText(
      g,
      `THE ${who.toUpperCase()} GAVE ${this.hours} HOURS`,
      W / 2 - 50,
      104,
      P.paper,
    );
    drawText(g, "WITH YOU.", W / 2 - 50, 114, P.paper);
    this.drawLedger(g);
    hint(g, "TAP APPRECIATE", t);
  }

  private drawLedger(g: Ctx): void {
    const q = this.quest;
    if (!q || !q.done) return;
    const y = 140;
    frame(g, 40, y, W - 80, 30, P.goldDeep, withAlpha(P.ink, 0.9));
    drawText(g, "THE TRIBE REMEMBERS", W / 2, y + 5, P.goldPale, {
      align: "center",
    });
    const helper = q.helper ? `THE ${q.helper.toUpperCase()} ${q.hours}H` : "";
    drawText(g, `YOU ${q.hours}H   ${helper}`, W / 2, y + 17, P.paper, {
      align: "center",
    });
  }
}
