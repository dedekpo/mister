import type { Entity, World } from "koota";
import { GAME_CONFIG, type RosterCounts } from "../../data/game-config";
import { computeAnchor } from "../formation";
import { seedMatchRandom } from "../random";
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
  type TeamSideId,
} from "../traits";
import { giveBallTo } from "./ball-control";
import { setPossession } from "./possession";

const ROSTERS = GAME_CONFIG.TACTICS.ROSTERS;
const KICKOFF_ROLE_PRIORITY = GAME_CONFIG.MATCH.KICKOFF_ROLE_PRIORITY;

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
  (Object.entries(roster) as [PlayerRoleId, number][]).forEach(
    ([role, count]) => {
      for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
        spawnPlayer(world, side, role, slotIndex, count);
      }
    },
  );
}

function spawnBall(world: World) {
  return world.spawn(
    IsBall,
    Position({ x: 0, y: GAME_CONFIG.BALL.RADIUS, z: 0 }),
  );
}

export function spawnMatch(world: World, kickingSide: TeamSideId = "home") {
  seedMatchRandom(world, GAME_CONFIG.MATCH.SEED);
  spawnTeam(world, "home", ROSTERS.HOME);
  spawnTeam(world, "away", ROSTERS.AWAY);
  spawnBall(world);
  resetForKickoff(world, kickingSide);
}

export function resetForKickoff(world: World, kickingSide: TeamSideId) {
  setPossession(world, kickingSide);
  world
    .query(IsPlayer, Position, TargetPosition, PlayerRole, TeamSide, RosterSlot)
    .updateEach(([position, target, role, teamSide, slot]) => {
      const anchor = computeAnchor({
        role: role.role,
        slotIndex: slot.index,
        slotCount: slot.count,
        side: teamSide.side,
        isAttacking: false,
      });
      position.x = anchor.x;
      position.z = anchor.z;
      target.x = anchor.x;
      target.z = anchor.z;
    });
  const kickoffCarrier = findKickoffCarrier(world, kickingSide);
  if (!kickoffCarrier) return;
  placeAtCenterSpot(kickoffCarrier);
  giveBallTo(world, kickoffCarrier);
}

function placeAtCenterSpot(player: Entity) {
  player.set(Position, { x: 0, y: 0, z: 0 });
  player.set(TargetPosition, { x: 0, z: 0 });
}

function findKickoffCarrier(
  world: World,
  side: TeamSideId,
): Entity | undefined {
  for (const role of KICKOFF_ROLE_PRIORITY) {
    const candidate = findMostCentralPlayer(world, side, role);
    if (candidate) return candidate;
  }
  return undefined;
}

function findMostCentralPlayer(
  world: World,
  side: TeamSideId,
  role: PlayerRoleId,
): Entity | undefined {
  let mostCentral: Entity | undefined;
  let smallestLaneOffset = Infinity;
  world
    .query(IsPlayer, Position, PlayerRole, TeamSide)
    .readEach(([position, playerRole, teamSide], entity) => {
      if (teamSide.side !== side) return;
      if (playerRole.role !== role) return;
      const laneOffset = Math.abs(position.z);
      if (laneOffset >= smallestLaneOffset) return;
      mostCentral = entity;
      smallestLaneOffset = laneOffset;
    });
  return mostCentral;
}
