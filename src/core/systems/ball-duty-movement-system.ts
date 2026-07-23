import type { World } from "koota";
import {
  BallFlight,
  IsBall,
  IsCarrier,
  IsChaser,
  IsReceiver,
  Position,
  TargetPosition,
} from "../traits";

export function ballDutyMovementSystem(world: World) {
  const ball = world.queryFirst(IsBall);
  if (!ball) return;
  const ballPosition = ball.get(Position);
  const flight = ball.get(BallFlight);
  world.query(IsReceiver, TargetPosition).updateEach(([target]) => {
    if (!flight) return;
    target.x = flight.toX;
    target.z = flight.toZ;
  });
  world.query(IsChaser, TargetPosition).updateEach(([target]) => {
    if (!ballPosition) return;
    target.x = ballPosition.x;
    target.z = ballPosition.z;
  });
  world.query(IsCarrier, Position, TargetPosition).updateEach(
    ([position, target]) => {
      target.x = position.x;
      target.z = position.z;
    },
  );
}
