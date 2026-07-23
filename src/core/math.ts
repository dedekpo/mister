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

export function inverseLerp(from: number, to: number, value: number) {
  return (value - from) / (to - from);
}
