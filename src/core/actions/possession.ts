import type { World } from "koota";
import { Possession, type TeamSideId } from "../traits";

export function setPossession(world: World, side: TeamSideId) {
  if (world.has(Possession)) {
    world.set(Possession, { side });
    return;
  }
  world.add(Possession({ side }));
}
