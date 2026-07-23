import type { ReactNode, Ref, SVGProps } from "react";
import { GAME_CONFIG } from "../../data/game-config";
import {
  CROSSWISE_GRID_OFFSETS,
  LENGTHWISE_GRID_OFFSETS,
} from "./grid-offsets";

const FIELD = GAME_CONFIG.FIELD;
const HALF_LENGTH = FIELD.LENGTH / 2;
const HALF_WIDTH = FIELD.WIDTH / 2;

interface MinimapPitchProps extends SVGProps<SVGSVGElement> {
  showGrid?: boolean;
  children?: ReactNode;
  ref?: Ref<SVGSVGElement>;
}

export default function MinimapPitch({
  showGrid = false,
  children,
  ...svgProps
}: MinimapPitchProps) {
  const penaltyBoxY = (FIELD.WIDTH - FIELD.PENALTY_AREA_WIDTH) / 2;

  return (
    <svg viewBox={`0 0 ${FIELD.LENGTH} ${FIELD.WIDTH}`} {...svgProps}>
      <rect
        width={FIELD.LENGTH}
        height={FIELD.WIDTH}
        fill={GAME_CONFIG.DEBUG.MINIMAP_BACKGROUND}
      />
      {showGrid &&
        CROSSWISE_GRID_OFFSETS.map((offset) => (
          <line
            key={`v-${offset}`}
            x1={HALF_LENGTH + offset}
            y1={0}
            x2={HALF_LENGTH + offset}
            y2={FIELD.WIDTH}
            stroke="white"
            strokeWidth={0.15}
            opacity={0.3}
          />
        ))}
      {showGrid &&
        LENGTHWISE_GRID_OFFSETS.map((offset) => (
          <line
            key={`h-${offset}`}
            x1={0}
            y1={HALF_WIDTH + offset}
            x2={FIELD.LENGTH}
            y2={HALF_WIDTH + offset}
            stroke="white"
            strokeWidth={0.15}
            opacity={0.3}
          />
        ))}
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
      {children}
    </svg>
  );
}
