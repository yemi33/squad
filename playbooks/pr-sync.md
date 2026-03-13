# PR Status Sync

> Agent: {{agent_name}} ({{agent_role}}) | Automated sync task

## Context

Team root: {{team_root}}

## Task

Check the live status of all active PRs across all projects and update the local tracker files. This is an automated housekeeping task — no code changes, no PRs, no worktrees.

## Projects and Their PRs

{{pr_sync_context}}

## Steps

For each project with active PRs:

1. **Fetch PR status from ADO** using `mcp__azure-ado__repo_get_pull_request_by_id`:
   - Pass the project's `repositoryId` and the PR's numeric ID (extract from `PR-NNNNN` format)
2. **Compare with local tracker** and update these fields:
   - `status`: map ADO status (1=active, 2=abandoned, 3=completed/merged)
   - `reviewStatus`: check `reviewers[].vote` (10=approved, 5=approved-with-suggestions, -5=waiting, -10=rejected, 0=no-vote)
     - Any vote >= 5 → `"approved"`
     - Any vote == -10 → `"changes-requested"`
     - Any vote == -5 → `"waiting"`
     - All votes 0 and at least one reviewer → `"pending"`
   - `mergeStatus`: if ADO status is 3 (completed), set to `"merged"`
   - `buildStatus`: check if `lastMergeCommit` exists (indicates merge is possible)
3. **Write updated tracker** back to the project's `pull-requests.json`

## Output Format

Report a summary of changes:
```
## PR Sync Results
- office-bohemia: 2 PRs checked, 1 updated (PR-4959092: pending → merged)
- OfficeAgent: 0 active PRs
- bebop-desktop: 1 PR checked, no changes
```

## Rules

- Do NOT create any PRs, branches, or commits
- Do NOT modify any code
- Only update `.squad/pull-requests.json` files
- If ADO API returns null/error for a PR, skip it (don't mark as failed)
- Use the exact repositoryId from the project config for each API call
