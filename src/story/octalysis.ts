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
// shows the shape it took. Game A also whispers once a chapter, for you
// alone, through one drive's black hat; what you answer marks that face.

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
  tap: "TAP A FACE, OR 1-8",
  tally: (took: number, of: number) =>
    of === 0
      ? "GAME A HAS NOT WHISPERED TO YOU YET."
      : took === 0
        ? `GAME A WHISPERED ${of} TIMES. YOU HELD EVERY DRIVE FROM ABOVE.`
        : `GAME A WHISPERED ${of} TIMES. ${took} TIMES YOU LET IT PULL YOU FROM BELOW: THE FACES IN RED.`,
  footer:
    "GAME A HOOKS YOU FROM BELOW: LACK, CHANCE, FEAR OF LOSS. GAME~B LEADS FROM ABOVE: MEANING, GROWTH, CREATIVITY.",
  credit: "THE OCTALYSIS OF YU-KAI CHOU",
};

/** The temptations of the act, in story order: one per chapter. */
export type TemptId =
  "grab" | "shut" | "keep" | "credit" | "envy" | "rank" | "price";

export const TEMPT_IDS: TemptId[] = [
  "grab",
  "shut",
  "keep",
  "credit",
  "envy",
  "rank",
  "price",
];

/** The stewards who can answer a temptation. */
export type Answerer = "sage" | "matriarch" | "chief";

/**
 * Game A whispering, for you alone, through one drive's black hat. The
 * player answers: take the pull (Game A) or hold the drive from above
 * (Game~B). A steward then names the drive that was pulled, and how.
 */
export type Temptation = {
  drive: DriveId;
  whisper: string;
  /** The answer Game A wants. */
  take: string;
  /** The answer that holds the drive from the white hat. */
  refuse: string;
  by: Answerer;
  /** What the steward says after each answer. */
  took: string;
  refused: string;
};

export const TEMPTATIONS: Record<TemptId, Temptation> = {
  grab: {
    drive: 6,
    whisper:
      "THERE IS NOT ENOUGH FOR EVERYONE. GRAB WHAT YOU NEED BEFORE THE OTHERS DO, THEN GRAB A LITTLE MORE. THEIR WINTER IS NOT YOUR PROBLEM.",
    take: "GRAB IT FIRST",
    refuse: "ENOUGH IF WE SHARE",
    by: "sage",
    took: "Feel that? Scarcity, pulled from below. Game A fakes the lack so you grab, and every grab makes the lack real for someone else.",
    refused:
      "Scarcity, held from above: what is rare is precious, so we look after it together instead of racing each other for it.",
  },
  shut: {
    drive: 8,
    whisper:
      "NINE THINGS IN REACH. NOW SHUT YOUR HALF AND KEEP THEIRS OPEN. TAKE FROM THEM, GIVE THEM NOTHING. WHATEVER YOU LET GO OF, YOU LOSE.",
    take: "SHUT MY HALF",
    refuse: "KEEP MY HALF OPEN",
    by: "matriarch",
    took: "Loss, pulled from below: the fear of losing what you hold. A link with one half shut is not a link. They will shut theirs too, and both of you are poorer.",
    refused:
      "Loss, held from above: what we guard is the trust between us. An open half is what keeps theirs open.",
  },
  keep: {
    drive: 4,
    whisper:
      "THEY GAVE FIRST. FOOLS. IT IS YOURS NOW, SO KEEP IT AND NEVER GIVE BACK. LET SOMEONE ELSE SETTLE YOUR CREDIT. YOU LOOK AFTER YOU.",
    take: "IT IS MINE NOW",
    refuse: "I WILL GIVE IN TURN",
    by: "sage",
    took: "Ownership, pulled from below: what you hold becomes what you hoard. In the mesh a balance that never settles is seen by all, and the offers stop coming.",
    refused:
      "Ownership, held from above: what you hold is yours to care for, and to pass on.",
  },
  credit: {
    drive: 2,
    whisper:
      "WHY CARRY ANYTHING? PUT YOUR NAME ON THE QUEST, LET THE OTHERS DO THE HOURS, AND TAKE THE THANKS FOR YOURSELF. CLIMB OVER THEM.",
    take: "TAKE THE CREDIT",
    refuse: "DO MY SHARE",
    by: "chief",
    took: "Growth, pulled from below: points instead of skill, a ladder to climb over the others. Here the hours count only for those who were there.",
    refused:
      "Growth, held from above: you get better by doing the work, and the tribe sees you get better.",
  },
  envy: {
    drive: 5,
    whisper:
      "BORROW? LIKE A BEGGAR? BUY YOUR OWN, BIGGER THAN THEIRS, AND LEAVE IT WHERE THE NEIGHBOURS CAN SEE IT. LET THEM ENVY YOU.",
    take: "BUY A BIGGER ONE",
    refuse: "BORROW IT",
    by: "chief",
    took: "Relatedness, pulled from below: envy. Game A sells you the ladder to be seen above your neighbour, and then it sits in your shed. Come and borrow anyway.",
    refused:
      "Relatedness, held from above: one ladder for a hundred houses is a hundred reasons to knock on each other's doors.",
  },
  rank: {
    drive: 1,
    whisper:
      "WEIGH MONEY ABOVE ALL. YOU HAVE THE MOST OF IT. WRITE THE RULE SO YOU ARE WORTH MORE THAN THEM, AND CALL IT MERIT. YOU WERE MEANT TO RULE.",
    take: "WEIGH IT MY WAY",
    refuse: "PROPOSE IT TO THE TRIBE",
    by: "sage",
    took: "Meaning, bent from below: the story that you were chosen to stand above the rest. That is the pyramid again. Here no one writes the rule alone.",
    refused:
      "Meaning, held from above: you are part of something bigger than yourself, and so is your vote.",
  },
  price: {
    drive: 7,
    whisper:
      "FORGET THE MOON. CHECK THE PRICE. CHECK IT AGAIN. ONE MORE REFRESH AND YOU STRIKE IT RICH, AND THEN YOU NEVER NEED ANY OF THEM AGAIN.",
    take: "ONE MORE REFRESH",
    refuse: "LOOK UP",
    by: "chief",
    took: "Curiosity, pulled from below: the slot machine. It keeps you checking and never arriving. Now look up, away from the screen.",
    refused:
      "Curiosity, held from above: wanting to see what comes next. The moon will show us, and it never needs a refresh.",
  },
};

/** The temptation that pulls drive `d`, if any. */
export function temptationOf(d: DriveId): TemptId | null {
  return TEMPT_IDS.find((id) => TEMPTATIONS[id].drive === d) ?? null;
}

/** The words around a temptation, and what the panels say of its answer. */
export const TEMPT_UI = {
  pulls: "GAME A PULLS",
  took: "GAME A PULLED IT:",
  refused: "YOU HELD IT FROM ABOVE:",
  woke: "WOKE",
};
