import { Not, type Entity, type World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { kickPass } from "../actions/kicking";
import { generateCarrierCandidates } from "../ai/candidates";
import { chooseCarrierAction } from "../ai/choose-carrier-action";
import { scoreCarrierCandidates } from "../ai/scoring";
import { randomRange } from "../random";
import { CarrierDecision, IsCarrier } from "../traits";
import { upsertTrait } from "../upsert-trait";

const CARRIER_AI = GAME_CONFIG.CARRIER_AI;

export function carrierDecisionSystem(world: World, delta: number) {
  clearStaleDecisions(world);
  armNewCarriers(world);
  tickThinkTimers(world, delta);
}

function clearStaleDecisions(world: World) {
  [...world.query(CarrierDecision, Not(IsCarrier))].forEach((entity) =>
    entity.remove(CarrierDecision),
  );
}

function armNewCarriers(world: World) {
  [...world.query(IsCarrier, Not(CarrierDecision))].forEach((carrier) =>
    armThinkTimer(world, carrier),
  );
}

function armThinkTimer(world: World, carrier: Entity) {
  upsertTrait(carrier, CarrierDecision, {
    thinkRemainingSeconds: randomRange(
      world,
      CARRIER_AI.THINK_SECONDS_MIN,
      CARRIER_AI.THINK_SECONDS_MAX,
    ),
  });
}

function tickThinkTimers(world: World, delta: number) {
  [...world.query(IsCarrier, CarrierDecision)].forEach((carrier) => {
    const decision = carrier.get(CarrierDecision);
    if (!decision) return;
    const thinkRemainingSeconds = decision.thinkRemainingSeconds - delta;
    if (thinkRemainingSeconds > 0) {
      carrier.set(CarrierDecision, { thinkRemainingSeconds });
      return;
    }
    decideCarrierAction(world, carrier);
  });
}

function decideCarrierAction(world: World, carrier: Entity) {
  const candidates = generateCarrierCandidates(world, carrier);
  const scoredCandidates = scoreCarrierCandidates(world, carrier, candidates);
  const picked = chooseCarrierAction(world, carrier, scoredCandidates);
  if (!picked || picked.kind === "hold") {
    armThinkTimer(world, carrier);
    return;
  }
  carrier.remove(CarrierDecision);
  kickPass(world, carrier, picked.target, picked.flavor);
}
