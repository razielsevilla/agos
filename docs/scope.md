# AGOS — MVP Scope (48-Hour Build)

Referenced by: `tickets.md`, `README.md`. Working checklist derived from the proposal's "Hackathon Deliverable Scope" section (`Proposal V2.pdf`) — use this to catch scope creep mid-sprint.

## In scope — must ship

- [ ] OpenCV-based waterline segmentation POC on recorded/public flood footage, calibrated against a fixed in-frame reference object (AGOS-005 – 008)
- [ ] Fully working **closing-the-loop demo**: flagged street → household risk list (illustrative elevation data) → "mark as flooded/affected" action → post-flood recovery-priority view (AGOS-011 – 020) — this is the centerpiece, protect it above everything else
- [ ] Demo dashboard: flagged street, sample rainfall-fusion risk score, household risk list (AGOS-016 – 018)
- [ ] Mocked alert output — the format/content a barangay DRRMO or resident would receive (AGOS-021)
- [ ] System architecture diagram foregrounding the closing-the-loop mechanic, not just the linear pipeline (AGOS-022)

## Out of scope — explicitly deferred to a CDRRMO-partnered pilot

- [ ] Any integration with live Cabuyao CCTV/bridge camera feeds — requires formal camera-access request and CDRRMO authorization
- [ ] Real CDRRMO/barangay-validated elevation and ground-floor household data — synthetic/illustrative data only for the demo
- [ ] Any measurement of real-world CV accuracy — can only be established against real footage/events during the pilot
- [ ] A trained/learned CV model — the hackathon build is a calibration-method POC, not a trained detector
- [ ] Integration with an actual CDRRMO alert dissemination channel (dashboard, SMS, radio) — the demo shows what an alert would look like, not a live connection
- [ ] Any data-use/privacy agreement covering CCTV footage retention and access — a governance step for the CDRRMO partnership, not a hackathon deliverable

## Non-goals (don't attempt, even if there's spare time)

- Authentication/authorization — not needed for a local demo
- A production-grade database (Postgres/PostGIS) — SQLite is sufficient
- Mobile-responsive design polish — a laptop-driven demo doesn't need it
- Any real PAGASA/rain-gauge API integration — static/sample rainfall input only

## Cut order if time runs short

If the schedule slips, cut in this order — protect the closing-the-loop flow (Phase 2 & 3 core views) at all costs, since it's the deliverable explicitly called out as the centerpiece:

1. **First to cut/simplify:** architecture diagram visual polish (a rough version still satisfies the deliverable), seed data volume (drop to 2 streets / 4 households each), CV packaged-output polish (raw annotated frames are enough, skip the GIF)
2. **Second to cut/simplify:** the optional `GET /streets/{id}/flood-events` endpoint, the mock alert view's visual styling (a plain rendering of the payload is acceptable)
3. **Never cut:** the flagged street view, the household risk list, the mark-as-flooded/affected interaction, and the recovery-record view — together these are the closing-the-loop demo (AGOS-023)

## References

- Full detail: `Proposal V2.pdf`, "Hackathon Deliverable Scope (48-Hour Development Period)"
- Build order and dependencies: `tickets.md`
