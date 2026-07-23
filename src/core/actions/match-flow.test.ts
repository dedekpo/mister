import { createWorld, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gameplayEventPhase } from "../events/gameplay-event-phase";
import { GoalScored } from "../events/match-events";
import { attackDirection } from "../formation";
import {
  BallCarried,
  IsBall,
  IsCarrier,
  IsPlayer,
  MatchRandom,
  PlayerRole,
  Position,
  Possession,
  Score,
  TeamSide,
} from "../traits";
import { resetForKickoff, spawnMatch } from "./match-flow";

let world: World;

beforeEach(() => {
  world = createWorld();
  spawnMatch(world);
});

afterEach(() => {
  world.destroy();
});

describe("spawnMatch", () => {
  it("spawns 22 players and one ball", () => {
    expect([...world.query(IsPlayer)]).toHaveLength(22);
    expect([...world.query(IsBall)]).toHaveLength(1);
  });

  it("spawns one goalkeeper per side", () => {
    const goalkeepers = [...world.query(IsPlayer, PlayerRole)].filter(
      (entity) => entity.get(PlayerRole)?.role === "GK",
    );
    expect(goalkeepers).toHaveLength(2);
    expect(new Set(goalkeepers.map((gk) => gk.get(TeamSide)?.side))).toEqual(
      new Set(["home", "away"]),
    );
  });

  it("seeds the match random stream", () => {
    expect(world.has(MatchRandom)).toBe(true);
  });

  it("starts goalless", () => {
    expect(world.get(Score)).toEqual({ home: 0, away: 0 });
  });
});

describe("goal flow", () => {
  it("counts the goal and restarts with the conceding side", () => {
    world.spawn(GoalScored({ side: "home" }));
    gameplayEventPhase(world);
    expect(world.get(Score)).toEqual({ home: 1, away: 0 });
    expect(world.get(Possession)?.side).toBe("away");
    const carriers = [...world.query(IsCarrier)];
    expect(carriers).toHaveLength(1);
    expect(carriers[0]!.get(TeamSide)?.side).toBe("away");
    expect(world.queryFirst(IsBall)!.has(BallCarried)).toBe(true);
    expect([...world.query(IsPlayer)]).toHaveLength(22);
    expect([...world.query(GoalScored)]).toHaveLength(0);
  });

  it("accumulates goals for both sides across restarts", () => {
    world.spawn(GoalScored({ side: "home" }));
    gameplayEventPhase(world);
    world.spawn(GoalScored({ side: "away" }));
    gameplayEventPhase(world);
    world.spawn(GoalScored({ side: "away" }));
    gameplayEventPhase(world);
    expect(world.get(Score)).toEqual({ home: 1, away: 2 });
  });
});

describe("resetForKickoff", () => {
  it("hands possession and the ball to the kicking side", () => {
    resetForKickoff(world, "away");
    expect(world.get(Possession)?.side).toBe("away");
    const carrier = world.queryFirst(IsCarrier)!;
    expect(carrier.get(TeamSide)?.side).toBe("away");
  });

  it("places the kickoff carrier on the center spot with the ball", () => {
    resetForKickoff(world, "away");
    const carrier = world.queryFirst(IsCarrier)!;
    const carrierPosition = carrier.get(Position)!;
    expect(carrierPosition.x).toBe(0);
    expect(carrierPosition.z).toBe(0);
    const ballPosition = world.queryFirst(IsBall)!.get(Position)!;
    expect(ballPosition.x).toBe(0);
    expect(ballPosition.z).toBe(0);
  });

  it("returns every other player to their own half", () => {
    resetForKickoff(world, "home");
    const carrier = world.queryFirst(IsCarrier);
    world
      .query(IsPlayer, Position, TeamSide)
      .readEach(([position, teamSide], entity) => {
        if (entity === carrier) return;
        const ownHalfSign = -attackDirection(teamSide.side);
        expect(Math.sign(position.x)).toBe(ownHalfSign);
      });
  });
});
