# R.A.A.H. — Autonomous Pothole Intelligence System
## Complete Setup Guide

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Docker + Docker Compose | Latest | [docker.com](https://docker.com) |
| Git | Any | [git-scm.com](https://git-scm.com) |

---

## 1. Clone & Setup

```bash
git clone <your-repo-url>
cd R.A.A.H.
```

---

## 2. Configure Environment Variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | JWT signing key (generate a random 64-char string) | ✅ |
| `MAPILLARY_ACCESS_TOKEN` | Get free at [mapillary.com/app/settings](https://www.mapillary.com/app/settings) | Optional |
| `AI_MODEL_ENABLED` | Set to `true` when your model is ready | Optional |
| `AI_MODEL_URL` | URL of your YOLO model endpoint | Optional |

All other variables have working defaults for Docker Compose.

---

## 3. Start with Docker Compose (Recommended)

```bash
# From the project root (where docker-compose.yml is)
docker-compose up --build
```

This starts:
- **PostgreSQL 15 + PostGIS** on port 5432
- **Redis 7** on port 6379
- **FastAPI backend** on port 8000
- **Celery worker** (background tasks)
- **Celery beat** (scheduler for auto-escalation + PVI refresh)

Wait for: `✅ R.A.A.H. Backend started` in logs.

---

## 4. Create Admin User

After the backend is running:

```bash
# Enter the backend container
docker-compose exec backend python create_admin.py \
  --email admin@raah.gov.in \
  --password yourpassword \
  --name "System Admin" \
  --role admin
```

Or for superadmin (can change user roles):
```bash
docker-compose exec backend python create_admin.py \
  --email superadmin@raah.gov.in \
  --password yourpassword \
  --name "Super Admin" \
  --role superadmin
```

### Without Docker (local setup):
```bash
cd backend
pip install -r requirements.txt
python create_admin.py --email admin@raah.gov.in --password secret --role admin
```

---

## 5. Start Frontend

```bash
cd R.A.A.H-Frontend
npm install
npm run dev
```

Visit: **http://localhost:5173**

---

## 6. Test the System

1. Open **http://localhost:5173**
2. Click **Launch Platform** → **Login**
3. Go to **Signup** tab → create a test citizen account
4. Navigate to **Live Monitoring**
5. Click the scanner area → upload any road photo
6. Watch detection results appear in real-time
7. Check **Map** to see the pothole marker appear on OpenStreetMap
8. Check **Complaints** → "Active Tickets" to see the auto-filed complaint

**Admin flow:**
1. Go back to Login → **Admin** tab
2. Sign in with admin credentials (created in Step 4)
3. Navigate to Complaints → change status to "pending" or "resolved"

---

## 7. Verify API Health

```bash
curl http://localhost:8000/
# {"status":"online","system":"R.A.A.H. ...","ai_model_enabled":false}

curl http://localhost:8000/api/analytics/stats
# Returns real-time DB stats
```

**Interactive API docs:** http://localhost:8000/docs

---

## 8. Adding the AI Model

When your YOLO model is ready:

1. Deploy your model as an HTTP API:
   ```
   POST /detect-pothole
   Input: multipart/form-data with field "file" (image/video)
   Output: {"potholes": [{"bbox": [x,y,w,h], "confidence": 0.92, "severity": "medium"}]}
   ```

2. Update `backend/.env`:
   ```
   AI_MODEL_ENABLED=true
   AI_MODEL_URL=http://your-model-host:8001/detect-pothole
   ```

3. Restart the backend:
   ```bash
   docker-compose restart backend worker
   ```

Only one file handles the model integration: `backend/ai_service/model.py`

---

## 9. PVI Predictions

Initial predictions are loaded on first map load. To manually refresh:
```bash
curl -X POST http://localhost:8000/api/predictions/refresh
```

Predictions auto-refresh every 6 hours via Celery Beat.

---

## 10. Deploy to Production

### Backend (VPS / Cloud)

1. Set up a server with PostgreSQL+PostGIS and Redis
2. Copy `backend/.env` with production values (strong SECRET_KEY, real DB credentials)
3. Run:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

### Frontend

```bash
cd R.A.A.H-Frontend
VITE_API_URL=https://your-backend-domain.com npm run build
# Upload dist/ to Vercel / Netlify / Nginx
```

### Create `.env.local` in frontend:
```
VITE_API_URL=https://your-api-domain.com
```

---

## 11. Database Management

```bash
# Connect to DB
docker-compose exec db psql -U raah_user -d raah_db

# View potholes
SELECT id, road_name, severity, status, created_at FROM potholes ORDER BY created_at DESC LIMIT 10;

# View complaints
SELECT complaint_number, status, agency, number_of_reports FROM complaints;

# Check users
SELECT id, name, email, role FROM users;
```

---

## 12. RBAC Reference

| Role | Register | Upload | View Map | Admin Dashboard | Change Roles |
|------|----------|--------|----------|-----------------|--------------|
| **citizen** | Self | ✅ | ✅ | ❌ (403) | ❌ |
| **admin** | Via script | ✅ | ✅ | ✅ | ❌ |
| **superadmin** | Via script | ✅ | ✅ | ✅ | ✅ |

> Superadmin is the only role that can promote a citizen to admin.

---

## 13. Troubleshooting

| Problem | Fix |
|---------|-----|
| `connection refused 5432` | Wait for DB to fully start, or run `docker-compose up db redis` first |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` from `backend/` |
| Map shows blank | Check browser console for Leaflet script load errors; ensure internet access |
| Upload fails with 400 | File must be image (jpg/png/webp) or video (mp4/mov), max 50MB |
| EXIF location not found | App will ask user to drop pin on map (expected behavior) |
| No potholes on map | Detection stub has ~15% chance of returning 0 potholes — retry with another image |

---

*R.A.A.H. — The road does not report itself.*
