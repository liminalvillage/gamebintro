// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The screen: a fixed 384×216 pixel buffer (16:9, roughly a Super Nintendo
// widened) scaled to fill the window. Everything draws into the buffer with
// integer coordinates; the browser scales it up with no smoothing, which is
// what makes the picture read as pixel art instead of blurry.

export const W = 384;
export const H = 216;

export class Screen {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  scale = 1;
  private left = 0;
  private top = 0;

  constructor(private readonly host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.setAttribute("role", "application");
    this.canvas.setAttribute("aria-label", "An Initiation to Game~B");
    this.canvas.tabIndex = 0;
    host.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d canvas unavailable");
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize(): void {
    const vw = this.host.clientWidth || window.innerWidth;
    const vh = this.host.clientHeight || window.innerHeight;
    const s = Math.min(vw / W, vh / H);
    // Integer scales keep every pixel the same size; fall back to fractional
    // on small phones where ×1 would leave most of the screen empty.
    this.scale = s >= 2 ? Math.floor(s) : s;
    const cw = Math.round(W * this.scale);
    const ch = Math.round(H * this.scale);
    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    this.left = Math.round((vw - cw) / 2);
    this.top = Math.round((vh - ch) / 2);
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
