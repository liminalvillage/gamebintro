// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  EQUATION_KEYS,
  GAME_A_EQUATION,
  allSeated,
  appreciate,
  askNeed,
  borrow,
  completeQuest,
  emptyTribe,
  evenEquation,
  federate,
  foundTribe,
  giveTo,
  handoffHours,
  inviteHelper,
  inReach,
  ledger,
  link,
  matchResource,
  meetNeed,
  offersFor,
  openNeed,
  partnerNeed,
  postQuest,
  rank,
  rebalance,
  returnItem,
  reviveTribe,
  seatRole,
  tally,
  type Equation,
} from "./tribe";

const sum = (e: Equation) => EQUATION_KEYS.reduce((s, k) => s + e[k], 0);

describe("founding and seating", () => {
  it("keeps a trimmed, capped name and refuses an empty one", () => {
    const t = emptyTribe();
    expect(foundTribe(t, "   ")).toBe(false);
    expect(t.name).toBeNull();
    expect(foundTribe(t, "  river   tribe  ")).toBe(true);
    expect(t.name).toBe("river tribe");
    foundTribe(t, "A".repeat(40));
    expect(t.name!.length).toBe(18);
  });

  it("seats each wisdom once and knows when all three sit", () => {
    const t = emptyTribe();
    seatRole(t, "mind");
    seatRole(t, "mind");
    expect(t.seated).toEqual(["mind"]);
    expect(allSeated(t)).toBe(false);
    seatRole(t, "heart");
    seatRole(t, "body");
    expect(allSeated(t)).toBe(true);
  });
});

describe("quests, needs, library", () => {
  it("credits hours and appreciation only once the quest is done with a helper", () => {
    const t = emptyTribe();
    const q = postQuest(t, "MEND THE BRIDGE", "body");
    expect(appreciate(q)).toBe(false);
    inviteHelper(q, "chief");
    expect(appreciate(q)).toBe(false);
    completeQuest(q, 2);
    expect(appreciate(q)).toBe(true);
    const tl = tally(t);
    expect(tl.pioneer.hours).toBe(2);
    expect(tl.chief.hours).toBe(2);
    expect(tl.chief.appreciation).toBe(1);
    expect(tl.sage.hours).toBe(0);
  });

  it("a met need is mutual credit that cancels out", () => {
    const t = emptyTribe();
    const n = askNeed(t, "SEEDS FOR THE ORCHARD")!;
    expect(ledger(t).balance).toBe(0);
    meetNeed(n, { from: "HILL FOLK", via: "federation" });
    expect(ledger(t)).toEqual({ received: 1, given: 0, balance: -1 });
    expect(openNeed(t)).toBeNull();
    // another holon's gift is its credit, not a steward's
    expect(tally(t).matriarch.money).toBe(0);
    meetNeed(askNeed(t, "BREAD")!, { from: "matriarch", via: "tribe" });
    expect(tally(t).matriarch.money).toBe(1);
  });
});

describe("needs first, then the federation", () => {
  it("reads what a need asks for from its words, and refuses an empty one", () => {
    expect(matchResource("a ladder for a week")).toBe("tools");
    expect(matchResource("Seeds for the orchard")).toBe("seeds");
    expect(matchResource("a song")).toBeNull();
    const t = emptyTribe();
    expect(askNeed(t, "   ")).toBeNull();
    expect(askNeed(t, "x".repeat(60))!.text.length).toBe(26);
  });

  it("linking widens what is in reach", () => {
    const t = emptyTribe();
    const before = inReach(t).length;
    expect(inReach(t).some((r) => r.res === "seeds")).toBe(false);
    link(t, "HILL FOLK");
    expect(inReach(t).length).toBeGreaterThan(before);
    expect(inReach(t)).toContainEqual({
      from: "HILL FOLK",
      res: "seeds",
      via: "federation",
    });
  });

  it("a need reaches near hexagons by the map and partners only by a link", () => {
    const t = emptyTribe();
    const n = askNeed(t, "SEEDS FOR THE ORCHARD")!;
    const both = { map: true, federation: true };
    expect(offersFor(t, n, both).map((o) => o.from)).toEqual(["STONE FARM"]);
    expect(offersFor(t, n, { map: false, federation: true })).toEqual([]);
    link(t, "HILL FOLK");
    const offers = offersFor(t, n, both);
    expect(offers.map((o) => [o.from, o.via])).toEqual([
      ["STONE FARM", "near"],
      ["HILL FOLK", "federation"],
    ]);
    expect(offersFor(t, n, { map: false, federation: true })).toHaveLength(1);
  });

  it("the tribe answers what its own stewards hold, and a hand answers the rest", () => {
    const t = emptyTribe();
    const own = offersFor(t, askNeed(t, "BREAD")!, {
      map: false,
      federation: false,
    });
    expect(own).toEqual([{ from: "matriarch", via: "tribe", what: "BREAD" }]);
    link(t, "THE FERRY");
    const odd = offersFor(t, askNeed(t, "A SONG FOR THE FEAST")!, {
      map: true,
      federation: true,
    });
    expect(odd.every((o) => o.what === "A HAND WITH IT")).toBe(true);
    expect(odd.some((o) => o.via === "federation")).toBe(true);
    expect(odd.some((o) => o.via === "near")).toBe(true);
  });

  it("borrows one thing at a time and remembers what was borrowed", () => {
    const t = emptyTribe();
    expect(returnItem(t)).toBe(false);
    expect(borrow(t, "SAW")).toBe(true);
    expect(borrow(t, "LADDER")).toBe(false);
    expect(returnItem(t)).toBe(true);
    expect(t.borrowed).toBeNull();
    expect(t.borrowedEver).toEqual(["SAW"]);
  });
});

describe("federating, and the credit coming home", () => {
  it("a link is two halves: theirs opens their shelf, yours opens part of yours", () => {
    const t = emptyTribe();
    expect(federate(t, "THE FERRY", "food")).toBe(true);
    expect(federate(t, "THE FERRY", "maps")).toBe(false);
    expect(t.links).toEqual(["THE FERRY"]);
    expect(t.opened).toEqual({ "THE FERRY": "food" });
  });

  it("a partner asks for what you opened to it, and it is not the one who just gave", () => {
    const t = emptyTribe();
    expect(partnerNeed(t)).toBeNull();
    federate(t, "THE FERRY", "food");
    federate(t, "HILL FOLK", "tools");
    meetNeed(askNeed(t, "SEEDS")!, { from: "THE FERRY", via: "federation" });
    expect(partnerNeed(t)).toEqual({
      from: "HILL FOLK",
      res: "tools",
      text: "TOOLS TO MEND THE FENCE",
    });
  });

  it("giving to anyone in the mesh settles what was received from someone else", () => {
    const t = emptyTribe();
    meetNeed(askNeed(t, "SEEDS")!, { from: "HILL FOLK", via: "federation" });
    expect(ledger(t).balance).toBe(-1);
    const g = giveTo(t, "THE FERRY", "food")!;
    expect(g.by).toBe("matriarch");
    expect(ledger(t)).toEqual({ received: 1, given: 1, balance: 0 });
    expect(tally(t).matriarch.money).toBe(1);
    expect(giveTo(t, "THE FERRY", "seeds")).toBeNull();
  });

  it("carrying a gift home takes longer the further it comes from", () => {
    const t = emptyTribe();
    const near = askNeed(t, "SEEDS")!;
    meetNeed(near, { from: "STONE FARM", via: "near" });
    const far = askNeed(t, "SEEDS")!;
    meetNeed(far, { from: "HILL FOLK", via: "federation" });
    const own = askNeed(t, "BREAD")!;
    meetNeed(own, { from: "matriarch", via: "tribe" });
    expect(handoffHours(near)).toBeLessThan(handoffHours(far));
    expect(handoffHours(own)).toBe(0);
  });
});

describe("the value equation", () => {
  it("always sums to 100 and stays within 0..100", () => {
    let eq = evenEquation();
    eq = rebalance(eq, "hours", 10);
    expect(eq.hours).toBe(35);
    expect(sum(eq)).toBe(100);
    for (let i = 0; i < 20; i++) eq = rebalance(eq, "hours", 10);
    expect(eq.hours).toBe(100);
    expect(sum(eq)).toBe(100);
    for (let i = 0; i < 20; i++) eq = rebalance(eq, "hours", -10);
    expect(eq.hours).toBe(0);
    expect(sum(eq)).toBe(100);
    expect(sum(GAME_A_EQUATION)).toBe(100);
  });

  it("takes from the largest term and gives to the smallest", () => {
    const eq: Equation = {
      hours: 10,
      money: 60,
      participation: 20,
      appreciation: 10,
    };
    const up = rebalance(eq, "hours", 10);
    expect(up.money).toBe(50);
    const down = rebalance(eq, "money", -10);
    expect(down.hours + down.appreciation).toBe(30);
  });

  it("re-ranks members when the equation changes", () => {
    const t = emptyTribe();
    const q = postQuest(t, "MAP THE SPRINGS", "mind");
    inviteHelper(q, "sage");
    completeQuest(q, 3);
    appreciate(q);
    meetNeed(askNeed(t, "A HAND ON MARKET DAY")!, {
      from: "chief",
      via: "tribe",
    });
    const byMoney = rank(t, GAME_A_EQUATION);
    expect(byMoney[0]!.who).toBe("chief");
    const byAppreciation = rank(t, {
      hours: 0,
      money: 0,
      participation: 0,
      appreciation: 100,
    });
    expect(byAppreciation[0]!.who).toBe("sage");
    const byHours = rank(t, {
      hours: 100,
      money: 0,
      participation: 0,
      appreciation: 0,
    });
    expect(
      byHours
        .slice(0, 2)
        .map((r) => r.who)
        .sort(),
    ).toEqual(["pioneer", "sage"]);
  });
});

describe("saving", () => {
  it("revives what it saved and drops garbage", () => {
    const t = emptyTribe();
    foundTribe(t, "LIMINAL");
    seatRole(t, "heart");
    const q = postQuest(t, "WELCOME THE NEWCOMERS", "heart");
    inviteHelper(q, "matriarch");
    completeQuest(q, 1);
    appreciate(q);
    meetNeed(askNeed(t, "SEEDS")!, { from: "HILL FOLK", via: "federation" });
    askNeed(t, "A SONG");
    borrow(t, "CART");
    t.equation = rebalance(evenEquation(), "appreciation", 20);
    link(t, "RIVER TRIBE");
    expect(link(t, "RIVER TRIBE")).toBe(false);
    federate(t, "THE FERRY", "food");
    giveTo(t, "THE FERRY", "food");
    const back = reviveTribe(JSON.parse(JSON.stringify(t)));
    expect(back).toEqual(t);
    expect(reviveTribe(null)).toEqual(emptyTribe());
    expect(
      reviveTribe({
        name: 7,
        seated: ["x"],
        quests: [{ title: 1 }],
        equation: { hours: 50, money: 50, participation: 50, appreciation: 50 },
        links: [null],
      }),
    ).toEqual(emptyTribe());
  });
});
