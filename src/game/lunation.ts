// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Lunations: which lunar cycle a moment falls in, and how far into it. A
// port of @holons/core/flows/lunation.ts (Meeus/moontool new moons, the
// numbering the Telegram bot's /newmoon counts by), the same port the
// liminalvillage.com site carries, so the game names tonight's cycle as the
// bot, the kiosk and the site do. Keep in step. Pure: pass the clock in.

export const SYNODIC_MONTH_DAYS = 29.53058868;
const JULIAN_UNIX_EPOCH = 2440587.5;
const MS_PER_DAY = 86400000;

const julianOf = (ms: number): number => ms / MS_PER_DAY + JULIAN_UNIX_EPOCH;
const msOf = (julian: number): number =>
  (julian - JULIAN_UNIX_EPOCH) * MS_PER_DAY;
const dsin = (degrees: number): number => Math.sin((Math.PI / 180) * degrees);

function meanNewMoon(k: number): number {
  const t = k / 1236.85;
  return (
    2415020.75933 +
    SYNODIC_MONTH_DAYS * k +
    (0.0001178 - 0.000000155 * t) * t * t +
    0.00033 * dsin(166.56 + (132.87 - 0.009173 * t) * t)
  );
}

function trueNewMoon(k: number): number {
  const t = k / 1236.85;
  const m = 359.2242 + 29.10535608 * k - (0.0000333 - 0.00000347 * t) * t * t;
  const mprime =
    306.0253 + 385.81691806 * k + (0.0107306 + 0.00001236 * t) * t * t;
  const f = 21.2964 + 390.67050646 * k - (0.0016528 - 0.00000239 * t) * t * t;
  const corrected =
    meanNewMoon(k) +
    (0.1734 - 0.000393 * t) * dsin(m) +
    0.0021 * dsin(2 * m) -
    0.4068 * dsin(mprime) +
    0.0161 * dsin(2 * mprime) -
    0.0004 * dsin(3 * mprime) +
    0.0104 * dsin(2 * f) -
    0.0051 * dsin(m + mprime) -
    0.0074 * dsin(m - mprime) +
    0.0004 * dsin(2 * f + m) -
    0.0004 * dsin(2 * f - m) -
    0.0006 * dsin(2 * f + mprime) +
    0.001 * dsin(2 * f - mprime) +
    0.0005 * dsin(m + 2 * mprime);
  return msOf(corrected);
}

function indexContaining(ts: number): number {
  const date = new Date(ts);
  let k = Math.floor(
    12.3685 * (date.getUTCFullYear() + date.getUTCMonth() / 12 - 1900),
  );
  for (let guard = 0; guard < 64; guard++) {
    if (ts < trueNewMoon(k)) k--;
    else if (ts >= trueNewMoon(k + 1)) k++;
    else break;
  }
  return k;
}

function numberOf(newMoonMs: number): number {
  const BASE_JULIAN = 2423436.40347;
  const BASE_SYNODIC = 29.530588861;
  return Math.round((julianOf(newMoonMs) - BASE_JULIAN) / BASE_SYNODIC) - 1200;
}

export type Lunation = {
  /** The cycle's number, as the bot's /newmoon counts it. */
  index: number;
  /** Its new moon and the next one's, in ms. */
  from: number;
  to: number;
  /** How far into the cycle: 0 new, 0.5 full, toward 1 dark again. */
  phase: number;
  /** Which day of the cycle, from 1. */
  day: number;
  /** Its length in whole days, rounded up. */
  days: number;
};

/** The lunar cycle containing `ts`, and where in it `ts` falls. */
export function lunationAt(ts: number): Lunation {
  const k = indexContaining(ts);
  const from = trueNewMoon(k);
  const to = trueNewMoon(k + 1);
  return {
    index: numberOf(from),
    from,
    to,
    phase: (ts - from) / (to - from),
    day: Math.floor((ts - from) / MS_PER_DAY) + 1,
    days: Math.ceil((to - from) / MS_PER_DAY),
  };
}

/** One of eight phase bands, centred as the kiosk names them (0 = new). */
export function phaseBand(phase: number): number {
  return Math.floor(((phase + 1 / 16) % 1) * 8);
}
