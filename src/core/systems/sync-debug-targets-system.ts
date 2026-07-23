import { Vector3 } from "three";
import type { World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { DebugTargetRefs, Position, TargetPosition } from "../traits";

const DEBUG = GAME_CONFIG.DEBUG;
const scratchDirection = new Vector3();

export function syncDebugTargetsSystem(world: World) {
  world
    .query(Position, TargetPosition, DebugTargetRefs)
    .updateEach(([position, target, refs]) => {
      if (!refs) return;
      refs.marker.position.set(target.x, DEBUG.MARKER_LIFT, target.z);
      const dx = target.x - position.x;
      const dz = target.z - position.z;
      const length = Math.hypot(dx, dz);
      const isArrowVisible = length > DEBUG.ARROW_MIN_LENGTH;
      refs.arrow.visible = isArrowVisible;
      if (!isArrowVisible) return;
      refs.arrow.position.set(position.x, DEBUG.ARROW_LIFT, position.z);
      scratchDirection.set(dx / length, 0, dz / length);
      refs.arrow.setDirection(scratchDirection);
      refs.arrow.setLength(
        length,
        DEBUG.ARROW_HEAD_LENGTH,
        DEBUG.ARROW_HEAD_WIDTH,
      );
    });
}
