import type { Entity, World } from "koota";
import {
  IsPlayer,
  TacticalOverride,
  TeamSide,
  type TeamSideId,
} from "../traits";

export function setTacticalOverride(
  entity: Entity,
  lane: number,
  depth: number,
) {
  if (entity.has(TacticalOverride)) {
    entity.set(TacticalOverride, { lane, depth });
    return;
  }
  entity.add(TacticalOverride({ lane, depth }));
}

export function clearTeamTacticalOverrides(world: World, side: TeamSideId) {
  const overridden = [
    ...world.query(IsPlayer, TacticalOverride, TeamSide),
  ].filter((entity) => entity.get(TeamSide)?.side === side);
  overridden.forEach((entity) => entity.remove(TacticalOverride));
}
