---
name: systematic-debugging
description: "Root-cause method and deep references for hard bugs: multi-layer instrumentation, backward call-stack tracing, flaky-test waits, test-polluter bisection, defense in depth. Use when a bug survived a first fix attempt or its cause is still unclear after reproducing it."
---

# Systematic Debugging

No fix without a root cause. A fix for a symptom you can't explain is a guess.

## The four phases

1. **Investigate.** Read the whole error and stack trace. Reproduce it reliably (a failing test is best); if you can't, gather more data instead of guessing. Check recent changes (`git log -p`, `git diff`, new dependencies, config, environment).
2. **Compare.** Find similar code that works. List every difference between the working and broken paths, however small. Read reference implementations completely; don't skim.
3. **Hypothesize.** One hypothesis at a time, stated as "X is the cause because Y". Run the smallest experiment that would falsify it. Change one variable per experiment.
4. **Fix at the source.** Write a failing test, fix where the bad value originates (not where it crashes), and run the test plus the surrounding suite.

**Three failed fixes means stop.** The model of the system is wrong. Report what you know and question the design rather than trying a fourth patch.

## Multi-layer systems

When the failure crosses components (CI → build → deploy, API → service → database), instrument every boundary once before fixing anything: log what enters and leaves each layer and whether env/config made it through. One run shows which layer breaks. Then dig into that layer only.

## References in this folder (open only the one you need)

| File | Use when |
|---|---|
| `root-cause-tracing.md` | The error surfaces deep in the stack; trace the bad value backward to its origin |
| `defense-in-depth.md` | You found the source; add validation at each layer so the whole class of bug can't recur |
| `condition-based-waiting.md` (+ `condition-based-waiting-example.ts`) | Flaky async tests; replace sleeps and timeouts with condition polling |
| `find-polluter.sh` | Some test leaves files or state behind; bisect to find which one |

## Red flags

"Quick fix for now", "just try changing X", several changes at once, proposing fixes before tracing data flow, adding retries or longer timeouts to make a flaky test pass, or "one more attempt" after two failures. Each one means: go back to phase 1.
