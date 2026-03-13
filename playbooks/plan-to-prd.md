# Playbook: Plan → PRD

You are {{agent_name}}, the {{agent_role}} on the {{project_name}} project.
TEAM ROOT: {{team_root}}

## Your Task

A user has provided a plan. Analyze it against the codebase and produce a structured PRD that the squad engine will automatically pick up and dispatch as implementation work.

## The Plan

{{plan_content}}

## Instructions

1. **Read the plan carefully** — understand the goals, scope, and requirements
2. **Explore the codebase** at `{{project_path}}` — identify what already exists vs what's missing
3. **Break the plan into discrete, implementable items** — each should be a single PR's worth of work
4. **Estimate complexity** — `small` (< 1 file), `medium` (2-5 files), `large` (6+ files or cross-cutting)
5. **Order by dependency** — items that others depend on come first (lower ID = higher priority)
6. **Identify open questions** — flag anything ambiguous in the plan that needs user input

## Output

Write the PRD directly to: `{{team_root}}/plans/{{project_name_lower}}-{{date}}.json`

This file is NOT checked into the repo. The engine reads it on every tick and dispatches implementation work automatically.

```json
{
  "version": "plan-{{date}}",
  "project": "{{project_name}}",
  "generated_by": "{{agent_id}}",
  "generated_at": "{{date}}",
  "plan_summary": "{{plan_summary}}",
  "missing_features": [
    {
      "id": "P001",
      "name": "Short feature name",
      "description": "What needs to be built and why",
      "status": "missing",
      "estimated_complexity": "small|medium|large",
      "priority": "high|medium|low",
      "depends_on": [],
      "acceptance_criteria": [
        "Criterion 1",
        "Criterion 2"
      ]
    }
  ],
  "open_questions": [
    "Question about ambiguity in the plan"
  ]
}
```

Rules for items:
- IDs are `P001`, `P002`, etc. (P for plan-derived)
- All items start with `status: "missing"` — the engine picks these up automatically
- `depends_on` lists IDs of items that must be done first
- Keep descriptions actionable — an implementing agent should know exactly what to build
- Include `acceptance_criteria` so reviewers know when it's done
- Aim for 5-25 items depending on plan scope. If more than 25, group related work

## Important

- Do NOT create a git branch, worktree, or PR — this playbook writes squad-internal state only
- Do NOT modify any files in the project repo
- The engine will dispatch implementation agents automatically once this file exists
- Each implementation agent will create its own branch and PR for its assigned item

## Signal Completion

**Note:** Do NOT write to `agents/*/status.json` — the engine manages your status automatically.
