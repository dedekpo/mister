import { GAME_CONFIG } from "../data/game-config";
import { clamp, type Point2D } from "./math";

const PITCH_HALF_LENGTH = GAME_CONFIG.FIELD.LENGTH / 2;
const PITCH_HALF_WIDTH = GAME_CONFIG.FIELD.WIDTH / 2;

export const OWN_GOAL_LINE_X = -PITCH_HALF_LENGTH;

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
