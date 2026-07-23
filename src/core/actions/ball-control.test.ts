import { createWorld, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PossessionChanged } from "../events/match-events";
import { gameplayEventPhase } from "../events/gameplay-event-phase";
import {
  BallCarried,
  BallFlight,
  BallInFlight,
  BallLoose,
  CarriedBy,
  FlightResolution,
  IsBall,
  IsCarrier,
  LastPassFrom,
  Possession,
  TeamSide,
} from "../traits";
import {
  claimBall,
  giveBallTo,
  giveBallToNearestOfSide,
  releaseBallLoose,
} from "./ball-control";
import { kickPass } from "./kicking";
import { spawnMatch } from "./match-flow";

let world: World;

beforeEach(() => {
  world = createWorld();
  spawnMatch(world);
});

afterEach(() => {
  world.destroy();
});

function carrier() {
  return world.queryFirst(IsCarrier);
}

function ball() {
  return world.queryFirst(IsBall)!;
}

describe("spawnMatch kickoff possession", () => {
  it("gives the ball to exactly one home player", () => {
    const carriers = [...world.query(IsCarrier)];
    expect(carriers).toHaveLength(1);
    expect(carriers[0].get(TeamSide)?.side).toBe("home");
  });

  it("marks the ball as carried by the carrier", () => {
    expect(ball().has(BallCarried)).toBe(true);
    expect(ball().has(BallInFlight)).toBe(false);
    expect(ball().has(BallLoose)).toBe(false);
    expect(ball().targetFor(CarriedBy)).toBe(carrier());
  });

  it("does not emit a possession event for the kickoff side", () => {
    expect([...world.query(PossessionChanged)]).toHaveLength(0);
  });
});

describe("claimBall", () => {
  it("moves the carrier tag when the other team claims", () => {
    const previousCarrier = carrier()!;
    giveBallToNearestOfSide(world, "away");
    const nextCarrier = carrier()!;
    expect(nextCarrier).not.toBe(previousCarrier);
    expect(previousCarrier.has(IsCarrier)).toBe(false);
    expect(nextCarrier.get(TeamSide)?.side).toBe("away");
    expect(ball().targetFor(CarriedBy)).toBe(nextCarrier);
  });

  it("emits a possession event only when the side changes", () => {
    giveBallToNearestOfSide(world, "away");
    expect([...world.query(PossessionChanged)]).toHaveLength(1);
    gameplayEventPhase(world);
    giveBallToNearestOfSide(world, "away");
    expect([...world.query(PossessionChanged)]).toHaveLength(0);
  });

  it("is a no-op when the carrier reclaims", () => {
    const currentCarrier = carrier()!;
    claimBall(world, currentCarrier);
    expect(carrier()).toBe(currentCarrier);
    expect([...world.query(PossessionChanged)]).toHaveLength(0);
  });

  it("clears stale pass memory on claim", () => {
    const previousCarrier = carrier()!;
    const claimant = [...world.query(TeamSide)].find(
      (player) =>
        player !== previousCarrier && player.get(TeamSide)?.side === "home",
    )!;
    claimant.add(LastPassFrom(previousCarrier));
    claimBall(world, claimant);
    expect(claimant.targetFor(LastPassFrom)).toBeUndefined();
  });
});

describe("gameplayEventPhase", () => {
  it("flips possession and destroys the event", () => {
    giveBallToNearestOfSide(world, "away");
    gameplayEventPhase(world);
    expect(world.get(Possession)?.side).toBe("away");
    expect([...world.query(PossessionChanged)]).toHaveLength(0);
  });
});

describe("releaseBallLoose", () => {
  it("clears interrupted flight state", () => {
    const passer = carrier()!;
    kickPass(world, passer, { x: 20, z: 0 }, "ground");
    releaseBallLoose(world, { vx: 1, vz: 0 });
    expect(ball().has(BallFlight)).toBe(false);
    expect(ball().has(FlightResolution)).toBe(false);
    expect(ball().has(BallLoose)).toBe(true);
  });
});

describe("giveBallTo", () => {
  it("teleports the ball to the receiving player", () => {
    const receiver = [...world.query(IsCarrier)][0];
    giveBallTo(world, receiver);
    expect(ball().targetFor(CarriedBy)).toBe(receiver);
  });
});
