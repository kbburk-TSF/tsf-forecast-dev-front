# TSF Frontend v1.3

## Deploy on Render (Static Site)
- Build: `npm install && npm run build`
- Publish directory: `dist`

## Use
1) Choose Database (demo_air_quality).
2) Choose Target Variable (loaded from DB).
3) Choose State Name (from filters).
4) Choose Aggregation (mean/sum).
5) Click **Run Forecast**.

API base is fixed in `src/lib.api.js` (adjust if your backend URL changes).
