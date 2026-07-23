import type { World } from "koota";
import { GAME_CONFIG } from "../data/game-config";
import { lerp } from "./math";
import { MatchRandom } from "./traits";
import { upsertTrait } from "./upsert-trait";

export interface RandomDraw {
  state: number;
  value: number;
}

export function stepRandom(state: number): RandomDraw {
  const advanced = (state + 0x6d2b79f5) | 0;
  let scrambled = advanced;
  scrambled = Math.imul(scrambled ^ (scrambled >>> 15), scrambled | 1);
  scrambled ^=
    scrambled + Math.imul(scrambled ^ (scrambled >>> 7), scrambled | 61);
  const value = ((scrambled ^ (scrambled >>> 14)) >>> 0) / 4294967296;
  return { state: advanced, value };
}

export function seedMatchRandom(world: World, seed: number) {
  upsertTrait(world, MatchRandom, { state: seed | 0 });
}

export function nextRandom01(world: World): number {
  if (!world.has(MatchRandom)) {
    seedMatchRandom(world, GAME_CONFIG.MATCH.SEED);
  }
  const draw = stepRandom(world.get(MatchRandom)!.state);
  world.set(MatchRandom, { state: draw.state });
  return draw.value;
}

export function randomRange(world: World, min: number, max: number): number {
  return lerp(min, max, nextRandom01(world));
}

export function randomChance(world: World, probability: number): boolean {
  return nextRandom01(world) < probability;
}

export function randomPick<T>(world: World, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(nextRandom01(world) * items.length)];
}
