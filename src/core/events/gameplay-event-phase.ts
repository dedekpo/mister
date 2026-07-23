import type { World } from "koota";
import { recordGoal, resetForKickoff } from "../actions/match-flow";
import { setPossession } from "../actions/possession";
import { opposingSide } from "../traits";
import { GoalScored, PossessionChanged } from "./match-events";

export function gameplayEventPhase(world: World) {
  world.query(PossessionChanged).updateEach(([event], entity) => {
    setPossession(world, event.side);
    entity.destroy();
  });
  world.query(GoalScored).updateEach(([event], entity) => {
    recordGoal(world, event.side);
    resetForKickoff(world, opposingSide(event.side));
    entity.destroy();
  });
}
