// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The cast. The pixel maps below are the original drawings, in the spirit
// of the film's cast: the Pioneer in her white top, the masked Sage with the
// orb staff, the bearded Chief with the crystal sword, the Matriarch on her
// cloud with the crystal crown. They fix each figure's box and proportions
// (the tests keep them tidy); what appears on screen is the same cast
// painted as vector illustration in ./cast.ts.

import { P } from "./palette";
import type { PixelMap, Sprite } from "../engine/sprite";
import { paintActor, paintPortrait } from "./cast";

export type CharacterId =
  "pioneer" | "sage" | "chief" | "matriarch" | "parasite";

export type Character = {
  id: CharacterId;
  name: string;
  /** Name colour in the dialogue box. */
  color: string;
  /** Portrait backdrop. */
  backdrop: string;
  /** Typewriter blip pitch. */
  voice: number;
};

export const CAST: Record<CharacterId, Character> = {
  pioneer: {
    id: "pioneer",
    name: "THE PIONEER",
    color: P.gold,
    backdrop: "#e8c35a",
    voice: 990,
  },
  sage: {
    id: "sage",
    name: "THE SAGE",
    color: P.mint,
    backdrop: "#2f8f84",
    voice: 740,
  },
  chief: {
    id: "chief",
    name: "THE CHIEF",
    color: "#9fd0ff",
    backdrop: "#4f6f9a",
    voice: 440,
  },
  matriarch: {
    id: "matriarch",
    name: "THE MATRIARCH",
    color: P.magenta,
    backdrop: "#d94f96",
    voice: 620,
  },
  parasite: {
    id: "parasite",
    name: "THE PARASITE",
    color: P.red,
    backdrop: "#5a1620",
    voice: 160,
  },
};

// ─── walking sprites ────────────────────────────────────────────────────

const pioneerKey = {
  h: P.hair,
  s: P.skinBrown,
  w: P.white,
  r: P.red,
  p: "#2b2436",
  k: P.ink,
  e: P.paper,
};
const PIONEER_ROWS = [
  "....hhh.....",
  "...hhhhh....",
  "...hhhhh....",
  "....hhh.....",
  "...hhhhhh...",
  "..hhhhhhhh..",
  "..hhssssh...",
  "..hsssssss..",
  "..hsssksss..",
  "..hssssss...",
  "...ssssss...",
  "....ssss....",
  ".....ss.....",
  "....rrrr....",
  "...rwwwwr...",
  "..swwwwwws..",
  "..swwwwwws..",
  "..swwwwwws..",
  "..s.wwwww...",
  "..s.wwwww...",
  "....wwwww...",
  "....wwwww...",
  "....ppppp...",
  "....ppppp...",
  "....ppppp...",
  "....pp.pp...",
  "....pp.pp...",
  "....pp.pp...",
  "....pp.pp...",
  "....pp.pp...",
  "....pp.pp...",
  "....pp.pp...",
  "....pp.pp...",
  "....pp.pp...",
  "....pp.pp...",
  "....pp.pp...",
  "....pp.pp...",
  "....kk.kk...",
  "....kk.kk...",
  "...kkk.kkk..",
];

const chiefKey = {
  g: P.mint,
  G: P.green,
  y: P.gold,
  s: P.skinDark,
  k: P.hair,
  r: P.red,
  w: P.white,
  p: "#1c1824",
  C: P.cyan,
  c: P.cyanDeep,
};
const CHIEF_ROWS = [
  "......g.g.g.g.g.......",
  ".....gGgGgGgGgG.......",
  ".....gGgGgGgGgG....C..",
  "......GGGGGGGGG....CC.",
  "......yyyyyyyyy....CC.",
  "......sssssssss....cC.",
  "......sskssskss....cC.",
  "......sssssssss....cC.",
  "......skkkkkkks....cC.",
  ".....kkkkkkkkkkk...cC.",
  ".....kkkkkkkkkkk...cC.",
  ".....kkkkkkkkkkk...cC.",
  "......kkkkkkkkk....cC.",
  ".......kkkkkkk.....cC.",
  "..rrrr.sssssss.rrrr.C.",
  ".rrrrrrsssssssrrrrrrC.",
  ".wwwwwwsssssssswwwwwC.",
  ".rrrrrrsssssssrrrrrrC.",
  ".wwwwwwsssssssswwwwwC.",
  ".rrrrr.ssssssss.rrrrC.",
  ".wwwww.ssssssss.wwwwy.",
  ".rrrrr.ssssssss.rrrry.",
  "..ssss.yyyyyyyy.ssssy.",
  "..ssss.yyyyyyyy.sssyy.",
  ".......pppppppp.......",
  "......pppppppppp......",
  "......pppppppppp......",
  "......pppppppppp......",
  "......pppppppppp......",
  "......pppppppppp......",
  "......pppppppppp......",
  "......pppppppppp......",
  "......pppp..pppp......",
  "......pppp..pppp......",
  "......pppp..pppp......",
  "......pppp..pppp......",
  "......pppp..pppp......",
  "......pppp..pppp......",
  "......pppp..pppp......",
  "......ssss..ssss......",
  "......ssss..ssss......",
  "......ssss..ssss......",
  "......kkkk..kkkk......",
  "......kkkk..kkkk......",
  ".....kkkkk..kkkkk.....",
];

const sageKey = {
  y: P.gold,
  k: P.hair,
  w: P.white,
  l: P.grey,
  d: P.greyDeep,
  t: P.mint,
  O: P.white,
  o: P.cyan,
  c: P.cyanDeep,
  s: P.skinLight,
};
const SAGE_ROWS = [
  "........y..y........",
  ".......yy..yy.......",
  "........yyyy........",
  ".......yyyyyy.......",
  "......kkyyyykk......",
  ".....kkkwwwwkkk.....",
  ".....kkwwwwwwkk.....",
  ".....kkwwkwwkwk.....",
  ".....kkwwwwwwkk.....",
  ".....kkwwwyywkk.....",
  ".....kkkwwwwkkk.....",
  "......kkkwwkkk......",
  "........llll........",
  ".......llllll.....O.",
  "......llttttll...OOO",
  "......lltttlll...OoO",
  "......llllllll....o.",
  "......llllllll....c.",
  ".....lllllllll....c.",
  ".....llldllllll...c.",
  ".....llldllllll...c.",
  ".....llldlllllll..c.",
  ".....llldllllllsssc.",
  ".....llldllllll...c.",
  "....lllldlllll....c.",
  "....lllldlllll....c.",
  "....lllldlllll....c.",
  "....lllldlllll....c.",
  "....lllldlllll....c.",
  "....dddddddddd....c.",
  "....lllllllll.....c.",
  "....lllllllll.....c.",
  "....lllllllll.....c.",
  "....llllllllll....c.",
  "....llllllllll....c.",
  "....llllllllll....c.",
  "....llllllllll....c.",
  "....llllllllll......",
  "....llllllllll......",
  "....llllllllll......",
  "....llllllllll......",
  "....llllllllll......",
  "....llllllllll......",
  "....dddddddddd......",
  "....kk......kk......",
];

const matriarchKey = {
  M: P.magentaDeep,
  m: P.magenta,
  w: P.white,
  s: P.skinDark,
  k: P.hair,
};
const MATRIARCH_ROWS = [
  ".........M..M.........",
  "........MMMMMM........",
  ".......wwMMMMww.......",
  "......wwwwwwwwww......",
  ".....wwwwwwwwwwww.....",
  ".....wwwwwwwwwwww.....",
  "....wwwwwwwwwwwwww....",
  "....wwwwssssssswww....",
  "....wwwsssssssssww....",
  "....wwwsskssskssww....",
  "....wwwsssssssssww....",
  ".....wwsssMMsssww.....",
  ".....wwwsssssswww.....",
  "......wwwssssww.......",
  ".........sss..........",
  "........mmmmm.........",
  ".......mmmmmmm........",
  "......smmmmmmms.......",
  "......smmmmmmms.......",
  "......s.mmmmm.s.......",
  "......s.mmmmm.s.......",
  "........mmmmm.........",
  "........mmmmmm........",
  "........mmmmmmm.......",
  ".......mmmmmmmmm......",
  ".......mmmmmmmmmm.....",
  "......mmmmmmmmmmmm....",
  "......mmmmmmmmmmmmm...",
  ".....mmmmmmmmmmmmmmm..",
  ".....mmmmmmmmmmmmmmmm.",
  "....mmmmmmmmmmmmmmmmm.",
  "....mmmmmmmmmmmmmmmmm.",
  "....mmmmmmmmmmmmmmmm..",
  "...mmmmmmmmmmmmmmmm...",
  "...mmmmmmmmmmmmmmm....",
  "...MMmmmmmmmmmmmm.....",
  "..MMMmmmmmmmmmmm......",
  ".MMMMmmmmmmmmmm.......",
  ".MMMMmmmmmmmmm........",
  "..MMMmmmmmmmm.........",
  "...MMmmmmmmm..........",
  "....mmmmmmm...........",
  "....w.wwwww.w.........",
  "...wwwwwwwwwww........",
  "..wwwwwwwwwwwww.......",
  "..wwwwwwwwwwwww.......",
  "...wwwwwwwwwww........",
  "....wwwwwwwww.........",
  ".....wwwwwww..........",
];

export type Actor = {
  id: CharacterId;
  stand: Sprite;
  stride: Sprite;
  /** Height of the drawn figure (feet at y + h). */
  h: number;
  w: number;
  /** Floating characters bob instead of stepping. */
  floats: boolean;
};

let actors: Record<Exclude<CharacterId, "parasite">, Actor> | null = null;

export function getActors(): Record<Exclude<CharacterId, "parasite">, Actor> {
  if (actors) return actors;
  const mk = (id: Exclude<CharacterId, "parasite">, floats = false): Actor => {
    const stand = paintActor(id, { stride: 0 });
    const stride = floats ? stand : paintActor(id, { stride: 1 });
    return { id, stand, stride, h: stand.h, w: stand.w, floats };
  };
  actors = {
    pioneer: mk("pioneer"),
    chief: mk("chief"),
    sage: mk("sage", true),
    matriarch: mk("matriarch", true),
  };
  return actors;
}

// ─── portraits (22×22, drawn on the character's backdrop) ───────────────

const PORTRAITS: Record<CharacterId, PixelMap> = {
  pioneer: {
    key: { h: P.hair, s: P.skinBrown, k: P.ink, r: P.red, w: P.white },
    rows: [
      ".........hhhh.........",
      "........hhhhhh........",
      "........hhhhhh........",
      ".........hhhh.........",
      ".......hhhhhhhh.......",
      "......hhhhhhhhhh......",
      ".....hhhhhhhhhhhh.....",
      ".....hhssssssssh......",
      ".....hsssssssssss.....",
      ".....hssssssssssh.....",
      ".....hskksssskkss.....",
      ".....hsssssssssss.....",
      "......ssssssssss......",
      "......sssskkssss......",
      ".......ssssssss.......",
      "........ssssss........",
      ".........ssss.........",
      "........rrssrr........",
      "......rrwwwwwwrr......",
      ".....wwwwwwwwwwww.....",
      "....wwwwwwwwwwwwww....",
      "....wwwwwwwwwwwwww....",
    ],
  },
  sage: {
    key: {
      y: P.gold,
      k: P.hair,
      w: P.white,
      l: P.grey,
      t: P.mint,
      d: P.greyDeep,
    },
    rows: [
      ".......y......y.......",
      "......yy......yy......",
      ".......yy....yy.......",
      "........yyyyyy........",
      ".......yyyyyyyy.......",
      ".....kkyyyyyyyykk.....",
      "....kkkkwwwwwwkkkk....",
      "....kkkwwwwwwwwkkk....",
      "....kkkwwwwwwwwkkk....",
      "....kkkwkkwwkkwkkk....",
      "....kkkwwwwwwwwkkk....",
      "....kkkwwyyyywwkkk....",
      "....kkkwwwwwwwwkkk....",
      ".....kkwwkkkkwwkk.....",
      ".....kkkwwwwwwkkk.....",
      "......kkkwwwwkkk......",
      "........llllll........",
      ".......llllllll.......",
      "......llltttllll......",
      ".....llllttttllll.....",
      "....llllllttlllllll...",
      "....dddddddddddddd....",
    ],
  },
  chief: {
    key: {
      g: P.mint,
      G: P.green,
      y: P.gold,
      s: P.skinDark,
      k: P.hair,
      r: P.red,
      w: P.white,
    },
    rows: [
      ".....g.g.g.g.g.g......",
      "....gGgGgGgGgGgG......",
      "....gGgGgGgGgGgG......",
      ".....GGGGGGGGGG.......",
      ".....yyyyyyyyyy.......",
      "....ssssssssssss......",
      "....ssssssssssss......",
      "....sskkssssskks......",
      "....ssssssssssss......",
      "....sssssssssssss.....",
      "....sskkkkkkkkss......",
      "...kkkkkkkkkkkkkk.....",
      "...kkkkkkkkkkkkkk.....",
      "..kkkkkkkkkkkkkkkk....",
      "..kkkkkkkkkkkkkkkk....",
      "..kkkkkkkkkkkkkkkk....",
      "...kkkkkkkkkkkkkk.....",
      "....kkkkkkkkkkkk......",
      ".....kkkkkkkkkk.......",
      "rrrr..ssssssss..rrrr..",
      "wwww.ssssssssss.wwww..",
      "rrrr.ssssssssss.rrrr..",
    ],
  },
  matriarch: {
    key: {
      M: P.magentaDeep,
      m: P.magenta,
      w: P.white,
      s: P.skinDark,
      k: P.hair,
    },
    rows: [
      "........M.M.M.........",
      ".......MMMMMMM........",
      "......wwMMMMMww.......",
      ".....wwwwwwwwwww......",
      "....wwwwwwwwwwwww.....",
      "...wwwwwwwwwwwwwww....",
      "...wwwwwwwwwwwwwww....",
      "..wwwwwsssssssswwww...",
      "..wwwwsssssssssswww...",
      "..wwwwsssssssssswww...",
      "..wwwwsskksssskkwww...",
      "..wwwwsssssssssswww...",
      "..wwwwwsssssssswwww...",
      "...wwwwsssMMssswww....",
      "...wwwwwssssswwwww....",
      "....wwwwwsssswwww.....",
      ".....wwwwwwwwwww......",
      "........sssss.........",
      ".......mmmmmmm........",
      "......mmmmmmmmm.......",
      ".....mmmmmmmmmmm......",
      "....mmmmmmmmmmmmm.....",
    ],
  },
  parasite: {
    key: { r: "#c8323c", R: "#8a1f2a", y: P.gold, k: P.ink, w: P.white },
    rows: [
      "......r.....r.........",
      ".....rr.r..rr.r.......",
      "....rrrrrrrrrrrr......",
      "...rrrrrrrrrrrrrr.....",
      "..rrrrrrrrrrrrrrrr....",
      "..rrrryyrrrrryyrrr....",
      ".rrrrykkyrrrykkyrrr...",
      ".rrrrykkyrrrykkyrrr...",
      ".rrrrryyrrrrryyrrrr...",
      ".rrrrrrrrrrrrrrrrrr...",
      ".rrrrrrrrrrrrrrrrrr...",
      "..rrrRRRRRRRRRRrrr....",
      "..rrRkwkwkwkwkwRrr....",
      "..rrRkkkkkkkkkkRrr....",
      "..rrrRwkwkwkwkRrrr....",
      "...rrrRRRRRRRRrrr.....",
      "...rrrrrrrrrrrrrr.....",
      "..rrrrrrrrrrrrrrrr....",
      ".rrrrrrrrrrrrrrrrrr...",
      ".rrr.rrrr.rrrr.rrrr...",
      ".rr..rrr..rrr...rrr...",
      ".r...rr...rr.....rr...",
    ],
  },
};

const portraitCache = new Map<CharacterId, Sprite>();

export function portrait(id: CharacterId): Sprite {
  let s = portraitCache.get(id);
  if (!s) {
    s = paintPortrait(id);
    portraitCache.set(id, s);
  }
  return s;
}

/** For the test suite: raw rows, so ragged art is caught before it ships. */
export const RAW_ROWS = {
  pioneer: PIONEER_ROWS,
  chief: CHIEF_ROWS,
  sage: SAGE_ROWS,
  matriarch: MATRIARCH_ROWS,
  portraits: Object.fromEntries(
    Object.entries(PORTRAITS).map(([k, v]) => [k, v.rows]),
  ) as Record<CharacterId, readonly string[]>,
};
