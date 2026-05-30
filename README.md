# SkillSwap for Local Communities

SkillSwap is a full-stack web app for people who need small skills — Excel help, resume review, basic coding, interview practice, guitar lessons — but cannot afford paid tutors. Instead of money, neighbors exchange useful skills with one another.

## ✨ Features

- **Premium dark theme** with 3D glassmorphism cards, neon glows, and floating particle effects.
- **3D tilt interaction** on member cards that track mouse movement.
- **Animated UI** with scroll-triggered fade-ins, gradient-shift buttons, and pulsing avatar rings.
- **Debounced search** for responsive skill matching.
- **Toast notifications** for form submissions and errors.
- **8 seeded community members** with trust badges and diverse skills.
- **Offline fallback** — the app works even without the backend running.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend**: Node.js (built-in modules only, zero dependencies)
- **Data**: File-backed JSON store (`data/community.json`)
- **Fonts**: Google Fonts (Inter + Outfit)

## Run Locally

Quick preview without the backend:

```text
Open public/index.html in your browser
```

On Windows, double-click:

```text
start-skillswap.bat
```

Or run:

```bash
npm start
```

Then open:

```text
http://localhost:3177
```

If PowerShell blocks `npm`, run:

```powershell
npm.cmd start
```

## API Routes

```text
GET    /api/health             → Health check
GET    /api/members?q=excel    → Search members by skill/name/area
GET    /api/requests           → List all swap requests
POST   /api/requests           → Create a new swap request
DELETE /api/requests/:id       → Remove a request by ID
PATCH  /api/requests/:id       → Update request status (Open/Matched/Completed)
GET    /api/stats              → Community statistics
```

### Example POST body:

```json
{
  "name": "Priya S.",
  "need": "Resume review",
  "offer": "Hindi conversation practice",
  "area": "South Delhi"
}
```

### Example PATCH body:

```json
{
  "status": "Matched"
}
```

### Example Stats response:

```json
{
  "totalMembers": 8,
  "avgRating": 4.77,
  "totalSwaps": 118,
  "openRequests": 2
}
```

## Backend Features

- **Route map architecture** — clean handler dispatch instead of if/else chains.
- **In-memory caching** — data loaded once, updated on writes.
- **HTML sanitization** — user inputs are entity-escaped to prevent XSS.
- **Rate limiting** — 30 requests per minute per IP (returns 429).
- **CORS headers** — enabled for all origins.
- **Request logging** — `[HH:MM:SS] METHOD /path → STATUS (Xms)`.

## Test

```bash
npm test
```

Or in PowerShell:

```powershell
npm.cmd test
```

## Publish To GitHub

```powershell
git add .
git commit -m "Dark theme 3D redesign"
git push origin main
```

## Suggested Next Features

- Login and member profiles with authentication.
- Location-based matching using real maps.
- In-app messaging and swap scheduling.
- Reviews, verification badges, and moderation tools.
- Database storage with PostgreSQL, MongoDB, or Firebase.
