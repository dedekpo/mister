import type { World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { IsPlayer, Position, Speed, TargetPosition } from "../traits";

const ARRIVAL_DISTANCE = GAME_CONFIG.TACTICS.ARRIVAL_DISTANCE;

export function movementSystem(world: World, delta: number) {
  world
    .query(IsPlayer, Position, TargetPosition, Speed)
    .updateEach(([position, target, speed]) => {
      const dx = target.x - position.x;
      const dz = target.z - position.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= ARRIVAL_DISTANCE) return;
      const step = Math.min(distance, speed.metersPerSecond * delta);
      position.x += (dx / distance) * step;
      position.z += (dz / distance) * step;
    });
}
