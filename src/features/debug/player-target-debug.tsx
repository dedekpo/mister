import { useEffect, useRef } from "react";
import type { ArrowHelper, Mesh } from "three";
import type { Entity } from "koota";
import { useQuery, useTrait } from "koota/react";
import { IsPlayer, TargetPosition, TeamSide } from "../../core/traits";
import { DebugTargetRefs } from "./debug-target-refs";
import { GAME_CONFIG } from "../../data/game-config";
import { teamColor } from "../players/team-color";

const DEBUG = GAME_CONFIG.DEBUG;

function PlayerTargetDebug({ entity }: { entity: Entity }) {
  const markerRef = useRef<Mesh>(null);
  const arrowRef = useRef<ArrowHelper>(null);
  const teamSide = useTrait(entity, TeamSide);

  useEffect(() => {
    const marker = markerRef.current;
    const arrow = arrowRef.current;
    if (!marker || !arrow) return;
    entity.add(DebugTargetRefs({ marker, arrow }));
    return () => entity.remove(DebugTargetRefs);
  }, [entity]);

  if (!teamSide) return null;

  return (
    <>
      <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[
            DEBUG.MARKER_RADIUS - DEBUG.MARKER_THICKNESS,
            DEBUG.MARKER_RADIUS,
            DEBUG.MARKER_SEGMENTS,
          ]}
        />
        <meshBasicMaterial
          color={teamColor(teamSide.side)}
          transparent
          opacity={DEBUG.MARKER_OPACITY}
        />
      </mesh>
      <arrowHelper
        ref={arrowRef}
        args={[undefined, undefined, 1, teamColor(teamSide.side)]}
      />
    </>
  );
}

export default function PlayerTargetsDebug() {
  const players = useQuery(IsPlayer, TargetPosition);

  return (
    <>
      {players.map((entity) => (
        <PlayerTargetDebug key={entity} entity={entity} />
      ))}
    </>
  );
}
