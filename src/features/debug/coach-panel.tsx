import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Entity } from "koota";
import { useQuery, useTrait, useWorld } from "koota/react";
import {
  IsPlayer,
  PlayerRole,
  RosterSlot,
  TacticalOverride,
  TeamSide,
  type TeamSideId,
} from "../../core/traits";
import { defaultTacticalSlot, type TacticalSlot } from "../../core/formation";
import { clamp } from "../../core/math";
import {
  clearTeamTacticalOverrides,
  setTacticalOverride,
} from "../../core/actions/coach";
import { GAME_CONFIG } from "../../data/game-config";
import { teamColor } from "../players/team-color";

const FIELD = GAME_CONFIG.FIELD;
const DEBUG = GAME_CONFIG.DEBUG;
const BOARD = GAME_CONFIG.TACTICS.BOARD;
const BOARD_WIDTH = FIELD.WIDTH;
const BOARD_HEIGHT = FIELD.LENGTH / 2;
const COLUMN_STEP = BOARD_WIDTH / BOARD.COLUMNS;
const ROW_STEP = BOARD_HEIGHT / BOARD.ROWS;

interface DragState extends TacticalSlot {
  entity: Entity;
}

function boardX(lane: number) {
  return lane * BOARD_WIDTH;
}

function boardY(depth: number) {
  return (1 - depth) * BOARD_HEIGHT;
}

function snapToCell(laneRatio: number, topRatio: number): TacticalSlot {
  const column = clamp(
    Math.floor(laneRatio * BOARD.COLUMNS),
    0,
    BOARD.COLUMNS - 1,
  );
  const row = clamp(Math.floor(topRatio * BOARD.ROWS), 0, BOARD.ROWS - 1);
  return {
    lane: (column + 0.5) / BOARD.COLUMNS,
    depth: 1 - (row + 0.5) / BOARD.ROWS,
  };
}

function BoardMarkings() {
  const penaltyBoxX = (BOARD_WIDTH - FIELD.PENALTY_AREA_WIDTH) / 2;
  const goalBoxX = (BOARD_WIDTH - FIELD.GOAL_AREA_WIDTH) / 2;
  const circleLeftX = BOARD_WIDTH / 2 - FIELD.CENTER_CIRCLE_RADIUS;
  const circleRightX = BOARD_WIDTH / 2 + FIELD.CENTER_CIRCLE_RADIUS;

  return (
    <>
      <rect
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        fill={DEBUG.MINIMAP_BACKGROUND}
      />
      {Array.from({ length: BOARD.COLUMNS - 1 }, (_, index) => (
        <line
          key={`column-${index}`}
          x1={(index + 1) * COLUMN_STEP}
          y1={0}
          x2={(index + 1) * COLUMN_STEP}
          y2={BOARD_HEIGHT}
          stroke="white"
          strokeWidth={0.2}
          opacity={0.25}
        />
      ))}
      {Array.from({ length: BOARD.ROWS - 1 }, (_, index) => (
        <line
          key={`row-${index}`}
          x1={0}
          y1={(index + 1) * ROW_STEP}
          x2={BOARD_WIDTH}
          y2={(index + 1) * ROW_STEP}
          stroke="white"
          strokeWidth={0.2}
          opacity={0.25}
        />
      ))}
      <rect
        x={0.5}
        y={0.5}
        width={BOARD_WIDTH - 1}
        height={BOARD_HEIGHT - 1}
        fill="none"
        stroke="white"
        strokeWidth={0.5}
      />
      <path
        d={`M ${circleLeftX} 0 A ${FIELD.CENTER_CIRCLE_RADIUS} ${FIELD.CENTER_CIRCLE_RADIUS} 0 0 0 ${circleRightX} 0`}
        fill="none"
        stroke="white"
        strokeWidth={0.5}
      />
      <rect
        x={penaltyBoxX}
        y={BOARD_HEIGHT - FIELD.PENALTY_AREA_DEPTH}
        width={FIELD.PENALTY_AREA_WIDTH}
        height={FIELD.PENALTY_AREA_DEPTH}
        fill="none"
        stroke="white"
        strokeWidth={0.5}
      />
      <rect
        x={goalBoxX}
        y={BOARD_HEIGHT - FIELD.GOAL_AREA_DEPTH}
        width={FIELD.GOAL_AREA_WIDTH}
        height={FIELD.GOAL_AREA_DEPTH}
        fill="none"
        stroke="white"
        strokeWidth={0.5}
      />
      <circle
        cx={BOARD_WIDTH / 2}
        cy={BOARD_HEIGHT - FIELD.PENALTY_SPOT_DISTANCE}
        r={0.4}
        fill="white"
      />
    </>
  );
}

function BoardDot({
  entity,
  boardSide,
  dragSlot,
  onStartDrag,
}: {
  entity: Entity;
  boardSide: TeamSideId;
  dragSlot: TacticalSlot | null;
  onStartDrag: (event: ReactPointerEvent) => void;
}) {
  const override = useTrait(entity, TacticalOverride);
  const role = useTrait(entity, PlayerRole);
  const teamSide = useTrait(entity, TeamSide);
  const slot = useTrait(entity, RosterSlot);
  if (!role || !teamSide || !slot) return null;
  if (teamSide.side !== boardSide) return null;

  const tactical =
    dragSlot ??
    override ??
    defaultTacticalSlot(role.role, slot.index, slot.count);

  return (
    <g
      className="cursor-grab"
      onPointerDown={onStartDrag}
      transform={`translate(${boardX(tactical.lane)}, ${boardY(tactical.depth)})`}
    >
      <circle
        r={DEBUG.COACH_DOT_RADIUS}
        fill={teamColor(teamSide.side)}
        stroke={override ? DEBUG.COACH_OVERRIDE_COLOR : "white"}
        strokeWidth={0.5}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={DEBUG.COACH_DOT_FONT_SIZE}
        fill="white"
        pointerEvents="none"
      >
        {role.role}
      </text>
    </g>
  );
}

function TacticalBoard({ side }: { side: TeamSideId }) {
  const world = useWorld();
  const svgRef = useRef<SVGSVGElement>(null);
  const players = useQuery(IsPlayer, PlayerRole, TeamSide, RosterSlot);
  const [drag, setDrag] = useState<DragState | null>(null);

  const toSlot = (event: ReactPointerEvent): TacticalSlot | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const bounds = svg.getBoundingClientRect();
    return snapToCell(
      (event.clientX - bounds.left) / bounds.width,
      (event.clientY - bounds.top) / bounds.height,
    );
  };

  const startDrag = (entity: Entity) => (event: ReactPointerEvent) => {
    const slot = toSlot(event);
    if (!slot) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    setDrag({ entity, ...slot });
  };

  const moveDrag = (event: ReactPointerEvent) => {
    if (!drag) return;
    const slot = toSlot(event);
    if (!slot) return;
    setDrag({ entity: drag.entity, ...slot });
  };

  const endDrag = () => {
    if (!drag) return;
    setTacticalOverride(drag.entity, drag.lane, drag.depth);
    setDrag(null);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: teamColor(side) }}
        >
          {side}
        </span>
        <button
          type="button"
          onClick={() => clearTeamTacticalOverrides(world, side)}
          className="rounded border border-white/20 px-2 text-xs uppercase text-white/60 hover:text-white"
        >
          Reset
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        className="w-44 touch-none rounded"
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
      >
        <BoardMarkings />
        {players.map((entity) => (
          <BoardDot
            key={entity}
            entity={entity}
            boardSide={side}
            dragSlot={drag?.entity === entity ? drag : null}
            onStartDrag={startDrag(entity)}
          />
        ))}
      </svg>
    </div>
  );
}

export default function CoachPanel() {
  return (
    <div className="fixed top-4 left-4 z-10 flex select-none flex-col gap-3 rounded-lg bg-black/70 p-3 text-white">
      <span className="text-xs uppercase tracking-wide opacity-60">Coach</span>
      <TacticalBoard side="home" />
      <TacticalBoard side="away" />
    </div>
  );
}
