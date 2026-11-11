# Repository inspection

Contributors can use this record to distinguish the inspected starting point
from the application described in the planning package. The inspection took
place on November 11, 2026, before any planning files were written.

## Observed starting point

| Item | Observed result |
| --- | --- |
| Repository | [DallasUrbanists/storytelling-studio](https://github.com/DallasUrbanists/storytelling-studio) |
| Visibility | Public |
| Default branch setting | `main` |
| Remote contents | GitHub's recursive `main` tree request returned `409: Git Repository is empty.` |
| Remote size | GitHub repository metadata reported `0` |
| Existing issues | The issue search returned no issues |
| Open pull requests | The pull request search returned no open pull requests |
| Branches | The branches collection returned an empty list |
| Rulesets | The repository rulesets collection returned an empty list |
| Automatic merging | Repository metadata reported `allow_auto_merge: false` |
| Local workspace | Empty directory; `git status`, `git remote`, and `git log` reported that it was not a Git repository |
| Existing instructions | No files or root `AGENTS.md` were present in the workspace; no `AGENTS.md` was found in the inspected parent directories |
| Existing application | No source, manifests, lockfile, tests, scripts, database, or runtime assets |
| Existing license file | None; MIT is the owner's requested license decision |

The default branch setting does not establish that a first commit or `main`
reference exists. The publisher must recheck remote state before initializing
the repository after approval; concurrent work must be preserved.

The inspection found no branches or repository rulesets; it did not establish
any future branch-protection rules or required checks.
Agents must read the rules that apply at publication time and must not weaken
them. A disabled automatic-merge setting does not prevent an authorized agent
from merging an eligible pull request through the normal merge operation.

## Local tool observations

The following read-only commands were run in PowerShell from the workspace.
These are tool checks, not application setup instructions.

```powershell
node --version
npm --version
git --version
```

| Tool | Observed result |
| --- | --- |
| Node.js | `v24.22.1` |
| npm | `11.19.1` |
| Git | `2.50.1.windows.1` |
| Python | An executable was found in the installed Python 3.14 directory |
| FFmpeg | No `ffmpeg` command was found on `PATH`; other bundled copies were not investigated |

No application build, browser render, export, dependency installation, or
application test was performed. The tool inventory does not establish that the
planned dependency combination works on this computer.

## Documentation source inspected

The complete 994-line
[Idea Map documentation style guide](https://github.com/DallasUrbanists/idea-map/blob/f9f490e33d29a2acd7ab1ff0d02dc748002a8eb3/docs/contributor-guides/documentation-style-guide.md)
was read. Its content blob is
`b68b509b0e0736698b9b2f0324b5c5f0b18f19d6`.

Idea Map's `LICENSE` is Apache-2.0, and the guide includes attribution to Google
documentation guidance under Creative Commons licenses. The adaptation and
license treatment are documented in the
[documentation attribution record](../contributor-guides/documentation-attribution.md).
Storytelling Studio explicitly separates proposed requirements from implemented
behavior, overriding the source guide's intended-as-current presentation rule.

## Publication boundary

This package is a local draft. Its creation does not authorize a commit, push,
GitHub issue, pull request, repository setting change, or application work.
The owner requested review of the concrete package before publication.

After approval, the publisher must reconcile this record with the actual remote
state and follow the [publication procedure](issue-backlog.md). Application
progress belongs in [implementation status](../implementation-status.md), not
in this historical inspection record.
