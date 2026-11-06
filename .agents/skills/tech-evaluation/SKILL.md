---
name: tech-evaluation
description: "Compare libraries, frameworks, or services and recommend one with evidence: fit, maintenance, license, security, size, cost, lock-in. Use for 'X vs Y', 'what should we use for…', or before adding a new dependency."
---

# Tech Evaluation

Pick the option that fits *this* project with the least long-term cost, and show the evidence. Use `web-research` for every fact that can go stale.

## 1. Frame it

- The job to be done in one sentence, plus hard constraints: runtime/framework versions, license policy, hosting, budget, data residency, team familiarity.
- **Is "nothing new" an option?** Check whether the repo, the platform, or an existing dependency already does it. That option always goes on the list.
- 2–4 real candidates. Not strawmen.

## 2. Gather evidence per candidate

| Criterion | What to check |
|---|---|
| Fit | Works with the installed versions (peer deps, runtime, ESM/CJS, SSR/edge)? Matches existing patterns? |
| Maintenance | Last release date, release cadence, open vs closed issues, maintainer count, bus factor. |
| Adoption | Download trend, notable users. Popularity is a tiebreaker, not a reason. |
| License | SPDX id; flag copyleft (GPL/AGPL) and "source-available" licenses. |
| Security | Known advisories (`npm audit`, GitHub advisories, OSV), install scripts, transitive dependency count. |
| Size / performance | Bundle size for frontend (bundlephobia / pkg-size), cold start, benchmarks from a neutral source. |
| Docs & types | First-party TypeScript types or stubs, docs for the version you would install. |
| Cost & lock-in | Pricing at expected volume, free-tier limits, data export, how hard it is to swap out later. |

Record dates and versions for every number. Mark anything you could not verify as unverified.

## 3. Try the finalist when it's cheap

A 10-minute spike (install, the one call you need, typecheck, build) beats an afternoon of reading. Throw the spike away afterwards. Never add a dependency to the real project only to evaluate it.

## 4. Recommend

```
Decision: <option> for <job>
Why: <2-3 reasons tied to the constraints>
Compared: | option | fit | maintenance | license | size/perf | cost | notes |
Risks: <what could go wrong and the exit path>
Sources: <links with dates>
```

If the choice is significant or hard to reverse, suggest an ADR (`docs/adr/NNNN-title.md`) and hand it to the `architect` agent.
