# SkillSwap for Local Communities

SkillSwap is a full-stack MVP for people who need small skills such as Excel help, resume review, basic coding, interview practice, or guitar lessons but cannot afford paid tutors. Instead of money, neighbors exchange useful skills with one another.

## What It Includes

- A responsive frontend for browsing nearby helpers, searching skills, and posting swap requests.
- A Node.js backend with JSON API routes for members, requests, and health checks.
- A small file-backed data store in `data/community.json`.
- Seeded sample community members and open requests.
- Basic tests for search matching and request validation.

## Run Locally

Quick preview without the backend:

```text
public/index.html
```

On Windows, double-click:

```text
start-skillswap.bat
```

It will open the app automatically after the backend is ready.

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
GET  /api/health
GET  /api/members?q=excel
GET  /api/requests
POST /api/requests
```

Example request body:

```json
{
  "name": "Priya S.",
  "need": "Resume review",
  "offer": "Hindi conversation practice",
  "area": "South Delhi"
}
```

## Test

```bash
npm test
```

Or in PowerShell:

```powershell
npm.cmd test
```

## Publish To GitHub

After installing and signing in to GitHub CLI:

```powershell
git add .
git commit -m "Build SkillSwap full-stack MVP"
gh repo create skillswap-local-communities --public --source=. --remote=origin --push
```

## Suggested Next Features

- Login and member profiles.
- Location-based matching using real maps.
- In-app messaging and swap scheduling.
- Reviews, verification badges, and moderation tools.
- Database storage with PostgreSQL, MongoDB, or Firebase.
