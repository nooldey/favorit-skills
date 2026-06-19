---
name: cem-frontend-submodule-branch-flow
description: Use when CEM frontend mono submodules need target branch comparison, uncovered commit analysis, cherry-pick or diff application, or historical version branch merging into target versions with manifest review, conflict-safe execution, and verification.
---

# CEM Frontend Submodule Branch Flow

## Overview

Use this skill for CEM frontend mono repositories whenever work centers on submodule branches. It has two modes: compare/apply package target branches, and merge historical version branches into a target version. Default to analysis and confirmation; never commit or push automatically unless the user explicitly asks and required checkpoints pass.

## Mode Selection

- Use **Compare/Apply** for inputs like `@cem/module-inbox→v4.12.7_zws` or “把这些提交 diff 应用到当前分支”.
- Use **Version Merge** for requests like “把历史版本分支合并到目标版本”, “融合版本分支”, or inputs containing source versions plus a target version.

## Compare/Apply Workflow

Accept lines like `@cem/module-inbox→v4.12.7_zws`, `@cem/module-inbox -> v4.12.7_zws`, or `apps/portal/inbox v4.12.7_zws`.

1. Read repo instructions first.
2. Check root and target submodule status; do not disturb unrelated changes.
3. Resolve package/path with the Node helper `scripts/submoduleBranchFlow.mjs analyze --input-file <file>`. If resolution fails, inspect `.gitmodules` and submodule `package.json` names.
4. Fetch each target branch into `refs/remotes/origin/<branch>`. If the helper cannot write `.git/modules/**/FETCH_HEAD`, run `git -C <path> fetch origin <branch>:refs/remotes/origin/<branch>` directly, then rerun the helper with `--no-fetch`.
5. Compare `HEAD...origin/<branch>` and report `target_not_in_current` (`HEAD..origin/<branch>`) plus `current_not_in_target` (`origin/<branch>..HEAD`).

Quick command:

```bash
node /path/to/skill/scripts/submoduleBranchFlow.mjs analyze --input-file /tmp/submodules.txt --format markdown
```

Apply changes only after the user asks. Require a clean target submodule unless existing changes are the intended staging area. Prefer `git -C <path> cherry-pick --no-commit <oldest> ... <newest>` for full commits; inspect `git show --stat` and `git show --patch` before applying selected commits by description. If equivalent content already exists, report “内容已覆盖但提交未包含” and do not force an empty commit. On conflicts, stop immediately and report conflicted files and recovery options.

## Version Merge Workflow

Use this mode for multi-submodule version branch fusion. Detailed rules and script field meanings live in `references/version_merge_reference.md`; read it before executing this mode.

Hard checkpoints:
1. Run `yarn checkout --env=dev --ver=<目标版本号>` in the monorepo root, then verify `supports/engineering/rspack/publics/versions.json` has the target `version` and non-empty `branches`.
2. Fetch remote version records through `scripts/readVersionLog.mjs`; do not use local fallback if the remote cannot be read.
3. Build the manifest with `scripts/buildMergeManifest.mjs <env> <targetVersion> <sourceVersions> [gitUserName]`.
4. Output the final manifest and stop for user confirmation before any checkout, branch creation, merge, commit, or push.
5. After confirmation, resolve paths only through `bin/utils/packageSubmodules.js` `packageSubmodules`; do not guess directories.
6. For each manifest item, use the target checkout actual `HEAD` when `baselineRef` is empty; do not substitute the source ref as baseline.
7. Create each submodule branch independently with `scripts/createBaseBranch.mjs --cwd <path> --branch <branchName>`, merge with `scripts/mergeSubmoduleTag.mjs --cwd <path> --ref <sourceRef>`, and stop on the first conflict.
8. After local merges finish, run `yarn branches record`.
9. Ask again before pushing; push each submodule branch from its own submodule directory.

Never confuse merge baseline with branch-name base. The new branch name uses `branchNameBaseRef`, while the merge base uses the target checkout or `baselineRef`.

## Verification

Before reporting success, run fresh checks:
- `git -C <path> status --short --branch` before and after each submodule operation.
- `git -C <path> diff --check` and, when staged, `git -C <path> diff --cached --check`.
- Smallest relevant package/root script available; if TypeScript emits existing repo-wide errors, filter for changed paths and report the boundary.
- For version merges, confirm every manifest item is either merged, blocked by conflict, or explicitly skipped by user confirmation.

## Output

For compare/apply, include package, path, current ref/commit, target branch/commit, uncovered counts, applied/skipped commits, changed files, staged state, and verification result.

For version merge, include source versions, target version, manifest rows (`name`, path, `sourceRef`, `baselineRef` or target checkout, `branchNameBaseRef`, `branchName`), confirmation checkpoints, conflict status, and push status.

Always answer in the repository’s required language.
