import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useWorld } from "koota/react";
import { GAME_CONFIG } from "../data/game-config";
import { stepFixedTick } from "../core/match/fixed-tick";
import { syncTransformSystem } from "../core/systems/sync-transform-system";
import { syncDebugTargetsSystem } from "../features/debug/sync-debug-targets-system";

const SIMULATION = GAME_CONFIG.SIMULATION;

export default function GameLoop() {
  const world = useWorld();
  const accumulator = useRef(0);

  useFrame((_, delta) => {
    accumulator.current += Math.min(delta, SIMULATION.MAX_FRAME_DELTA_SECONDS);
    while (accumulator.current >= SIMULATION.TICK_SECONDS) {
      accumulator.current -= SIMULATION.TICK_SECONDS;
      stepFixedTick(world, SIMULATION.TICK_SECONDS);
    }
    syncTransformSystem(world);
    syncDebugTargetsSystem(world);
  });

  return null;
}
