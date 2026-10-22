// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Boot: one screen, one input funnel, one synth, one scene at a time.

import { Audio } from "./engine/audio";
import { Input } from "./engine/input";
import { Screen } from "./engine/screen";
import { drawText } from "./engine/font";
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

input.onFirstGesture = () => audio.start();
window.addEventListener("keydown", (e) => {
  if (e.key === "m" || e.key === "M") {
    if (document.activeElement?.id === "typein") return;
    audio.toggleMute();
  }
});

services.go(new TitleScene(services));

let last = performance.now();
let t = 0;
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  scene?.update(dt, t);
  scene?.draw(screen.ctx, t);
  if (audio.muted)
    drawText(screen.ctx, "SOUND OFF (M)", 4, 4, "rgba(243,238,228,0.45)");
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
void P;
