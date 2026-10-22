// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Where the initiation lands: Holons. The tribe that plays Game~B needs a
// place to hold its roles, its quests and its gifts; a holon is that place.
// Text and links for the finale live here so they are easy to retune.

export type Wisdom = "mind" | "heart" | "body";

/** The second act's interactions, in story order: it starts from a need. */
export type PlayId =
  | "found"
  | "roles"
  | "ask"
  | "federate"
  | "cast"
  | "give"
  | "quest"
  | "library"
  | "equation";

export const PLAY_IDS: PlayId[] = [
  "found",
  "roles",
  "ask",
  "federate",
  "cast",
  "give",
  "quest",
  "library",
  "equation",
];

/** The card shown when an interaction is done: what the idea is. */
export const PLAY_MEANS: Record<PlayId, { title: string; line: string }> = {
  ask: {
    title: "NEEDS FIRST",
    line: "A HOLON'S ECONOMY STARTS FROM WHAT ITS PEOPLE NEED, NOT FROM WHAT SELLS. A NEED IS SAID OUT LOUD, WHERE THE TRIBE CAN HEAR IT.",
  },
  found: {
    title: "A HOLON",
    line: "A WHOLE THAT IS ALSO PART OF A LARGER WHOLE: A TRIBE WITH ITS OWN MEMBERS, ITS OWN LEDGER AND ITS OWN WAY.",
  },
  roles: {
    title: "MEMBERS & ROLES",
    line: "EVERY PLAYER PRESENT, EVERY ROLE NAMED AND RESPECTED. NO ONE IS IN CHARGE OF EVERYTHING.",
  },
  federate: {
    title: "FEDERATION",
    line: "TRIBES LINK BY CONSENT, BOTH HALVES SAYING YES. EACH KEEPS ITS OWN LEDGER AND OPENS PART OF ITS SHELF: WITH EVERY LINK, MORE IS IN REACH FOR EVERYONE.",
  },
  cast: {
    title: "NEEDS & OFFERS",
    line: "A NEED TRAVELS OUT, HEXAGON BY HEXAGON AND ALONG EVERY FEDERATION LINK, UNTIL SOMEONE WHO HAS IT ANSWERS. NOT WHOEVER PAYS MOST: WHOEVER HAS IT.",
  },
  give: {
    title: "MUTUAL CREDIT",
    line: "NO INTEREST AND NO MASTER. WHAT YOU RECEIVE IS A BALANCE, AND IT SETTLES WHEN YOU GIVE IN TURN, TO ANYONE IN THE MESH. CREDIT FLOWS IN CIRCLES.",
  },
  quest: {
    title: "QUESTS",
    line: "WORK IS POSTED IN THE OPEN AND ANYONE MAY JOIN. THE HOURS COUNT FOR EVERYONE WHO TOOK PART, AND THE THANKS ARE REMEMBERED.",
  },
  library: {
    title: "LIBRARY OF THINGS",
    line: "TOOLS ARE SHARED, NOT HOARDED: ONE LADDER FOR A HUNDRED HOUSES. A FEDERATED TRIBE'S SHELF IS YOURS TO BORROW FROM TOO.",
  },
  equation: {
    title: "VALUE EQUATION",
    line: "THE TRIBE DECIDES WHAT IT HONOURS: HOURS, MONEY, PARTICIPATION, APPRECIATION. IT CHANGES ONLY BY PROPOSAL AND VOTE.",
  },
};

/** The things the sandbox world holds, and the words that ask for them. */
export type Resource =
  | "seeds"
  | "cart"
  | "hands"
  | "shelter"
  | "food"
  | "tools"
  | "maps"
  | "rope"
  | "wool"
  | "honey"
  | "salt";

export const RESOURCES: Record<Resource, { label: string; words: string[] }> = {
  seeds: {
    label: "SEEDS",
    words: ["SEED", "PLANT", "GARDEN", "ORCHARD", "GROW"],
  },
  cart: {
    label: "A CART",
    words: ["CART", "RIDE", "MOVE", "CARRY", "TRANSPORT", "VAN", "CAR"],
  },
  hands: {
    label: "HANDS",
    words: ["HAND", "HELP", "WORK", "HARVEST", "PEOPLE", "MARKET"],
  },
  shelter: {
    label: "A ROOF",
    words: ["ROOF", "ROOM", "SLEEP", "BED", "HOUSE", "SHELTER", "STAY", "TENT"],
  },
  food: {
    label: "BREAD",
    words: ["FOOD", "BREAD", "EAT", "MEAL", "FLOUR", "HUNGRY"],
  },
  tools: {
    label: "TOOLS",
    words: ["TOOL", "SAW", "HAMMER", "LADDER", "DRILL", "FIX", "MEND"],
  },
  maps: {
    label: "MAPS",
    words: ["MAP", "WAY", "RIVER", "SPRING", "WATER", "PATH"],
  },
  rope: { label: "ROPE", words: ["ROPE", "CORD", "TIE"] },
  wool: {
    label: "WOOL",
    words: ["WOOL", "WARM", "BLANKET", "CLOTH", "CLOTHES", "COAT"],
  },
  honey: { label: "HONEY", words: ["HONEY", "BEE", "SWEET"] },
  salt: { label: "SALT", words: ["SALT", "PRESERVE"] },
};

/** What the interactions offer to pick from, and the world around the tribe. */
export const PLAY_OPTIONS = {
  /** Suggested needs: none of them is on the tribe's own shelf. */
  needs: [
    { text: "SEEDS FOR THE ORCHARD", res: "seeds" },
    { text: "A CART FOR THE HARVEST", res: "cart" },
    { text: "A ROOF FOR THE WINTER", res: "shelter" },
    { text: "HANDS ON MARKET DAY", res: "hands" },
  ] as { text: string; res: Resource }[],
  /** What the tribe's own stewards hold. */
  stewardHas: { sage: "maps", matriarch: "food", chief: "tools" } as Record<
    "sage" | "matriarch" | "chief",
    Resource
  >,
  /** What a partner asks for, when it needs what you opened to it. */
  partnerAsks: {
    food: "BREAD FOR THE CROSSING",
    maps: "A MAP OF THE NEW CHANNEL",
    tools: "TOOLS TO MEND THE FENCE",
  } as Partial<Record<Resource, string>>,
  names: ["RIVER TRIBE", "LIMINAL VALLEY", "THE ORCHARD", "NORTH COMMONS"],
  /** Tribes that may federate with yours: far away, reached by a link. */
  partners: [
    { name: "THE FERRY", has: ["cart", "rope"] },
    { name: "HILL FOLK", has: ["seeds", "wool"] },
    { name: "SALT MARSH", has: ["salt", "shelter"] },
  ] as { name: string; has: Resource[] }[],
  /** Holons on the hexagons around yours: near, reached by the map. */
  nearby: [
    { name: "OLD MILL", km: 2, has: ["hands", "food"] },
    { name: "STONE FARM", km: 2, has: ["seeds", "honey"] },
    { name: "WILLOW HOUSE", km: 6, has: ["shelter", "hands"] },
  ] as { name: string; km: number; has: Resource[] }[],
  quests: [
    { wisdom: "mind", title: "MAP THE SPRINGS", hours: 3 },
    { wisdom: "heart", title: "WELCOME THE NEWCOMERS", hours: 2 },
    { wisdom: "body", title: "MEND THE BRIDGE", hours: 4 },
  ] as { wisdom: Wisdom; title: string; hours: number }[],
  /** The library: two things of ours, two on federated partners' shelves. */
  items: [
    { name: "SAW", owner: null },
    { name: "LADDER", owner: null },
    { name: "CART", owner: "THE FERRY" },
    { name: "TENT", owner: "SALT MARSH" },
  ] as { name: string; owner: string | null }[],
};

/** Row labels of the finale's "your tribe" page. */
export const TRIBE_PAGE = {
  title: "YOUR TRIBE",
  unnamed: "AN UNNAMED TRIBE",
  rows: {
    members: "MEMBERS & ROLES",
    quests: "QUESTS",
    needs: "NEED",
    library: "LIBRARY",
    equation: "VALUE EQUATION",
    links: "FEDERATION",
  },
  footer: "NOW DO IT FOR REAL. FIND THE OTHERS.",
};

/** The moon chapter's diagram: one lunation, and what each quarter is for. */
export const MOON = {
  lunation: "LUNATION",
  day: "DAY",
  of: "OF",
  /** The eight phase bands, new moon first (see game/lunation phaseBand). */
  phases: [
    "NEW MOON",
    "WAXING CRESCENT",
    "FIRST QUARTER",
    "WAXING GIBBOUS",
    "FULL MOON",
    "WANING GIBBOUS",
    "LAST QUARTER",
    "WANING CRESCENT",
  ],
  /** What the tribe does at each quarter: new, first, full, last. */
  quarters: ["ARRIVE & PLAN", "BUILD", "CELEBRATE", "MEND & SETTLE"],
};

/** Where the moon is tonight, under the mesh on the finale. */
export const MOON_TONIGHT = {
  line: (index: number, day: number, days: number) =>
    `TONIGHT IS DAY ${day} OF ${days} OF LUNATION ${index}. AT THE NEXT NEW MOON, EVERY TRIBE IN THE MESH BEGINS AGAIN TOGETHER.`,
  village:
    "PLAYED FOR REAL AT LIMINAL VILLAGE, ITALY, AND ACROSS THE REGENERATIVA NETWORK.",
};

export const MESH_IN_HOLONS = [
  "HOLONS FEDERATE: EACH TRIBE KEEPS ITS OWN LEDGER AND SHARES WHAT IT CHOOSES, ACROSS HEXAGONS FROM THE NEIGHBOURHOOD TO THE GLOBE.",
  "NO SINGLE SERVER OWNS IT. NO SINGLE TRIBE RULES IT.",
];

export const LINKS = [
  { label: "FIND THE OTHERS", href: "https://holons.io" },
  { label: "OPEN THE DASHBOARD", href: "https://dashboard.holons.io" },
  { label: "PLAY ON TELEGRAM", href: "https://t.me/HolonsBot" },
  { label: "THE YEAR IN MOONS", href: "https://liminalvillage.com/lunations" },
] as const;

export const CREDITS = [
  "AN INITIATION TO GAME~B",
  "A HOLONS INTRODUCTION",
  "",
  "AFTER THE FILM",
  "AN INITIATION TO GAME~B (2022)",
  "WRITTEN, DIRECTED & ANIMATED BY JAKE RUIZ",
  "PRODUCED BY JIM RUTT, JEFF GOMEZ & JAKE RUIZ",
  "MUSIC BY HELENE VOGELSINGER",
  "IN LOVING MEMORY OF JIM RUTT",
  "",
  "THIS GAME",
  "ORIGINAL PIXEL ART, CODE & RETELLING",
  "BY THE HOLONS PROJECT",
  "AGPL-3.0-OR-LATER",
  "DESIGNED THROUGH THE OCTALYSIS",
  "FRAMEWORK BY YU-KAI CHOU",
  "",
  "KEEP TIME BY THE MOON",
  "LIMINALVILLAGE.COM/LUNATIONS",
  "REGENERATIVA.EARTH",
  "",
  "FIND THE OTHERS",
  "HOLONS.IO",
];
