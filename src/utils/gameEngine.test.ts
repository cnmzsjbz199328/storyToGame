import { describe, it, expect } from "vitest";
import { evalCondition, applyChanges, initState } from "./gameEngine";
import { GameState, Story } from "../types";

const baseState: GameState = {
  currentNodeId: "start",
  val: 50,
  variables: { trust: 3, route: "north" },
  flags: new Set(["visited_tavern"]),
  unlockedAchievements: [],
  history: [],
  importantFlags: [],
};

// ─── evalCondition ───────────────────────────────────────────────────────────
describe("evalCondition", () => {
  it("returns true for undefined", () => {
    expect(evalCondition(undefined, baseState)).toBe(true);
  });

  it("returns true for 'default'", () => {
    expect(evalCondition("default", baseState)).toBe(true);
  });

  it("val >= / <= / > / < / == / !=", () => {
    expect(evalCondition("val >= 50", baseState)).toBe(true);
    expect(evalCondition("val >= 51", baseState)).toBe(false);
    expect(evalCondition("val <= 50", baseState)).toBe(true);
    expect(evalCondition("val > 49", baseState)).toBe(true);
    expect(evalCondition("val > 50", baseState)).toBe(false);
    expect(evalCondition("val < 51", baseState)).toBe(true);
    expect(evalCondition("val == 50", baseState)).toBe(true);
    expect(evalCondition("val != 50", baseState)).toBe(false);
    expect(evalCondition("val != 99", baseState)).toBe(true);
  });

  it("hasFlag and !hasFlag", () => {
    expect(evalCondition("hasFlag 'visited_tavern'", baseState)).toBe(true);
    expect(evalCondition("hasFlag 'not_here'", baseState)).toBe(false);
    expect(evalCondition("!hasFlag 'visited_tavern'", baseState)).toBe(false);
    expect(evalCondition("!hasFlag 'not_here'", baseState)).toBe(true);
  });

  it("custom numeric variable comparison", () => {
    expect(evalCondition("trust >= 3", baseState)).toBe(true);
    expect(evalCondition("trust >= 4", baseState)).toBe(false);
    expect(evalCondition("trust == 3", baseState)).toBe(true);
  });

  it("string variable comparison", () => {
    expect(evalCondition("route == 'north'", baseState)).toBe(true);
    expect(evalCondition("route == 'south'", baseState)).toBe(false);
  });

  it("returns true on malformed condition (fail-open)", () => {
    expect(evalCondition("???invalid???", baseState)).toBe(true);
  });
});

// ─── applyChanges ────────────────────────────────────────────────────────────
const emptyState: GameState = {
  currentNodeId: "start",
  val: 50,
  variables: {},
  flags: new Set(),
  unlockedAchievements: [],
  history: [],
  importantFlags: [],
};

describe("applyChanges", () => {
  it("returns empty object for undefined changes", () => {
    expect(applyChanges(emptyState, undefined)).toEqual({});
  });

  it("val += n", () => {
    expect(applyChanges(emptyState, { val: 10 }).val).toBe(60);
    expect(applyChanges(emptyState, { val: -10 }).val).toBe(40);
  });

  it("val clamps to 0–100", () => {
    expect(applyChanges({ ...emptyState, val: 95 }, { val: 20 }).val).toBe(100);
    expect(applyChanges({ ...emptyState, val: 5 }, { val: -20 }).val).toBe(0);
  });

  it("valSet overrides val", () => {
    expect(applyChanges(emptyState, { valSet: 30 }).val).toBe(30);
    expect(applyChanges(emptyState, { valSet: 0 }).val).toBe(0);
    expect(applyChanges(emptyState, { valSet: 100 }).val).toBe(100);
  });

  it("addFlag", () => {
    const result = applyChanges(emptyState, { addFlag: "new_flag" });
    expect(result.flags?.has("new_flag")).toBe(true);
  });

  it("addFlags (multiple)", () => {
    const result = applyChanges(emptyState, { addFlags: ["a", "b"] });
    expect(result.flags?.has("a")).toBe(true);
    expect(result.flags?.has("b")).toBe(true);
  });

  it("removeFlag", () => {
    const state = { ...emptyState, flags: new Set(["existing"]) };
    const result = applyChanges(state, { removeFlag: "existing" });
    expect(result.flags?.has("existing")).toBe(false);
  });

  it("unlockAchievement", () => {
    const result = applyChanges(emptyState, { unlockAchievement: "ach_1" });
    expect(result.unlockedAchievements).toContain("ach_1");
  });

  it("no duplicate achievements", () => {
    const state = { ...emptyState, unlockedAchievements: ["ach_1"] };
    const result = applyChanges(state, { unlockAchievement: "ach_1" });
    expect(result.unlockedAchievements?.filter(a => a === "ach_1").length).toBe(1);
  });

  it("set custom variables", () => {
    const result = applyChanges(emptyState, { set: { has_key: true, count: 3 } });
    expect(result.variables).toEqual({ has_key: true, count: 3 });
  });

  it("importantFlag adds to both importantFlags and flags", () => {
    const result = applyChanges(emptyState, { importantFlag: { flag: "key_taken", label: "拾起了钥匙" } });
    expect(result.flags?.has("key_taken")).toBe(true);
    expect(result.importantFlags?.some(f => f.flag === "key_taken")).toBe(true);
  });
});

// ─── initState ───────────────────────────────────────────────────────────────
describe("initState", () => {
  const story: Story = {
    meta: { title: "Test", author: "Tester", initialVariable: 38 },
    startNodeId: "intro",
    variables: { has_key: false },
    nodes: { intro: { segments: [] } },
  };

  it("sets currentNodeId to startNodeId", () => {
    expect(initState(story).currentNodeId).toBe("intro");
  });

  it("uses meta.initialVariable for val", () => {
    expect(initState(story).val).toBe(38);
  });

  it("defaults val to 50 if initialVariable not set", () => {
    const s = { ...story, meta: { ...story.meta, initialVariable: undefined } };
    expect(initState(s).val).toBe(50);
  });

  it("copies initial variables", () => {
    expect(initState(story).variables).toEqual({ has_key: false });
  });

  it("starts with empty flags, achievements, history", () => {
    const state = initState(story);
    expect(state.flags.size).toBe(0);
    expect(state.unlockedAchievements).toEqual([]);
    expect(state.history).toEqual([]);
  });
});
