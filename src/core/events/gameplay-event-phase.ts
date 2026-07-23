import type { World } from "koota";
import { setPossession } from "../actions/possession";
import { PossessionChanged } from "./match-events";

export function gameplayEventPhase(world: World) {
  world.query(PossessionChanged).updateEach(([event], entity) => {
    setPossession(world, event.side);
    entity.destroy();
  });
}
