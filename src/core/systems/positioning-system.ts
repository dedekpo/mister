import type { World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { computeAnchor, projectTacticalSlot } from "../formation";
import { clamp } from "../math";
import {
  IsBall,
  IsPlayer,
  PlayerRole,
  Position,
  Possession,
  RosterSlot,
  TacticalOverride,
  TargetPosition,
  TeamSide,
} from "../traits";

const TACTICS = GAME_CONFIG.TACTICS;
const PITCH_X_LIMIT =
  GAME_CONFIG.FIELD.LENGTH / 2 - TACTICS.PITCH_CLAMP_MARGIN;
const PITCH_Z_LIMIT = GAME_CONFIG.FIELD.WIDTH / 2 - TACTICS.PITCH_CLAMP_MARGIN;

export function positioningSystem(world: World) {
  const possession = world.get(Possession);
  const ball = world.queryFirst(IsBall);
  if (!possession || !ball) return;
  const ballPosition = ball.get(Position);
  if (!ballPosition) return;

  world
    .query(IsPlayer, TargetPosition, PlayerRole, TeamSide, RosterSlot)
    .updateEach(([target, playerRole, teamSide, slot], entity) => {
      const isAttacking = possession.side === teamSide.side;
      const override = entity.get(TacticalOverride);
      const anchor = override
        ? projectTacticalSlot(override, teamSide.side, isAttacking)
        : computeAnchor({
            role: playerRole.role,
            slotIndex: slot.index,
            slotCount: slot.count,
            side: teamSide.side,
            isAttacking,
          });
      target.x = clamp(
        anchor.x + ballPosition.x * TACTICS.BALL_PULL_X,
        -PITCH_X_LIMIT,
        PITCH_X_LIMIT,
      );
      target.z = clamp(
        anchor.z + ballPosition.z * TACTICS.BALL_PULL_Z,
        -PITCH_Z_LIMIT,
        PITCH_Z_LIMIT,
      );
    });
}
