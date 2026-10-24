// SPDX-License-Identifier: AGPL-3.0-or-later
//
// A chapter: one place, the party, and a list of beats played in order.
// Dialogue types itself out and waits for a tap; walking waits for the
// player to hold right; the parasite trials wait for the orbs to be kept
// open. Effects run on timers. When the last beat ends the chapter fades
// and hands over to the next one, or to the finale.

import { drawParagraph, drawText, LINE_H, measure } from "../engine/font";
import { H, W } from "../engine/screen";
import { drawSprite } from "../engine/sprite";
import {
  CAST,
  getActors,
  portrait,
  type Actor,
  type CharacterId,
} from "../art/characters";
import { P } from "../art/palette";
import { disc, hexagon, rect, ring, withAlpha } from "../art/paint";
import {
  drawScenery,
  getScenery,
  type Scenery,
  type SceneryParams,
} from "../art/scenery";
import {
  amulet,
  bigTitle,
  button,
  dialogue,
  driveAt,
  driveColor,
  driveLabels,
  exitChip,
  fade,
  frame,
  hint,
  inRect,
  parasite as drawParasite,
  moonDiagram,
  pyramidDiagram,
  scalesDiagram,
  talisman,
  wisdomOrbs,
} from "../art/ui";
import {
  CHAPTERS,
  HOLONS_ACT_START,
  type Beat,
  type Chapter,
} from "../story/script";
import type { Wisdom } from "../story/holons";
import {
  AMULET,
  DRIVE_IDS,
  DRIVES,
  PLAY_DRIVES,
  type DriveId,
} from "../story/octalysis";
import { driveLevels } from "./drives";
import { lunationAt, phaseBand } from "./lunation";
import { FinaleScene } from "./finale";
import {
  createRoam,
  drawCarry,
  drawRoamHud,
  drawRoamWorld,
  roamCamera,
  stepRoam,
  type Roam,
} from "./roam";
import { createPlay, type Play } from "./play";
import { saveState, settleWisdom } from "./state";
import { TitleScene } from "./title";
import type { Scene, Services } from "./types";

type Member = { id: Exclude<CharacterId, "parasite">; x: number };
const PARTY: Member[] = [
  { id: "matriarch", x: 56 },
  { id: "chief", x: 100 },
  { id: "pioneer", x: 170 },
  { id: "sage", x: 238 },
];

/** The pioneer's centre in the line (their sprite starts at x 170). */
const PIONEER_X = 176;
const WALK_SPEED = 56;
const TYPE_SPEED = 32;

type Trial = {
  kind: "first" | "second";
  t: number;
  open: Record<Wisdom, number>;
  gust: number;
  duration: number;
  decay: number;
};

const ORBS: {
  k: Wisdom;
  label: string;
  color: string;
  x: number;
  key: string[];
}[] = [
  {
    k: "mind",
    label: "MIND",
    color: P.cyan,
    x: W / 2 - 64,
    key: ["1", "m", "M"],
  },
  {
    k: "heart",
    label: "HEART",
    color: P.magenta,
    x: W / 2,
    key: ["2", "h", "H"],
  },
  {
    k: "body",
    label: "BODY",
    color: P.mint,
    x: W / 2 + 64,
    key: ["3", "b", "B"],
  },
];
/** Keys 1-8 read the faces in drive order. */
const AROUND_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const ORB_Y = 96;
const ORB_R = 15;

/** The amulet in the HUD, and opened in its panel. */
const AMULET_HUD = { x: 14, y: 12, r: 8 };
const AMULET_BIG = { x: 112, y: 106, r: 44 };
/** The panel's text column, right of the big amulet's labels. */
const COL = { x: 236, w: W - 236 - 12 };

/** Whether the amulet has been opened yet (it beckons until it has). */
let amuletOpened = false;

export class ChapterScene implements Scene {
  private readonly ch: Chapter;
  private scenery: Scenery;
  private params: SceneryParams = { phase: 0, fire: 1 };
  private scroll = 0;
  private beat = 0;
  private shown = 0;
  private walked = 0;
  private walking = false;
  private stepT = 0;
  private fxT = 0;
  private waitT = 0;
  private parasiteR = 0;
  private parasiteTarget = 0;
  private parasiteK = 0.5;
  private talismanT = -1;
  private collapse = 0;
  private collapseDir = 0;
  private overlay: "pyramid" | "scales" | "moon" | null = null;
  private overlayF = 0;
  /** Tonight's lunation, read off the clock when the moon fx starts. */
  private moon = { index: 0, day: 1, days: 30, band: 0 };
  private mapAnim: { from: number; to: number; t: number } | null = null;
  private trial: Trial | null = null;
  private play: Play | null = null;
  /** Drives the last play woke: they glow on the amulet for a while. */
  private lit: { drives: DriveId[]; t: number } | null = null;
  private amuletT = -1;
  /** The amulet's panel while open, with the face being read. */
  private panel: { d: DriveId } | null = null;
  private amuletBtn = { x: 0, y: 0, w: 0, h: 0 };
  private closeBtn = { x: 0, y: 0, w: 0, h: 0 };
  private faceBoxes: {
    d: DriveId;
    box: { x: number; y: number; w: number; h: number };
  }[] = [];
  private cardShown = 0;
  private fadeIn = 1;
  private fadeOut = -1;
  private roleBtns: {
    r: { x: number; y: number; w: number; h: number };
    k: Wisdom;
  }[] = [];
  private shake = 0;
  private exitBtn = { x: 0, y: 0, w: 0, h: 0 };
  /** The roam in play, or the last one (its fire and saplings stay). */
  private roam: Roam | null = null;
  /** Each member's offset from their place in the line (px), and facing. */
  private off: Record<Member["id"], number> = {
    matriarch: 0,
    chief: 0,
    pioneer: 0,
    sage: 0,
  };
  private face: Record<Member["id"], 1 | -1> = {
    matriarch: 1,
    chief: 1,
    pioneer: 1,
    sage: 1,
  };
  private moving: Record<Member["id"], boolean> = {
    matriarch: false,
    chief: false,
    pioneer: false,
    sage: false,
  };
  private muffled = 0;

  constructor(
    private readonly s: Services,
    private readonly index: number,
  ) {
    this.ch = CHAPTERS[index]!;
    this.scenery = getScenery(this.ch.scenery);
  }

  enter(): void {
    this.s.input.flush();
    this.s.state.chapter = this.index;
    saveState(this.s.state);
    this.s.audio.music(this.ch.music);
    if (this.ch.scenery === "overworld") {
      const first = this.ch.beats.find(
        (b): b is { map: [number, number] } => "map" in b,
      );
      this.params.phase = first ? first.map[0] : 0;
    }
    this.startBeat();
  }

  private get current(): Beat | undefined {
    return this.ch.beats[this.beat];
  }

  private next(): void {
    this.beat++;
    if (this.beat >= this.ch.beats.length) {
      this.fadeOut = 0;
      return;
    }
    this.startBeat();
  }

  private startBeat(): void {
    const b = this.current;
    if (!b) return;
    this.shown = 0;
    this.fxT = 0;
    this.waitT = 0;
    if ("say" in b) {
      // a line for another purpose than the one this holon chose
      if (b.when && b.when !== this.s.state.tribe.purpose) return this.next();
      if (b.say === "parasite") {
        this.s.audio.sting();
        this.shake = 1;
      }
    } else if ("choose" in b) {
      // the act's opening question is for players who skipped the intro;
      // whoever already chose a wisdom walks straight on
      if (this.s.state.role) this.next();
    } else if ("play" in b) {
      this.play = createPlay(b.play, this.s);
      this.play.enter?.();
    } else if ("walk" in b) {
      this.walked = 0;
      this.overlay = null;
    } else if ("roam" in b) {
      this.overlay = null;
      this.roam = createRoam(b.roam, this.scroll + PIONEER_X, this.index + 1);
    } else if ("fx" in b) {
      if (b.fx === "parasite-rise") {
        this.parasiteTarget = 14;
        this.s.audio.sting();
      } else if (b.fx === "parasite-calm") this.parasiteTarget = 0;
      else if (b.fx === "talisman") {
        this.talismanT = 0;
        this.s.state.talisman = true;
        this.s.audio.chime();
      } else if (b.fx === "amulet") {
        this.amuletT = 0;
        this.s.audio.chime();
      } else if (b.fx === "collapse") this.collapseDir = 1;
      else if (b.fx === "revive") {
        this.collapse = 1;
        this.collapseDir = -1;
      } else if (b.fx === "pyramid" || b.fx === "scales") {
        this.overlay = b.fx;
        this.overlayF = 0;
      } else if (b.fx === "moon") {
        const l = lunationAt(Date.now());
        this.moon = { ...l, band: phaseBand(l.phase) };
        this.overlay = "moon";
        this.overlayF = 0;
        this.s.audio.chime();
      } else if (b.fx === "mesh") {
        this.mapAnim = { from: 0, to: 1, t: 0 };
      }
    } else if ("trial" in b) {
      this.trial = {
        kind: b.trial,
        t: 0,
        open: { mind: 1, heart: 1, body: 1 },
        gust: 0,
        duration: b.trial === "first" ? 9 : 7,
        decay: b.trial === "first" ? 0.16 : 0.3,
      };
      this.parasiteTarget = 16;
      this.s.audio.sting();
    } else if ("map" in b) {
      this.mapAnim = { from: b.map[0], to: b.map[1], t: 0 };
    } else if ("card" in b) {
      this.cardShown = 0;
      this.s.audio.stopMusic(1.2);
      this.s.audio.whoosh();
    }
  }

  update(dt: number, t: number): void {
    const inp = this.s.input;
    const taps = inp.consumeTaps();
    const adv = inp.consumeAdvance();
    const keys = inp.consumeKeys();
    const typed = inp.consumeTyped();
    if (this.panel) return this.runPanel(taps, keys, adv);
    if (keys.includes("Escape") || taps.some((p) => inRect(p, this.exitBtn)))
      return this.leave();
    if (this.hasAmulet && taps.some((p) => inRect(p, this.amuletBtn))) {
      amuletOpened = true;
      this.panel = { d: this.lit?.drives[0] ?? 1 };
      this.s.audio.blip(990);
      return;
    }
    this.fadeIn = Math.max(0, this.fadeIn - dt * 1.2);
    this.shake = Math.max(0, this.shake - dt * 2);
    if (this.lit && (this.lit.t -= dt) <= 0) this.lit = null;
    settleWisdom(this.s.state, dt);
    this.parasiteR +=
      (this.parasiteTarget - this.parasiteR) * Math.min(1, dt * 3);
    // the parasite smothers the music as it grows
    const muffle = Math.min(1, this.parasiteR / 22);
    if (Math.abs(muffle - this.muffled) > 0.03) {
      this.muffled = muffle;
      this.s.audio.muffle(muffle);
    }
    this.followParty(dt);
    if (this.talismanT >= 0) this.talismanT += dt;
    if (this.amuletT >= 0) this.amuletT += dt;
    if (this.collapseDir !== 0) {
      this.collapse = Math.max(
        0,
        Math.min(1, this.collapse + this.collapseDir * dt * 1.4),
      );
      if (this.collapse === 0 || this.collapse === 1) this.collapseDir = 0;
    }
    if (this.mapAnim) {
      this.mapAnim.t = Math.min(1, this.mapAnim.t + dt / 3.2);
      const f = this.mapAnim.t;
      this.params.phase =
        this.mapAnim.from + (this.mapAnim.to - this.mapAnim.from) * f;
    }
    if (this.overlay)
      this.overlayF = Math.min(
        1,
        this.overlayF + dt / (this.overlay === "pyramid" ? 2.2 : 4.5),
      );

    if (this.fadeOut >= 0) {
      this.fadeOut += dt * 0.9;
      if (this.fadeOut >= 1.1) this.finish();
      return;
    }

    const b = this.current;
    if (!b) return;

    if ("say" in b) {
      const total = b.text.length;
      if (this.shown < total) {
        const before = Math.floor(this.shown);
        this.shown = Math.min(total, this.shown + dt * TYPE_SPEED);
        if (Math.floor(this.shown) !== before && b.text[before] !== " ")
          this.s.audio.blip(CAST[b.say].voice);
        if (adv) this.shown = total;
      } else if (adv) {
        this.next();
      }
      return;
    }
    if ("walk" in b) {
      const held = inp.held("right");
      this.walking = held;
      if (held) {
        const d = WALK_SPEED * dt;
        this.scroll += d;
        this.walked += d;
        this.stepT += dt;
        if (
          Math.floor(this.stepT / 0.32) !== Math.floor((this.stepT - dt) / 0.32)
        )
          this.s.audio.step();
        if (this.walked >= b.walk) {
          this.walking = false;
          this.next();
        }
      }
      return;
    }
    if ("roam" in b && this.roam) {
      this.runRoam(this.roam, dt, taps, keys);
      return;
    }
    if ("choose" in b) {
      for (const tap of taps)
        for (const r of this.roleBtns)
          if (inRect(tap, r.r)) return this.pickRole(r.k);
      for (const o of ORBS)
        if (o.key.some((k) => keys.includes(k))) return this.pickRole(o.k);
      return;
    }
    if ("fx" in b) {
      this.fxT += dt;
      const done =
        b.fx === "parasite-rise" || b.fx === "parasite-calm"
          ? this.fxT > 1.1
          : b.fx === "talisman" || b.fx === "amulet"
            ? this.fxT > 2.6 || (adv && this.fxT > 0.8)
            : b.fx === "collapse"
              ? this.fxT > 1.3
              : b.fx === "revive"
                ? this.fxT > 1.1
                : b.fx === "pyramid"
                  ? this.overlayF >= 1 || (adv && this.fxT > 0.5)
                  : b.fx === "scales" || b.fx === "moon"
                    ? this.overlayF >= 1 || (adv && this.fxT > 0.5)
                    : /* mesh */ (this.mapAnim?.t ?? 1) >= 1 ||
                      (adv && this.fxT > 0.5);
      if (done) this.next();
      return;
    }
    if ("trial" in b && this.trial) {
      this.runTrial(this.trial, dt, t, taps, keys);
      return;
    }
    if ("play" in b && this.play) {
      this.play.update(dt, t, { taps, keys, adv, typed });
      if (this.play.done) {
        this.lit = { drives: PLAY_DRIVES[b.play], t: 4 };
        this.play.exit?.();
        this.play = null;
        this.next();
      }
      return;
    }
    if ("map" in b) {
      if ((this.mapAnim?.t ?? 1) >= 1 || adv) {
        if (this.mapAnim) this.params.phase = this.mapAnim.to;
        this.mapAnim = null;
        this.next();
      }
      return;
    }
    if ("card" in b) {
      this.cardShown = Math.min(b.card.length, this.cardShown + dt * 6);
      if (adv && this.cardShown >= b.card.length) this.next();
      if (adv && this.cardShown < b.card.length) this.cardShown = b.card.length;
      return;
    }
    if ("wait" in b) {
      this.waitT += dt;
      if (this.waitT >= b.wait || adv) this.next();
    }
  }

  /** Pioneer under the player's hands; the camera and the others follow. */
  private runRoam(
    r: Roam,
    dt: number,
    taps: { x: number; y: number }[],
    keys: string[],
  ): void {
    const inp = this.s.input;
    const groundY = this.scenery.groundY ?? H - 40;
    const px = r.x - this.scroll;
    let dir: -1 | 0 | 1 = 0;
    const kr = ["ArrowRight", "d", "D"].some((k) => inp.pressed(k));
    const kl = ["ArrowLeft", "a", "A"].some((k) => inp.pressed(k));
    if (kr !== kl) dir = kr ? 1 : -1;
    else if (inp.isDown()) {
      const p = inp.pointer();
      if (Math.abs(p.x - px) > 6) dir = p.x > px ? 1 : -1;
    }
    const jump =
      keys.some((k) => ["ArrowUp", "w", "W", " "].includes(k)) ||
      taps.some((p) => p.y < groundY - r.h - 40);
    const audio = this.s.audio;
    for (const e of stepRoam(r, dt, { dir, jump })) {
      if (e === "step") audio.step();
      else if (e === "jump") audio.jump();
      else if (e === "pickup") audio.pickup(r.got + r.carry);
      else if (e === "deliver") audio.fireUp();
      else if (e === "plant") audio.grow();
      else if (e === "goal") audio.chime();
      else if (e === "coin") {
        audio.coin();
        this.parasiteTarget = Math.min(18, 6 + r.got * 3);
        this.dimWisdom(0.22);
      } else if (e === "hurt") {
        audio.hurt();
        this.shake = 0.8;
        this.dimWisdom(0.25);
      }
    }
    const cam = roamCamera(r, PIONEER_X);
    this.scroll += (cam - this.scroll) * Math.min(1, dt * 4);
    if (r.done) {
      this.parasiteTarget = 0;
      this.next();
    }
  }

  private dimWisdom(by: number): void {
    const w = this.s.state.wisdom;
    const ks = ["mind", "heart", "body"] as const;
    const k = ks[Math.floor(Math.random() * 3)]!;
    w[k] = Math.max(0.05, w[k] - by);
  }

  /**
   * While roaming the pioneer runs free and the others trail behind, in
   * a tighter line; otherwise everyone eases back into their places.
   */
  private followParty(dt: number): void {
    const r = this.roam;
    const roaming = !!r && !r.done && "roam" in (this.current ?? {});
    for (const m of PARTY) {
      const before = this.off[m.id];
      let target = 0;
      if (roaming && r) {
        const lead = r.x - this.scroll;
        if (m.id === "pioneer") {
          this.off.pioneer = lead - PIONEER_X;
          this.face.pioneer = r.face;
          this.moving.pioneer = r.moving && r.h === 0;
          continue;
        }
        const gap = (m.x - PIONEER_X) * 0.45 - r.face * 14;
        target = lead + gap - m.x;
      }
      const k = roaming ? 2.2 : 3;
      this.off[m.id] += (target - this.off[m.id]) * Math.min(1, dt * k);
      const v = (this.off[m.id] - before) / Math.max(dt, 1e-3);
      this.moving[m.id] = Math.abs(v) > 8;
      if (Math.abs(v) > 8) this.face[m.id] = v > 0 ? 1 : -1;
      else if (!roaming) this.face[m.id] = 1;
    }
  }

  private pickRole(k: Wisdom): void {
    this.s.state.role = k;
    this.s.state.wisdom[k] = 1;
    saveState(this.s.state);
    this.s.audio.chime();
    this.next();
  }

  private runTrial(
    tr: Trial,
    dt: number,
    t: number,
    taps: { x: number; y: number }[],
    keys: string[],
  ): void {
    tr.t += dt;
    const ramp = 1 + tr.t * 0.12;
    for (const o of ORBS)
      tr.open[o.k] = Math.max(0, tr.open[o.k] - tr.decay * ramp * dt);
    tr.gust += dt;
    if (tr.gust > (tr.kind === "first" ? 1.1 : 0.7)) {
      tr.gust = 0;
      const o = ORBS[Math.floor(((Math.sin(t * 7.3) + 1) / 2) * 2.999)]!;
      tr.open[o.k] = Math.max(0, tr.open[o.k] - 0.3);
    }
    for (const tap of taps) {
      for (const o of ORBS) {
        if (Math.hypot(tap.x - o.x, tap.y - ORB_Y) <= ORB_R + 8) {
          tr.open[o.k] = 1;
          this.s.audio.blip(
            o.k === "mind" ? 1320 : o.k === "heart" ? 990 : 660,
          );
        }
      }
    }
    for (const o of ORBS)
      if (o.key.some((k) => keys.includes(k))) tr.open[o.k] = 1;
    const avg = (tr.open.mind + tr.open.heart + tr.open.body) / 3;
    this.parasiteK = 1 - avg;
    this.parasiteTarget = 10 + (1 - avg) * 16;
    this.shake = Math.max(this.shake, (1 - avg) * 0.5);
    this.s.state.wisdom = { ...tr.open };
    if (tr.t >= tr.duration) {
      this.trial = null;
      this.parasiteK = 0.5;
      if (tr.kind === "first") this.parasiteTarget = 0;
      this.next();
    }
  }

  /** In the act the talisman is woken as the amulet. */
  private get hasAmulet(): boolean {
    return this.index >= HOLONS_ACT_START && this.s.state.talisman;
  }

  /** The amulet's panel holds the game still: read a face, then close. */
  private runPanel(
    taps: { x: number; y: number }[],
    keys: string[],
    adv: boolean,
  ): void {
    const pick = (d: DriveId) => {
      if (this.panel && this.panel.d !== d) this.s.audio.blip(1320);
      this.panel = { d };
    };
    if (keys.includes("Escape")) return void (this.panel = null);
    const n = AROUND_KEYS.findIndex((k) => keys.includes(k));
    if (n >= 0) pick((n + 1) as DriveId);
    for (const p of taps) {
      if (inRect(p, this.closeBtn)) return void (this.panel = null);
      const hit =
        driveAt(AMULET_BIG.x, AMULET_BIG.y, AMULET_BIG.r, p) ??
        this.faceBoxes.find((f) => inRect(p, f.box))?.d;
      if (hit) pick(hit);
    }
    if (adv && !taps.length) this.panel = null;
  }

  exit(): void {
    this.play?.exit?.();
    this.play = null;
  }

  /** Back to the title; the chapter is saved, so CONTINUE picks it up. */
  private leave(): void {
    saveState(this.s.state);
    this.s.go(new TitleScene(this.s));
  }

  private finish(): void {
    const nextIndex = this.index + 1;
    this.s.state.chapter = nextIndex;
    saveState(this.s.state);
    if (nextIndex < CHAPTERS.length)
      this.s.go(new ChapterScene(this.s, nextIndex));
    else this.s.go(new FinaleScene(this.s));
  }

  // ─── drawing ──────────────────────────────────────────────────────────

  draw(g: CanvasRenderingContext2D, t: number): void {
    const b = this.current;
    if (b && "card" in b) {
      rect(g, 0, 0, W, H, P.black);
      const text = b.card.slice(0, Math.floor(this.cardShown));
      bigTitle(g, text, W / 2, H / 2 - 12, t, P.paper);
      if (this.cardShown >= b.card.length) hint(g, "TAP", t);
      this.exitBtn = exitChip(g);
      return;
    }
    g.save();
    if (this.shake > 0)
      g.translate(
        Math.round(Math.sin(t * 60) * 3 * this.shake),
        Math.round(Math.cos(t * 50) * 2 * this.shake),
      );
    drawScenery(g, this.scenery, t, this.scroll, this.params);
    if (this.parasiteR > 0.5)
      drawParasite(
        g,
        W / 2 + 40,
        62,
        Math.round(this.parasiteR),
        t,
        this.parasiteK,
      );
    if (this.roam && this.scenery.groundY !== null)
      drawRoamWorld(g, this.roam, t, this.scroll, this.scenery.groundY);
    if (this.scenery.groundY !== null)
      this.drawParty(g, t, this.scenery.groundY);
    this.scenery.front?.(g, t, this.scroll, this.params);
    g.restore();

    if (this.overlay === "pyramid") pyramidDiagram(g, this.overlayF);
    if (this.overlay === "scales") scalesDiagram(g, this.overlayF, t);
    if (this.overlay === "moon") moonDiagram(g, this.overlayF, t, this.moon);

    if (this.talismanT >= 0 && this.talismanT < 2.8) {
      const f = Math.min(1, this.talismanT / 0.6);
      disc(g, W / 2, 80, Math.round(30 * f), withAlpha(P.gold, 0.15));
      talisman(g, W / 2, 80, Math.round(22 * f), t);
      if (f >= 1)
        drawText(g, "THE SYMBOL OF WHOLENESS", W / 2, 118, P.goldPale, {
          align: "center",
          shadow: P.ink,
        });
    }

    if (this.amuletT >= 0 && this.amuletT < 2.8) this.drawWaking(g, t);

    if (this.trial) this.drawTrial(g, this.trial, t);

    // HUD
    wisdomOrbs(g, this.s.state.wisdom, t, W - 84);
    const { x: ax, y: ay, r: ar } = AMULET_HUD;
    if (this.hasAmulet) {
      // the talisman woken: each play lights the faces it wakes
      const sayAmulet = !!b && "say" in b && /amulet/i.test(b.text);
      if (!amuletOpened || this.lit || sayAmulet) {
        const s = 0.5 + 0.5 * Math.sin(t * 4);
        ring(g, ax, ay, ar + 2 + Math.round(s * 2), withAlpha(P.gold, 0.5 * s));
      }
      amulet(g, ax, ay, ar, driveLevels(this.s.state.tribe), t, {
        lit: this.lit?.drives,
      });
      this.amuletBtn = {
        x: ax - ar - 4,
        y: ay - ar - 4,
        w: 2 * ar + 8,
        h: 2 * ar + 8,
      };
    } else if (this.s.state.talisman) talisman(g, ax, ay, 7, t);
    const tribe = this.s.state.tribe;
    if (tribe.name) {
      const bx = this.s.state.talisman ? 32 : 14;
      hexagon(g, bx, 12, 6, withAlpha(P.ink, 0.6), P.goldPale);
      drawText(
        g,
        tribe.name.toUpperCase().slice(0, 12),
        bx + 10,
        9,
        P.goldPale,
        {
          shadow: P.ink,
        },
      );
    }

    if (b && "say" in b)
      dialogue(
        g,
        b.say,
        b.text,
        Math.floor(this.shown),
        Math.floor(t * 2) % 2 === 0,
      );
    if (b && "roam" in b && this.roam) drawRoamHud(g, this.roam, t);
    if (b && "walk" in b) {
      hint(g, "HOLD → OR THE RIGHT SIDE TO WALK", t);
      const f = Math.min(1, this.walked / b.walk);
      rect(g, W / 2 - 30, H - 8, 60, 2, withAlpha(P.paper, 0.3));
      rect(g, W / 2 - 30, H - 8, Math.round(60 * f), 2, P.gold);
    }
    if (b && "choose" in b) this.drawRoleChoice(g, t);
    if (b && "play" in b && this.play) this.play.draw(g, t);
    if (b && ("map" in b || ("fx" in b && b.fx === "mesh")))
      hint(g, "TAP TO SKIP", t);

    if (this.fadeIn > 0) fade(g, this.fadeIn);
    if (this.fadeOut >= 0) fade(g, this.fadeOut);
    if (this.panel) return this.drawPanel(g, t, this.panel.d);
    this.exitBtn = exitChip(g);
  }

  /** The talisman turning into the eight-faced amulet, mid-screen. */
  private drawWaking(g: CanvasRenderingContext2D, t: number): void {
    const f = Math.min(1, this.amuletT / 1.2);
    disc(g, W / 2, 80, 32, withAlpha(P.gold, 0.15));
    if (f < 1) talisman(g, W / 2, 80, 22, t, withAlpha(P.gold, 1 - f));
    const empty = driveLevels(this.s.state.tribe);
    amulet(g, W / 2, 80, Math.round(26 * f), empty, t, {
      lit: f >= 1 ? DRIVE_IDS : [],
    });
    if (f >= 1) {
      rect(g, W / 2 - 90, 114, 180, 14, withAlpha(P.ink, 0.7));
      drawText(g, AMULET.title, W / 2, 118, P.goldPale, {
        align: "center",
        shadow: P.ink,
      });
    }
  }

  /** The amulet opened: its faces around it, the one being read beside. */
  private drawPanel(g: CanvasRenderingContext2D, t: number, d: DriveId): void {
    rect(g, 0, 0, W, H, withAlpha(P.ink, 0.95));
    drawText(g, AMULET.title, W / 2, 8, P.gold, {
      align: "center",
      shadow: P.ink,
    });
    const lv = driveLevels(this.s.state.tribe);
    const { x, y, r } = AMULET_BIG;
    amulet(g, x, y, r, lv, t, { focus: d, lit: this.lit?.drives });
    this.faceBoxes = driveLabels(g, x, y, r, lv, d);
    const drive = DRIVES[d];
    let ty = 44;
    drawText(g, drive.short, COL.x, ty, driveColor(d), { shadow: P.ink });
    ty += LINE_H + 4;
    const n = drawParagraph(g, drive.line, COL.x, ty, COL.w, P.paper, {
      shadow: P.ink,
    });
    ty += n * LINE_H + 6;
    drawText(
      g,
      lv[d] > 0 ? AMULET.awake : AMULET.asleep,
      COL.x,
      ty,
      withAlpha(lv[d] > 0 ? P.gold : P.paper, lv[d] > 0 ? 1 : 0.5),
    );
    drawText(g, AMULET.tap, x, H - 30, withAlpha(P.paper, 0.6), {
      align: "center",
    });
    drawText(g, AMULET.credit, 12, H - 12, withAlpha(P.paper, 0.45));
    this.closeBtn = button(g, "CLOSE", W - 40, H - 24, true);
  }

  private drawParty(
    g: CanvasRenderingContext2D,
    t: number,
    groundY: number,
  ): void {
    const actors = getActors();
    const floating = this.scenery.id === "warp";
    const roam = this.roam && "roam" in (this.current ?? {}) ? this.roam : null;
    const beat = Math.floor((this.walking ? this.stepT : t) / 0.16) % 2 === 1;
    for (const m of PARTY) {
      const a: Actor = actors[m.id];
      const bob =
        a.floats || floating ? Math.round(Math.sin(t * 2 + m.x) * 2) : 0;
      const x = m.x + Math.round(this.off[m.id]);
      const lift = m.id === "pioneer" && roam ? Math.round(roam.h) : 0;
      const y = groundY - a.h + bob - lift;
      const flip = this.face[m.id] === -1;
      const stride = (this.walking || this.moving[m.id]) && beat;
      const ix = (dx: number) => (flip ? x + a.w - dx : x + dx);
      // glow behind the stewards' instruments
      if (m.id === "sage")
        disc(
          g,
          ix(18),
          y + 14,
          5,
          withAlpha(P.cyan, 0.25 + 0.1 * Math.sin(t * 3)),
        );
      if (m.id === "chief")
        disc(
          g,
          ix(20),
          y + 3,
          4,
          withAlpha(P.cyan, 0.25 + 0.1 * Math.sin(t * 3 + 1)),
        );
      if (m.id === "matriarch")
        disc(g, x + 10, y + 6, 12, withAlpha(P.white, 0.12));
      if (m.id === "pioneer" && this.collapse > 0) {
        this.drawFallen(g, a, x, groundY, this.collapse);
        continue;
      }
      drawSprite(g, stride && !a.floats ? a.stride : a.stand, x, y, flip);
      if (m.id === "pioneer" && roam) drawCarry(g, roam, x, y + a.h);
    }
    if (floating) {
      for (const m of PARTY)
        ring(
          g,
          m.x + Math.round(this.off[m.id]) + actors[m.id].w / 2,
          groundY + 4,
          10,
          withAlpha(P.white, 0.12 + 0.08 * Math.sin(t * 2 + m.x)),
        );
    }
  }

  private drawFallen(
    g: CanvasRenderingContext2D,
    a: Actor,
    x: number,
    groundY: number,
    f: number,
  ): void {
    // pivot at the feet; the body swings forward and comes to rest lying on
    // the ground (not sunk into it), head to the right
    g.save();
    g.translate(x + 4, groundY);
    g.rotate((Math.PI / 2) * f);
    drawSprite(g, a.stand, -Math.round(a.w * f), -a.h);
    g.restore();
  }

  private drawRoleChoice(g: CanvasRenderingContext2D, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.black, 0.45));
    drawText(g, "WHICH WISDOM DO YOU LEAD WITH?", W / 2, 28, P.paper, {
      align: "center",
      shadow: P.ink,
    });
    const cards: {
      k: Wisdom;
      who: CharacterId;
      title: string;
      line: string;
      color: string;
    }[] = [
      {
        k: "mind",
        who: "sage",
        title: "MIND",
        line: "I SEEK TRUTH",
        color: P.cyan,
      },
      {
        k: "heart",
        who: "matriarch",
        title: "HEART",
        line: "I GIVE PURPOSE",
        color: P.magenta,
      },
      {
        k: "body",
        who: "chief",
        title: "BODY",
        line: "I BUILD",
        color: P.mint,
      },
    ];
    this.roleBtns = [];
    cards.forEach((c, i) => {
      const w = 104;
      const x = Math.round(W / 2 - 160 + i * 112);
      const y = 44;
      const active = Math.floor(t * 1.5) % 3 === i;
      frame(g, x, y, w, 96, active ? P.gold : P.goldDeep);
      const spr = portrait(c.who);
      rect(g, x + w / 2 - 23, y + 8, 46, 46, CAST[c.who].backdrop);
      g.drawImage(spr.canvas, Math.round(x + w / 2 - 22), y + 9, 44, 44);
      drawText(g, c.title, x + w / 2, y + 60, c.color, { align: "center" });
      drawText(g, c.line, x + w / 2, y + 72, P.paper, { align: "center" });
      drawText(g, `(${i + 1})`, x + w / 2, y + 84, withAlpha(P.paper, 0.5), {
        align: "center",
      });
      this.roleBtns.push({ r: { x, y, w, h: 96 }, k: c.k });
    });
    hint(g, "TAP ONE", t);
  }

  private drawTrial(g: CanvasRenderingContext2D, tr: Trial, t: number): void {
    rect(g, 0, 0, W, H, withAlpha(P.ink, 0.35));
    drawText(g, "BREATHE. KEEP YOUR WISDOM CENTRES OPEN.", W / 2, 30, P.paper, {
      align: "center",
      shadow: P.ink,
    });
    for (const o of ORBS) {
      const v = tr.open[o.k];
      ring(g, o.x, ORB_Y, ORB_R + 3, withAlpha(o.color, 0.3));
      disc(g, o.x, ORB_Y, ORB_R, withAlpha(o.color, 0.1 + 0.9 * v));
      const breathe = Math.round(Math.sin(t * 3) * 2);
      ring(
        g,
        o.x,
        ORB_Y,
        ORB_R + 6 + breathe,
        withAlpha(o.color, 0.15 + 0.5 * v),
      );
      if (v < 0.4)
        ring(
          g,
          o.x,
          ORB_Y,
          ORB_R + 10 + Math.round(Math.sin(t * 12) * 2),
          withAlpha(P.red, 0.6),
        );
      drawText(g, o.label, o.x, ORB_Y + ORB_R + 8, v < 0.4 ? P.red : o.color, {
        align: "center",
        shadow: P.ink,
      });
    }
    const left = Math.max(0, tr.duration - tr.t);
    rect(g, W / 2 - 60, 134, 120, 3, withAlpha(P.paper, 0.25));
    rect(g, W / 2 - 60, 134, Math.round(120 * (left / tr.duration)), 3, P.gold);
    hint(g, "TAP AN ORB WHEN IT DIMS (1 2 3)", t);
    void measure;
  }
}
