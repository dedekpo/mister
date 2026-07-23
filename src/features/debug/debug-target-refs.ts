import type * as THREE from "three";
import { trait } from "koota";

export interface DebugTargetSceneObjects {
  marker: THREE.Object3D;
  arrow: THREE.ArrowHelper;
}

export const DebugTargetRefs = trait(
  () => null as DebugTargetSceneObjects | null,
);
