import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import type { PassFlavor } from "../actions/kicking";
import { displacement2D, type Point2D } from "../math";
import { IsPlayer, Position, TeamSide } from "../traits";

const CARRIER_AI = GAME_CONFIG.CARRIER_AI;
const MIN_PASS_DISTANCE_M = GAME_CONFIG.PASSING.MIN_DISTANCE_M;

export interface PassCandidate {
  kind: "pass";
  receiver: Entity;
  target: Point2D;
  flavor: PassFlavor;
}

export interface HoldCandidate {
  kind: "hold";
}

export type CarrierActionCandidate = PassCandidate | HoldCandidate;

export function generateCarrierCandidates(
  world: World,
  carrier: Entity,
): CarrierActionCandidate[] {
  const candidates: CarrierActionCandidate[] = [{ kind: "hold" }];
  const carrierPosition = carrier.get(Position);
  const side = carrier.get(TeamSide)?.side;
  if (!carrierPosition || !side) return candidates;
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

function passFlavorForDistance(distance: number): PassFlavor | undefined {
  if (distance < MIN_PASS_DISTANCE_M) return undefined;
  if (distance <= CARRIER_AI.GROUND_MAX_RANGE_M) return "ground";
  if (distance <= CARRIER_AI.LOFTED_MAX_RANGE_M) return "lofted";
  return undefined;
}
