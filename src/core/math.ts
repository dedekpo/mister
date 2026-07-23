export interface Point2D {
  x: number;
  z: number;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function distance2D(a: Point2D, b: Point2D) {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

export function lerp(from: number, to: number, ratio: number) {
  return from + (to - from) * ratio;
}

export function inverseLerp(from: number, to: number, value: number) {
  return (value - from) / (to - from);
}
