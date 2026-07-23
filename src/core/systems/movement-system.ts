import type { World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { displacement2D } from "../math";
import { IsPlayer, Position, Speed, TargetPosition } from "../traits";

const ARRIVAL_DISTANCE = GAME_CONFIG.TACTICS.ARRIVAL_DISTANCE;

export function movementSystem(world: World, delta: number) {
  world
    .query(IsPlayer, Position, TargetPosition, Speed)
    .updateEach(([position, target, speed]) => {
      const { dx, dz, distance } = displacement2D(position, target);
      if (distance <= ARRIVAL_DISTANCE) return;
      const step = Math.min(distance, speed.metersPerSecond * delta);
      position.x += (dx / distance) * step;
      position.z += (dz / distance) * step;
    });
}
