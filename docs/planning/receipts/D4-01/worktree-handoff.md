# D4-01 worktree handoff

- Issue D4-01 (#60), branch `orchestrator/github-issue-60`; no attempt ID was
  provided in the dispatch. Changes are uncommitted. The declared lease is
  `schema-root`; coordinator acceptance and merge remain outstanding.
- The optional roadway collection carries ordered segment ranges and
  cross-sections, explicit dimension evidence, original and normalized units,
  band identities, direction, placement, and locks. Unknown dimensions contain
  no numeric value. The synthetic tests make no Maple Avenue claims.
- `node --test --test-isolation=none tests/roadway/schema.test.mjs
  tests/project-schema/validation.test.mjs`: 37 passed on this Windows host.
  The default isolated test runner failed to spawn subprocesses with `EPERM`.
- Strict TypeScript checking of the shared schema passed using the existing
  TypeScript compiler from the adjacent task-7 worktree. This worktree has no
  installed dependencies; the full workspace check and lint were not run.
- This slice does not implement balancing, transition mappings, an editor,
  geometry-derived station extent, source rights verification, or export.
  A stated extent is checked for internal consistency, not against geometry.

## Proposed coordinator documentation update

Update project-format and roadway-editor to describe the optional D4-01 schema
as a bounded implementation: segment stations are meters within an authored
extent; bands are ordered and identify placement, locks and evidence; known
widths retain original units and normalized meters; unknown widths carry no
number. Document required source references and the distinction between
existing/proposed roles and evidence status. Keep balancing, transition,
rendering, detailed source rights, and geographic extent verification marked
as future work. Update shared implementation status only after acceptance.

The coordinator should integrate the roadway tests into the appropriate test
command and run the full pinned workspace checks in an equipped environment.
Dependent work becomes eligible only after D4-01 is accepted and merged; consult
the execution schedule for the next eligible issue.
