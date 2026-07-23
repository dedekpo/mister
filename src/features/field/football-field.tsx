import { GAME_CONFIG } from "../../data/game-config";

const FIELD = GAME_CONFIG.FIELD;
const HALF_LENGTH = FIELD.LENGTH / 2;
const HALF_WIDTH = FIELD.WIDTH / 2;
const PENALTY_ARC_HALF_ANGLE = Math.acos(
  (FIELD.PENALTY_AREA_DEPTH - FIELD.PENALTY_SPOT_DISTANCE) /
    FIELD.PENALTY_ARC_RADIUS,
);

type FieldSide = -1 | 1;

interface LineProps {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

function Line({ x = 0, y = 0, width, height }: LineProps) {
  return (
    <mesh position={[x, y, FIELD.LINE_LIFT]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color={FIELD.LINE_COLOR} />
    </mesh>
  );
}

interface SpotProps {
  x?: number;
  y?: number;
}

function Spot({ x = 0, y = 0 }: SpotProps) {
  return (
    <mesh position={[x, y, FIELD.LINE_LIFT]}>
      <circleGeometry args={[FIELD.SPOT_RADIUS, FIELD.SPOT_SEGMENTS]} />
      <meshStandardMaterial color={FIELD.LINE_COLOR} />
    </mesh>
  );
}

interface ArcProps {
  x?: number;
  y?: number;
  radius: number;
  thetaStart?: number;
  thetaLength?: number;
}

function Arc({
  x = 0,
  y = 0,
  radius,
  thetaStart = 0,
  thetaLength = Math.PI * 2,
}: ArcProps) {
  return (
    <mesh position={[x, y, FIELD.LINE_LIFT]}>
      <ringGeometry
        args={[
          radius - FIELD.LINE_WIDTH / 2,
          radius + FIELD.LINE_WIDTH / 2,
          FIELD.ARC_SEGMENTS,
          1,
          thetaStart,
          thetaLength,
        ]}
      />
      <meshStandardMaterial color={FIELD.LINE_COLOR} />
    </mesh>
  );
}

function PenaltyEnd({ side }: { side: FieldSide }) {
  const goalLineX = side * HALF_LENGTH;
  const penaltySpotX = side * (HALF_LENGTH - FIELD.PENALTY_SPOT_DISTANCE);
  const penaltyArcFacing = side === -1 ? 0 : Math.PI;

  return (
    <>
      <Line
        x={side * (HALF_LENGTH - FIELD.PENALTY_AREA_DEPTH)}
        width={FIELD.LINE_WIDTH}
        height={FIELD.PENALTY_AREA_WIDTH}
      />
      <Line
        x={side * (HALF_LENGTH - FIELD.PENALTY_AREA_DEPTH / 2)}
        y={FIELD.PENALTY_AREA_WIDTH / 2}
        width={FIELD.PENALTY_AREA_DEPTH}
        height={FIELD.LINE_WIDTH}
      />
      <Line
        x={side * (HALF_LENGTH - FIELD.PENALTY_AREA_DEPTH / 2)}
        y={-FIELD.PENALTY_AREA_WIDTH / 2}
        width={FIELD.PENALTY_AREA_DEPTH}
        height={FIELD.LINE_WIDTH}
      />
      <Line
        x={side * (HALF_LENGTH - FIELD.GOAL_AREA_DEPTH)}
        width={FIELD.LINE_WIDTH}
        height={FIELD.GOAL_AREA_WIDTH}
      />
      <Line
        x={side * (HALF_LENGTH - FIELD.GOAL_AREA_DEPTH / 2)}
        y={FIELD.GOAL_AREA_WIDTH / 2}
        width={FIELD.GOAL_AREA_DEPTH}
        height={FIELD.LINE_WIDTH}
      />
      <Line
        x={side * (HALF_LENGTH - FIELD.GOAL_AREA_DEPTH / 2)}
        y={-FIELD.GOAL_AREA_WIDTH / 2}
        width={FIELD.GOAL_AREA_DEPTH}
        height={FIELD.LINE_WIDTH}
      />
      <Spot x={penaltySpotX} />
      <Arc
        x={penaltySpotX}
        radius={FIELD.PENALTY_ARC_RADIUS}
        thetaStart={penaltyArcFacing - PENALTY_ARC_HALF_ANGLE}
        thetaLength={PENALTY_ARC_HALF_ANGLE * 2}
      />
      <Arc
        x={goalLineX}
        y={-HALF_WIDTH}
        radius={FIELD.CORNER_ARC_RADIUS}
        thetaStart={side === -1 ? 0 : Math.PI / 2}
        thetaLength={Math.PI / 2}
      />
      <Arc
        x={goalLineX}
        y={HALF_WIDTH}
        radius={FIELD.CORNER_ARC_RADIUS}
        thetaStart={side === -1 ? (3 * Math.PI) / 2 : Math.PI}
        thetaLength={Math.PI / 2}
      />
    </>
  );
}

export default function FootballField() {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow>
        <planeGeometry
          args={[
            FIELD.LENGTH + FIELD.GRASS_MARGIN * 2,
            FIELD.WIDTH + FIELD.GRASS_MARGIN * 2,
          ]}
        />
        <meshStandardMaterial color={FIELD.GRASS_COLOR} />
      </mesh>
      <Line
        y={HALF_WIDTH - FIELD.LINE_WIDTH / 2}
        width={FIELD.LENGTH}
        height={FIELD.LINE_WIDTH}
      />
      <Line
        y={-(HALF_WIDTH - FIELD.LINE_WIDTH / 2)}
        width={FIELD.LENGTH}
        height={FIELD.LINE_WIDTH}
      />
      <Line
        x={HALF_LENGTH - FIELD.LINE_WIDTH / 2}
        width={FIELD.LINE_WIDTH}
        height={FIELD.WIDTH}
      />
      <Line
        x={-(HALF_LENGTH - FIELD.LINE_WIDTH / 2)}
        width={FIELD.LINE_WIDTH}
        height={FIELD.WIDTH}
      />
      <Line width={FIELD.LINE_WIDTH} height={FIELD.WIDTH} />
      <Arc radius={FIELD.CENTER_CIRCLE_RADIUS} />
      <Spot />
      <PenaltyEnd side={-1} />
      <PenaltyEnd side={1} />
    </group>
  );
}
