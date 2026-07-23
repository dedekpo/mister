import type { MouseEvent } from "react";
import { useTrait, useWorld } from "koota/react";
import { Possession, type TeamSideId } from "../../core/traits";
import { setPossession } from "../../core/actions/possession";
import { teleportBall } from "../../core/actions/ball";
import { GAME_CONFIG } from "../../data/game-config";
import MinimapPitch from "./minimap-pitch";

const FIELD = GAME_CONFIG.FIELD;
const TEAM_SIDES: TeamSideId[] = ["home", "away"];

function PossessionFlipper() {
  const world = useWorld();
  const possession = useTrait(world, Possession);
  if (!possession) return null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide opacity-60">
        Possession
      </span>
      <div className="flex overflow-hidden rounded-md border border-white/20">
        {TEAM_SIDES.map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => setPossession(world, side)}
            className={`flex-1 px-3 py-1 text-sm uppercase transition-colors ${
              possession.side === side
                ? side === "home"
                  ? "bg-red-600 text-white"
                  : "bg-blue-600 text-white"
                : "bg-transparent text-white/50 hover:text-white"
            }`}
          >
            {side}
          </button>
        ))}
      </div>
    </div>
  );
}

function TeleportMinimap() {
  const world = useWorld();

  const teleportBallToClick = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const xRatio = (event.clientX - bounds.left) / bounds.width;
    const zRatio = (event.clientY - bounds.top) / bounds.height;
    teleportBall(
      world,
      (xRatio - 0.5) * FIELD.LENGTH,
      (zRatio - 0.5) * FIELD.WIDTH,
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide opacity-60">
        Ball teleport
      </span>
      <MinimapPitch
        className="w-56 cursor-crosshair rounded"
        onClick={teleportBallToClick}
      />
    </div>
  );
}

export default function DebugPanel() {
  return (
    <div className="fixed top-4 right-4 z-10 flex select-none flex-col gap-3 rounded-lg bg-black/70 p-3 text-white">
      <PossessionFlipper />
      <TeleportMinimap />
    </div>
  );
}
