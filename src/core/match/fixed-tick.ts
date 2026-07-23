import type { World } from "koota";
import { gameplayEventPhase } from "../events/gameplay-event-phase";
import { ballCarrySystem } from "../systems/ball-carry-system";
import { ballContestSystem } from "../systems/ball-contest-system";
import { ballDutyMovementSystem } from "../systems/ball-duty-movement-system";
import { ballDutySystem } from "../systems/ball-duty-system";
import { ballFlightSystem } from "../systems/ball-flight-system";
import { carrierDecisionSystem } from "../systems/carrier-decision-system";
import { looseBallSystem } from "../systems/loose-ball-system";
import { movementSystem } from "../systems/movement-system";
import { positioningSystem } from "../systems/positioning-system";

export function stepFixedTick(world: World, tickSeconds: number) {
  ballDutySystem(world, tickSeconds);
  carrierDecisionSystem(world, tickSeconds);
  positioningSystem(world);
  ballDutyMovementSystem(world);
  movementSystem(world, tickSeconds);
  ballContestSystem(world, tickSeconds);
  ballCarrySystem(world);
  ballFlightSystem(world, tickSeconds);
  looseBallSystem(world, tickSeconds);
  gameplayEventPhase(world);
}
