import { Vector3 } from "three";
import type { World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { displacement2D } from "../../core/math";
import { Position, TargetPosition } from "../../core/traits";
import { DebugTargetRefs } from "./debug-target-refs";

const DEBUG = GAME_CONFIG.DEBUG;
const scratchDirection = new Vector3();

export function syncDebugTargetsSystem(world: World) {
  world
    .query(Position, TargetPosition, DebugTargetRefs)
    .updateEach(([position, target, refs]) => {
      if (!refs) return;
      refs.marker.position.set(target.x, DEBUG.MARKER_LIFT, target.z);
      const { dx, dz, distance } = displacement2D(position, target);
      const isArrowVisible = distance > DEBUG.ARROW_MIN_LENGTH;
      refs.arrow.visible = isArrowVisible;
      if (!isArrowVisible) return;
      refs.arrow.position.set(position.x, DEBUG.ARROW_LIFT, position.z);
      scratchDirection.set(dx / distance, 0, dz / distance);
      refs.arrow.setDirection(scratchDirection);
      refs.arrow.setLength(
        distance,
        DEBUG.ARROW_HEAD_LENGTH,
        DEBUG.ARROW_HEAD_WIDTH,
      );
    });
}
