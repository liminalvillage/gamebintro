// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Audio } from "../engine/audio";
import type { Input } from "../engine/input";
import type { Screen } from "../engine/screen";
import type { GameState } from "./state";

export interface Scene {
  enter(): void;
  update(dt: number, t: number): void;
  draw(g: CanvasRenderingContext2D, t: number): void;
  exit?(): void;
}

export type Services = {
  screen: Screen;
  input: Input;
  audio: Audio;
  state: GameState;
  go(next: Scene): void;
};
