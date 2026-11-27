# Hisabna

Read `docs/HANDOFF.md` (product and scope) and `docs/TRACKING.md` (progress) first.

## Git workflow (see `docs/WORKFLOW.md` for the full agreement)

- Branches: `main` (production) <- `staging` (release candidate) <- `dev` (integration) <- task branches.
- Never commit or push directly to `dev`, `staging` or `main`.
- Do each task in its own worktree and branch (`type/short-name`) created from `origin/dev`.
- Open PRs into `dev` only. Never merge a PR unless asked. Never PR to `staging`/`main` unless asked.
- Conventional Commits, and sign off every commit (`git commit -s`).
- Before claiming done: `pnpm lint && pnpm typecheck && pnpm test`.
- Update `docs/TRACKING.md` in the same PR as the task.
