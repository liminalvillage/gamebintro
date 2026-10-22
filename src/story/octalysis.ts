// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The eight core drives of Yu-kai Chou's Octalysis framework, the lens the
// second act is designed through. Every drive can be pulled two ways: the
// white hat (meaning, growth, creativity — feels good, lasts) and the black
// hat (scarcity, uncertainty, fear of loss — compels, then burns out). Game A
// is the parasite riding the black hat; Game~B leads from the white hat and
// uses the black only where it is honest. In the act the Chief's talisman
// wakes as an amulet of eight faces: the Sage explains it once, each play
// lights the faces it wakes, a tap on it opens it to read, and the finale
// shows the shape it took.

import type { PlayId } from "./holons";

export type DriveId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const DRIVE_IDS: DriveId[] = [1, 2, 3, 4, 5, 6, 7, 8];

export type Drive = {
  /** One word for Chou's drive (1 = epic meaning & calling, …). */
  short: string;
  /** What it is, and how each game pulls it (the amulet's panel). */
  line: string;
  /** Top of the octagon (white), bottom (black), or the sides between. */
  hat: "white" | "black" | "side";
};

export const DRIVES: Record<DriveId, Drive> = {
  1: {
    short: "MEANING",
    line: "YOU ARE PART OF SOMETHING BIGGER THAN YOURSELF. GAME~B LEADS WITH IT.",
    hat: "white",
  },
  2: {
    short: "GROWTH",
    line: "YOU GET BETTER AT WHAT MATTERS, AND YOU CAN SEE IT. GAME~B LEADS WITH IT.",
    hat: "white",
  },
  3: {
    short: "CREATIVITY",
    line: "YOU TRY THINGS, COMBINE THEM, MAKE THEM YOURS. GAME~B LEADS WITH IT.",
    hat: "white",
  },
  4: {
    short: "OWNERSHIP",
    line: "WHAT YOU TEND IS YOURS TO CARE FOR. GAME A TURNS IT INTO HOARDING.",
    hat: "side",
  },
  5: {
    short: "RELATEDNESS",
    line: "OTHERS ARE WITH YOU: HELP, THANKS, BELONGING. GAME A TURNS IT INTO ENVY.",
    hat: "side",
  },
  6: {
    short: "SCARCITY",
    line: "WHAT IS RARE FEELS PRECIOUS. GAME A FAKES THE LACK TO SELL TO YOU.",
    hat: "black",
  },
  7: {
    short: "CURIOSITY",
    line: "YOU WANT TO SEE WHAT COMES NEXT. GAME A MAKES IT A SLOT MACHINE.",
    hat: "black",
  },
  8: {
    short: "LOSS",
    line: "YOU DO NOT WANT TO LOSE WHAT YOU HAVE. GAME A RUNS ON THAT FEAR.",
    hat: "black",
  },
};

/**
 * Where each drive sits on the octagon, clockwise from the top: meaning
 * crowns it, loss is its floor, left-brain drives on the left.
 */
export const AROUND: DriveId[] = [1, 3, 5, 7, 8, 6, 4, 2];

/** The drives each play wakes. Every drive is woken by at least one. */
export const PLAY_DRIVES: Record<PlayId, DriveId[]> = {
  ask: [1, 6],
  found: [4, 3],
  roles: [1, 5],
  federate: [5, 7],
  cast: [7, 2],
  give: [5, 8],
  quest: [2, 5],
  library: [4, 8],
  equation: [3, 1],
};

/** The amulet's panel, opened by a tap on it in the HUD. */
export const AMULET = {
  title: "THE AMULET OF EIGHT DRIVES",
  tap: "TAP A FACE",
  awake: "AWAKE IN YOUR TRIBE",
  asleep: "STILL ASLEEP",
  credit: "THE OCTALYSIS OF YU-KAI CHOU",
};

/** The finale's octalysis page. */
export const OCTALYSIS_PAGE = {
  title: "WHAT MOVED YOUR TRIBE",
  footer:
    "GAME A HOOKS YOU FROM BELOW: LACK, CHANCE, FEAR OF LOSS. GAME~B LEADS FROM ABOVE: MEANING, GROWTH, CREATIVITY.",
  credit: "THE OCTALYSIS OF YU-KAI CHOU",
};
