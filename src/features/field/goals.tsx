import { GAME_CONFIG } from "../../data/game-config";

const GOAL = GAME_CONFIG.GOAL;
const HALF_LENGTH = GAME_CONFIG.FIELD.LENGTH / 2;
const POST_LATERAL_OFFSET = GOAL.WIDTH / 2 + GOAL.BAR_RADIUS;
const CROSSBAR_LENGTH = GOAL.WIDTH + GOAL.BAR_RADIUS * 2;

type FieldSide = -1 | 1;

function GoalPost({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, GOAL.HEIGHT / 2, z]} castShadow>
      <cylinderGeometry
        args={[GOAL.BAR_RADIUS, GOAL.BAR_RADIUS, GOAL.HEIGHT, GOAL.BAR_SEGMENTS]}
      />
      <meshStandardMaterial color={GOAL.COLOR} />
    </mesh>
  );
}

function Goal({ side }: { side: FieldSide }) {
  const goalLineX = side * HALF_LENGTH;

  return (
    <group>
      <GoalPost x={goalLineX} z={-POST_LATERAL_OFFSET} />
      <GoalPost x={goalLineX} z={POST_LATERAL_OFFSET} />
      <mesh
        position={[goalLineX, GOAL.HEIGHT + GOAL.BAR_RADIUS, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry
          args={[
            GOAL.BAR_RADIUS,
            GOAL.BAR_RADIUS,
            CROSSBAR_LENGTH,
            GOAL.BAR_SEGMENTS,
          ]}
        />
        <meshStandardMaterial color={GOAL.COLOR} />
      </mesh>
    </group>
  );
}

export default function Goals() {
  return (
    <>
      <Goal side={-1} />
      <Goal side={1} />
    </>
  );
}
