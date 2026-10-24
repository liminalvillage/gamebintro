// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The screen: a fixed 384×216 logical stage (16:9) that every scene lays out
// in, drawn at the display's native resolution. The backing canvas is sized
// to the window's device pixels and the context is scaled so one logical
// unit covers however many device pixels it needs; shapes, text and sprites
// are drawn as smooth vector or high-resolution images on top of that, so
// the picture stays sharp at any size instead of being a blown-up bitmap.

export const W = 384;
export const H = 216;

/**
 * Resolution offscreen art (scenery layers, sprites) is baked at, in device
 * pixels per logical unit. Fixed at boot from the window so caches built
 * later match the screen; capped so a 768-wide scenery layer stays a
 * reasonable size in memory on phones.
 */
export let RES = 4;

/** An offscreen canvas `w`×`h` logical units, pre-scaled by RES. */
export function hiCanvas(
  w: number,
  h: number,
  res = RES,
): { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w * res));
  canvas.height = Math.max(1, Math.ceil(h * res));
  const g = canvas.getContext("2d")!;
  g.scale(res, res);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  return { canvas, g };
}

export class Screen {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** CSS pixels per logical unit. */
  scale = 1;
  /** Device pixels per logical unit. */
  dpr = 1;
  private left = 0;
  private top = 0;

  constructor(private readonly host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("role", "application");
    this.canvas.setAttribute("aria-label", "An Initiation to Game~B");
    this.canvas.tabIndex = 0;
    host.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d canvas unavailable");
    this.ctx = ctx;
    this.resize();
    RES = Math.max(2, Math.min(4, Math.ceil(this.dpr)));
    window.addEventListener("resize", () => this.resize());
  }

  resize(): void {
    const vw = this.host.clientWidth || window.innerWidth;
    const vh = this.host.clientHeight || window.innerHeight;
    this.scale = Math.min(vw / W, vh / H);
    const cw = Math.round(W * this.scale);
    const ch = Math.round(H * this.scale);
    const ratio = Math.min(3, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(cw * ratio);
    this.canvas.height = Math.round(ch * ratio);
    this.dpr = this.canvas.width / W;
    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    this.left = Math.round((vw - cw) / 2);
    this.top = Math.round((vh - ch) / 2);
    this.begin();
  }

  /** Reset the context to logical units; called before every frame. */
  begin(): void {
    const g = this.ctx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
  }

  /** Window coordinates → buffer coordinates. */
  toBuffer(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor((clientX - r.left) / this.scale),
      y: Math.floor((clientY - r.top) / this.scale),
    };
  }

  /** Buffer rectangle → window CSS rectangle (for the DOM link overlay). */
  toWindow(
    x: number,
    y: number,
    w: number,
    h: number,
  ): { left: number; top: number; width: number; height: number } {
    return {
      left: this.left + x * this.scale,
      top: this.top + y * this.scale,
      width: w * this.scale,
      height: h * this.scale,
    };
  }
}
