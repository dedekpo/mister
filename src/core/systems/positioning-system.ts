import { Not, type World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { computeAnchor, projectTacticalSlot } from "../formation";
import { clampToPitch } from "../pitch";
import {
  IsBall,
  IsCarrier,
  IsChaser,
  IsPlayer,
  IsReceiver,
  PlayerRole,
  Position,
  Possession,
  RosterSlot,
  TacticalOverride,
  TargetPosition,
  TeamSide,
} from "../traits";

const TACTICS = GAME_CONFIG.TACTICS;

export function positioningSystem(world: World) {
  const possession = world.get(Possession);
  const ball = world.queryFirst(IsBall);
  if (!possession || !ball) return;
  const ballPosition = ball.get(Position);
  if (!ballPosition) return;

  world
    .query(
      IsPlayer,
      TargetPosition,
      PlayerRole,
      TeamSide,
      RosterSlot,
      Not(IsCarrier, IsReceiver, IsChaser),
    )
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
      const pulled = clampToPitch(
        {
          x: anchor.x + ballPosition.x * TACTICS.BALL_PULL_X,
          z: anchor.z + ballPosition.z * TACTICS.BALL_PULL_Z,
        },
        TACTICS.PITCH_CLAMP_MARGIN,
      );
      target.x = pulled.x;
      target.z = pulled.z;
    });
}
