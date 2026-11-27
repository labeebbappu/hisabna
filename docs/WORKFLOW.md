# Hisabna Workflow and Working Agreement

Status: draft. Defaults chosen by Claude on 2026-11-27; edit freely.

## 1. Branches

| Branch    | Purpose                                              | Who writes to it                  |
|-----------|------------------------------------------------------|-----------------------------------|
| `main`    | Production. Every commit is releasable. Tagged `vX.Y.Z`. | PR from `staging` (or a hotfix) only |
| `staging` | Release candidate. Deployed to the staging environment and tested. | PR from `dev` only      |
| `dev`     | Integration. The latest merged work.                  | PR from task branches only        |
| `type/short-name` | One task. Short-lived. Created from `dev`.    | The author                        |

`type` is one of `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.
Example: `feat/split-percent`.

**No direct commits or pushes to `dev`, `staging` or `main`.** Not even for
"tiny" changes. This is enforced on GitHub (section 6), not by goodwill.

## 2. Doing a task

1. Create a worktree from the latest `dev`. One task, one worktree, one branch:
   ```
   git fetch origin
   git worktree add ../hisabna-worktrees/feat-split-percent -b feat/split-percent origin/dev
   cd ../hisabna-worktrees/feat-split-percent && pnpm install
   ```
2. Work with small commits. Test first where there is logic (money, ledger, splits).
3. Before opening a PR, run `pnpm lint && pnpm typecheck && pnpm test`.
4. Rebase on `origin/dev` if it moved, then push the branch and open a PR **into `dev`**.
5. Merge when CI is green and the review is done (section 4). Delete the branch.
6. Remove the worktree: `git worktree remove ../hisabna-worktrees/feat-split-percent`.

## 3. Commits

- Conventional Commits: `feat(ledger): equal split with remainder rules`.
- Every commit is signed off (`git commit -s`), per `CONTRIBUTING.md` (DCO).
- Update `docs/TRACKING.md` in the same PR as the task it describes.

## 4. Pull requests

- Target `dev`. Title follows the commit style. Description says what and why, and how it was tested.
- One task per PR. Keep it reviewable.
- Required: CI passes (`lint`, `typecheck`, `test`), all conversations resolved, branch up to date with `dev`.
- Review: while the team is one person, the author self-reviews with `/code-review` and
  reads the diff on GitHub before merging. Once there is a second maintainer, require
  1 approval (a one-line setting change).
- Merge method into `dev`: **squash**. The squash message must keep the `Signed-off-by` line.

## 5. Promotion and releases

- `dev` to `staging`: PR, **merge commit** (not squash, so the branches stay in sync). Do it when
  `dev` has a coherent set of finished work. Verify on the staging environment.
- `staging` to `main`: PR, merge commit, then tag `vX.Y.Z` on `main`.
- Only `staging` to `main` is a release. Nothing reaches `main` without having sat on `staging`.

### Hotfixes
Branch `fix/<name>` from `main`, PR into `main`, tag a patch release, then open PRs to
merge `main` back into `staging` and `dev` so they do not drift.

## 6. Enforcement (GitHub settings)

Set as repository rulesets on `main`, `staging` and `dev`:
- Require a pull request before merging (0 approvals for now).
- Require status check `ci` to pass, and the branch to be up to date.
- Block force pushes and deletions.
- Restrict `staging` to PRs from `dev`, and `main` to PRs from `staging` or `fix/*` (by convention;
  GitHub cannot restrict the source branch natively).
- Include administrators, so the rule applies to the owner too.

Follow-ups to the CI setup (not done yet):
- Trigger CI on `pull_request` and on `push` to `dev`/`staging`/`main` only, so task branches are not built twice.
- Add a DCO check so unsigned commits fail the PR.

## 7. Working agreement for Claude (and any agent)

- Never commit, push or force-push to `dev`, `staging` or `main`.
- Always work in a task worktree on a task branch created from `origin/dev`.
- Open PRs against `dev` only. Never open a PR to `staging` or `main` unless asked.
- Never merge a PR unless explicitly told to.
- Sign off every commit. Do not skip hooks or CI.
- Run lint, typecheck and test before saying work is done, and report the real result.
- Pushing, opening PRs, and changing GitHub settings are outward-facing: confirm first unless
  the task already says to do it.
- If this document and a request conflict, stop and ask.
