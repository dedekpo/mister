import type { World } from "koota";
import { Position, SceneRef } from "../traits";

export function syncTransformSystem(world: World) {
  world.query(Position, SceneRef).updateEach(([position, sceneObject]) => {
    if (!sceneObject) return;
    sceneObject.position.set(position.x, position.y, position.z);
  });
}
