export interface Point2D {
  x: number;
  z: number;
}

export interface Displacement2D {
  dx: number;
  dz: number;
  distance: number;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function displacement2D(from: Point2D, to: Point2D): Displacement2D {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return { dx, dz, distance: Math.hypot(dx, dz) };
}

export function lerp(from: number, to: number, ratio: number) {
  return from + (to - from) * ratio;
}

export function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function inverseLerp(from: number, to: number, value: number) {
  return (value - from) / (to - from);
}

export function parabolicArcHeight(peak: number, progress: number) {
  return peak * 4 * progress * (1 - progress);
}

export interface SegmentProjection {
  point: Point2D;
  progress: number;
  distance: number;
}

export function projectOntoSegment(
  start: Point2D,
  end: Point2D,
  point: Point2D,
): SegmentProjection {
  const { dx, dz, distance } = displacement2D(start, end);
  if (distance === 0) {
    return {
      point: { x: start.x, z: start.z },
      progress: 0,
      distance: displacement2D(start, point).distance,
    };
  }
  const alongLane = (point.x - start.x) * dx + (point.z - start.z) * dz;
  const progress = clamp(alongLane / (distance * distance), 0, 1);
  const closest = { x: start.x + dx * progress, z: start.z + dz * progress };
  return {
    point: closest,
    progress,
    distance: displacement2D(closest, point).distance,
  };
}
