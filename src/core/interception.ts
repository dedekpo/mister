import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../data/game-config";
import {
  clamp,
  displacement2D,
  projectOntoSegment,
  type Point2D,
} from "./math";
import {
  IsPlayer,
  opposingSide,
  Position,
  TeamSide,
  type TeamSideId,
} from "./traits";

const INTERCEPTION = GAME_CONFIG.INTERCEPTION;

export interface LaneThreat {
  opponent: Entity;
  interceptPoint: Point2D;
  laneProgress: number;
  chance: number;
}

export function findLaneThreats(
  world: World,
  from: Point2D,
  to: Point2D,
  passingSide: TeamSideId,
): LaneThreat[] {
  const defendingSide = opposingSide(passingSide);
  const laneLength = displacement2D(from, to).distance;
  const threats: LaneThreat[] = [];
  world
    .query(IsPlayer, Position, TeamSide)
    .readEach(([position, teamSide], entity) => {
      if (teamSide.side !== defendingSide) return;
      const projection = projectOntoSegment(from, to, position);
      if (projection.distance >= INTERCEPTION.LANE_RADIUS_M) return;
      if (!isCuttableLanePoint(projection.progress, laneLength)) return;
      threats.push({
        opponent: entity,
        interceptPoint: projection.point,
        laneProgress: projection.progress,
        chance: laneThreatChance(projection.distance, projection.progress),
      });
    });
  return threats;
}

function isCuttableLanePoint(
  laneProgress: number,
  laneLength: number,
): boolean {
  const margin = INTERCEPTION.LANE_ENTRY_MARGIN_M;
  return (
    laneProgress * laneLength >= margin &&
    (1 - laneProgress) * laneLength >= margin
  );
}

function laneThreatChance(laneDistance: number, laneProgress: number): number {
  const laneProximity = 1 - laneDistance / INTERCEPTION.LANE_RADIUS_M;
  return clamp(
    laneProximity *
      (INTERCEPTION.BASE_CHANCE +
        INTERCEPTION.EARLY_LANE_BONUS * (1 - laneProgress)),
    0,
    1,
  );
}

export function combinedInterceptionChance(threats: LaneThreat[]): number {
  const escapesEveryThreat = threats.reduce(
    (escape, threat) => escape * (1 - threat.chance),
    1,
  );
  return 1 - escapesEveryThreat;
}

export function likeliestInterceptor(
  threats: LaneThreat[],
): LaneThreat | undefined {
  return threats.reduce<LaneThreat | undefined>((best, threat) => {
    if (!best || threat.chance > best.chance) return threat;
    return best;
  }, undefined);
}

export function passInterceptionRisk(
  world: World,
  from: Point2D,
  to: Point2D,
  passingSide: TeamSideId,
): number {
  return combinedInterceptionChance(
    findLaneThreats(world, from, to, passingSide),
  );
}
