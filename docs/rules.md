# AGOS — Team Workflow Rules

Referenced by: `tickets.md`, `README.md`. Git branching and commit conventions for the team — keep this updated if the workflow changes.

---

## Branching model

Three long-lived branches:

- **`main`** — phase-complete, demo-stable code only.
- **`develop`** — integration branch. Accumulates completed tickets within the current phase.
- **`feature`** — shared working branch. Both team members commit here directly while working tickets.

### Flow

1. Team members work tickets from `tickets.md` directly on `feature`.
2. On completing **one ticket**, open a PR: `feature → develop`.
3. The reviewer (Raziel) reviews and merges each ticket PR into `develop`.
4. Once every ticket in the current phase (per `tickets.md`'s Phase 0–4 grouping) is merged into `develop`, open a PR: `develop → main` to mark that phase complete.
5. Repeat per phase until all tickets are done.

---

## Commit message format

```
<type>(AGOS-XXX): <imperative summary>
```

**`type`** maps to the ticket's `Type` column in `tickets.md`:

| Ticket Type | Commit type |
|---|---|
| Setup | `chore` |
| Data | `feat` |
| Backend | `feat` |
| Frontend | `feat` |
| CV/ML | `feat` |
| Docs | `docs` |
| Integration | `feat` or `test` |
| QA | `test` or `fix` |
| Bug fix (any track) | `fix` |

**Examples:**
```
chore(AGOS-001): scaffold backend/frontend/cv/data repo structure
feat(AGOS-011): add GET /streets endpoint with fused risk score
feat(AGOS-013): add PATCH /households/{id} to mark affected status
feat(AGOS-018): render ranked household risk list view
fix(AGOS-019): reflect marked-affected state immediately in UI
docs(AGOS-022): add closing-the-loop architecture diagram
test(AGOS-023): verify end-to-end closing-the-loop flow
```

**Rules:**
- Imperative mood ("add", not "added"/"adds"), lowercase, no trailing period, ideally ≤72 chars.
- One ticket per commit where practical — keeps `git log --grep AGOS-013` and `git blame` mapped cleanly back to `tickets.md`.
- If a commit needs more explanation than the summary line allows, add a body explaining *why*, not what — the diff already shows what.
- PR titles follow the same `<type>(AGOS-XXX): <summary>` format as commits, so the PR list and commit history read identically.
