import { trait } from "koota";
import type { TeamSideId } from "../traits";

export const PossessionChanged = trait({ side: "home" as TeamSideId });
export const GoalScored = trait({ side: "home" as TeamSideId });
