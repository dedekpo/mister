import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../data/game-config";
import { clampToPitch, isWithinPitch, OWN_GOAL_LINE_X } from "./pitch";

const HALF_LENGTH = GAME_CONFIG.FIELD.LENGTH / 2;
const HALF_WIDTH = GAME_CONFIG.FIELD.WIDTH / 2;
const MARGIN = 2;

describe("clampToPitch", () => {
  it("leaves interior points untouched", () => {
    expect(clampToPitch({ x: 10, z: -5 }, MARGIN)).toEqual({ x: 10, z: -5 });
  });

  it("pulls points back inside both axes at once", () => {
    expect(clampToPitch({ x: 500, z: -500 }, MARGIN)).toEqual({
      x: HALF_LENGTH - MARGIN,
      z: -(HALF_WIDTH - MARGIN),
    });
  });

  it("honours a zero margin", () => {
    expect(clampToPitch({ x: 500, z: 500 }, 0)).toEqual({
      x: HALF_LENGTH,
      z: HALF_WIDTH,
    });
  });
});

describe("isWithinPitch", () => {
  it("accepts a point exactly on the margin boundary", () => {
    expect(isWithinPitch({ x: HALF_LENGTH - MARGIN, z: 0 }, MARGIN)).toBe(true);
  });

  it("rejects a point past the goal line margin", () => {
    expect(isWithinPitch({ x: HALF_LENGTH - MARGIN + 0.1, z: 0 }, MARGIN)).toBe(
      false,
    );
  });

  it("rejects a point past the touchline margin", () => {
    expect(isWithinPitch({ x: 0, z: -(HALF_WIDTH - MARGIN) - 0.1 }, MARGIN)).toBe(
      false,
    );
  });
});

describe("OWN_GOAL_LINE_X", () => {
  it("sits on the home goal line", () => {
    expect(OWN_GOAL_LINE_X).toBe(-HALF_LENGTH);
  });
});
