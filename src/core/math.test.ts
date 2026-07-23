import { describe, expect, it } from "vitest";
import { projectOntoSegment } from "./math";

const LANE_START = { x: 0, z: 0 };
const LANE_END = { x: 20, z: 0 };

describe("projectOntoSegment", () => {
  it("drops a perpendicular onto the interior of the segment", () => {
    const projection = projectOntoSegment(LANE_START, LANE_END, { x: 5, z: 3 });
    expect(projection.point).toEqual({ x: 5, z: 0 });
    expect(projection.progress).toBeCloseTo(0.25);
    expect(projection.distance).toBeCloseTo(3);
  });

  it("clamps points behind the start to the start", () => {
    const projection = projectOntoSegment(LANE_START, LANE_END, { x: -4, z: 3 });
    expect(projection.point).toEqual({ x: 0, z: 0 });
    expect(projection.progress).toBe(0);
    expect(projection.distance).toBeCloseTo(5);
  });

  it("clamps points beyond the end to the end", () => {
    const projection = projectOntoSegment(LANE_START, LANE_END, { x: 24, z: 3 });
    expect(projection.point).toEqual({ x: 20, z: 0 });
    expect(projection.progress).toBe(1);
    expect(projection.distance).toBeCloseTo(5);
  });

  it("handles a diagonal segment", () => {
    const projection = projectOntoSegment(
      { x: 0, z: 0 },
      { x: 10, z: 10 },
      { x: 10, z: 0 },
    );
    expect(projection.point.x).toBeCloseTo(5);
    expect(projection.point.z).toBeCloseTo(5);
    expect(projection.progress).toBeCloseTo(0.5);
    expect(projection.distance).toBeCloseTo(Math.hypot(5, 5));
  });

  it("degrades to a point distance when the segment has no length", () => {
    const projection = projectOntoSegment(
      { x: 4, z: 4 },
      { x: 4, z: 4 },
      { x: 4, z: 7 },
    );
    expect(projection.point).toEqual({ x: 4, z: 4 });
    expect(projection.progress).toBe(0);
    expect(projection.distance).toBeCloseTo(3);
  });
});
