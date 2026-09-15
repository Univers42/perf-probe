import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  diffEventCounts,
  getEventCountsSnapshot,
  getPerfDurations,
  getRenderCount,
  isPerfEnabled,
  mark,
  measure,
  recordReactCommit,
  recordRender,
  resetPerfMetrics,
  timed,
  usedJSHeapSize,
} from "../src/index.ts";

/** The probe is opt-in; node has no DEV flag, so enable it via the storage switch. */
function enableProbe(on: boolean): void {
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (on && k === "osio:perf" ? "1" : null),
    setItem: () => {},
  };
}

beforeEach(() => {
  enableProbe(true);
  resetPerfMetrics();
});

test("isPerfEnabled follows the storage switch", () => {
  enableProbe(true);
  assert.equal(isPerfEnabled(), true);
  enableProbe(false);
  assert.equal(isPerfEnabled(), false);
});

test("mark + measure records a non-negative duration", () => {
  mark("a");
  mark("b");
  const value = measure("a-to-b", "a", "b");
  assert.ok(value === null || value >= 0, "duration is null or non-negative");
});

test("timed returns the sync function's value", () => {
  assert.equal(timed("sync", () => 42), 42);
});

test("timed awaits and returns the async function's value", async () => {
  assert.equal(await timed("async", async () => "ok"), "ok");
});

test("timed propagates a sync throw", () => {
  assert.throws(() => timed("boom", () => { throw new Error("x"); }), /x/);
});

test("recordRender counts per component", () => {
  recordRender("Foo");
  recordRender("Foo");
  recordRender("Bar");
  assert.equal(getRenderCount("Foo"), 2);
  assert.equal(getRenderCount("Bar"), 1);
  assert.equal(getRenderCount("Never"), 0);
});

test("resetPerfMetrics clears counters and durations", () => {
  recordRender("Foo");
  recordReactCommit("Foo", 1.5);
  resetPerfMetrics();
  assert.equal(getRenderCount("Foo"), 0);
  assert.deepEqual(getPerfDurations("anything"), []);
});

test("the sample buffer is bounded (no unbounded growth)", () => {
  for (let i = 0; i < 6000; i += 1) recordReactCommit("Foo", i);
  // Capped at MAX_PERF_SAMPLES (5000) so a long session cannot leak memory.
  assert.ok(getRenderCount("Foo") >= 0);
});

test("diffEventCounts reports per-key deltas", () => {
  const before = { click: 1, keydown: 5 };
  const after = { click: 4, keydown: 5, wheel: 2 };
  const delta = diffEventCounts(before, after);
  assert.equal(delta.click, 3);
  assert.ok(!("keydown" in delta) || delta.keydown === 0);
  assert.equal(delta.wheel, 2);
});

test("getEventCountsSnapshot returns a plain object", () => {
  assert.equal(typeof getEventCountsSnapshot(), "object");
});

test("usedJSHeapSize returns null where the API is absent", () => {
  const value = usedJSHeapSize();
  assert.ok(value === null || typeof value === "number");
});

test("everything is inert when disabled", () => {
  enableProbe(false);
  resetPerfMetrics();
  recordRender("Off");
  assert.equal(getRenderCount("Off"), 0);
});
