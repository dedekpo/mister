import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../data/game-config";
import { clamp } from "./math";
import { nearestOpponentDistance } from "./queries";
import { Position, TeamSide } from "./traits";

const PRESSURE = GAME_CONFIG.PRESSURE;

export function pressureOn(world: World, player: Entity): number {
  const distance = nearestOpponentDistanceFrom(world, player);
  return clamp(1 - distance / PRESSURE.RADIUS_M, 0, 1);
}

export function isUnderTacklePressure(world: World, player: Entity): boolean {
  return nearestOpponentDistanceFrom(world, player) <= PRESSURE.TACKLE_RADIUS_M;
}

function nearestOpponentDistanceFrom(world: World, player: Entity): number {
  const position = player.get(Position);
  const side = player.get(TeamSide)?.side;
  if (!position || !side) return Infinity;
  return nearestOpponentDistance(world, position, side);
}
