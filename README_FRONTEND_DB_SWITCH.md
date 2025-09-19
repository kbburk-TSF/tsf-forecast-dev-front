# Front-End DB Switch (via Backend API URL)

Your front end does **not** connect to Neon directly. To use the new database(s), it must call the **backend** that you just configured.
Update the front end to point at the backend base URL. Two common setups are included below.

## 1) Vite/React
Create or update `.env.production` (and optionally `.env.development`) with:
```
VITE_ENGINE_API_URL=https://tsf-forecast-dev-backend.onrender.com
```
Use it in code via `import.meta.env.VITE_ENGINE_API_URL`.

## 2) Next.js / CRA
Create or update `.env.production` with:
```
NEXT_PUBLIC_ENGINE_API_URL=https://tsf-forecast-dev-backend.onrender.com
```
Use it in code via `process.env.NEXT_PUBLIC_ENGINE_API_URL`.

---

## Drop-in API client
Place `src/api/pipeline.ts` into your project and import its functions.
It reads whichever env var your framework exposes.

### Functions
- `startRun(forecastId: string)` → POST `/pipeline/run`
- `getStatus(runId: string)` → GET `/pipeline/status?run_id=...`
- `retryPhase(runId: string, phase: string)` → POST `/pipeline/retry-phase`

No other changes are required to “connect to the new database” from the front end; pointing to the backend is the only required step.
