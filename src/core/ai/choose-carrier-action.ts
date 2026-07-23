import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { randomRange } from "../random";
import type { CarrierActionCandidate } from "./candidates";
import type { ScoredCandidate } from "./scoring";

const PICK_TEMPERATURE = GAME_CONFIG.CARRIER_AI.PICK_TEMPERATURE;

export function chooseCarrierAction(
  world: World,
  _carrier: Entity,
  scoredCandidates: ScoredCandidate[],
): CarrierActionCandidate | undefined {
  let bestCandidate: CarrierActionCandidate | undefined;
  let bestNoisyScore = -Infinity;
  scoredCandidates.forEach(({ candidate, score }) => {
    const noisyScore =
      score + randomRange(world, -PICK_TEMPERATURE, PICK_TEMPERATURE);
    if (noisyScore <= bestNoisyScore) return;
    bestCandidate = candidate;
    bestNoisyScore = noisyScore;
  });
  return bestCandidate;
}
