import * as THREE from "three/webgpu";
import { Canvas, extend } from "@react-three/fiber";
import { WorldProvider } from "koota/react";
import type { ReactNode } from "react";
import { world } from "../core/world";
import { GAME_CONFIG } from "../data/game-config";

extend(THREE as any);

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Canvas
      shadows
      camera={{
        position: GAME_CONFIG.CAMERA.START_POSITION,
        fov: GAME_CONFIG.CAMERA.FOV,
      }}
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(
          props as ConstructorParameters<typeof THREE.WebGPURenderer>[0],
        );
        await renderer.init();
        return renderer;
      }}
    >
      <WorldProvider world={world}>{children}</WorldProvider>
    </Canvas>
  );
}
