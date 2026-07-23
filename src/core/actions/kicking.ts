import type { Entity, TraitRecord, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import {
  combinedInterceptionChance,
  findLaneThreats,
  likeliestInterceptor,
} from "../interception";
import { displacement2D, type Point2D } from "../math";
import { findNearestPlayer } from "../queries";
import { randomChance } from "../random";
import {
  BallCarried,
  BallFlight,
  BallInFlight,
  CarriedBy,
  FlightResolution,
  IsBall,
  LastPassFrom,
  Position,
  TeamSide,
  type FlightResolutionKind,
  type TeamSideId,
} from "../traits";
import {
  claimBall,
  releaseBallLoose,
  stripCarrierDuty,
  type RollVelocity,
} from "./ball-control";

const PASSING = GAME_CONFIG.PASSING;
const CLAIM_REACH_M =
  GAME_CONFIG.BALL_CONTROL.CLAIM_RADIUS_M * PASSING.ARRIVAL_GRACE;

export type PassFlavor = "ground" | "lofted";

type BallFlightData = TraitRecord<typeof BallFlight>;

export function passSpeed(flavor: PassFlavor) {
  if (flavor === "ground") return PASSING.GROUND_SPEED_MPS;
  return PASSING.LOFTED_SPEED_MPS;
}

function passArcHeight(flavor: PassFlavor) {
  if (flavor === "ground") return 0;
  return PASSING.LOFTED_ARC_HEIGHT_M;
}

export function kickPass(
  world: World,
  kicker: Entity,
  target: Point2D,
  flavor: PassFlavor,
) {
  const ball = world.queryFirst(IsBall, BallCarried);
  if (!ball) return;
  if (ball.targetFor(CarriedBy) !== kicker) return;
  const ballPosition = ball.get(Position);
  const side = kicker.get(TeamSide)?.side;
  if (!ballPosition || !side) return;
  if (displacement2D(ballPosition, target).distance < PASSING.MIN_DISTANCE_M) {
    return;
  }
  const outcome = resolvePassOutcome(world, ballPosition, target, side, kicker);
  stripCarrierDuty(kicker);
  ball.remove(CarriedBy(kicker));
  ball.remove(BallCarried);
  ball.add(
    BallInFlight,
    BallFlight({
      fromX: ballPosition.x,
      fromZ: ballPosition.z,
      toX: outcome.destination.x,
      toZ: outcome.destination.z,
      elapsedSeconds: 0,
      durationSeconds:
        displacement2D(ballPosition, outcome.destination).distance /
        passSpeed(flavor),
      arcHeight: passArcHeight(flavor),
    }),
    FlightResolution({
      claimant: outcome.claimant,
      passer: kicker,
      kind: outcome.kind,
    }),
  );
}

export function kickClear(world: World, kicker: Entity, target: Point2D) {
  kickPass(world, kicker, target, "lofted");
}

interface PassOutcome {
  claimant: Entity;
  kind: FlightResolutionKind;
  destination: Point2D;
}

function resolvePassOutcome(
  world: World,
  from: Point2D,
  target: Point2D,
  side: TeamSideId,
  kicker: Entity,
): PassOutcome {
  const threats = findLaneThreats(world, from, target, side);
  const isIntercepted = randomChance(
    world,
    combinedInterceptionChance(threats),
  );
  const interceptor = isIntercepted ? likeliestInterceptor(threats) : undefined;
  if (interceptor) {
    return {
      claimant: interceptor.opponent,
      kind: "intercepted",
      destination: interceptor.interceptPoint,
    };
  }
  const receiver = findNearestPlayer(world, {
    point: target,
    side,
    exclude: kicker,
  });
  return {
    claimant: receiver ?? kicker,
    kind: "received",
    destination: target,
  };
}

export function resolveFlightArrival(world: World, ball: Entity) {
  const flight = ball.get(BallFlight);
  const resolution = ball.get(FlightResolution);
  if (!flight || !resolution) return;
  const landingPoint = { x: flight.toX, z: flight.toZ };
  const roll = landingRoll(flight);
  ball.remove(BallFlight, FlightResolution);
  const claimantPosition = resolution.claimant.get(Position);
  const claimantCanReach =
    claimantPosition &&
    displacement2D(claimantPosition, landingPoint).distance <= CLAIM_REACH_M;
  if (claimantCanReach) {
    claimBall(world, resolution.claimant);
    if (resolution.kind === "received") {
      rememberPassOrigin(resolution.claimant, resolution.passer);
    }
    return;
  }
  releaseBallLoose(world, roll);
}

function rememberPassOrigin(receiver: Entity, passer: Entity) {
  if (receiver === passer) return;
  receiver.add(LastPassFrom(passer));
}

function landingRoll(flight: BallFlightData): RollVelocity {
  const { dx, dz, distance } = displacement2D(
    { x: flight.fromX, z: flight.fromZ },
    { x: flight.toX, z: flight.toZ },
  );
  if (distance === 0 || flight.durationSeconds === 0) return { vx: 0, vz: 0 };
  const rollSpeed =
    (distance / flight.durationSeconds) * PASSING.LANDING_ROLL_FACTOR;
  return { vx: (dx / distance) * rollSpeed, vz: (dz / distance) * rollSpeed };
}
