import type { Entity, TraitRecord, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { displacement2D, type Point2D } from "../math";
import { findNearestPlayer } from "../queries";
import {
  BallCarried,
  BallFlight,
  BallInFlight,
  CarriedBy,
  FlightResolution,
  IsBall,
  IsCarrier,
  LastPassFrom,
  Position,
  TeamSide,
} from "../traits";
import { claimBall, releaseBallLoose, type RollVelocity } from "./ball-control";

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
  if (!ballPosition) return;
  const { distance } = displacement2D(ballPosition, target);
  if (distance < PASSING.MIN_DISTANCE_M) return;
  const side = kicker.get(TeamSide)?.side;
  const claimant = side
    ? findNearestPlayer(world, { point: target, side, exclude: kicker })
    : undefined;
  kicker.remove(IsCarrier);
  ball.remove(CarriedBy(kicker));
  ball.remove(BallCarried);
  ball.add(
    BallInFlight,
    BallFlight({
      fromX: ballPosition.x,
      fromZ: ballPosition.z,
      toX: target.x,
      toZ: target.z,
      elapsedSeconds: 0,
      durationSeconds: distance / passSpeed(flavor),
      arcHeight: passArcHeight(flavor),
    }),
    FlightResolution({
      claimant: claimant ?? kicker,
      passer: kicker,
      kind: "received",
    }),
  );
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
    rememberPassOrigin(resolution.claimant, resolution.passer);
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
