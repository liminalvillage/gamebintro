// SPDX-License-Identifier: AGPL-3.0-or-later

import type { PlayId } from "../../story/holons";
import type { Services } from "../types";
import { AskPlay } from "./ask";
import { CastPlay } from "./cast";
import { EquationPlay } from "./equation";
import { FederatePlay } from "./federate";
import { FoundPlay } from "./found";
import { GivePlay } from "./give";
import { LibraryPlay } from "./library";
import { QuestPlay } from "./quest";
import { RolesPlay } from "./roles";
import type { Play } from "./types";

export type { Play, PlayInput } from "./types";

export function createPlay(id: PlayId, s: Services): Play {
  switch (id) {
    case "ask":
      return new AskPlay(s);
    case "found":
      return new FoundPlay(s);
    case "roles":
      return new RolesPlay(s);
    case "federate":
      return new FederatePlay(s);
    case "cast":
      return new CastPlay(s);
    case "give":
      return new GivePlay(s);
    case "quest":
      return new QuestPlay(s);
    case "library":
      return new LibraryPlay(s);
    case "equation":
      return new EquationPlay(s);
  }
}
