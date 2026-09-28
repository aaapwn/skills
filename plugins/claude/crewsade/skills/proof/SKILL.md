---
name: proof
description: Rules for telling work that works from work that only looks green — what a comment, report or commit may claim, how to make a test prove something, and how to check a run. Preloaded by the crewsade developer (to write tests and claims) and auditor (to challenge them).
user-invocable: false
---

# Proof

Green means "nothing failed", not "the thing you meant to test ran". Every rule here is a way
that difference has already cost a day. **Nothing counts as done that you did not watch work.**

Both sides of the crew read the same rules:

- **The developer** follows them while writing — every claim proven, every new test shown red
  without its change.
- **The auditor** uses them to challenge what the developer handed over. Each rule is also a
  question: *did this test reach the code? would it fail without the change? does this
  comment state something anyone watched happen?* A rule the work breaks is a `FIX` item,
  with the file and line.

## What you are allowed to claim

Applies to comments, commit messages, reports and whitelists alike.

- **Never write a claim about library, engine, or platform behaviour into a comment without
  proving it.** Run it: hit the service, write a throwaway probe test, read the dependency's
  source. Every "because X does Y" in a comment should be something you watched happen.
- **"Not in the list" is not "does not exist" until you searched the way the system stores
  it.** Catalogues normalise — case folding, aliases, namespaces, plurals, deprecated
  spellings — so a literal search over a dump reports things missing that are right there
  under another spelling. Look it up the way the system resolves it, land the check as a
  test, and only then write the conclusion into a comment, a commit message, or a whitelist.
- **A test name written into a comment is a claim like any other.** "Pinned by
  TestFoo" is load-bearing — it tells the next reader the invariant is guarded.
  Grep for it before you write it; if it does not exist, write the test rather
  than the sentence. A citation to nothing is worse than no citation, because it
  stops people looking.
- **Never guess a value another team owns.** Commit the job or config **disabled**, with a
  `TODO` naming the exact question and who answers it. Something that looks green while doing
  the wrong thing is worse than something visibly switched off.
- **A count taken through a filter counts the filter, not the concept.** Before narrowing to a
  flag, tag or group, sample the rows the narrowing drops and ask who writes that flag, and on
  which path.

## Making a test prove something

Green means "nothing failed", not "the thing you meant to test ran". Every rule here is a way
that distinction has already cost a day.

- **Prove each new test fails without its fix.** Revert the fix, watch it go red, restore it.
  A test that passes either way tests nothing. Three ways this proof lies to you: the build
  breaks or the runner errors out, so nothing ran and you read "no failures" as "no problem"
  — confirm the suite actually executed; version control cannot restore a file that was never
  committed, so copy it aside before you break it — and point the mutation at the *working*
  file, never at the copy, or the restore silently reinstates the mutation; and the repo's
  default test target may exclude the very tests that would have caught you (a short/smoke
  flag, a tag filter, a skipped suite) — read what the target actually runs before believing
  its green.
- **Prove the test reached the thing it tests.** Inputs can die at an earlier guard, a fixture
  can miss the branch, a short-circuit can stop the walk before your case. Assert the
  precondition *inside* the test, next to the case that assumes it, or assert a marker only
  the traced path can produce. A suite that goes green in milliseconds tested nothing.
- **An oracle must not read its answer out of anything that quotes the input.** Error
  messages, echo endpoints and request logs repeat what you sent, so the probe "finds" its own
  canary and reports a result that was never there. Exclude echoed surfaces from what the
  oracle inspects. The measuring tool counts too: an HTTP client that resolves a relative
  redirect against the URL you pointed it at reports *your* host back as the server's
  answer. Read the raw header, not the tool's interpretation of it.
- **Compare one object, not two parses of it.** When a check compares two views of the same
  input, parse once and hand the one result to both sides. Parsing per side gives disjoint
  graphs, so identity comparisons come back empty and the check stays green with the feature
  switched off entirely.
- **When you borrow production code to observe behaviour, borrow the part you are observing,**
  not the part that short-circuits. A walker that stops at the first rejection leaves
  everything after it unobserved, and the harness reports gaps that do not exist.
- **When the question is "prevented" vs "merely not yet", assert over a window.**
  Cleanup that runs asynchronously — a goroutine, a queue, a background reaper —
  has not happened yet at the instant your assertion fires, so a point-in-time
  check passes for the wrong reason and keeps passing when the guard is deleted.
  Watch for the whole interval instead (never/always over a span), or wait for the
  thing to settle and assert after.
- **A threshold assertion needs a margin when the measurement accumulates the
  quantity being tested.** "Deadline is later than the budget" is true by itself
  once any time has passed between reading the clock and setting the deadline — so
  it stays green with the intended headroom removed. Require the gap to have a
  size.
- **A mutation that stays green is evidence about your rationale, not only about
  your test.** When flipping an order, a bound, or a guard changes nothing, the
  stated reason for it may simply be wrong. Go measure why it matters; either you
  find the real reason and fix the comment, or there was none and the code should
  say so.
- **Health-check per item, never in aggregate.** "At least one case/canary/fixture went live"
  hides the one that never did — and its rows count as proof for as long as it exists. Assert
  liveness at the granularity of the thing it certifies, and make a deliberately inert item
  say so in code.
- **A known-failure entry that stops reproducing is not a fix.** Something else in the fixture
  may now reject it earlier. Before deleting an xfail / known-gap entry, change the fixture so
  the other gate cannot be what closed it, and watch it stay closed.
- **A test that pins an *order* must fail both checks it orders.** Input that trips only one
  of them passes whichever way round they run, so it pins nothing while looking like proof.
  Two gates on one route: send a request that is bad for both, then the response names which
  gate ran first.
- **Verify a mutation or a restore by running the test, not by grepping the file.** The same
  string usually appears elsewhere, so both "found" and "not found" lie about whether your
  edit landed. Red/green is the only reliable witness.
- **Measure the outcome, not the input you just set.** Reading back a property proves only
  that your declaration applied; the result can still be invisible for an orthogonal reason
  (size, opacity, clipping elsewhere in the cascade). For UI, take a screenshot and look at
  it. When a framework offers one value through two channels, assume it spends both.
- **A round-trip through one client cannot pin a storage format.** The same library
  normalises on write and on read, so a wrong type, encoding or precision comes back
  identical. Assert on something the store computes itself — a comparison, a predicate, a
  query it evaluates.
- **A normaliser the framework re-applies must be a fixed point.** Validators, resolvers and
  serialisers get run on their own output. Test `f(f(x)) === f(x)`, not only `f(x)`.
- **Code the framework may run twice must survive running twice.** Effects, handlers and
  retries get double-invoked; a step that reads *and* consumes a one-shot value hands the
  second run nothing, which overwrites the first. Separate the read from the consume, and
  test by invoking twice.
- **A test that asserts something is *rejected* is nearly blind to changes in the rejecter.**
  Mutate the checker and the input still mismatches — for a different reason — so it stays
  rejected and the test stays green while pinning far less than its name claims. This bites
  hardest where the test builds its own independent counterpart (its own signer, encoder,
  serialiser), because then *no* one-sided change can ever agree. Mutate to find out; when
  nothing moves, narrow the comment to what the test really pins and say which layer does
  own the claim — a layer that can see the checker's internals.
- **Adding a second test package against a shared external fixture creates a cross-binary
  race, because test runners run packages in parallel.** Everything that was safe while one
  package owned the fixture — truncating a table, recreating a user, dropping and rebuilding
  a policy — now interleaves with another binary mid-assertion. It shows up as a rare failure
  with a misleading message (an auth error, an empty result), not as an obvious collision.
  Take a cross-process lock in every fixture that touches the shared resource, and prove it
  by hammering the conflicting operation from a second process while the suite runs, rather
  than by running both suites a few times and seeing green.
- **Never assert on how much partial output escaped before a failure.** How many rows, lines
  or bytes made it out before an error is a function of buffering and network timing, not of
  the contract — it varies between an isolated run and a full suite. Assert the invariant the
  consumer actually relies on: the terminal record arrived, the completion flag is false, the
  classification is right.
- **When a guard reads ambient state, the test must not be the thing that supplies it.** A fix
  that reads a deadline off a context, a value off a header, or a flag out of the environment
  only works if something on the real path actually sets that state. A test that sets it up
  itself proves the mechanism and nothing about the wiring: it goes green while the guard never
  fires in production. Write one test whose *only* source is the production one, with the test
  forbidden from providing it. When the real value is too far out to wait for, record what
  arrived at the boundary instead of waiting for the effect.
- **Inserting a function directly above another silently re-points the doc comment above it.**
  The comment now documents your new function and the old one has none. Read the seam after
  inserting, not just the diff of what you added.
- **When the repo has an adversarial harness — fuzz corpus, canary sweep, differential test,
  property test — a new guard is not done until it has an entry there.** Running it and
  reading "0 holes" proves nothing when the corpus predates your slice: it is reporting on
  someone else's guards. Add the case, break your guard on purpose, watch it appear. If the
  repo has no such harness, the minimum is one test that actively tries to walk around the
  guard you just wrote.
- **A decision that drops the mechanism which normally enforces an invariant still owes the
  invariant.** Moving a check off an atomic layer (a store constraint, a lock) into
  application code keeps every sequential test green while concurrent requests all succeed.
  Write down which conditions the dropped mechanism covered — concurrency, other writers, bulk
  paths — and test the invariant under exactly those.

## Checking a run

- **Judge a run by its exit code, never by grepped output.**
  `<test cmd> | grep FAIL && git commit` commits a red tree — grep matched the word, returned
  0, and the `&&` fired. Run the suite into a file, then read the exit status.
- **Run the repo's own lint and formatter before staging.** If they rewrite files, stage after
  they run, not before, or your commits spend the review fighting the tooling. An
  auto-fixer can also leave the tree **not compiling** — rewriting an expression into
  one that needs an import it does not add, for instance. Re-run the build and the
  tests after the fixer, not before it.
- **Verify boot and config from a clean environment.** A gitignored env file, a shell export, a
  cached credential — any of them makes a newly-required variable look satisfied. Start the
  thing somewhere that has none of them, and check the exit status, not just the log line.
  Emptying the inherited environment is not that: a runtime that loads an env file from its
  working directory by itself refills it. Disable the file loading too, and confirm by a
  symptom that only the file could cause (a warning, a value) disappearing.
- **When porting a tool from a reference branch, run its `--help` and its error paths,** not
  only its happy path. Usage output, config dumps and debug logs print defaults — a secret
  that reaches one of those surfaces lands in terminals, scrollback and CI logs. The
  reference branch shipping it is not evidence that it is safe.
- **A task-runner entry is a claim.** A script, make target or CI job you add or edit reads
  as a supported way to run the thing. Run it from a clean environment and let what it
  prints set its final form.
- **A code generator that collects things by naming convention gives a guard only
  as strong as the name.** Something that sweeps every function whose name matches a
  prefix into a build pulls in whatever matches, including what belongs to a different binary or
  layer. When the name is the only thing keeping them apart, a collision is what
  makes you notice — and collisions are luck. Assert the outcome instead: the
  dependency tree, the generated file, the linked binary.

## Checking against the criterion

Per-step checks prove each step did what it aimed at, and review reads code; neither observes
the criterion as the user stated it.

- **Walk every acceptance criterion against the running system**, with a checker that did not
  build it: real server responses rather than mocks, every supported screen size, direct API
  calls for rules the UI hides.
- **Re-walk what a fix touched, and measure the neighbours of what you fixed.** A fix that
  makes the target number right can clip the element next to it.
