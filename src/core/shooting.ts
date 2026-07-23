import { GAME_CONFIG } from "../data/game-config";
import { attackDirection } from "./formation";
import {
  clamp,
  displacement2D,
  lerp,
  radiansToDegrees,
  type Point2D,
} from "./math";
import { opponentGoalCenter } from "./pitch";
import type { TeamSideId } from "./traits";

const SHOOTING = GAME_CONFIG.SHOOTING;

export interface ShotGeometry {
  distanceM: number;
  angleDeg: number;
}

export function shotGeometry(from: Point2D, side: TeamSideId): ShotGeometry {
  const goal = opponentGoalCenter(side);
  const advance = (goal.x - from.x) * attackDirection(side);
  const lateral = Math.abs(goal.z - from.z);
  return {
    distanceM: displacement2D(from, goal).distance,
    angleDeg: radiansToDegrees(Math.atan2(lateral, advance)),
  };
}

export function isShootingPosition(geometry: ShotGeometry): boolean {
  return (
    geometry.distanceM <= SHOOTING.MAX_RANGE_M &&
    geometry.angleDeg <= SHOOTING.CONE_HALF_ANGLE_DEG
  );
}

export function shotQuality(geometry: ShotGeometry): number {
  const angleFactor = clamp(
    1 - geometry.angleDeg / SHOOTING.CONE_HALF_ANGLE_DEG,
    0,
    1,
  );
  return (
    angleFactor *
    Math.exp(-SHOOTING.QUALITY_DISTANCE_FALLOFF * geometry.distanceM)
  );
}

export function shotConversionChance(quality: number): number {
  return lerp(SHOOTING.BASE_CONVERSION, 1, quality * quality);
}
