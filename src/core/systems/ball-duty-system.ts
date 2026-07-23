import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { tickCountdown } from "../countdown";
import { findNearestPlayers } from "../queries";
import {
  BallCarried,
  BallInFlight,
  BallLoose,
  ChaseReassignCooldown,
  FlightResolution,
  IsBall,
  IsChaser,
  IsReceiver,
  Position,
  TEAM_SIDES,
} from "../traits";
import { upsertTrait } from "../upsert-trait";

const DUTIES = GAME_CONFIG.DUTIES;

export function ballDutySystem(world: World, delta: number) {
  const ball = world.queryFirst(IsBall);
  if (!ball) return;
  if (ball.has(BallCarried)) {
    clearReceivers(world);
    clearChasers(world);
    resetChaseCooldown(world);
    return;
  }
  if (ball.has(BallInFlight)) {
    clearChasers(world);
    assignReceiver(world, ball);
    resetChaseCooldown(world);
    return;
  }
  if (!ball.has(BallLoose)) return;
  clearReceivers(world);
  assignChasers(world, ball, delta);
}

function assignReceiver(world: World, ball: Entity) {
  const claimant = ball.get(FlightResolution)?.claimant;
  if (!claimant) return;
  [...world.query(IsReceiver)].forEach((entity) => {
    if (entity !== claimant) entity.remove(IsReceiver);
  });
  if (!claimant.has(IsReceiver)) claimant.add(IsReceiver);
}

function assignChasers(world: World, ball: Entity, delta: number) {
  const hasChasers = world.queryFirst(IsChaser) !== undefined;
  const isCoolingDown = !tickCountdown(world, ChaseReassignCooldown, delta);
  if (isCoolingDown && hasChasers) return;
  const ballPosition = ball.get(Position);
  if (!ballPosition) return;
  const desiredChasers = new Set(
    TEAM_SIDES.flatMap((side) =>
      findNearestPlayers(world, {
        point: ballPosition,
        side,
        count: DUTIES.CHASERS_PER_SIDE,
        excludeRole: "GK",
      }),
    ),
  );
  [...world.query(IsChaser)].forEach((entity) => {
    if (!desiredChasers.has(entity)) entity.remove(IsChaser);
  });
  desiredChasers.forEach((entity) => {
    if (!entity.has(IsChaser)) entity.add(IsChaser);
  });
  upsertTrait(world, ChaseReassignCooldown, {
    remainingSeconds: DUTIES.CHASE_REASSIGN_SECONDS,
  });
}

function clearReceivers(world: World) {
  [...world.query(IsReceiver)].forEach((entity) => entity.remove(IsReceiver));
}

function clearChasers(world: World) {
  [...world.query(IsChaser)].forEach((entity) => entity.remove(IsChaser));
}

function resetChaseCooldown(world: World) {
  if (world.get(ChaseReassignCooldown)?.remainingSeconds === 0) return;
  upsertTrait(world, ChaseReassignCooldown, { remainingSeconds: 0 });
}
