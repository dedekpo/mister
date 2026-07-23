import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../data/game-config";
import {
  isShootingPosition,
  shotConversionChance,
  shotGeometry,
  shotQuality,
} from "./shooting";

const SHOOTING = GAME_CONFIG.SHOOTING;
const GOAL_LINE_X = GAME_CONFIG.FIELD.LENGTH / 2;

describe("shotGeometry", () => {
  it("measures distance and angle to the attacked goal", () => {
    const geometry = shotGeometry({ x: GOAL_LINE_X - 10, z: 10 }, "home");
    expect(geometry.distanceM).toBeCloseTo(Math.hypot(10, 10));
    expect(geometry.angleDeg).toBeCloseTo(45);
  });

  it("reads a central shot as zero angle", () => {
    const geometry = shotGeometry({ x: GOAL_LINE_X - 12, z: 0 }, "home");
    expect(geometry.angleDeg).toBe(0);
    expect(geometry.distanceM).toBeCloseTo(12);
  });

  it("mirrors for the away side", () => {
    const homeGeometry = shotGeometry({ x: GOAL_LINE_X - 10, z: 10 }, "home");
    const awayGeometry = shotGeometry({ x: -(GOAL_LINE_X - 10), z: 10 }, "away");
    expect(awayGeometry.distanceM).toBeCloseTo(homeGeometry.distanceM);
    expect(awayGeometry.angleDeg).toBeCloseTo(homeGeometry.angleDeg);
  });

  it("rejects positions behind the goal line", () => {
    const geometry = shotGeometry({ x: GOAL_LINE_X + 1, z: 1 }, "home");
    expect(geometry.angleDeg).toBeGreaterThan(90);
    expect(isShootingPosition(geometry)).toBe(false);
  });
});

describe("isShootingPosition", () => {
  it("accepts a central position inside the range", () => {
    expect(
      isShootingPosition(shotGeometry({ x: GOAL_LINE_X - 15, z: 0 }, "home")),
    ).toBe(true);
  });

  it("rejects positions beyond the shooting range", () => {
    expect(
      isShootingPosition(
        shotGeometry({ x: GOAL_LINE_X - SHOOTING.MAX_RANGE_M - 1, z: 0 }, "home"),
      ),
    ).toBe(false);
  });

  it("rejects positions outside the shooting cone", () => {
    expect(
      isShootingPosition(shotGeometry({ x: GOAL_LINE_X - 5, z: 15 }, "home")),
    ).toBe(false);
  });
});

describe("shotQuality", () => {
  it("rates a close central shot far above a long wide one", () => {
    const closeCentral = shotQuality({ distanceM: 8, angleDeg: 0 });
    const longWide = shotQuality({ distanceM: 23, angleDeg: 45 });
    expect(closeCentral).toBeGreaterThan(longWide * 3);
  });

  it("decays with distance", () => {
    expect(shotQuality({ distanceM: 10, angleDeg: 10 })).toBeGreaterThan(
      shotQuality({ distanceM: 20, angleDeg: 10 }),
    );
  });

  it("decays with angle", () => {
    expect(shotQuality({ distanceM: 12, angleDeg: 0 })).toBeGreaterThan(
      shotQuality({ distanceM: 12, angleDeg: 40 }),
    );
  });

  it("bottoms out at the cone edge", () => {
    expect(
      shotQuality({ distanceM: 12, angleDeg: SHOOTING.CONE_HALF_ANGLE_DEG }),
    ).toBe(0);
    expect(shotQuality({ distanceM: 12, angleDeg: 90 })).toBe(0);
  });
});

describe("shotConversionChance", () => {
  it("floors at the base conversion", () => {
    expect(shotConversionChance(0)).toBe(SHOOTING.BASE_CONVERSION);
  });

  it("caps at certainty for a perfect chance", () => {
    expect(shotConversionChance(1)).toBe(1);
  });

  it("grows with quality", () => {
    expect(shotConversionChance(0.7)).toBeGreaterThan(
      shotConversionChance(0.4),
    );
  });
});
