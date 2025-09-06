## v1.6.0 — 2025-09-06
- Run Forecast now starts a **background job** via `/classical/start`.
- Live progress polling via `/classical/status` with a progress bar.
- Shows **Download Classical CSV** when the job is ready (downloads from `/classical/download?job_id=…`).
- Keeps preflight `/classical/probe` message.
