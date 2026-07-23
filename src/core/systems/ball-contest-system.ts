import type { World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { dispossessCarrier } from "../actions/ball-control";
import { expireCountdowns, tickCountdown } from "../countdown";
import { isUnderTacklePressure } from "../pressure";
import { randomChance } from "../random";
import {
  BallCarried,
  CarriedBy,
  ClaimLockout,
  ContestTimer,
  IsBall,
} from "../traits";
import { upsertTrait } from "../upsert-trait";

const PRESSURE = GAME_CONFIG.PRESSURE;

export function ballContestSystem(world: World, delta: number) {
  expireCountdowns(world, ClaimLockout, delta);
  const ball = world.queryFirst(IsBall, BallCarried);
  const carrier = ball?.targetFor(CarriedBy);
  if (!carrier) return;
  if (!isUnderTacklePressure(world, carrier)) {
    carrier.remove(ContestTimer);
    return;
  }
  const isContestResolved = tickCountdown(
    carrier,
    ContestTimer,
    delta,
    PRESSURE.CONTEST_INTERVAL_SECONDS,
  );
  if (!isContestResolved) return;
  if (randomChance(world, PRESSURE.DISPOSSESS_CHANCE)) {
    dispossessCarrier(world, carrier);
    return;
  }
  upsertTrait(carrier, ContestTimer, {
    remainingSeconds: PRESSURE.CONTEST_INTERVAL_SECONDS,
  });
}
