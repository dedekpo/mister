import { GAME_CONFIG } from "../../data/game-config";
import type { TeamSideId } from "../../core/traits";

export function teamColor(side: TeamSideId) {
  return side === "home"
    ? GAME_CONFIG.TEAMS.HOME_COLOR
    : GAME_CONFIG.TEAMS.AWAY_COLOR;
}
