import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { attackDirection } from "../formation";
import { clamp, displacement2D, type Point2D } from "../math";
import { findNearestPlayer } from "../queries";
import {
  LastPassFrom,
  Position,
  TeamSide,
  type TeamSideId,
} from "../traits";
import type { CarrierActionCandidate, PassCandidate } from "./candidates";

const CARRIER_AI = GAME_CONFIG.CARRIER_AI;

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
  return scorePassCandidate(world, carrier, candidate);
}

function scorePassCandidate(
  world: World,
  carrier: Entity,
  candidate: PassCandidate,
): number {
  const carrierPosition = carrier.get(Position);
  const side = carrier.get(TeamSide)?.side;
  if (!carrierPosition || !side) return 0;
  return (
    CARRIER_AI.WEIGHT_OPENNESS *
      receiverOpenness(world, candidate.receiver, side) +
    CARRIER_AI.WEIGHT_PROGRESSION *
      passProgression(carrierPosition, candidate.target, side) -
    CARRIER_AI.WEIGHT_BACKPASS_PENALTY *
      backpassPenalty(carrier, candidate.receiver) -
    passLaneRisk(world, carrierPosition, candidate.target)
  );
}

function receiverOpenness(
  world: World,
  receiver: Entity,
  receiverSide: TeamSideId,
): number {
  const receiverPosition = receiver.get(Position);
  if (!receiverPosition) return 0;
  const opponentPosition = findNearestPlayer(world, {
    point: receiverPosition,
    side: opposingSide(receiverSide),
  })?.get(Position);
  if (!opponentPosition) return 1;
  const distance = displacement2D(receiverPosition, opponentPosition).distance;
  return clamp(distance / CARRIER_AI.OPENNESS_CAP_M, 0, 1);
}

function passProgression(
  from: Point2D,
  to: Point2D,
  side: TeamSideId,
): number {
  const advance = (to.x - from.x) * attackDirection(side);
  return clamp(advance / CARRIER_AI.LOFTED_MAX_RANGE_M, -1, 1);
}

function backpassPenalty(carrier: Entity, receiver: Entity): number {
  return carrier.targetFor(LastPassFrom) === receiver ? 1 : 0;
}

function passLaneRisk(
  _world: World,
  _from: Point2D,
  _to: Point2D,
): number {
  return 0;
}

function opposingSide(side: TeamSideId): TeamSideId {
  return side === "home" ? "away" : "home";
}
