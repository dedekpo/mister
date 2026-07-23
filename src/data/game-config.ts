import type {
  LevelId,
  RosterRoleId,
  WideRoleId,
} from "../core/traits";

export interface LevelConfig {
  ATTACKING_X: number;
  DEFENDING_X: number;
  BAND_WIDTH: number;
}

export interface WideRoleConfig {
  LEVEL: LevelId;
  FLANK_Z: number;
}

export type RosterCounts = Partial<Record<RosterRoleId, number>>;

const BALL_CIRCUMFERENCE = 0.69;
const SIMULATION_TICK_RATE_HZ = 60;

export const GAME_CONFIG = {
  FIELD: {
    LENGTH: 105,
    WIDTH: 68,
    LINE_WIDTH: 0.12,
    LINE_LIFT: 0.01,
    CENTER_CIRCLE_RADIUS: 9.15,
    PENALTY_AREA_DEPTH: 16.5,
    PENALTY_AREA_WIDTH: 40.32,
    GOAL_AREA_DEPTH: 5.5,
    GOAL_AREA_WIDTH: 18.32,
    PENALTY_SPOT_DISTANCE: 11,
    PENALTY_ARC_RADIUS: 9.15,
    CORNER_ARC_RADIUS: 1,
    SPOT_RADIUS: 0.11,
    GRASS_MARGIN: 4,
    ARC_SEGMENTS: 64,
    SPOT_SEGMENTS: 24,
    GRASS_COLOR: "#41b45c",
    LINE_COLOR: "white",
  },
  GOAL: {
    WIDTH: 7.32,
    HEIGHT: 2.44,
    BAR_RADIUS: 0.06,
    BAR_SEGMENTS: 16,
    COLOR: "white",
  },
  PLAYER: {
    HEIGHT: 1.8,
    RADIUS: 0.3,
    RUN_SPEED_MPS: 7,
  },
  SIMULATION: {
    TICK_RATE_HZ: SIMULATION_TICK_RATE_HZ,
    TICK_SECONDS: 1 / SIMULATION_TICK_RATE_HZ,
    MAX_FRAME_DELTA_SECONDS: 0.25,
  },
  BALL: {
    CIRCUMFERENCE: BALL_CIRCUMFERENCE,
    RADIUS: BALL_CIRCUMFERENCE / (2 * Math.PI),
    SEGMENTS: 32,
    COLOR: "white",
  },
  TEAMS: {
    HOME_COLOR: "red",
    AWAY_COLOR: "blue",
  },
  CAMERA: {
    START_POSITION: [0, 60, 70] as [number, number, number],
    FOV: 45,
  },
  LIGHTING: {
    AMBIENT_INTENSITY: 0.5,
    SUN_POSITION: [10, 10, 10] as [number, number, number],
    SUN_INTENSITY: 1.5,
  },
  TACTICS: {
    BALL_PULL_X: 0.25,
    BALL_PULL_Z: 0.35,
    PITCH_CLAMP_MARGIN: 2,
    ARRIVAL_DISTANCE: 0.15,
    GOALKEEPER: {
      ATTACKING_X: -48,
      DEFENDING_X: -50,
    },
    LEVELS: {
      CB: { ATTACKING_X: -30, DEFENDING_X: -42, BAND_WIDTH: 24 },
      CDM: { ATTACKING_X: -15, DEFENDING_X: -32, BAND_WIDTH: 20 },
      CM: { ATTACKING_X: -2, DEFENDING_X: -24, BAND_WIDTH: 26 },
      CAM: { ATTACKING_X: 12, DEFENDING_X: -15, BAND_WIDTH: 20 },
      ST: { ATTACKING_X: 30, DEFENDING_X: -5, BAND_WIDTH: 14 },
    } satisfies Record<LevelId, LevelConfig>,
    WIDE: {
      FB: { LEVEL: "CB", FLANK_Z: 27 },
      WB: { LEVEL: "CM", FLANK_Z: 29 },
      W: { LEVEL: "ST", FLANK_Z: 25 },
    } satisfies Record<WideRoleId, WideRoleConfig>,
    ROSTERS: {
      HOME: { CB: 2, FB: 2, CDM: 1, CM: 2, W: 2, ST: 1 } satisfies RosterCounts,
      AWAY: { CB: 3, WB: 2, CDM: 2, CAM: 1, ST: 2 } satisfies RosterCounts,
    },
    BOARD: {
      COLUMNS: 5,
      ROWS: 5,
      ATTACKING_DEPTH_RANGE: [-45, 35] as [number, number],
      DEFENDING_DEPTH_RANGE: [-50, -4] as [number, number],
      WIDTH_MARGIN: 4,
    },
  },
  DEBUG: {
    GRID_CELL_SIZE: 5,
    GRID_LINE_WIDTH: 0.06,
    GRID_OPACITY: 0.15,
    GRID_LIFT: 0.005,
    GRID_COLOR: "white",
    MARKER_RADIUS: 0.6,
    MARKER_THICKNESS: 0.12,
    MARKER_SEGMENTS: 32,
    MARKER_OPACITY: 0.9,
    MARKER_LIFT: 0.02,
    ARROW_LIFT: 1,
    ARROW_MIN_LENGTH: 0.6,
    ARROW_HEAD_LENGTH: 0.8,
    ARROW_HEAD_WIDTH: 0.4,
    MINIMAP_BACKGROUND: "#2f7d43",
    COACH_DOT_RADIUS: 3,
    COACH_DOT_FONT_SIZE: 2.2,
    COACH_OVERRIDE_COLOR: "#facc15",
  },
} ;
