import type { World } from "koota";
import { upsertTrait } from "../upsert-trait";
import { Possession, type TeamSideId } from "../traits";

export function setPossession(world: World, side: TeamSideId) {
  upsertTrait(world, Possession, { side });
}
