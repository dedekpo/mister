import { useEffect, useRef } from "react";
import type { Group } from "three";
import type { Entity } from "koota";
import { useQuery, useTrait } from "koota/react";
import { IsPlayer, Position, SceneRef, TeamSide } from "../../core/traits";
import { GAME_CONFIG } from "../../data/game-config";
import { teamColor } from "./team-color";

const PLAYER = GAME_CONFIG.PLAYER;
const CAPSULE_CYLINDER_LENGTH = PLAYER.HEIGHT - PLAYER.RADIUS * 2;

function PlayerView({ entity }: { entity: Entity }) {
  const groupRef = useRef<Group>(null);
  const teamSide = useTrait(entity, TeamSide);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    entity.add(SceneRef(group));
    return () => entity.remove(SceneRef);
  }, [entity]);

  if (!teamSide) return null;

  return (
    <group ref={groupRef}>
      <mesh position={[0, PLAYER.HEIGHT / 2, 0]} castShadow>
        <capsuleGeometry args={[PLAYER.RADIUS, CAPSULE_CYLINDER_LENGTH]} />
        <meshStandardMaterial color={teamColor(teamSide.side)} />
      </mesh>
    </group>
  );
}

export default function PlayersView() {
  const players = useQuery(IsPlayer, Position);

  return (
    <>
      {players.map((entity) => (
        <PlayerView key={entity} entity={entity} />
      ))}
    </>
  );
}
