# TSF Frontend (New)
White-background React app wired to your backend. Tabs:
- **Connect**: checks `/health` and shows backend URL.
- **Data**: pick the database environment (Air Quality Demo), loads targets and states from `/data/{db}` endpoints.
- **Classical Forecast**: start, poll, and download the CSV.
- **Runs**: start and observe the sequential pipeline.

## Configure backend URL
- Prefer: set `VITE_ENGINE_API_URL` in Render (Frontend → Environment).
- Fallback if unset: `https://tsf-forecast-dev-backend.onrender.com`.

## Build locally
```
npm install
npm run dev
# or build
npm run build && npm run preview
```
