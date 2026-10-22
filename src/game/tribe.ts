// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The sandbox tribe: what the second act builds, as pure rules over plain
// data. Nothing here touches Holons for real — it is a toy ledger that
// mirrors the shape of a holon (a need first, members with roles, federation
// links that widen what is in reach, offers from near hexagons and from
// partners, quests with hours and appreciation, a library of things, a
// value equation) so the player meets each idea by doing it once.

import type { CharacterId } from "../art/characters";
import {
  PLAY_OPTIONS,
  RESOURCES,
  type Resource,
  type Wisdom,
} from "../story/holons";

export type Steward = Exclude<CharacterId, "parasite" | "pioneer">;

export const WISDOM_OF: Record<Steward, Wisdom> = {
  sage: "mind",
  matriarch: "heart",
  chief: "body",
};

export const STEWARD_OF: Record<Wisdom, Steward> = {
  mind: "sage",
  heart: "matriarch",
  body: "chief",
};

export type Quest = {
  title: string;
  wisdom: Wisdom;
  hours: number;
  helper: Steward | null;
  done: boolean;
  appreciated: boolean;
};

/** How an offer reached the need: from inside, from a near hexagon, by a link. */
export type Via = "tribe" | "near" | "federation";

export type Need = {
  text: string;
  /** What it asks for, if the words name something the world holds. */
  res: Resource | null;
  /** Who met it: a steward id, or another holon's name. */
  metBy: string | null;
  via: Via | null;
};

export const NEED_MAX = 26;

export type EquationKey = "hours" | "money" | "participation" | "appreciation";
export const EQUATION_KEYS: EquationKey[] = [
  "hours",
  "money",
  "participation",
  "appreciation",
];
export type Equation = Record<EquationKey, number>;

export type Tribe = {
  name: string | null;
  /** Wisdoms whose steward has taken their seat. */
  seated: Wisdom[];
  quests: Quest[];
  needs: Need[];
  /** Library item currently held by the player, if any. */
  borrowed: string | null;
  /** Items ever borrowed (so the finale can count them). */
  borrowedEver: string[];
  equation: Equation | null;
  /** Neighbouring tribes linked to. */
  links: string[];
  /** What the tribe opened of its own shelf to each partner, by name. */
  opened: Record<string, Resource>;
  /** What the tribe gave when a partner asked. */
  given: Gift[];
};

/** Something the tribe gave to another holon, and the steward who held it. */
export type Gift = { to: string; res: Resource; by: Steward };

export function emptyTribe(): Tribe {
  return {
    name: null,
    seated: [],
    quests: [],
    needs: [],
    borrowed: null,
    borrowedEver: [],
    equation: null,
    links: [],
    opened: {},
    given: [],
  };
}

export const NAME_MAX = 18;

/** Names are trimmed, capped and never empty; returns false if nothing usable. */
export function foundTribe(t: Tribe, name: string): boolean {
  const n = name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX).trim();
  if (!n) return false;
  t.name = n;
  return true;
}

export function seatRole(t: Tribe, w: Wisdom): void {
  if (!t.seated.includes(w)) t.seated.push(w);
}

export function allSeated(t: Tribe): boolean {
  return (["mind", "heart", "body"] as Wisdom[]).every((w) =>
    t.seated.includes(w),
  );
}

export function postQuest(t: Tribe, title: string, wisdom: Wisdom): Quest {
  const q: Quest = {
    title,
    wisdom,
    hours: 0,
    helper: null,
    done: false,
    appreciated: false,
  };
  t.quests.push(q);
  return q;
}

export function inviteHelper(q: Quest, who: Steward): void {
  q.helper = who;
}

export function completeQuest(q: Quest, hours: number): void {
  q.done = true;
  q.hours = Math.max(0, hours);
}

export function appreciate(q: Quest): boolean {
  if (!q.helper || !q.done) return false;
  q.appreciated = true;
  return true;
}

/** The first resource whose words appear in the need, or null. */
export function matchResource(text: string): Resource | null {
  const up = text.toUpperCase();
  for (const [res, r] of Object.entries(RESOURCES) as [
    Resource,
    (typeof RESOURCES)[Resource],
  ][])
    if (r.words.some((w) => up.includes(w))) return res;
  return null;
}

/** Trimmed, capped, never empty; null if nothing usable. */
export function askNeed(
  t: Tribe,
  text: string,
  res: Resource | null = matchResource(text),
): Need | null {
  const n = text
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, NEED_MAX)
    .trim()
    .toUpperCase();
  if (!n) return null;
  const need: Need = { text: n, res, metBy: null, via: null };
  t.needs.push(need);
  return need;
}

/** The need still waiting for an offer, latest first. */
export function openNeed(t: Tribe): Need | null {
  for (let i = t.needs.length - 1; i >= 0; i--)
    if (!t.needs[i]!.metBy) return t.needs[i]!;
  return null;
}

export type Offer = {
  from: string;
  via: Via;
  /** Distance for a near hexagon; partners are reached by a link instead. */
  km?: number;
  what: string;
};

/** What is in reach: the tribe's own shelf, then every linked partner's. */
export function inReach(
  t: Tribe,
): { from: string; res: Resource; via: "tribe" | "federation" }[] {
  const out: { from: string; res: Resource; via: "tribe" | "federation" }[] =
    [];
  for (const [who, res] of Object.entries(PLAY_OPTIONS.stewardHas))
    out.push({ from: who, res, via: "tribe" });
  for (const p of PLAY_OPTIONS.partners)
    if (t.links.includes(p.name))
      for (const res of p.has)
        out.push({ from: p.name, res, via: "federation" });
  return out;
}

/**
 * Who answers a need, given where it was shared. The tribe always hears it;
 * the map reaches the near hexagons; the federation reaches linked partners
 * only. A need the world has no word for is answered by whoever hears it
 * with a hand ("we can help with that").
 */
export function offersFor(
  t: Tribe,
  need: Need,
  share: { map: boolean; federation: boolean },
): Offer[] {
  const out: Offer[] = [];
  const has = (list: Resource[]) =>
    need.res === null || list.includes(need.res);
  const what = need.res ? RESOURCES[need.res].label : "A HAND WITH IT";
  if (need.res)
    for (const [who, res] of Object.entries(PLAY_OPTIONS.stewardHas))
      if (res === need.res) out.push({ from: who, via: "tribe", what });
  if (share.map)
    for (const n of PLAY_OPTIONS.nearby)
      if (has(n.has)) out.push({ from: n.name, via: "near", km: n.km, what });
  if (share.federation)
    for (const p of PLAY_OPTIONS.partners)
      if (t.links.includes(p.name) && has(p.has))
        out.push({ from: p.name, via: "federation", what });
  return out;
}

export function meetNeed(n: Need, offer: Pick<Offer, "from" | "via">): void {
  n.metBy = offer.from;
  n.via = offer.via;
}

/** The steward who holds a resource on the tribe's own shelf, if any. */
export function holderOf(res: Resource): Steward | null {
  for (const [who, r] of Object.entries(PLAY_OPTIONS.stewardHas))
    if (r === res) return who as Steward;
  return null;
}

/**
 * Hours to carry a gift home: nothing from inside the tribe, an hour per
 * few km from a near hexagon, a day's walk along a federation link.
 */
export function offerHours(o: Pick<Offer, "via" | "km">): number {
  if (o.via === "tribe") return 0;
  if (o.via === "near") return Math.max(1, Math.round((o.km ?? 2) / 3));
  return 3;
}

/** The handoff hours of a met need (0 while it is still open). */
export function handoffHours(n: Need): number {
  if (!n.metBy || !n.via) return 0;
  const km = PLAY_OPTIONS.nearby.find((x) => x.name === n.metBy)?.km;
  return offerHours({ via: n.via, km });
}

/**
 * Federating is two halves: they open their shelf, you open part of yours
 * in return. Both are recorded with the link.
 */
export function federate(t: Tribe, partner: string, res: Resource): boolean {
  if (!link(t, partner)) return false;
  t.opened[partner] = res;
  return true;
}

/**
 * The need a partner brings back to you: what you opened to it, asked by
 * the first linked partner that did not just give to you.
 */
export function partnerNeed(
  t: Tribe,
): { from: string; res: Resource; text: string } | null {
  const giver = t.needs.find((n) => n.via === "federation")?.metBy;
  const linked = PLAY_OPTIONS.partners.filter(
    (p) => t.links.includes(p.name) && t.opened[p.name],
  );
  const p = linked.find((x) => x.name !== giver) ?? linked[0];
  if (!p) return null;
  const res = t.opened[p.name]!;
  return {
    from: p.name,
    res,
    text: PLAY_OPTIONS.partnerAsks[res] ?? RESOURCES[res].label,
  };
}

export function giveTo(t: Tribe, to: string, res: Resource): Gift | null {
  const by = holderOf(res);
  if (!by) return null;
  const g: Gift = { to, res, by };
  t.given.push(g);
  return g;
}

/**
 * Mutual credit, from the tribe's side: every need another holon met is
 * -1, every gift to another holon is +1. It is a balance, not a debt — it
 * settles by giving to anyone in the mesh, not by paying back the giver.
 */
export function ledger(t: Tribe): {
  received: number;
  given: number;
  balance: number;
} {
  const received = t.needs.filter((n) => n.metBy && n.via !== "tribe").length;
  const given = t.given.length;
  return { received, given, balance: given - received };
}

export function borrow(t: Tribe, item: string): boolean {
  if (t.borrowed) return false;
  t.borrowed = item;
  if (!t.borrowedEver.includes(item)) t.borrowedEver.push(item);
  return true;
}

export function returnItem(t: Tribe): boolean {
  if (!t.borrowed) return false;
  t.borrowed = null;
  return true;
}

/** Game A's equation: only accumulation counts. */
export const GAME_A_EQUATION: Equation = {
  hours: 0,
  money: 100,
  participation: 0,
  appreciation: 0,
};

/** Where the tribe starts from: an even split, for the player to reshape. */
export function evenEquation(): Equation {
  return { hours: 25, money: 25, participation: 25, appreciation: 25 };
}

/**
 * Move `delta` points onto `key`, taking them from (or giving them to) the
 * other terms largest-first, so the four always sum to 100 and stay 0..100.
 */
export function rebalance(
  eq: Equation,
  key: EquationKey,
  delta: number,
): Equation {
  const out: Equation = { ...eq };
  const target = Math.max(0, Math.min(100, out[key] + delta));
  let diff = target - out[key];
  out[key] = target;
  const others = EQUATION_KEYS.filter((k) => k !== key);
  // taking: from the largest first; giving: to the smallest first
  while (diff !== 0) {
    const sorted = [...others].sort((a, b) =>
      diff > 0 ? out[b] - out[a] : out[a] - out[b],
    );
    const k = sorted[0]!;
    if (diff > 0) {
      const take = Math.min(diff, out[k]);
      if (take === 0) break;
      out[k] -= take;
      diff -= take;
    } else {
      const give = Math.min(-diff, 100 - out[k]);
      if (give === 0) break;
      out[k] += give;
      diff += give;
    }
  }
  return out;
}

export type Member = "pioneer" | Steward;
export const MEMBERS: Member[] = ["pioneer", "sage", "matriarch", "chief"];

/**
 * Each member's tally under the sandbox ledger. Hours go to whoever did a
 * quest (the player and the helper), participation counts quests and needs
 * taken part in, appreciation goes to the helper who was thanked, money to
 * the steward who met a need (they gave something of theirs).
 */
export function tally(t: Tribe): Record<Member, Equation> {
  const z = (): Equation => ({
    hours: 0,
    money: 0,
    participation: 0,
    appreciation: 0,
  });
  const r: Record<Member, Equation> = {
    pioneer: z(),
    sage: z(),
    matriarch: z(),
    chief: z(),
  };
  for (const q of t.quests) {
    if (!q.done) continue;
    r.pioneer.hours += q.hours;
    r.pioneer.participation += 1;
    if (q.helper) {
      r[q.helper].hours += q.hours;
      r[q.helper].participation += 1;
      if (q.appreciated) r[q.helper].appreciation += 1;
    }
  }
  for (const n of t.needs) {
    if (!n.metBy) continue;
    r.pioneer.participation += 1;
    // a gift from inside the tribe credits its steward; one from another
    // holon is that holon's credit, on its own ledger
    const m = n.metBy;
    if (m === "sage" || m === "matriarch" || m === "chief") {
      r[m].participation += 1;
      r[m].money += 1;
    }
  }
  for (const g of t.given) {
    r[g.by].participation += 1;
    r[g.by].money += 1;
  }
  return r;
}

/** Weighted score per member under `eq`, highest first; ties keep MEMBERS order. */
export function rank(t: Tribe, eq: Equation): { who: Member; score: number }[] {
  const tl = tally(t);
  const max: Equation = {
    hours: 0,
    money: 0,
    participation: 0,
    appreciation: 0,
  };
  for (const m of MEMBERS)
    for (const k of EQUATION_KEYS) max[k] = Math.max(max[k], tl[m][k]);
  const rows = MEMBERS.map((who) => {
    let score = 0;
    for (const k of EQUATION_KEYS)
      if (max[k] > 0) score += (eq[k] / 100) * (tl[who][k] / max[k]);
    return { who, score: Math.round(score * 100) / 100 };
  });
  return rows.sort((a, b) => b.score - a.score);
}

export function adoptEquation(t: Tribe, eq: Equation): void {
  t.equation = { ...eq };
}

export function link(t: Tribe, neighbour: string): boolean {
  if (t.links.includes(neighbour)) return false;
  t.links.push(neighbour);
  return true;
}

/** Lenient revival of a saved tribe; anything odd falls back to empty. */
export function reviveTribe(j: unknown): Tribe {
  const t = emptyTribe();
  if (!j || typeof j !== "object") return t;
  const o = j as Record<string, unknown>;
  if (typeof o.name === "string" && o.name.trim()) foundTribe(t, o.name);
  if (Array.isArray(o.seated))
    for (const w of o.seated)
      if (w === "mind" || w === "heart" || w === "body") seatRole(t, w);
  if (Array.isArray(o.quests))
    for (const q of o.quests as Record<string, unknown>[]) {
      if (!q || typeof q.title !== "string") continue;
      const w = q.wisdom;
      if (w !== "mind" && w !== "heart" && w !== "body") continue;
      const nq = postQuest(t, q.title, w);
      const h = q.helper;
      if (h === "sage" || h === "matriarch" || h === "chief") nq.helper = h;
      if (q.done === true)
        completeQuest(nq, typeof q.hours === "number" ? q.hours : 0);
      if (q.appreciated === true) appreciate(nq);
    }
  if (Array.isArray(o.needs))
    for (const n of o.needs as Record<string, unknown>[]) {
      if (!n || typeof n.text !== "string") continue;
      const res =
        typeof n.res === "string" && n.res in RESOURCES
          ? (n.res as Resource)
          : null;
      const nn = askNeed(t, n.text, res);
      if (!nn) continue;
      const via = n.via;
      if (
        typeof n.metBy === "string" &&
        (via === "tribe" || via === "near" || via === "federation")
      )
        meetNeed(nn, { from: n.metBy, via });
    }
  if (Array.isArray(o.borrowedEver))
    for (const i of o.borrowedEver)
      if (typeof i === "string" && !t.borrowedEver.includes(i))
        t.borrowedEver.push(i);
  if (typeof o.borrowed === "string") {
    t.borrowed = o.borrowed;
    if (!t.borrowedEver.includes(o.borrowed)) t.borrowedEver.push(o.borrowed);
  }
  if (o.equation && typeof o.equation === "object") {
    const e = o.equation as Record<string, unknown>;
    if (EQUATION_KEYS.every((k) => typeof e[k] === "number")) {
      const eq = Object.fromEntries(
        EQUATION_KEYS.map((k) => [
          k,
          Math.max(0, Math.min(100, e[k] as number)),
        ]),
      ) as Equation;
      if (EQUATION_KEYS.reduce((s, k) => s + eq[k], 0) === 100) t.equation = eq;
    }
  }
  if (Array.isArray(o.links))
    for (const l of o.links) if (typeof l === "string") link(t, l);
  const isRes = (r: unknown): r is Resource =>
    typeof r === "string" && r in RESOURCES;
  if (o.opened && typeof o.opened === "object")
    for (const [k, r] of Object.entries(o.opened as Record<string, unknown>))
      if (t.links.includes(k) && isRes(r)) t.opened[k] = r;
  if (Array.isArray(o.given))
    for (const g of o.given as Record<string, unknown>[])
      if (g && typeof g.to === "string" && isRes(g.res)) giveTo(t, g.to, g.res);
  return t;
}
