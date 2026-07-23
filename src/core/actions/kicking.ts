import type { Entity, TraitRecord, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { GoalScored } from "../events/match-events";
import {
  combinedInterceptionChance,
  findLaneThreats,
  likeliestInterceptor,
} from "../interception";
import { displacement2D, type Point2D } from "../math";
import { clampToPitch, opponentGoalCenter } from "../pitch";
import { findGoalkeeper, findNearestPlayer } from "../queries";
import {
  nextRandom01,
  randomChance,
  randomRange,
  randomSign,
} from "../random";
import { shotConversionChance, shotGeometry, shotQuality } from "../shooting";
import {
  BallCarried,
  BallFlight,
  BallInFlight,
  CarriedBy,
  FlightResolution,
  IsBall,
  LastPassFrom,
  opposingSide,
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
const SHOOTING = GAME_CONFIG.SHOOTING;
const GOAL_HALF_WIDTH = GAME_CONFIG.GOAL.WIDTH / 2;
const CLAIM_REACH_M =
  GAME_CONFIG.BALL_CONTROL.CLAIM_RADIUS_M * PASSING.ARRIVAL_GRACE;

export type PassFlavor = "ground" | "lofted";

type BallFlightData = TraitRecord<typeof BallFlight>;

interface FlightProfile {
  speedMps: number;
  arcHeight: number;
}

interface KickOutcome {
  claimant: Entity;
  kind: FlightResolutionKind;
  destination: Point2D;
}

interface CarriedBall {
  ball: Entity;
  from: Point2D;
  side: TeamSideId;
}

const SHOT_FLIGHT_PROFILE: FlightProfile = {
  speedMps: SHOOTING.SHOT_SPEED_MPS,
  arcHeight: SHOOTING.SHOT_ARC_HEIGHT_M,
};

export function passSpeed(flavor: PassFlavor) {
  if (flavor === "ground") return PASSING.GROUND_SPEED_MPS;
  return PASSING.LOFTED_SPEED_MPS;
}

function passArcHeight(flavor: PassFlavor) {
  if (flavor === "ground") return 0;
  return PASSING.LOFTED_ARC_HEIGHT_M;
}

function passFlightProfile(flavor: PassFlavor): FlightProfile {
  return { speedMps: passSpeed(flavor), arcHeight: passArcHeight(flavor) };
}

function carriedBallFor(world: World, kicker: Entity): CarriedBall | undefined {
  const ball = world.queryFirst(IsBall, BallCarried);
  if (!ball) return undefined;
  if (ball.targetFor(CarriedBy) !== kicker) return undefined;
  const ballPosition = ball.get(Position);
  const side = kicker.get(TeamSide)?.side;
  if (!ballPosition || !side) return undefined;
  return { ball, from: { x: ballPosition.x, z: ballPosition.z }, side };
}

export function kickPass(
  world: World,
  kicker: Entity,
  target: Point2D,
  flavor: PassFlavor,
) {
  const carried = carriedBallFor(world, kicker);
  if (!carried) return;
  if (displacement2D(carried.from, target).distance < PASSING.MIN_DISTANCE_M) {
    return;
  }
  const outcome = resolvePassOutcome(world, carried, target, kicker);
  launchBallFlight(carried, kicker, outcome, passFlightProfile(flavor));
}

export function kickClear(world: World, kicker: Entity, target: Point2D) {
  kickPass(world, kicker, target, "lofted");
}

export function kickShot(world: World, shooter: Entity) {
  const carried = carriedBallFor(world, shooter);
  if (!carried) return;
  const outcome = resolveShotOutcome(world, carried, shooter);
  launchBallFlight(carried, shooter, outcome, SHOT_FLIGHT_PROFILE);
}

function launchBallFlight(
  carried: CarriedBall,
  kicker: Entity,
  outcome: KickOutcome,
  profile: FlightProfile,
) {
  const { ball, from } = carried;
  stripCarrierDuty(kicker);
  ball.remove(CarriedBy(kicker));
  ball.remove(BallCarried);
  ball.add(
    BallInFlight,
    BallFlight({
      fromX: from.x,
      fromZ: from.z,
      toX: outcome.destination.x,
      toZ: outcome.destination.z,
      elapsedSeconds: 0,
      durationSeconds:
        displacement2D(from, outcome.destination).distance / profile.speedMps,
      arcHeight: profile.arcHeight,
    }),
    FlightResolution({
      claimant: outcome.claimant,
      passer: kicker,
      kind: outcome.kind,
    }),
  );
}

function resolveShotOutcome(
  world: World,
  carried: CarriedBall,
  shooter: Entity,
): KickOutcome {
  const { from, side } = carried;
  const quality = shotQuality(shotGeometry(from, side));
  const conversion = shotConversionChance(quality);
  const roll = nextRandom01(world);
  if (roll < conversion) {
    return {
      claimant: shooter,
      kind: "goal",
      destination: goalMouthTarget(world, side),
    };
  }
  const goalkeeper = findGoalkeeper(world, opposingSide(side));
  const goalkeeperPosition = goalkeeper?.get(Position);
  const isSaved =
    roll < conversion + (1 - conversion) * SHOOTING.OUTCOME_SAVE_SHARE;
  if (isSaved && goalkeeper && goalkeeperPosition) {
    return {
      claimant: goalkeeper,
      kind: "saved",
      destination: { x: goalkeeperPosition.x, z: goalkeeperPosition.z },
    };
  }
  return {
    claimant: shooter,
    kind: "offTarget",
    destination: missTarget(world, side),
  };
}

function goalMouthTarget(world: World, side: TeamSideId): Point2D {
  const goal = opponentGoalCenter(side);
  const mouthReach = GOAL_HALF_WIDTH * SHOOTING.GOAL_MOUTH_INSET;
  return {
    x: goal.x,
    z: goal.z + randomRange(world, -mouthReach, mouthReach),
  };
}

function missTarget(world: World, side: TeamSideId): Point2D {
  const goal = opponentGoalCenter(side);
  const missSide = randomSign(world);
  const missOffset = randomRange(
    world,
    SHOOTING.MISS_MIN_OFFSET_M,
    SHOOTING.MISS_MAX_OFFSET_M,
  );
  return clampToPitch(
    { x: goal.x, z: goal.z + missSide * (GOAL_HALF_WIDTH + missOffset) },
    GAME_CONFIG.TACTICS.PITCH_CLAMP_MARGIN,
  );
}

function resolvePassOutcome(
  world: World,
  carried: CarriedBall,
  target: Point2D,
  kicker: Entity,
): KickOutcome {
  const { from, side } = carried;
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
  if (resolution.kind === "goal") {
    emitGoalScored(world, resolution.passer);
    releaseBallLoose(world, roll);
    return;
  }
  if (resolution.kind === "offTarget") {
    releaseBallLoose(world, roll);
    return;
  }
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

function emitGoalScored(world: World, shooter: Entity) {
  const side = shooter.get(TeamSide)?.side;
  if (!side) return;
  world.spawn(GoalScored({ side }));
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
