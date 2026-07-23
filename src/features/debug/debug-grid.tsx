import { GAME_CONFIG } from "../../data/game-config";
import {
  CROSSWISE_GRID_OFFSETS,
  LENGTHWISE_GRID_OFFSETS,
} from "./grid-offsets";

const FIELD = GAME_CONFIG.FIELD;
const DEBUG = GAME_CONFIG.DEBUG;

function GridLine({
  x = 0,
  y = 0,
  width,
  height,
}: {
  x?: number;
  y?: number;
  width: number;
  height: number;
}) {
  return (
    <mesh position={[x, y, DEBUG.GRID_LIFT]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        color={DEBUG.GRID_COLOR}
        transparent
        opacity={DEBUG.GRID_OPACITY}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function DebugGrid() {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {LENGTHWISE_GRID_OFFSETS.map((offset) => (
        <GridLine
          key={`lengthwise-${offset}`}
          y={offset}
          width={FIELD.LENGTH}
          height={DEBUG.GRID_LINE_WIDTH}
        />
      ))}
      {CROSSWISE_GRID_OFFSETS.map((offset) => (
        <GridLine
          key={`crosswise-${offset}`}
          x={offset}
          width={DEBUG.GRID_LINE_WIDTH}
          height={FIELD.WIDTH}
        />
      ))}
    </group>
  );
}
