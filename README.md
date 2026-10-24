<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# initiation

**An Initiation to Game~B** — a playable, pixel-art retelling of the short
film of the same name (Jake Ruiz, 2022; produced by Jim Rutt, Jeff Gomez and
Jake Ruiz), used as the introduction to Holons.

A terminal asks you to question the world. Say yes, and the three stewards —
the Sage (mind), the Chief (body), the Matriarch (heart) — walk you from the
first game through Game A to Game B, while the parasite tries to close your
wisdom centres. Where the film ends, "it is time to play", a second act
begins: a resource-based economy, played once in a sandbox. You name the
holon and seat its roles, then say what you need inside it (typed, or one of
four); each member looks on their own shelf, and none has enough. The
parasite comes back as Game A's voice ("buy it, borrow at interest, trust no
one") and the stewards answer it. You federate with three partner tribes as
a handshake — each opens its shelf, you choose what of yours to open in
return, both halves say yes — and their things fly into an "in reach" shelf
(3 things become 9). Then the need travels to the hexagons around yours and
along every link; whoever has it answers, and the nearer the offer, the
shorter the handoff quest. A partner then asks, in the tribe's Telegram-style
chat, for the very thing you opened to it: give it and the mutual credit you
took on settles in a circle. Then the handoff quest, a library that includes
the partners' shelves, and the value equation put to a vote. Last, the stewards show the clock a
tribe keeps time by: the moon. A ring of eight moons marks one lunation
(arrive and plan at the new moon, build, celebrate at the full, mend and
settle as it wanes), with tonight's real cycle lit, and the story lands on
Liminal Village in Italy and the ReGenerativa network, where tribes already
live by lunations. Each
interaction ends with a short card saying what the idea is; the screens
borrow the kiosk's Needs & Offers look and Telegram's chat. The finale sums
up the tribe you built and hands you the real links. **SKIP INTRO** on the
title goes straight to this act (it asks your wisdom first);
**EXIT** (top-right, or Esc) returns to the title from anywhere, and
CONTINUE picks the chapter back up.

The act is designed through Yu-kai Chou's
[Octalysis](https://medium.com/@yukaichou/the-octalysis-framework-for-gamification-behavioral-design-fe381150f0c1)
framework, worn as the talisman. At the start of the act the Chief's
talisman wakes as an amulet of eight faces and the Sage says what it is:
Game A pulls the black-hat drives (manufactured scarcity, slot-machine
chance, fear of loss); a tribe in Holons leads from the white hat (meaning,
growth, creativity) and uses the black only where it is honest — a real
need waits, a borrowed tool comes back whole. Every play wakes two drives
(`PLAY_DRIVES` in `src/story/octalysis.ts`); the amulet in the top-left
corner fills as they wake and glows after each play (`src/game/drives.ts`,
read off the tribe, nothing extra saved). Tap it (any time in the act) to
open it: tap a face, or press 1-8, to read that drive and whether your
tribe has woken it. Once a chapter, Game A whispers through one drive's
black hat, for you alone ("grab it before they do", "shut your half",
"keep it and never give back", "take the credit", "buy a bigger one",
"weigh it your way", "one more refresh"; `TEMPTATIONS` in
`src/story/octalysis.ts`). You answer: take the pull and the parasite
swells, your wisdoms dim and the face cracks red; hold it and a steward
names the same drive pulled from above. The finale's "What moved your
tribe" page shows the shape it took, the faces Game A pulled, and reads
any face you tap with what you answered.

## What it is

- A single static page: Vite + TypeScript, one `<canvas>`, no framework, no
  image files. The game lays out on a fixed 384×216 stage but draws at the
  display's native resolution (`src/engine/screen.ts`): scenery is vector
  shapes and gradients baked into high-resolution layers
  (`src/art/paint.ts`, `src/art/scenery.ts`), the cast is high-resolution
  pixel art, painted in the boxes of its original pixel maps and baked down
  to a grid three times as fine, with flat cel shading and a 1px outline
  (`src/art/cast.ts`, `src/art/characters.ts`), text is JetBrains Mono on
  the same 6-unit grid (`src/engine/font.ts`), and the sound is a small Web
  Audio synth.
- The story is data: `src/story/script.ts` holds every beat (dialogue, walks,
  choices, effects, trials, and the second act's `play` beats),
  `src/story/holons.ts` the cards naming each idea, the sandbox world (needs,
  resources, partner tribes, nearby holons) and the options each play offers,
  the finale text and links. Edit words there; the scenes only play them.
- The second act's interactions live in `src/game/play/` (one file per
  feature, over the `PlayBase` shell in `types.ts`); the sandbox tribe they
  build is plain data with pure rules in `src/game/tribe.ts` (tested).
- Lunations are counted as `@holons/core` counts them (`src/game/lunation.ts`,
  the same port liminalvillage.com carries), so the cycle the game names
  is the one the Telegram bot's /newmoon and the site's year in moons name.
- Progress (chapter, chosen role, talisman, the sandbox tribe) is saved in
  `localStorage` so a phone that sleeps can continue.
- It does not touch Holosphere or `@holons/core`: nothing is written anywhere.
  The tribe you build in the act is pretend, kept in your browser only.

## Controls

| Action         | Keyboard               | Touch / mouse            |
| -------------- | ---------------------- | ------------------------ |
| Next line      | Space / Enter          | tap                      |
| Walk           | → or D                 | hold the right half      |
| Pick a role    | 1 / 2 / 3              | tap a card               |
| Keep orbs lit  | 1 / 2 / 3 or M / H / B | tap the orb that dims    |
| Terminal       | type, Enter; Y / N     | tap a question, YES / NO |
| Name the tribe | type, Enter            | tap a suggested name     |
| In the act     | 1 2 3 (4) pick, Enter  | tap cards, buttons       |
| Sound          | M                      | —                        |

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5573
pnpm build      # → build/ (static)
pnpm test       # font coverage, script integrity, art shape
pnpm typecheck
pnpm lint
```

Deploy as a static site: `netlify.toml` builds with pnpm and publishes
`build/`.

## Credits

After _An Initiation to Game~B_ (2022) — written, directed and animated by
Jake Ruiz; produced by Jim Rutt, Jeff Gomez and Jake Ruiz; music by Hélène
Vogelsinger. In loving memory of Jim Rutt. The pixel art, code and the
retelling here are original work of the Holons project, released under
AGPL-3.0-or-later (see `LICENSE.md`); the film's own footage,
artwork and music are not included.
