import { GAME_CONFIG } from "../../data/game-config";

function gridOffsets(halfExtent: number) {
  const offsets = [0];
  for (
    let offset = GAME_CONFIG.DEBUG.GRID_CELL_SIZE;
    offset < halfExtent;
    offset += GAME_CONFIG.DEBUG.GRID_CELL_SIZE
  ) {
    offsets.push(offset, -offset);
  }
  return offsets;
}

export const LENGTHWISE_GRID_OFFSETS = gridOffsets(GAME_CONFIG.FIELD.WIDTH / 2);
export const CROSSWISE_GRID_OFFSETS = gridOffsets(GAME_CONFIG.FIELD.LENGTH / 2);
