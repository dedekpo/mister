import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import type { PassFlavor } from "../actions/kicking";
import { attackDirection } from "../formation";
import { degreesToRadians, displacement2D, type Point2D } from "../math";
import { clampToPitch, isWithinPitch } from "../pitch";
import {
  IsPlayer,
  PlayerRole,
  Position,
  TeamSide,
  type TeamSideId,
} from "../traits";

const CARRIER_AI = GAME_CONFIG.CARRIER_AI;
const DRIBBLING = GAME_CONFIG.DRIBBLING;
const CLEARING = GAME_CONFIG.CLEARING;
const MIN_PASS_DISTANCE_M = GAME_CONFIG.PASSING.MIN_DISTANCE_M;
const PITCH_MARGIN_M = GAME_CONFIG.TACTICS.PITCH_CLAMP_MARGIN;

export interface PassCandidate {
  kind: "pass";
  receiver: Entity;
  target: Point2D;
  flavor: PassFlavor;
}

export interface DribbleCandidate {
  kind: "dribble";
  target: Point2D;
}

export interface ClearCandidate {
  kind: "clear";
  target: Point2D;
}

export interface HoldCandidate {
  kind: "hold";
}

export type CarrierActionCandidate =
  | PassCandidate
  | DribbleCandidate
  | ClearCandidate
  | HoldCandidate;

export function generateCarrierCandidates(
  world: World,
  carrier: Entity,
): CarrierActionCandidate[] {
  const candidates: CarrierActionCandidate[] = [{ kind: "hold" }];
  const carrierPosition = carrier.get(Position);
  const side = carrier.get(TeamSide)?.side;
  if (!carrierPosition || !side) return candidates;
  candidates.push(...passCandidates(world, carrier, carrierPosition, side));
  if (carrier.get(PlayerRole)?.role !== "GK") {
    candidates.push(...dribbleCandidates(carrierPosition, side));
  }
  candidates.push(...clearCandidates(carrierPosition, side));
  return candidates;
}

function passCandidates(
  world: World,
  carrier: Entity,
  carrierPosition: Point2D,
  side: TeamSideId,
): PassCandidate[] {
  const candidates: PassCandidate[] = [];
  world
    .query(IsPlayer, Position, TeamSide)
    .readEach(([position, teamSide], entity) => {
      if (entity === carrier) return;
      if (teamSide.side !== side) return;
      const flavor = passFlavorForDistance(
        displacement2D(carrierPosition, position).distance,
      );
      if (!flavor) return;
      candidates.push({
        kind: "pass",
        receiver: entity,
        target: { x: position.x, z: position.z },
        flavor,
      });
    });
  return candidates;
}

function dribbleCandidates(
  carrierPosition: Point2D,
  side: TeamSideId,
): DribbleCandidate[] {
  return DRIBBLING.PROBE_ANGLES_DEG.map((angleDeg) =>
    dribbleProbeTarget(carrierPosition, side, angleDeg),
  )
    .filter((target) => isWithinPitch(target, PITCH_MARGIN_M))
    .map((target) => ({ kind: "dribble", target }));
}

function dribbleProbeTarget(
  carrierPosition: Point2D,
  side: TeamSideId,
  angleDeg: number,
): Point2D {
  const angle = degreesToRadians(angleDeg);
  const reach = attackDirection(side) * DRIBBLING.PROBE_DISTANCE_M;
  return {
    x: carrierPosition.x + Math.cos(angle) * reach,
    z: carrierPosition.z + Math.sin(angle) * reach,
  };
}

function clearCandidates(
  carrierPosition: Point2D,
  side: TeamSideId,
): ClearCandidate[] {
  const target = clampToPitch(
    {
      x: carrierPosition.x + attackDirection(side) * CLEARING.DISTANCE_M,
      z: carrierPosition.z,
    },
    PITCH_MARGIN_M,
  );
  const { distance } = displacement2D(carrierPosition, target);
  if (distance < MIN_PASS_DISTANCE_M) return [];
  return [{ kind: "clear", target }];
}

function passFlavorForDistance(distance: number): PassFlavor | undefined {
  if (distance < MIN_PASS_DISTANCE_M) return undefined;
  if (distance <= CARRIER_AI.GROUND_MAX_RANGE_M) return "ground";
  if (distance <= CARRIER_AI.LOFTED_MAX_RANGE_M) return "lofted";
  return undefined;
}
