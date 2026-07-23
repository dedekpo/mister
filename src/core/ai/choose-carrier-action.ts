import type { Entity, World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { randomRange } from "../random";
import type { CarrierActionCandidate } from "./candidates";
import type { ScoredCandidate } from "./scoring";

const CARRIER_AI = GAME_CONFIG.CARRIER_AI;

export function chooseCarrierAction(
  world: World,
  _carrier: Entity,
  scoredCandidates: ScoredCandidate[],
): CarrierActionCandidate | undefined {
  let bestCandidate: CarrierActionCandidate | undefined;
  let bestNoisyScore = -Infinity;
  scoredCandidates.forEach(({ candidate, score }) => {
    const noisyScore =
      score +
      randomRange(
        world,
        -CARRIER_AI.PICK_TEMPERATURE,
        CARRIER_AI.PICK_TEMPERATURE,
      );
    if (noisyScore <= bestNoisyScore) return;
    bestCandidate = candidate;
    bestNoisyScore = noisyScore;
  });
  return bestCandidate;
}
