import type { World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { attackDirection } from "../formation";
import { displacement2D, type Point2D } from "../math";
import {
  BallCarried,
  CarriedBy,
  IsBall,
  Position,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "../traits";

const CARRY_OFFSET_M = GAME_CONFIG.BALL_CONTROL.CARRY_OFFSET_M;
const ARRIVAL_DISTANCE = GAME_CONFIG.TACTICS.ARRIVAL_DISTANCE;

export function ballCarrySystem(world: World) {
  const ball = world.queryFirst(IsBall, BallCarried);
  if (!ball) return;
  const carrier = ball.targetFor(CarriedBy);
  if (!carrier) return;
  const carrierPosition = carrier.get(Position);
  const carrierTarget = carrier.get(TargetPosition);
  const carrierSide = carrier.get(TeamSide);
  if (!carrierPosition || !carrierTarget || !carrierSide) return;
  const direction = carryDirection(
    carrierPosition,
    carrierTarget,
    carrierSide.side,
  );
  ball.set(Position, {
    x: carrierPosition.x + direction.x * CARRY_OFFSET_M,
    y: GAME_CONFIG.BALL.RADIUS,
    z: carrierPosition.z + direction.z * CARRY_OFFSET_M,
  });
}

function carryDirection(
  position: Point2D,
  target: Point2D,
  side: TeamSideId,
): Point2D {
  const { dx, dz, distance } = displacement2D(position, target);
  if (distance <= ARRIVAL_DISTANCE) return { x: attackDirection(side), z: 0 };
  return { x: dx / distance, z: dz / distance };
}
