import type { ConfigurableTrait, ExtractSchema, Trait, TraitValue } from "koota";

interface TraitContainer {
  has(trait: Trait): boolean;
  add(...traits: ConfigurableTrait[]): void;
  set<T extends Trait>(trait: T, value: TraitValue<ExtractSchema<T>>): void;
}

export function upsertTrait<T extends Trait>(
  target: TraitContainer,
  trait: T,
  value: TraitValue<ExtractSchema<T>>,
) {
  if (target.has(trait)) {
    target.set(trait, value);
    return;
  }
  target.add(trait(value));
}
