// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Which Octalysis drives the sandbox tribe has woken, read off the tribe
// itself (nothing extra is saved): a play counts once what it builds is
// there, and a drive is as full as the share of its plays that are done.
// A whisper of Game A the tribe gave in to marks its drive as pulled.

import { PLAY_IDS, type PlayId } from "../story/holons";
import {
  DRIVE_IDS,
  PLAY_DRIVES,
  TEMPT_IDS,
  TEMPTATIONS,
  type DriveId,
} from "../story/octalysis";
import { allSeated, type Tribe } from "./tribe";

/** True once the tribe holds what the play leaves behind. */
export function played(t: Tribe, id: PlayId): boolean {
  switch (id) {
    case "ask":
      return t.needs.length > 0;
    case "found":
      return t.name !== null;
    case "roles":
      return allSeated(t);
    case "federate":
      return t.links.length > 0;
    case "cast":
      return t.needs.some((n) => n.metBy !== null);
    case "give":
      return t.given.length > 0;
    case "quest":
      return t.quests.some((q) => q.done && q.appreciated);
    case "library":
      return t.borrowedEver.length > 0 && t.borrowed === null;
    case "equation":
      return t.equation !== null;
  }
}

/** Each drive from 0 (asleep) to 1 (every play that wakes it is done). */
export function driveLevels(t: Tribe): Record<DriveId, number> {
  const out = {} as Record<DriveId, number>;
  for (const d of DRIVE_IDS) {
    const plays = PLAY_IDS.filter((p) => PLAY_DRIVES[p].includes(d));
    const done = plays.filter((p) => played(t, p)).length;
    out[d] = plays.length ? done / plays.length : 0;
  }
  return out;
}

/** The drives Game A pulled from below: the whispers the tribe gave in to. */
export function pulledDrives(t: Tribe): DriveId[] {
  return TEMPT_IDS.filter((id) => t.tempted[id] === "a").map(
    (id) => TEMPTATIONS[id].drive,
  );
}
