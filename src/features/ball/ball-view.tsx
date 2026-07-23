import { useEffect, useRef } from "react";
import type { Group } from "three";
import type { Entity } from "koota";
import { useQuery } from "koota/react";
import { IsBall, Position, SceneRef } from "../../core/traits";
import { GAME_CONFIG } from "../../data/game-config";

const BALL = GAME_CONFIG.BALL;

function BallView({ entity }: { entity: Entity }) {
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    entity.add(SceneRef(group));
    return () => entity.remove(SceneRef);
  }, [entity]);

  return (
    <group ref={groupRef}>
      <mesh castShadow>
        <sphereGeometry args={[BALL.RADIUS, BALL.SEGMENTS, BALL.SEGMENTS]} />
        <meshStandardMaterial color={BALL.COLOR} />
      </mesh>
    </group>
  );
}

export default function BallsView() {
  const balls = useQuery(IsBall, Position);

  return (
    <>
      {balls.map((entity) => (
        <BallView key={entity} entity={entity} />
      ))}
    </>
  );
}
