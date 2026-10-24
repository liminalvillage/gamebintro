// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The journey, beat by beat. Dialogue follows the arc of "An Initiation to
// Game~B" (Jake Ruiz, 2022): the first game, Game A, the parasite, the three
// wisdoms, Game B — retold in our own words, and landing on Holons at the
// end. Edit the words here; the scenes only play them.

import type { CharacterId } from "../art/characters";
import type { SceneryId } from "../art/scenery";
import type { MoodId } from "../engine/music";
import type { RoamId } from "../game/roam";
import type { PlayId, Purpose } from "./holons";
import type { TemptId } from "./octalysis";

export type Beat =
  /** A line of dialogue; with `when`, only for a holon of that purpose. */
  | { say: CharacterId; text: string; when?: Purpose }
  /** The party walks right for `px` pixels; the player holds → / the right half. */
  | { walk: number }
  /** The pioneer roams free: gather, carry, dodge, plant (see game/roam). */
  | { roam: RoamId }
  /** A choice the player makes. */
  | { choose: "role" }
  /** A one-off effect. */
  | {
      fx:
        | "parasite-rise"
        | "parasite-calm"
        | "talisman"
        | "amulet"
        | "collapse"
        | "revive"
        | "pyramid"
        | "scales"
        | "mesh"
        | "moon";
    }
  /** The parasite attack: keep the wisdom centres open. */
  | { trial: "first" | "second" }
  /** Drive the overworld animation from one phase to another. */
  | { map: [from: number, to: number] }
  /** A caption on black. */
  | { card: string }
  /** One Holons feature, played in the sandbox tribe (the second act). */
  | { play: PlayId }
  /** Game A whispers through one drive; the player takes it or holds. */
  | { tempt: TemptId }
  /** A pause in seconds. */
  | { wait: number };

export type Chapter = {
  id: string;
  scenery: SceneryId;
  /** The mood the score plays here. */
  music: MoodId;
  beats: Beat[];
};

export const PROLOGUE_QUESTIONS = [
  "What's going on with the world right now?",
  "Is the world falling apart?",
  "How did we get here?",
  "Who's right and who's wrong?",
  "What's real and what's fake?",
  "What should I do?",
];

export const PROLOGUE_REPLIES = [
  "Ok. Ask another question.",
  "Keep going.",
  "....",
  "Good. One more.",
  "....",
];

export const PROLOGUE_OFFER =
  "These are very good questions.\nIt looks like you are playing Game A.\nWould you like to play Game~B?";

export const CHAPTERS: Chapter[] = [
  {
    id: "awakening",
    scenery: "valley",
    music: "dawn",
    beats: [
      { say: "pioneer", text: "Whaa... what happened?" },
      { say: "chief", text: "You have been initiated." },
      { say: "pioneer", text: "Huh?" },
      { say: "chief", text: "Let's move. We haven't much time." },
      { say: "pioneer", text: "Time for what?" },
      { say: "chief", text: "Until the parasite takes hold of you again." },
      { say: "sage", text: "You are weak, but you now have eyes to see." },
      { say: "pioneer", text: "What am I looking at? Where am I?" },
      {
        say: "sage",
        text: "Like most everyone you know, you have been hijacked by a parasite.",
      },
      {
        say: "sage",
        text: "The parasite was born of Game A: the game you have been playing your whole life. It tells you how to think, how to feel, and what to do.",
      },
      {
        say: "matriarch",
        text: "Now that you are free of its influence, for a while, we would like to take you on a journey.",
      },
      { say: "pioneer", text: "A journey to where?" },
      { say: "matriarch", text: "A journey to Game~B." },
      {
        say: "matriarch",
        text: "The journey to Game~B is a story about the relationship between humanity, technology and nature. Not only a story of survival, but of the potential to thrive.",
      },
      {
        say: "matriarch",
        text: "You and your tribe will be among the first people to play Game~B.",
      },
      { roam: "forage" },
      {
        say: "sage",
        text: "We have traced our steps back to the beginning, just before the dawn of human civilisation. Before Game A, there was the first game.",
      },
      {
        say: "sage",
        text: "The first game was our most enduring and successful game. We played it for over a hundred thousand years.",
      },
      {
        say: "chief",
        text: "Our nomadic ancestors stood apart from their natural cohabitants in one special ability: they could adapt across every bioregion of the earth.",
      },
      {
        say: "chief",
        text: "The key to that adaptability was culture: a new strategy for group cooperation. These early cultures operated within the principles of wholeness and regeneration.",
      },
      {
        say: "sage",
        text: "The first game was, of course, multiplayer. Each player is necessary to sustain wholeness by stewarding the cycle of regeneration.",
      },
      {
        say: "sage",
        text: "All players must be present, and respect each other's roles.",
      },
      {
        say: "sage",
        text: "Roles. I am the Sage, who seeks truth and ensures its transmission to the coming generations. My wisdom is that of the mind.",
      },
      {
        say: "chief",
        text: "I am the Chief, who seeks to build a better world for the coming generations. My wisdom is that of the body, and its extensions.",
      },
      {
        say: "matriarch",
        text: "I am the Matriarch, who gives life and purpose to the coming generations. My wisdom is that of the heart.",
      },
      { say: "pioneer", text: "Which role am I?" },
      { choose: "role" },
      {
        say: "matriarch",
        text: "As a Game~B pioneer you must do what is yours to do, and bring together all of the roles needed to sustain wholeness and regeneration.",
      },
      { fx: "parasite-rise" },
      { say: "chief", text: "The parasite! It's waking up. We have to hurry." },
      {
        say: "sage",
        text: "You mustn't allow the creature to take hold. Breathe deeply, and keep your wisdom centres open.",
      },
      { trial: "first" },
      { fx: "parasite-calm" },
      { say: "sage", text: "Good. Come." },
      { walk: 200 },
    ],
  },
  {
    id: "village",
    scenery: "village",
    music: "village",
    beats: [
      {
        say: "matriarch",
        text: "Nature's abundance functions in a constant state of regenerative motion. This is wholeness.",
      },
      {
        say: "matriarch",
        text: "As stewards, all players in the human tribe must move with nature's cycles, as our nomadic ancestors once did.",
      },
      { say: "chief", text: "Here. Take this talisman." },
      { fx: "talisman" },
      {
        say: "sage",
        text: "In the first game, cooperation was the rule within each tribe, through the co-creative strategy of culture. Each player felt membership and belonging.",
      },
      { roam: "kindle" },
      {
        say: "chief",
        text: "All tribes were indigenous to a specific place on earth, a bioregion. Each tribe grew niches around the habitats available to it, as every living being does.",
      },
      {
        say: "chief",
        text: "Shelters, tools, weapons, clothing and medicines: all made from what was immediately available, skilfully, with knowledge of the local plants and animals.",
      },
      {
        say: "chief",
        text: "Neighbouring tribes were regarded as dangerous. Yet the most resilient tribes traded goods and knowledge, in patterns of both cooperation and competition.",
      },
      { walk: 140 },
      {
        say: "sage",
        text: "For a long time, the tribes across all bioregions respected the principle of wholeness, and stayed in a harsh but steady balance with nature.",
      },
      { say: "sage", text: "But even nature's bounty has her limits." },
    ],
  },
  {
    id: "overworld-first",
    scenery: "overworld",
    music: "journey",
    beats: [
      { map: [0, 1] },
      {
        say: "sage",
        text: "Over time the first game became so successful that the number and size of tribes grew large.",
      },
      { map: [1, 2] },
      {
        say: "chief",
        text: "We were forced into close proximity with one another. Once we were no longer free to roam, we had no choice but to settle in place.",
      },
      { say: "chief", text: "Competition for nature's bounty intensified." },
      { map: [2, 2.6] },
      { say: "sage", text: "A new game emerged. Game A." },
    ],
  },
  {
    id: "cradle",
    scenery: "cradle",
    music: "empire",
    beats: [
      { say: "pioneer", text: "Where are we now? Or... when?" },
      {
        say: "sage",
        text: "Here we stand before the cradle of civilisation, at the birth of Game A.",
      },
      {
        say: "sage",
        text: "As competition increased, the tribe began to lose its instinctive ability to sustain the principles of wholeness and regeneration.",
      },
      {
        say: "chief",
        text: "Game A is the game of growth, rivalry, control and accumulation.",
      },
      {
        say: "chief",
        text: "Settlement meant accumulating and controlling resources, knowledge, and people. The race accelerated, faster and faster, and competition came to dominate cooperation.",
      },
      {
        say: "chief",
        text: "Though necessary to advance the human tribe, Game A would prove to be fragile.",
      },
      { roam: "hoard" },
      {
        say: "sage",
        text: "Even players who depended on each other began to compete. They assumed dominion over nature's land and her bounty, and over each other.",
      },
      { fx: "pyramid" },
      {
        say: "sage",
        text: "Before long, culture was divided into rigid classes, and those with the greatest accumulation sat at the top of an exclusive hierarchy.",
      },
      { say: "matriarch", text: "What we do to nature, we do to ourselves." },
    ],
  },
  {
    id: "overworld-gamea",
    scenery: "overworld",
    music: "march",
    beats: [
      { map: [2.6, 3.2] },
      {
        say: "sage",
        text: "The strategy of culture itself adapted, as empires competed for more and more accumulation and control, and killed off those who could not or would not play the new game.",
      },
      {
        say: "matriarch",
        text: "In our race to master Game A, nature's stewardship was lost.",
      },
      { map: [3.2, 4] },
      {
        say: "chief",
        text: "Game A's technology takes from nature without bothering to give back. It is fundamentally exploitative.",
      },
      {
        say: "chief",
        text: "Rivalry and accumulation drove the exponential development of complicated technologies. Since they require extraction from the geosphere, eventually they become lethal to the biosphere.",
      },
    ],
  },
  {
    id: "burning",
    scenery: "burning",
    music: "burning",
    beats: [
      {
        say: "chief",
        text: "As the game advances, our global ecosystems are collapsing, while our technologies gain the potential for destruction and depletion on a vast scale.",
      },
      {
        say: "sage",
        text: "Compared to the first game, Game A is young, and its players are novices.",
      },
      {
        say: "sage",
        text: "When the principles of wholeness and regeneration are abandoned there is only one fate: self-termination.",
      },
      {
        say: "sage",
        text: "Indeed, every empire since the beginning of Game A has risen only to be forced, later, into disintegration.",
      },
      {
        say: "sage",
        text: "The pattern is clear now. We must play a new game if we are to survive and thrive. Game~B.",
      },
      {
        say: "pioneer",
        text: "Wha... wait. Does that mean going back to the first game?",
      },
      {
        say: "sage",
        text: "No. The only way out is through. We must take what we have learned from Game A, then once again move to sustain wholeness and regeneration.",
      },
      { roam: "embers" },
      {
        say: "chief",
        text: "The parasite you carry with you is an object of control, of blind adherence to the rules of Game A. It was set upon you in your earliest years.",
      },
      {
        say: "chief",
        text: "It makes sure you conform, by conditioning you to see yourself as separate from nature and from other people, so that you forget wholeness and your purpose as a steward.",
      },
      {
        say: "matriarch",
        text: "The parasite knows only one god: the growth-based economy. But you can free yourself from its grasp.",
      },
      { say: "pioneer", text: "How?" },
    ],
  },
  {
    id: "metropolis",
    scenery: "metropolis",
    music: "machine",
    beats: [
      {
        say: "sage",
        text: "By starting with what you did at the outset of this journey. Asking more questions than you answer will open your mind.",
      },
      {
        say: "matriarch",
        text: "By first finding what is yours to do, then building meaningful relationships with those you need to work with. This will open your heart.",
      },
      {
        say: "chief",
        text: "And finally, by acting and creating from a place of integrity within your tribe. This will train your body to play Game~B.",
      },
      {
        say: "matriarch",
        text: "The more you keep these wisdom centres open, and sustain wholeness within yourself, your tribe and the world, the less the parasite will have influence over you.",
      },
      { fx: "parasite-rise" },
      { say: "parasite", text: "GRRRRRROOOOAHHHH" },
      { trial: "second" },
      { fx: "collapse" },
      {
        say: "pioneer",
        text: "Ah hah hah... nuh huh... nuh huh... uhh... mmmhhmm...",
      },
      { card: "GAME~B" },
    ],
  },
  {
    id: "gameb",
    scenery: "gameb",
    music: "bloom",
    beats: [
      { fx: "revive" },
      { say: "pioneer", text: "Whoa hoh hoooh... is this Game~B?" },
      {
        say: "sage",
        text: "The story of Game~B is not yet written, nor guaranteed. But its potential is real.",
      },
      {
        say: "sage",
        text: "Now more than ever, the world needs our creativity and stewardship to create the conditions for life to thrive.",
      },
      {
        say: "matriarch",
        text: "The challenges that face humanity are far too complex for one person or tribe to fathom. The crises we see, ecological, political, social, educational, are interconnected.",
      },
      {
        say: "matriarch",
        text: "To face this meta-crisis we must consciously revitalise our tribe's special ability to adapt quickly, with a co-creative strategy of culture. And we must do so in a bioregional mesh network across the globe.",
      },
      { roam: "plant" },
      {
        say: "matriarch",
        text: "Restoring this co-creative engine to the human tribe will once again allow cooperation to out-compete competition, leading to an exodus out of Game A.",
      },
      {
        say: "sage",
        text: "Therefore, by the rules of Game~B, the meta-crisis cannot be solved by a single tribe or ideology. The key is to expand our inter-tribal cooperation to the global scale.",
      },
      {
        say: "sage",
        text: "For this we need open, decentralised access to our Game A technologies, along with a culture rejuvenated by wholeness.",
      },
      {
        say: "sage",
        text: "Nature creates humans. Humans create technology. And technology must be used to support the integrity of nature.",
      },
      {
        say: "chief",
        text: "Game A's strategy of driving rivalrous innovation and production while continuing extraction must come to an end.",
      },
    ],
  },
  {
    id: "commons",
    scenery: "commons",
    music: "commons",
    beats: [
      {
        say: "matriarch",
        text: "At the heart of this co-creative strategy of culture is a space to rediscover each other, and our relationship with nature.",
      },
      {
        say: "matriarch",
        text: "As we learn our role as stewards we revive the principles of wholeness and regeneration. Like our own bodies, the Game~B tribe must protect the heart.",
      },
      {
        say: "chief",
        text: "We start by acting locally while thinking globally. Like our nomadic ancestors, our economies become bioregional.",
      },
      {
        say: "chief",
        text: "This time, however, they are interconnected by a global mesh, with the assistance of our technology.",
      },
    ],
  },
  {
    id: "mesh",
    scenery: "worldmap",
    music: "mesh",
    beats: [
      { fx: "mesh" },
      {
        say: "chief",
        text: "Tribe selection is the driving force of human evolution. What will distinguish us from our nomadic ancestors is our cooperation on all scales.",
      },
      { fx: "scales" },
      {
        say: "sage",
        text: "From the individual player, to the neighbourhood, to the village, to the tribe, to the city, to the bioregion, to the globe... and some day across the galaxy.",
      },
      {
        say: "sage",
        text: "Like the fungal networks beneath our feet, a rich system of channels for cooperation and movement will let us respond to the global challenges we face.",
      },
    ],
  },
  {
    id: "warp",
    scenery: "warp",
    music: "warp",
    beats: [
      {
        say: "chief",
        text: "The work required to achieve this vision is, today, incomprehensible.",
      },
      { say: "matriarch", text: "But it is time to play." },
      {
        say: "matriarch",
        text: "Every day you must return to the symbol of wholeness to loosen the parasite's grasp. By keeping your wisdom centres open you can let go of your conditioned ways of being.",
      },
      {
        say: "matriarch",
        text: "Lead with your strengths, and find others who are committed to do the same.",
      },
      {
        say: "matriarch",
        text: "Make sure your tribe has strengths in all three forms of wisdom, and that you respect each other's roles. Then, and only then, can you start to play Game~B.",
      },
      {
        say: "sage",
        text: "There is a future of thriving that awaits us. It would be a shame to miss it.",
      },
      { say: "parasite", text: "GRRRRRROOOOHHHHUUUUUGHHH..." },
    ],
  },
  // ─── Act two: playing Game~B — the holon, its need, the mesh that meets it
  {
    id: "tribe",
    scenery: "gameb",
    music: "bloom",
    beats: [
      { choose: "role" },
      { fx: "amulet" },
      {
        say: "sage",
        text: "Look at your talisman. Here it wakes as an amulet with eight faces: the eight drives that move every player in every game.",
      },
      {
        say: "sage",
        text: "Game A pulls the lower faces: lack, chance, the fear of losing. Game~B leads from the upper ones: meaning, growth, creativity.",
      },
      {
        say: "sage",
        text: "Each thing we do together lights the faces it wakes. Tap the amulet, up in the corner, whenever you want to read it.",
      },
      {
        say: "sage",
        text: "And Game A will whisper to you through these faces, for you alone. Each time, you choose which way the face is pulled. The amulet remembers.",
      },
      {
        say: "matriarch",
        text: "Then let's play. A tribe that plays Game~B needs a home for what it shares: its needs, its gifts, its work. That home is a holon.",
      },
      {
        say: "sage",
        text: "A holon is a whole that is also part of a larger whole. Your tribe is one. So is your valley, your bioregion, the earth.",
      },
      {
        say: "chief",
        text: "Every holon begins with a name, and a reason to exist. What shall we call ours, and what is it for?",
      },
      { play: "found" },
      {
        say: "sage",
        when: "land",
        text: "To heal the land. Then we begin where the soil is tired, and plant what our grandchildren will eat.",
      },
      {
        say: "matriarch",
        when: "warm",
        text: "To keep us warm. Then no one in this valley spends the winter alone, or out in the cold.",
      },
      {
        say: "chief",
        when: "feed",
        text: "To feed everyone. Then the harvest is not ours until it reaches every table in the valley.",
      },
      {
        say: "matriarch",
        when: "gather",
        text: "To gather people. Then our fire is lit for strangers too, and every market day is a festival.",
      },
      {
        say: "sage",
        text: "Now the roles. In the first game all players had to be present, and respect each other's roles. Nothing has changed.",
      },
      { play: "roles" },
      {
        say: "matriarch",
        text: "Four players, three wisdoms, one tribe. Now we can speak of what matters. Game A starts from a price: what will sell? Game~B starts from a need.",
      },
      {
        say: "chief",
        text: "This winter was hard. The river moved, the old orchard failed, and the barn roof gave way. Each of us is missing something.",
      },
      {
        say: "sage",
        when: "land",
        text: "And we said we would heal the land. The orchard will need seeds before the spring.",
      },
      {
        say: "matriarch",
        when: "warm",
        text: "And we said we would keep each other warm. The barn is where the newcomers slept.",
      },
      {
        say: "chief",
        when: "feed",
        text: "And we said we would feed everyone. The harvest is ripe, but the tables are far.",
      },
      {
        say: "matriarch",
        when: "gather",
        text: "And we said we would gather people. Market day is coming, and our hands are few.",
      },
      {
        say: "matriarch",
        text: "So say yours, here, inside our holon, where the whole tribe will hear it. What do you need?",
      },
      { play: "ask" },
      {
        say: "chief",
        text: "We each looked on our own shelves. Maps, bread, tools. A tribe alone never holds everything a life needs.",
      },
      { tempt: "grab" },
      {
        say: "matriarch",
        text: "Breathe. That voice will come back, every time we have something to share. Beyond the hill there are other tribes, and they have shelves too.",
      },
      { walk: 120 },
    ],
  },
  {
    id: "federate",
    scenery: "worldmap",
    music: "mesh",
    beats: [
      {
        say: "chief",
        text: "No tribe plays alone. Around us are other tribes, each with its own ledger, its own roles, and its own shelf of things.",
      },
      { fx: "mesh" },
      {
        say: "sage",
        text: "To federate, two tribes link, and a link has two halves. Each tribe says yes for itself, keeps its own ledger, and opens part of its shelf to the other.",
      },
      {
        say: "sage",
        text: "Look at the bottom: what is in reach. Three things now, all ours. Link, and their things join ours. Choose what you will open in return.",
      },
      { play: "federate" },
      {
        say: "matriarch",
        text: "Nine things in reach where there were three, and nothing changed hands. This is the mesh: it grows one link at a time, and no tribe rules it.",
      },
      { tempt: "shut" },
    ],
  },
  {
    id: "gifts",
    scenery: "commons",
    music: "commons",
    beats: [
      {
        say: "matriarch",
        text: "Now let your need travel: out to the hexagons around us, the nearest first, and along every link we just made.",
      },
      {
        say: "sage",
        text: "Whoever has it can answer. Not whoever pays most: whoever has it, and is near, or is a friend. The nearer, the shorter the walk home.",
      },
      { play: "cast" },
      { tempt: "keep" },
      {
        say: "sage",
        text: "No interest and no master. It is mutual credit: a balance, and it settles when we give in turn, to anyone in the mesh.",
      },
      {
        say: "chief",
        text: "Listen. The bot is ringing. One of our new partners has a need of its own.",
      },
      { play: "give" },
      {
        say: "matriarch",
        text: "We received from one tribe and can give to another. Whether we give today or tomorrow, the balance is ours to settle, and credit that flows in a circle is not a debt.",
      },
    ],
  },
  {
    id: "quests",
    scenery: "gameb",
    music: "work",
    beats: [
      {
        say: "chief",
        text: "A gift still has to be carried home. The work of a tribe is a quest: anyone may post one, anyone may join it.",
      },
      {
        say: "chief",
        text: "When it is done, the hours are counted for everyone who took part. Pick one that is yours to do.",
      },
      { tempt: "credit" },
      { play: "quest" },
      {
        say: "matriarch",
        text: "Did you see? The thanks you gave is kept too. A tribe remembers who shows up.",
      },
      { walk: 120 },
    ],
  },
  {
    id: "library",
    scenery: "village",
    music: "village",
    beats: [
      {
        say: "chief",
        text: "Remember the talisman? I did not sell it to you. I lent it. In Game A a tool sits idle in a hundred sheds.",
      },
      { tempt: "envy" },
      {
        say: "chief",
        text: "In the tribe, tools are shared, not hoarded: a library of things. See what is free, borrow it, bring it back. Our partners' shelves are open to us too.",
      },
      { play: "library" },
      {
        say: "chief",
        text: "A borrowed tool asks for one thing in return: that it comes back whole.",
      },
      { walk: 100 },
    ],
  },
  {
    id: "equation",
    scenery: "commons",
    music: "commons",
    beats: [
      {
        say: "sage",
        text: "In Game A one thing was honoured: accumulation. Whoever held the most stood at the top of the pyramid.",
      },
      { tempt: "rank" },
      {
        say: "sage",
        text: "A tribe that plays Game~B chooses for itself what it honours. That is its value equation: hours, money, participation, appreciation. Weigh them.",
      },
      { play: "equation" },
      {
        say: "matriarch",
        text: "No chief decided this. It was proposed, and the tribe voted. That is how every rule of a holon changes.",
      },
    ],
  },
  {
    id: "moon",
    scenery: "village",
    music: "village",
    beats: [
      {
        say: "sage",
        text: "One last thing: the clock. Game A keeps time by the factory whistle, the quarterly report, the day the interest falls due.",
      },
      { tempt: "price" },
      {
        say: "chief",
        text: "A tribe that plays Game~B keeps time by the moon. Look up. Every tribe in the mesh sees the same one.",
      },
      { fx: "moon" },
      {
        say: "sage",
        text: "The moon is a progress bar the whole planet can read. From one new moon to the next is a lunation: twenty-nine and a half days.",
      },
      {
        say: "matriarch",
        text: "At the new moon we arrive and plan, each on three levels: our own growth, the people and place around us, and a cause for the planet.",
      },
      {
        say: "chief",
        text: "At the full moon we look back and celebrate. As it wanes we finish, mend and settle. When it goes dark, the cycle closes.",
      },
      {
        say: "sage",
        text: "A holon keeps its books by the moon: the quests, the hours, the credit, counted each lunation. Then a new page opens, for everyone at once.",
      },
      {
        say: "matriarch",
        text: "This is not only a story. In the hills of central Italy, at Liminal Village, tribes already live this way. Guests arrive with the new moon and stay a moonth.",
      },
      {
        say: "sage",
        text: "It is one node of a network, ReGenerativa: places that keep one calendar of moons, share their frameworks, and send quests from site to site.",
      },
      {
        say: "chief",
        text: "Wherever you are, the next new moon is yours to begin with. Count it, plan it, and find the others who are counting too.",
      },
      { card: "FIND THE OTHERS" },
    ],
  },
];

/** Index of the first chapter of the second act (where SKIP INTRO lands). */
export const HOLONS_ACT_START = CHAPTERS.findIndex((c) =>
  c.beats.some((b) => "play" in b),
);

/** The scales named in the mesh chapter, in order (for the diagram + tests). */
export const SCALES = [
  "PLAYER",
  "NEIGHBOURHOOD",
  "VILLAGE",
  "TRIBE",
  "CITY",
  "BIOREGION",
  "GLOBE",
  "GALAXY",
];
