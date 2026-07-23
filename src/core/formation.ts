import { GAME_CONFIG } from "../data/game-config";
import { clamp, inverseLerp, lerp, type Point2D } from "./math";
import type {
  LevelId,
  PlayerRoleId,
  TeamSideId,
  WideRoleId,
} from "./traits";

const TACTICS = GAME_CONFIG.TACTICS;
const BOARD = TACTICS.BOARD;
const BOARD_LANE_SPAN = GAME_CONFIG.FIELD.WIDTH - BOARD.WIDTH_MARGIN * 2;

export interface TacticalSlot {
  lane: number;
  depth: number;
}

export interface AnchorRequest {
  role: PlayerRoleId;
  slotIndex: number;
  slotCount: number;
  side: TeamSideId;
  isAttacking: boolean;
}

function attackDirection(side: TeamSideId): 1 | -1 {
  return side === "home" ? 1 : -1;
}

function isWideRole(role: PlayerRoleId): role is WideRoleId {
  return role in TACTICS.WIDE;
}

function levelSlotOffset(
  slotIndex: number,
  slotCount: number,
  bandWidth: number,
) {
  return ((slotIndex + 1) / (slotCount + 1) - 0.5) * bandWidth;
}

function wideFlankZ(slotIndex: number, flankZ: number) {
  return slotIndex % 2 === 0 ? -flankZ : flankZ;
}

function levelDepth(level: LevelId, isAttacking: boolean) {
  const config = TACTICS.LEVELS[level];
  return isAttacking ? config.ATTACKING_X : config.DEFENDING_X;
}

export function computeAnchor(request: AnchorRequest): Point2D {
  const mirror = attackDirection(request.side);
  if (request.role === "GK") {
    const depth = request.isAttacking
      ? TACTICS.GOALKEEPER.ATTACKING_X
      : TACTICS.GOALKEEPER.DEFENDING_X;
    return { x: depth * mirror, z: 0 };
  }
  if (isWideRole(request.role)) {
    const wide = TACTICS.WIDE[request.role];
    return {
      x: levelDepth(wide.LEVEL, request.isAttacking) * mirror,
      z: wideFlankZ(request.slotIndex, wide.FLANK_Z) * mirror,
    };
  }
  const level = TACTICS.LEVELS[request.role];
  return {
    x: levelDepth(request.role, request.isAttacking) * mirror,
    z:
      levelSlotOffset(request.slotIndex, request.slotCount, level.BAND_WIDTH) *
      mirror,
  };
}

export function projectTacticalSlot(
  slot: TacticalSlot,
  side: TeamSideId,
  isAttacking: boolean,
): Point2D {
  const [nearGoalX, advancedX] = isAttacking
    ? BOARD.ATTACKING_DEPTH_RANGE
    : BOARD.DEFENDING_DEPTH_RANGE;
  const mirror = attackDirection(side);
  return {
    x: lerp(nearGoalX, advancedX, slot.depth) * mirror,
    z: (slot.lane - 0.5) * BOARD_LANE_SPAN * mirror,
  };
}

export function defaultTacticalSlot(
  role: PlayerRoleId,
  slotIndex: number,
  slotCount: number,
): TacticalSlot {
  const anchor = computeAnchor({
    role,
    slotIndex,
    slotCount,
    side: "home",
    isAttacking: false,
  });
  const [nearGoalX, advancedX] = BOARD.DEFENDING_DEPTH_RANGE;
  return {
    lane: clamp(anchor.z / BOARD_LANE_SPAN + 0.5, 0, 1),
    depth: clamp(inverseLerp(nearGoalX, advancedX, anchor.x), 0, 1),
  };
}
