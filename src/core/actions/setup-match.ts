import type { World } from "koota";
import { GAME_CONFIG, type RosterCounts } from "../../data/game-config";
import { computeAnchor } from "../formation";
import {
  IsBall,
  IsPlayer,
  PlayerRole,
  Position,
  RosterSlot,
  Speed,
  TargetPosition,
  TeamSide,
  type PlayerRoleId,
  type RosterRoleId,
  type TeamSideId,
} from "../traits";
import { setPossession } from "./possession";

function spawnPlayer(
  world: World,
  side: TeamSideId,
  role: PlayerRoleId,
  slotIndex: number,
  slotCount: number,
) {
  const anchor = computeAnchor({
    role,
    slotIndex,
    slotCount,
    side,
    isAttacking: false,
  });
  return world.spawn(
    IsPlayer,
    TeamSide({ side }),
    PlayerRole({ role }),
    RosterSlot({ index: slotIndex, count: slotCount }),
    Position({ x: anchor.x, y: 0, z: anchor.z }),
    TargetPosition({ x: anchor.x, z: anchor.z }),
    Speed({ metersPerSecond: GAME_CONFIG.PLAYER.RUN_SPEED_MPS }),
  );
}

function spawnTeam(world: World, side: TeamSideId, roster: RosterCounts) {
  spawnPlayer(world, side, "GK", 0, 1);
  (Object.entries(roster) as [RosterRoleId, number][]).forEach(
    ([role, count]) => {
      for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
        spawnPlayer(world, side, role, slotIndex, count);
      }
    },
  );
}

function spawnBall(world: World) {
  return world.spawn(IsBall, Position({ x: 0, y: GAME_CONFIG.BALL.RADIUS, z: 0 }));
}

function clearMatch(world: World) {
  const matchEntities = [...world.query(IsPlayer), ...world.query(IsBall)];
  matchEntities.forEach((entity) => entity.destroy());
}

export function setupKickoff(world: World, kickingSide: TeamSideId) {
  clearMatch(world);
  setPossession(world, kickingSide);
  spawnTeam(world, "home", GAME_CONFIG.TACTICS.ROSTERS.HOME);
  spawnTeam(world, "away", GAME_CONFIG.TACTICS.ROSTERS.AWAY);
  spawnBall(world);
}
