import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { PossessionChanged } from "../events/match-events";
import { findNearestPlayer } from "../queries";
import {
  BallCarried,
  BallFlight,
  BallInFlight,
  BallLoose,
  BallRoll,
  CarriedBy,
  FlightResolution,
  IsBall,
  IsCarrier,
  LastPassFrom,
  Position,
  Possession,
  TeamSide,
  type TeamSideId,
} from "../traits";
import { upsertTrait } from "../upsert-trait";

export interface RollVelocity {
  vx: number;
  vz: number;
}

export function claimBall(world: World, player: Entity) {
  const ball = world.queryFirst(IsBall);
  if (!ball) return;
  const previousCarrier = world.queryFirst(IsCarrier);
  if (previousCarrier === player) return;
  previousCarrier?.remove(IsCarrier);
  clearPassMemory(player);
  ball.remove(BallInFlight, BallLoose, BallRoll, BallFlight, FlightResolution);
  if (!ball.has(BallCarried)) ball.add(BallCarried);
  ball.add(CarriedBy(player));
  player.add(IsCarrier);
  emitPossessionChangeFor(world, player);
}

export function giveBallTo(world: World, player: Entity) {
  const ball = world.queryFirst(IsBall);
  const playerPosition = player.get(Position);
  if (!ball || !playerPosition) return;
  ball.set(Position, {
    x: playerPosition.x,
    y: GAME_CONFIG.BALL.RADIUS,
    z: playerPosition.z,
  });
  claimBall(world, player);
}

export function giveBallToNearestOfSide(world: World, side: TeamSideId) {
  const ballPosition = world.queryFirst(IsBall)?.get(Position);
  if (!ballPosition) return;
  const receiver = findNearestPlayer(world, { point: ballPosition, side });
  if (!receiver) return;
  giveBallTo(world, receiver);
}

export function releaseBallLoose(world: World, roll: RollVelocity) {
  const ball = world.queryFirst(IsBall);
  if (!ball) return;
  world.queryFirst(IsCarrier)?.remove(IsCarrier);
  const carrier = ball.targetFor(CarriedBy);
  if (carrier) ball.remove(CarriedBy(carrier));
  ball.remove(BallCarried, BallInFlight, BallFlight, FlightResolution);
  if (!ball.has(BallLoose)) ball.add(BallLoose);
  upsertTrait(ball, BallRoll, roll);
}

function clearPassMemory(player: Entity) {
  const lastPasser = player.targetFor(LastPassFrom);
  if (lastPasser) player.remove(LastPassFrom(lastPasser));
}

function emitPossessionChangeFor(world: World, player: Entity) {
  const side = player.get(TeamSide)?.side;
  if (!side) return;
  if (world.get(Possession)?.side === side) return;
  world.spawn(PossessionChanged({ side }));
}
