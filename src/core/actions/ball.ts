import type { World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { IsBall, Position } from "../traits";

export function teleportBall(world: World, x: number, z: number) {
  const ball = world.queryFirst(IsBall);
  if (!ball) return;
  ball.set(Position, { x, y: GAME_CONFIG.BALL.RADIUS, z });
}
