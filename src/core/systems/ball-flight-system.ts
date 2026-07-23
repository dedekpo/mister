import type { World } from "koota";
import { GAME_CONFIG } from "../../data/game-config";
import { resolveFlightArrival } from "../actions/kicking";
import { lerp, parabolicArcHeight } from "../math";
import { BallFlight, BallInFlight, IsBall, Position } from "../traits";

const BALL = GAME_CONFIG.BALL;

export function ballFlightSystem(world: World, delta: number) {
  const ball = world.queryFirst(IsBall, BallInFlight);
  if (!ball) return;
  const flight = ball.get(BallFlight);
  if (!flight) return;
  const elapsedSeconds = flight.elapsedSeconds + delta;
  if (elapsedSeconds >= flight.durationSeconds) {
    ball.set(Position, { x: flight.toX, y: BALL.RADIUS, z: flight.toZ });
    resolveFlightArrival(world, ball);
    return;
  }
  ball.set(BallFlight, { ...flight, elapsedSeconds });
  const progress = elapsedSeconds / flight.durationSeconds;
  ball.set(Position, {
    x: lerp(flight.fromX, flight.toX, progress),
    y: BALL.RADIUS + parabolicArcHeight(flight.arcHeight, progress),
    z: lerp(flight.fromZ, flight.toZ, progress),
  });
}
