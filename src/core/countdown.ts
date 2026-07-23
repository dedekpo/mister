import type { ExtractSchema, Trait, TraitRecord, World } from "koota";
import { upsertTrait, type TraitContainer } from "./upsert-trait";

export type CountdownTrait = Trait<{ remainingSeconds: number }>;

export interface CountdownTarget extends TraitContainer {
  get<T extends Trait>(trait: T): TraitRecord<ExtractSchema<T>> | undefined;
}

export function tickCountdown(
  target: CountdownTarget,
  trait: CountdownTrait,
  delta: number,
  secondsWhenUnarmed = 0,
): boolean {
  const remainingSeconds =
    (target.get(trait)?.remainingSeconds ?? secondsWhenUnarmed) - delta;
  if (remainingSeconds <= 0) return true;
  upsertTrait(target, trait, { remainingSeconds });
  return false;
}

export function expireCountdowns(
  world: World,
  trait: CountdownTrait,
  delta: number,
) {
  [...world.query(trait)].forEach((entity) => {
    if (tickCountdown(entity, trait, delta)) entity.remove(trait);
  });
}
