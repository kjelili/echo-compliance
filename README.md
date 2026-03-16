# Echo Compliance

Echo Compliance is a web app MVP for fast construction-site reporting:
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

## Project Structure
- `frontend/` - React UI
- `backend/` - Express API
- `docs/` - requirements and implementation process
- `remotion-demo/` - demo video composition

## Quick Start
1. Install dependencies:
   - `npm run install:all`
2. Start backend:
   - `npm run dev -w backend`
3. Start frontend:
   - `npm run dev -w frontend`
4. Open:
   - frontend: `http://localhost:5173`
   - backend health: `http://localhost:4000/api/health`

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

### Notes for Vercel runtime
- API routes are served via `api/[...all].js`.
- Configure Redis for durable storage:
  - `REDIS_URL` (recommended) e.g. `rediss://default:<password>@redis-17105.c325.us-east-1-4.ec2.cloud.redislabs.com:17105`
  - or `REDIS_PASSWORD` (+ optional `REDIS_ENDPOINT`, `REDIS_USERNAME`)
- Optional frontend API override env var: `VITE_API_BASE` (defaults to `/api` in production and `http://localhost:4000/api` in local dev).

## Notes
- The current AI summarizer is deterministic and local-first.
- The MVP avoids Streamlit and uses a full web stack.
- Uploaded photos are stored in `backend/data/uploads`.
- Logs are persisted in Redis when Redis env vars are present; otherwise the app falls back to `backend/data/logs.json`.
