import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { claimBall } from "../actions/ball-control";
import { displacement2D } from "../math";
import { findNearestPlayer } from "../queries";
import { BallLoose, BallRoll, IsBall, Position } from "../traits";

const LOOSE_BALL = GAME_CONFIG.LOOSE_BALL;
const CLAIM_RADIUS_M = GAME_CONFIG.BALL_CONTROL.CLAIM_RADIUS_M;
const BALL_RADIUS = GAME_CONFIG.BALL.RADIUS;

export function looseBallSystem(world: World, delta: number) {
  const ball = world.queryFirst(IsBall, BallLoose);
  if (!ball) return;
  rollWithFriction(ball, delta);
  claimWhenReachable(world, ball);
}

function rollWithFriction(ball: Entity, delta: number) {
  const position = ball.get(Position);
  const roll = ball.get(BallRoll);
  if (!position || !roll) return;
  const speed = Math.hypot(roll.vx, roll.vz);
  if (speed < LOOSE_BALL.MIN_ROLL_SPEED_MPS) {
    if (speed > 0) ball.set(BallRoll, { vx: 0, vz: 0 });
    return;
  }
  ball.set(Position, {
    x: position.x + roll.vx * delta,
    y: BALL_RADIUS,
    z: position.z + roll.vz * delta,
  });
  const decay = Math.exp(-LOOSE_BALL.FRICTION_PER_SECOND * delta);
  ball.set(BallRoll, { vx: roll.vx * decay, vz: roll.vz * decay });
}

function claimWhenReachable(world: World, ball: Entity) {
  const ballPosition = ball.get(Position);
  if (!ballPosition) return;
  const nearest = findNearestPlayer(world, { point: ballPosition });
  const nearestPosition = nearest?.get(Position);
  if (!nearest || !nearestPosition) return;
  if (displacement2D(nearestPosition, ballPosition).distance > CLAIM_RADIUS_M) {
    return;
  }
  claimBall(world, nearest);
}
