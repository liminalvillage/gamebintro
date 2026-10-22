// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Input funnel: keyboard, mouse and touch all collapse into a few verbs the
// scenes understand — advance, tap(x,y), hold-right/left, and typed text for
// the terminal. Scenes poll it each frame; nothing here knows about scenes.

import type { Screen } from "./screen";

export type Tap = { x: number; y: number };

export class Input {
  private advances = 0;
  private taps: Tap[] = [];
  private keys = new Set<string>();
  private keyQueue: string[] = [];
  private pointerDown = false;
  private pointerX = 0;
  private pointerY = 0;
  private typed: string[] = [];
  private submits = 0;
  private backspaces = 0;
  private textMode = false;
  private readonly typein: HTMLInputElement | null;
  /** Fires on the first user gesture — audio may start only after it. */
  onFirstGesture: (() => void) | null = null;
  private gestured = false;

  constructor(private readonly screen: Screen) {
    const c = screen.canvas;
    this.typein = document.getElementById("typein") as HTMLInputElement | null;

    window.addEventListener("keydown", (e) => {
      if (this.textMode && e.target === this.typein) return; // the input handles it
      this.gesture();
      this.keys.add(e.key);
      if (!e.repeat) this.keyQueue.push(e.key);
      if (e.key === " " || e.key === "Enter") {
        this.advances++;
        e.preventDefault();
      }
      if (this.textMode) {
        if (e.key === "Backspace") this.backspaces++;
        else if (e.key === "Enter") this.submits++;
        else if (e.key.length === 1) this.typed.push(e.key);
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key));
    window.addEventListener("blur", () => this.keys.clear());

    c.addEventListener("pointerdown", (e) => {
      this.gesture();
      c.focus({ preventScroll: true });
      const p = screen.toBuffer(e.clientX, e.clientY);
      this.pointerDown = true;
      this.pointerX = p.x;
      this.pointerY = p.y;
      this.taps.push(p);
      this.advances++;
      if (this.textMode) this.typein?.focus();
      e.preventDefault();
    });
    c.addEventListener("pointermove", (e) => {
      const p = screen.toBuffer(e.clientX, e.clientY);
      this.pointerX = p.x;
      this.pointerY = p.y;
    });
    const up = () => (this.pointerDown = false);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    if (this.typein) {
      this.typein.addEventListener("input", () => {
        const v = this.typein!.value;
        if (v) {
          for (const ch of v) this.typed.push(ch);
          this.typein!.value = "";
        }
      });
      this.typein.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.submits++;
          e.preventDefault();
        } else if (e.key === "Backspace") {
          this.backspaces++;
        } else if (e.key === "Escape") {
          // the way out works while typing too
          this.keyQueue.push("Escape");
        }
      });
    }
  }

  private gesture(): void {
    if (this.gestured) return;
    this.gestured = true;
    this.onFirstGesture?.();
  }

  /** One "go on" press (space, enter, click or tap), consumed once. */
  consumeAdvance(): boolean {
    if (this.advances > 0) {
      this.advances = 0;
      return true;
    }
    return false;
  }

  /** Taps since the last call, in buffer coordinates. */
  consumeTaps(): Tap[] {
    const t = this.taps;
    this.taps = [];
    return t;
  }

  /** Drop pending presses — used on scene changes so a click doesn't leak. */
  flush(): void {
    this.advances = 0;
    this.keyQueue = [];
    this.taps = [];
    this.typed = [];
    this.submits = 0;
    this.backspaces = 0;
  }

  /** Walking: arrow keys / WASD, or holding the pointer on either half. */
  held(dir: "left" | "right"): boolean {
    if (dir === "right") {
      if (
        this.keys.has("ArrowRight") ||
        this.keys.has("d") ||
        this.keys.has("D")
      )
        return true;
      return this.pointerDown && this.pointerX >= 384 / 2;
    }
    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A"))
      return true;
    return this.pointerDown && this.pointerX < 384 / 2;
  }

  isDown(): boolean {
    return this.pointerDown;
  }

  pointer(): Tap {
    return { x: this.pointerX, y: this.pointerY };
  }

  /** Typed-text mode for the terminal scene. */
  setTextMode(on: boolean): void {
    this.textMode = on;
    if (on) this.typein?.focus({ preventScroll: true });
    else this.typein?.blur();
  }

  consumeTyped(): { chars: string[]; backspaces: number; submits: number } {
    const r = {
      chars: this.typed,
      backspaces: this.backspaces,
      submits: this.submits,
    };
    this.typed = [];
    this.backspaces = 0;
    this.submits = 0;
    return r;
  }

  pressed(key: string): boolean {
    return this.keys.has(key);
  }

  /** Keys pressed since the last call (edge-triggered, never missed between frames). */
  consumeKeys(): string[] {
    const k = this.keyQueue;
    this.keyQueue = [];
    return k;
  }
}
