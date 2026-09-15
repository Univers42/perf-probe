# perf-probe

`@osionos/perf-probe` — a small browser performance probe: marks and measures, React commit
counters, Event Timing capture, and heap sampling. Zero dependencies.

## Off by default

Every entry point returns early unless the probe is enabled, so leaving calls in production code
costs a boolean check. It is on when either:

- the bundle is a dev build (`import.meta.env.DEV`), or
- `localStorage.setItem('osio:perf', '1')`.

That matters because these helpers are meant to be left *in* the code. A profiler you have to add
before you can measure is a profiler you never use during the incident you actually care about.

## Bounded by construction

Samples land in ring buffers capped at 5000 entries. A long-running session cannot grow the
probe's memory without bound — which is what makes it safe to enable on a real user's tab.

## API

```ts
isPerfEnabled(): boolean

mark(name): void
measure(name, startMark?, endMark?): number | null
timed<T>(name, fn: () => T): T                    // sync and async overloads
getPerfDurations(name): number[]

recordRender(componentName): void
getRenderCount(componentName): number
recordReactCommit(componentName, duration): void
getReactCommitDurations(): number[]

startEventTimingCapture(): void
getEventTimingDurations(): number[]
getEventCountsSnapshot(): Record<string, number>
diffEventCounts(before, after): Record<string, number>

usedJSHeapSize(): number | null                   // null where unsupported
resetPerfMetrics(): void
```

Every browser API it touches is feature-detected, so importing this in a worker, under SSR, or in
a plain node test runner is safe — the calls simply become no-ops.

## Usage

```ts
import { timed, startEventTimingCapture, diffEventCounts, getEventCountsSnapshot }
  from "@osionos/perf-probe";

const parsed = timed("parse-document", () => parse(source));

startEventTimingCapture();
const before = getEventCountsSnapshot();
// …interaction…
const delta = diffEventCounts(before, getEventCountsSnapshot());
```

## Scope

This package is the *measurement* half only. Load generators and synthetic-data seeding are
application concerns and deliberately stay in the host app: they need the app's own stores.

## Development

```sh
make help       # list targets
make check      # typecheck + tests
```
