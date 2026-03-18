# Echo Compliance

Echo Compliance is a local-first web app for fast construction-site reporting where users own their data by default:
- voice or text updates
- AI-structured daily logs
- photo attachments
- searchable history
- PDF export
- copyable email summary
- one-click daily brief sharing
- one-click daily site digest sharing
- action board with owner/due/status tracking
- hard reminder escalation for overdue actions
- shift handover and toolbox talk drafts
- recurring risk insights and quick filters
- compliance pulse score with 48-hour SLA forecast and evidence gap radar
- local device storage (no required backend/database)
- optional user-owned sync file in Google Drive or OneDrive synced folders

## Project Structure
- `frontend/` - React UI
- `backend/` - Express API (optional/legacy deployment mode)
- `docs/` - requirements and implementation process
- `remotion-demo/` - demo video composition

## Quick Start
1. Install dependencies:
   - `npm run install:all`
2. Start frontend:
   - `npm run dev -w frontend`
3. Open:
   - frontend: `http://localhost:5173`

### Local-first mode (default)
- App features run in-browser and persist to local device storage.
- No backend/API/database is required to create logs, actions, insights, and exports.

### Optional cloud-backed file sync (user-owned)
- Use the **Data Ownership** panel in the app.
- Click **Connect Drive File** and choose a JSON file in your local Google Drive or OneDrive synced folder.
- Use **Sync Now** to persist the latest state to your chosen file.
- Use **Export Backup** / **Import Backup** for manual portability.

## Verification Steps
1. Backend smoke test:
   - `npm run test -w backend`
2. Frontend build:
   - `npm run build -w frontend`
3. Backend syntax check:
   - `npm run build -w backend`
4. Full project build:
   - `npm run build`
5. Detailed verification log:
   - `docs/04-build-verification.md`

## Remotion Demo Video
1. Open studio:
   - `npm run dev -w remotion-demo`
2. Render MP4:
   - `npm run render -w remotion-demo`
3. Output file:
   - `remotion-demo/out/demo.mp4`

## Vercel Deployment
1. Ensure `vercel.json` exists in project root (included).
2. Import repo/folder into Vercel.
3. Build settings:
   - Build Command: `npm run build -w frontend`
   - Output Directory: `frontend/dist`
4. Deploy.

### Notes for Vercel runtime (optional backend mode)
- API routes are served via `api/[...all].js`.
- Configure Redis for durable storage:
  - `REDIS_URL` (recommended) e.g. `rediss://default:<password>@redis-17105.c325.us-east-1-4.ec2.cloud.redislabs.com:17105`
  - or `REDIS_PASSWORD` (+ optional `REDIS_ENDPOINT`, `REDIS_USERNAME`)
- Optional frontend API override env var: `VITE_API_BASE` (defaults to `/api` in production and `http://localhost:4000/api` in local dev).

## Notes
- The current AI summarizer is deterministic and local-first.
- The app can operate fully without any external database.
- Backend + Redis remain available for teams that prefer server-managed deployments.
