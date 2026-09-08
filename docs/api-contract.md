# AGOS — API Contract (Hackathon MVP)

Referenced by: `tickets.md` (AGOS-003), `data-model.md`, `demo-script.md`

- **Base URL (local):** `http://localhost:8000/api`
- **Format:** JSON in, JSON out
- **Auth:** none for the hackathon build. A real deployment would need CDRRMO-scoped auth — deferred to the pilot phase (see `scope.md`).
- **Error shape:** `{ "error": "<message>" }` with a non-2xx status code (`404` for missing IDs, `400` for bad request bodies).

Entity shapes referenced below (`Street`, `Household`, `FloodEvent`) are defined in `data-model.md`.

---

## `GET /streets`

Flagged/all streets summary — powers the street list view (AGOS-017).

**Response `200`**
```json
[
  {
    "id": "STR-001",
    "name": "Purok 3, Brgy. Banay-Banay",
    "barangay": "Banay-Banay",
    "status": "flagged",
    "risk_score": 72,
    "last_updated": "2026-09-07T14:32:00+08:00"
  }
]
```

**Used by:** AGOS-011 (backend), AGOS-017 (frontend)

---

## `GET /streets/{street_id}`

Full street detail, including the evacuation route and latest CV reading.

**Response `200`** — full `Street` object (see `data-model.md`)
**Response `404`** — unknown `street_id`

**Used by:** AGOS-011, AGOS-017

---

## `GET /streets/{street_id}/households`

Ranked household risk list for a street — powers the household list view (AGOS-018).

**Response `200`**
```json
[
  {
    "id": "HH-014",
    "street_id": "STR-001",
    "address_label": "Blk 4 Lot 12",
    "elevation_m": 0.3,
    "ground_floor": true,
    "risk_score": 88,
    "risk_rank": 1,
    "predicted_at_risk": true,
    "affected_status": "unmarked",
    "marked_at": null
  }
]
```
Sorted ascending by `risk_rank` (1 first).

**Used by:** AGOS-012 (backend), AGOS-018 (frontend)

---

## `PATCH /households/{household_id}`

Marks a household as flooded/affected (or dry) during a simulated event — the interaction that starts closing the loop (AGOS-019).

**Request body**
```json
{ "affected_status": "confirmed_affected" }
```
Allowed values: `"confirmed_affected"` | `"confirmed_dry"`.

**Response `200`** — the updated `Household` object, with `marked_at` set to the current timestamp
**Response `404`** — unknown `household_id`
**Response `400`** — invalid `affected_status` value

**Used by:** AGOS-013 (backend), AGOS-019 (frontend)

---

## `GET /streets/{street_id}/recovery-record`

The post-flood recovery-priority record — the same household list, now annotated with what actually happened (AGOS-020, the closing-the-loop centerpiece).

**Response `200`**
```json
[
  {
    "id": "HH-014",
    "address_label": "Blk 4 Lot 12",
    "risk_rank": 1,
    "predicted_at_risk": true,
    "affected_status": "confirmed_affected",
    "marked_at": "2026-09-07T15:10:00+08:00"
  }
]
```
Sorted so households that were **both predicted at-risk and confirmed affected** appear first — this is the CDRRMO's relief-prioritization starting point.

**Used by:** AGOS-014 (backend), AGOS-020 (frontend)

---

## `GET /streets/{street_id}/alert`

Composed mock alert payload — what a barangay DRRMO or resident would receive (AGOS-021).

**Response `200`**
```json
{
  "street": { "id": "STR-001", "name": "Purok 3, Brgy. Banay-Banay", "status": "flagged", "risk_score": 72 },
  "household_list": [ { "id": "HH-014", "address_label": "Blk 4 Lot 12", "risk_rank": 1 } ],
  "suggested_evacuation_route": "Proceed via Purok 3 Main Rd to the covered court on higher ground.",
  "generated_at": "2026-09-07T14:35:00+08:00"
}
```

**Used by:** AGOS-015 (backend), AGOS-021 (frontend)

---

## `GET /streets/{street_id}/flood-events` (optional/stretch)

Rainfall/risk-fusion sample history for a street — only needed if there's time to show the fusion input, not just its output.

**Response `200`** — array of `FloodEvent` objects (see `data-model.md`)

**Used by:** optional extension of AGOS-011
