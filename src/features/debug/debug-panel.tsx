import { useTrait, useWorld } from "koota/react";
import { Possession, TEAM_SIDES } from "../../core/traits";
import { giveBallToNearestOfSide } from "../../core/actions/ball-control";
import { teamColor } from "../players/team-color";

function BallGiver() {
  const world = useWorld();
  const possession = useTrait(world, Possession);
  if (!possession) return null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide opacity-60">
        Give ball to
      </span>
      <div className="flex overflow-hidden rounded-md border border-white/20">
        {TEAM_SIDES.map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => giveBallToNearestOfSide(world, side)}
            className={`flex-1 px-3 py-1 text-sm uppercase transition-colors ${
              possession.side === side
                ? "text-white"
                : "bg-transparent text-white/50 hover:text-white"
            }`}
            style={
              possession.side === side
                ? { backgroundColor: teamColor(side) }
                : undefined
            }
          >
            {side}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DebugPanel() {
  return (
    <div className="fixed top-4 right-4 z-10 flex select-none flex-col gap-3 rounded-lg bg-black/70 p-3 text-white">
      <BallGiver />
    </div>
  );
}
