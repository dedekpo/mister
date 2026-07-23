import { GAME_CONFIG } from "../data/game-config";
import { attackDirection } from "./formation";
import { clamp, type Point2D } from "./math";
import type { TeamSideId } from "./traits";

const PITCH_HALF_LENGTH = GAME_CONFIG.FIELD.LENGTH / 2;
const PITCH_HALF_WIDTH = GAME_CONFIG.FIELD.WIDTH / 2;

export const OWN_GOAL_LINE_X = -PITCH_HALF_LENGTH;

export function opponentGoalCenter(side: TeamSideId): Point2D {
  return { x: attackDirection(side) * PITCH_HALF_LENGTH, z: 0 };
}

export function clampToPitch(point: Point2D, marginM: number): Point2D {
  return {
    x: clamp(
      point.x,
      -PITCH_HALF_LENGTH + marginM,
      PITCH_HALF_LENGTH - marginM,
    ),
    z: clamp(point.z, -PITCH_HALF_WIDTH + marginM, PITCH_HALF_WIDTH - marginM),
  };
}

export function isWithinPitch(point: Point2D, marginM: number): boolean {
  return (
    Math.abs(point.x) <= PITCH_HALF_LENGTH - marginM &&
    Math.abs(point.z) <= PITCH_HALF_WIDTH - marginM
  );
}
