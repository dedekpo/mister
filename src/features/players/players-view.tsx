import { useEffect, useRef } from "react";
import type { Group } from "three";
import type { Entity } from "koota";
import { useHas, useQuery, useTrait } from "koota/react";
import {
  IsCarrier,
  IsPlayer,
  Position,
  SceneRef,
  TeamSide,
} from "../../core/traits";
import { GAME_CONFIG } from "../../data/game-config";
import { teamColor } from "./team-color";

const PLAYER = GAME_CONFIG.PLAYER;
const DEBUG = GAME_CONFIG.DEBUG;
const CAPSULE_CYLINDER_LENGTH = PLAYER.HEIGHT - PLAYER.RADIUS * 2;

function CarrierRing() {
  return (
    <mesh position={[0, DEBUG.CARRIER_RING_LIFT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry
        args={[DEBUG.CARRIER_RING_INNER_RADIUS, DEBUG.CARRIER_RING_OUTER_RADIUS]}
      />
      <meshBasicMaterial color={DEBUG.CARRIER_RING_COLOR} />
    </mesh>
  );
}

function PlayerView({ entity }: { entity: Entity }) {
  const groupRef = useRef<Group>(null);
  const teamSide = useTrait(entity, TeamSide);
  const isCarrying = useHas(entity, IsCarrier);

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
      {isCarrying && <CarrierRing />}
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
