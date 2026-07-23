import type { Entity, World } from "koota";
import { displacement2D, type Point2D } from "./math";
import {
  IsPlayer,
  PlayerRole,
  Position,
  TeamSide,
  type PlayerRoleId,
  type TeamSideId,
} from "./traits";

export interface NearestPlayerRequest {
  point: Point2D;
  side?: TeamSideId;
  exclude?: Entity;
  excludeRole?: PlayerRoleId;
}

export interface NearestPlayersRequest extends NearestPlayerRequest {
  count: number;
}

interface RankedPlayer {
  entity: Entity;
  distance: number;
}

export function findNearestPlayer(
  world: World,
  request: NearestPlayerRequest,
): Entity | undefined {
  return findNearestPlayers(world, { ...request, count: 1 })[0];
}

export function findNearestPlayers(
  world: World,
  request: NearestPlayersRequest,
): Entity[] {
  const ranked: RankedPlayer[] = [];
  world
    .query(IsPlayer, Position, TeamSide, PlayerRole)
    .readEach(([position, teamSide, role], entity) => {
      if (entity === request.exclude) return;
      if (request.side && teamSide.side !== request.side) return;
      if (request.excludeRole && role.role === request.excludeRole) return;
      ranked.push({
        entity,
        distance: displacement2D(position, request.point).distance,
      });
    });
  return ranked
    .sort((a, b) => a.distance - b.distance)
    .slice(0, request.count)
    .map((player) => player.entity);
}
