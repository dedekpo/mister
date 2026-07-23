import type * as THREE from "three";
import { trait } from "koota";

export type LevelId = "CB" | "CDM" | "CM" | "CAM" | "ST";
export type WideRoleId = "FB" | "WB" | "W";
export type PlayerRoleId = "GK" | LevelId | WideRoleId;
export type RosterRoleId = Exclude<PlayerRoleId, "GK">;

export type TeamSideId = "home" | "away";

export const Position = trait({ x: 0, y: 0, z: 0 });
export const TargetPosition = trait({ x: 0, z: 0 });
export const TacticalOverride = trait({ lane: 0.5, depth: 0.5 });
export const Speed = trait({ metersPerSecond: 0 });
export const IsPlayer = trait();
export const IsBall = trait();
export const PlayerRole = trait({ role: "GK" as PlayerRoleId });
export const RosterSlot = trait({ index: 0, count: 1 });
export const TeamSide = trait({ side: "home" as TeamSideId });
export const Possession = trait({ side: "home" as TeamSideId });
export const SceneRef = trait(() => null as THREE.Object3D | null);
