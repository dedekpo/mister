import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { attackDirection } from "../formation";
import { passInterceptionRisk } from "../interception";
import { clamp, inverseLerp, type Point2D } from "../math";
import { OWN_GOAL_LINE_X } from "../pitch";
import { pressureOn } from "../pressure";
import { nearestOpponentDistance } from "../queries";
import { LastPassFrom, Position, TeamSide, type TeamSideId } from "../traits";
import type {
  CarrierActionCandidate,
  DribbleCandidate,
  PassCandidate,
} from "./candidates";

const CARRIER_AI = GAME_CONFIG.CARRIER_AI;
const DRIBBLING = GAME_CONFIG.DRIBBLING;
const CLEARING = GAME_CONFIG.CLEARING;

export interface ScoredCandidate {
  candidate: CarrierActionCandidate;
  score: number;
}

export function scoreCarrierCandidates(
  world: World,
  carrier: Entity,
  candidates: CarrierActionCandidate[],
): ScoredCandidate[] {
  return candidates.map((candidate) => ({
    candidate,
    score: scoreCarrierCandidate(world, carrier, candidate),
  }));
}

export function scoreCarrierCandidate(
  world: World,
  carrier: Entity,
  candidate: CarrierActionCandidate,
): number {
  if (candidate.kind === "hold") return 0;
  if (candidate.kind === "pass") {
    return scorePassCandidate(world, carrier, candidate);
  }
  if (candidate.kind === "dribble") {
    return scoreDribbleCandidate(world, carrier, candidate);
  }
  if (candidate.kind === "clear") return scoreClearCandidate(world, carrier);
  return unscorableCandidate(candidate);
}

function unscorableCandidate(candidate: never): never {
  throw new Error(`unscored carrier candidate: ${JSON.stringify(candidate)}`);
}

function scorePassCandidate(
  world: World,
  carrier: Entity,
  candidate: PassCandidate,
): number {
  const carrierPosition = carrier.get(Position);
  const side = carrier.get(TeamSide)?.side;
  if (!carrierPosition || !side) return 0;
  const effectiveOpenness =
    receiverOpenness(world, candidate.receiver, side) *
    (1 - pressureOn(world, carrier));
  return (
    CARRIER_AI.WEIGHT_OPENNESS * effectiveOpenness +
    CARRIER_AI.WEIGHT_PROGRESSION *
      progression(
        carrierPosition,
        candidate.target,
        side,
        CARRIER_AI.LOFTED_MAX_RANGE_M,
      ) -
    CARRIER_AI.WEIGHT_BACKPASS_PENALTY *
      backpassPenalty(carrier, candidate.receiver) -
    CARRIER_AI.WEIGHT_LANE_RISK *
      passInterceptionRisk(world, carrierPosition, candidate.target, side)
  );
}

function scoreDribbleCandidate(
  world: World,
  carrier: Entity,
  candidate: DribbleCandidate,
): number {
  const carrierPosition = carrier.get(Position);
  const side = carrier.get(TeamSide)?.side;
  if (!carrierPosition || !side) return 0;
  const space = probeSpace(world, candidate.target, side);
  return (
    DRIBBLING.WEIGHT_SPACE * space +
    DRIBBLING.WEIGHT_PROGRESSION *
      progression(
        carrierPosition,
        candidate.target,
        side,
        DRIBBLING.PROBE_DISTANCE_M,
      ) +
    DRIBBLING.WEIGHT_ESCAPE * pressureOn(world, carrier) * space
  );
}

function scoreClearCandidate(world: World, carrier: Entity): number {
  const carrierPosition = carrier.get(Position);
  const side = carrier.get(TeamSide)?.side;
  if (!carrierPosition || !side) return 0;
  return (
    CLEARING.WEIGHT *
      pressureOn(world, carrier) *
      ownThirdDeepness(carrierPosition, side) +
    CLEARING.BASE_SCORE
  );
}

function ownThirdDeepness(position: Point2D, side: TeamSideId): number {
  const advanceX = position.x * attackDirection(side);
  return clamp(
    inverseLerp(CLEARING.PANIC_THIRD_X, OWN_GOAL_LINE_X, advanceX),
    0,
    1,
  );
}

function probeSpace(world: World, target: Point2D, side: TeamSideId): number {
  return clamp(
    nearestOpponentDistance(world, target, side) / DRIBBLING.SPACE_RADIUS_M,
    0,
    1,
  );
}

function receiverOpenness(
  world: World,
  receiver: Entity,
  receiverSide: TeamSideId,
): number {
  const receiverPosition = receiver.get(Position);
  if (!receiverPosition) return 0;
  return clamp(
    nearestOpponentDistance(world, receiverPosition, receiverSide) /
      CARRIER_AI.OPENNESS_CAP_M,
    0,
    1,
  );
}

function progression(
  from: Point2D,
  to: Point2D,
  side: TeamSideId,
  rangeM: number,
): number {
  const advance = (to.x - from.x) * attackDirection(side);
  return clamp(advance / rangeM, -1, 1);
}

function backpassPenalty(carrier: Entity, receiver: Entity): number {
  return carrier.targetFor(LastPassFrom) === receiver ? 1 : 0;
}
