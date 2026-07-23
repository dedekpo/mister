import type { SVGProps } from "react";
import { GAME_CONFIG } from "../../data/game-config";

const FIELD = GAME_CONFIG.FIELD;
const HALF_LENGTH = FIELD.LENGTH / 2;
const HALF_WIDTH = FIELD.WIDTH / 2;

export default function MinimapPitch(svgProps: SVGProps<SVGSVGElement>) {
  const penaltyBoxY = (FIELD.WIDTH - FIELD.PENALTY_AREA_WIDTH) / 2;

  return (
    <svg viewBox={`0 0 ${FIELD.LENGTH} ${FIELD.WIDTH}`} {...svgProps}>
      <rect
        width={FIELD.LENGTH}
        height={FIELD.WIDTH}
        fill={GAME_CONFIG.DEBUG.MINIMAP_BACKGROUND}
      />
      <rect
        x={1}
        y={1}
        width={FIELD.LENGTH - 2}
        height={FIELD.WIDTH - 2}
        fill="none"
        stroke="white"
        strokeWidth={0.6}
      />
      <line
        x1={HALF_LENGTH}
        y1={1}
        x2={HALF_LENGTH}
        y2={FIELD.WIDTH - 1}
        stroke="white"
        strokeWidth={0.6}
      />
      <circle
        cx={HALF_LENGTH}
        cy={HALF_WIDTH}
        r={FIELD.CENTER_CIRCLE_RADIUS}
        fill="none"
        stroke="white"
        strokeWidth={0.6}
      />
      <rect
        x={1}
        y={penaltyBoxY}
        width={FIELD.PENALTY_AREA_DEPTH}
        height={FIELD.PENALTY_AREA_WIDTH}
        fill="none"
        stroke="white"
        strokeWidth={0.6}
      />
      <rect
        x={FIELD.LENGTH - 1 - FIELD.PENALTY_AREA_DEPTH}
        y={penaltyBoxY}
        width={FIELD.PENALTY_AREA_DEPTH}
        height={FIELD.PENALTY_AREA_WIDTH}
        fill="none"
        stroke="white"
        strokeWidth={0.6}
      />
    </svg>
  );
}
