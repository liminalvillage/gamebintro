// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Boot: one screen, one input funnel, one synth, one scene at a time.

import { Audio } from "./engine/audio";
import { Input } from "./engine/input";
import { H, Screen, W } from "./engine/screen";
import { drawText, FONT_FAMILY } from "./engine/font";
import { P } from "./art/palette";
import { TitleScene } from "./game/title";
import { loadState } from "./game/state";
import type { Scene, Services } from "./game/types";

const host = document.getElementById("stage");
if (!host) throw new Error("#stage missing");

const screen = new Screen(host);
const input = new Input(screen);
const audio = new Audio();
const state = loadState();

let scene: Scene | null = null;
const services: Services = {
  screen,
  input,
  audio,
  state,
  go(next) {
    scene?.exit?.();
    scene = next;
    scene.enter();
  },
};

void document.fonts?.load(`700 10px ${FONT_FAMILY}`).catch(() => undefined);

input.onFirstGesture = () => audio.start();
window.addEventListener("keydown", (e) => {
  if (e.key === "m" || e.key === "M") {
    if (document.activeElement?.id === "typein") return;
    audio.toggleMute();
  }
});

services.go(new TitleScene(services));

// A soft darkening toward the corners, over every scene, for depth.
let shade: CanvasGradient | null = null;
function vignette(g: CanvasRenderingContext2D): void {
  if (!shade) {
    shade = g.createRadialGradient(
      W / 2,
      H / 2,
      H * 0.45,
      W / 2,
      H / 2,
      W * 0.62,
    );
    shade.addColorStop(0, "rgba(6,5,10,0)");
    shade.addColorStop(1, "rgba(6,5,10,0.38)");
  }
  g.fillStyle = shade;
  g.fillRect(0, 0, W, H);
}

let last = performance.now();
let t = 0;
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  scene?.update(dt, t);
  screen.begin();
  scene?.draw(screen.ctx, t);
  vignette(screen.ctx);
  if (audio.muted)
    drawText(screen.ctx, "SOUND OFF (M)", 4, 4, "rgba(243,238,228,0.45)");
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
void P;
