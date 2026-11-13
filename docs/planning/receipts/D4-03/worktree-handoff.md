# D4-03 roadway constraint test handoff

D4-03 (#62) adds independent dimensional cases and edit sequences in the
operator-assigned `task-62` worktree. Local receipt ID:
`D4-03-20261113-task-62`. No separate controller attempt ID or fencing token
was supplied; this identifier makes no controller activation claim.
The operator assignment is GPT-6.1 Sol with high reasoning. This receipt
records author self-checks, not an independent review.

The branch is `orchestrator/github-issue-62`, based on
`2c7ac57239aa22bfceeb501b2d9dfd14cb853412`. That base is the D4-02 merge
(PR #99), including implementation `344f483`; its solver and D4-01 schema
were inspected and their 44 roadway tests passed before edits. The worker
created no commit and made no Git metadata or controller changes.

## Scope and behavior

The changed paths are:

- `package.json`
- `tests/roadway/constraints.test.ts`
- `tests/fixtures/roadway/constraint-cases.ts`
- `tests/fixtures/roadway/README.md`
- `docs/planning/receipts/D4-03/worktree-handoff.md`

These paths cover the assigned manifest and roadway fixture scopes, the unique
constraint test, fixture documentation and this issue receipt. Shared status,
architecture and planning ledgers remain coordinator-owned. An unrelated
untracked `.orchestrator-temp-Dx0sWp/` appeared during checks and was left alone.

The new `test:roadway` command runs existing schema and solver tests plus 16
new cases with the built-in Node runner. `check` invokes it as well. The
roadway command uses `--test-isolation=none` to work on restricted hosts.
No dependencies or lockfile changes are needed.

Seven fixtures specify literal independently calculated pavement, envelope,
locked, editable and residual totals. They cover four through lanes; two
through lanes plus center turn, bicycles, buffers and sidewalks; mixed feet
and meters; over-allocation; unassigned space; an outside-envelope discrepancy;
and impossible locks. Tests compare diagnostic codes, scopes, band IDs and
signed residuals, and check that input and returned widths remain unchanged.
The project parser accepts every fixture, including dimensionally infeasible
drafts, and all band dimensions retain assumed evidence.

Mutation sequences reject locked edits atomically, unlock and change bicycle,
center-turn and sidewalk widths, expose intermediate infeasibility, balance
explicit companion edits, and restore full original state including locks,
units, evidence and order. Equivalent-unit edits cycle five times without
physical drift; inconsistent unit conversion fails. Literal tolerance cases
check inclusive ±0.01 m and rejected ±0.0101 m residuals without importing the
solver's tolerance as their expected-value source.

The [fixture guide](../../../../tests/fixtures/roadway/README.md) records the
hand calculations and required real dimensional evidence. These are assumed
schematic concepts, with no Maple measurements, engineered design approval,
legal right-of-way assertion or engineering recommendation.

## Verification

Checks ran on Windows with Node `24.22.1` and npm `11.19.1`:

- `npm run test:roadway` passed all 60 tests (44 prerequisite and 16 new).
- `node --test --test-isolation=none --test-reporter=dot tests/core/*.test.mjs tests/project-schema/*.test.mjs tests/roadway/*.test.mjs tests/roadway/*.test.ts tests/research/*.test.mjs`
  passed all 136 tests after removing the deliberate fault probe.
- `node ../task-7/node_modules/typescript/bin/tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --allowImportingTsExtensions --skipLibCheck --typeRoots ../task-7/node_modules/@types tests/roadway/constraints.test.ts tests/fixtures/roadway/constraint-cases.ts`
  passed. An initial NodeNext-mode invocation rejected `import.meta` because
  this root package defaults to CommonJS for TypeScript compilation. The
  passing invocation explicitly checks the ESM syntax that Node detects when
  running the tests. No production compiler settings changed.
- Focused ESLint checks passed for both new TypeScript files using the existing
  adjacent `ESLint` API and `typescript-eslint` recommended configuration, with
  `overrideConfigFile: true`. Root lint excludes test files, so this check
  supplied those rules explicitly rather than reporting ignored files as linted.
- `node scripts/check-docs.mjs` and `git diff --check` passed. A direct content
  audit also checked final newlines and trailing whitespace in the four
  implementation and fixture files, preserving the manifest's line endings.

The full workspace `npm run check` was not run: this worktree has no installed
dependencies. Existing adjacent compiler and lint packages were read without
installing or modifying them. The focused static checks and combined unit
command cover this test-only change. Node emits a module-type autodetection
warning for the new test; execution succeeds. The root package type was left
unchanged to avoid changing other workspace scripts' module behavior.

## Deliberate solver fault

The worker copied the solver to
`tests/fixtures/roadway/.fault-solver.ts` and copied the constraint test to
`tests/roadway/.fault-constraints.test.ts`, redirecting only the copied test's
solver import. The copied solver's pavement input changed from
`bands.filter(b => b.location === 'between-curbs')` to `bands`, incorrectly
including both sidewalks in pavement. The production solver was never edited.

`node --test --test-isolation=none --test-reporter=spec tests/roadway/.fault-constraints.test.ts`
exited 1 with assertion failures: 15 failed, one passed (fixture schema).
The independent arithmetic cases and mutation/tolerance checks detected the
fault. The probe explicitly required a nonzero exit plus assertion output;
an import or host failure alone could not count as successful detection.
Both probe files were removed in a `finally` block, and the combined suite
passed afterward. No fault switch or alternate solver remains in the tests.

The unchanged production solver SHA-256 is
`18ac89b9d1d5552be69a5cceb7ed16e656c5038f1f4541522a7b35db38552b5c`.

## File fingerprints and remaining work

The implementation files have the following SHA-256 values, excluding this
receipt to avoid self-reference:

```text
d51ac9fd8dd7eeda7ed02feaa942184c74ece887cc7b765debc6e6e0995a2a41  package.json
ebdca165a550940055b421d6f5963cf7b9717b1efc6c4c81a6294cbeb1594dbe  tests/fixtures/roadway/README.md
35ac56f76023f73dd614048e63f2e269b4c6eb5ae780135185708e03c3ba7261  tests/fixtures/roadway/constraint-cases.ts
28486ad65728157c8787dd1048b762cdceca801ac07c03637f201959e4bf7025  tests/roadway/constraints.test.ts
```

The proposed implementation manifest hash is
`e60ffea4f16598e8b9d0786f2555965f58d3955db8030ae7334454a931e3a607`.
Its SHA-256 input concatenates each listed path, a null byte, its decimal byte
length, a null byte, then its exact contents, in the listed order. This is
an uncommitted content fingerprint, not a fabricated Git tree or commit.

No scoped acceptance criteria or owner decisions remain. Geometry, segment
interpolation, animation, UI, rendering and real dimensional approval remain
later work. The coordinator should review this change, run integrated checks
in an equipped checkout, and incorporate the verified command, synthetic
coverage and dimensional-evidence limits into shared documentation in the same
PR. This receipt does not release dependent work. D4-06 is the next downstream
consumer of D4-03 after acceptance; its D4-04 and D1-10 dependencies must also
be accepted before dispatch.

