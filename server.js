import { createServer } from "node:http";
import { access, readFile, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const dataPath = path.join(__dirname, "data", "community.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------
let cache = null;

export async function loadCommunity() {
  if (cache) return cache;
  const raw = await readFile(dataPath, "utf8");
  cache = JSON.parse(raw);
  return cache;
}

export async function saveCommunity(data) {
  cache = data;
  await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function reloadCache() {
  cache = null;
}

// ---------------------------------------------------------------------------
// HTML sanitization
// ---------------------------------------------------------------------------
const htmlEntities = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

export function sanitize(str) {
  return String(str).replace(/[&<>"']/g, (ch) => htmlEntities[ch]);
}

// ---------------------------------------------------------------------------
// Rate limiter — 30 requests per 60 seconds per IP
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

export const rateLimiter = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimiter.get(ip);

  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimiter.set(ip, entry);
    return true;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------
export function normalizeText(value) {
  return String(value || "").trim();
}

export function buildMatchScore(member, query) {
  const search = normalizeText(query).toLowerCase();
  if (!search) return 1;

  const haystack = [
    member.name,
    member.neighborhood,
    member.bio,
    ...(member.offers || []),
    ...(member.wants || [])
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search) ? 2 : 0;
}

export function filterMembers(members, query) {
  return members
    .map((member) => ({
      ...member,
      matchScore: buildMatchScore(member, query)
    }))
    .filter((member) => member.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || b.rating - a.rating || a.distance - b.distance);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export function validateRequest(payload) {
  const name = sanitize(normalizeText(payload.name));
  const need = sanitize(normalizeText(payload.need));
  const offer = sanitize(normalizeText(payload.offer));
  const area = sanitize(normalizeText(payload.area));

  if (!name || !need || !offer || !area) {
    return { error: "Please add your name, what you need, what you can offer, and your area." };
  }

  if ([name, need, offer, area].some((item) => item.length > 80)) {
    return { error: "Please keep each field under 80 characters." };
  }

  return {
    value: {
      id: `req-${crypto.randomUUID().slice(0, 8)}`,
      name,
      need,
      offer,
      area,
      status: "Open",
      createdAt: new Date().toISOString()
    }
  };
}

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------
export function computeStats(community) {
  const members = community.members || [];
  const requests = community.requests || [];

  const totalMembers = members.length;
  const avgRating =
    totalMembers > 0
      ? Math.round((members.reduce((sum, m) => sum + (m.rating || 0), 0) / totalMembers) * 100) / 100
      : 0;
  const totalSwaps = members.reduce((sum, m) => sum + (m.swaps || 0), 0);
  const openRequests = requests.filter((r) => r.status === "Open").length;

  return { totalMembers, avgRating, totalSwaps, openRequests };
}

// ---------------------------------------------------------------------------
// Low-level HTTP helpers
// ---------------------------------------------------------------------------
async function parseJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) {
      throw new Error("Request body is too large.");
    }
  }

  return body ? JSON.parse(body) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
async function handleHealth(_req, _res, _url, _params) {
  return { status: 200, body: { ok: true, name: "SkillSwap API" } };
}

async function handleGetMembers(_req, _res, url, _params) {
  const community = await loadCommunity();
  const q = url.searchParams.get("q") || "";
  return { status: 200, body: { members: filterMembers(community.members, q) } };
}

async function handleGetRequests(_req, _res, _url, _params) {
  const community = await loadCommunity();
  return { status: 200, body: { requests: community.requests } };
}

async function handlePostRequest(request, _res, _url, _params) {
  const payload = await parseJsonBody(request);
  const result = validateRequest(payload);

  if (result.error) {
    return { status: 400, body: { error: result.error } };
  }

  const community = await loadCommunity();
  community.requests = [result.value, ...community.requests];
  await saveCommunity(community);
  return { status: 201, body: { request: result.value } };
}

async function handleDeleteRequest(_req, _res, _url, params) {
  const community = await loadCommunity();
  const idx = community.requests.findIndex((r) => r.id === params.id);

  if (idx === -1) {
    return { status: 404, body: { error: "Request not found." } };
  }

  const removed = community.requests.splice(idx, 1)[0];
  await saveCommunity(community);
  return { status: 200, body: { deleted: removed } };
}

const VALID_STATUSES = ["Open", "Matched", "Completed"];

async function handlePatchRequest(request, _res, _url, params) {
  const payload = await parseJsonBody(request);
  const newStatus = normalizeText(payload.status);

  if (!VALID_STATUSES.includes(newStatus)) {
    return {
      status: 400,
      body: { error: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}` }
    };
  }

  const community = await loadCommunity();
  const target = community.requests.find((r) => r.id === params.id);

  if (!target) {
    return { status: 404, body: { error: "Request not found." } };
  }

  target.status = newStatus;
  await saveCommunity(community);
  return { status: 200, body: { request: target } };
}

async function handleGetStats(_req, _res, _url, _params) {
  const community = await loadCommunity();
  return { status: 200, body: computeStats(community) };
}

// ---------------------------------------------------------------------------
// Route map & matcher
// ---------------------------------------------------------------------------
const routes = {
  "GET /api/health": handleHealth,
  "GET /api/members": handleGetMembers,
  "GET /api/requests": handleGetRequests,
  "POST /api/requests": handlePostRequest,
  "DELETE /api/requests/:id": handleDeleteRequest,
  "PATCH /api/requests/:id": handlePatchRequest,
  "GET /api/stats": handleGetStats
};

function matchRoute(method, pathname) {
  const key = `${method} ${pathname}`;
  if (routes[key]) {
    return { handler: routes[key], params: {} };
  }

  for (const pattern of Object.keys(routes)) {
    if (!pattern.includes(":")) continue;

    const [routeMethod, routePath] = pattern.split(" ");
    if (routeMethod !== method) continue;

    const routeParts = routePath.split("/");
    const urlParts = pathname.split("/");

    if (routeParts.length !== urlParts.length) continue;

    const params = {};
    let matched = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(":")) {
        params[routeParts[i].slice(1)] = decodeURIComponent(urlParts[i]);
      } else if (routeParts[i] !== urlParts[i]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { handler: routes[pattern], params };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ---------------------------------------------------------------------------
// Request logging
// ---------------------------------------------------------------------------
function logRequest(method, pathname, statusCode, startTime) {
  const elapsed = Date.now() - startTime;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  console.log(`[${hh}:${mm}:${ss}] ${method} ${pathname} → ${statusCode} (${elapsed}ms)`);
}

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------
async function serveStatic(request, response, url) {
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return 403;
  }

  try {
    await access(filePath);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return 404;
  }

  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream"
  });

  createReadStream(filePath).pipe(response);
  return 200;
}

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------
export function createApp() {
  return createServer(async (request, response) => {
    const startTime = Date.now();
    let statusCode = 500;

    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      setCorsHeaders(response);

      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        statusCode = 204;
        logRequest(request.method, url.pathname, statusCode, startTime);
        return;
      }

      const ip = request.socket.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) {
        statusCode = 429;
        sendJson(response, 429, { error: "Too many requests. Please try again later." });
        logRequest(request.method, url.pathname, statusCode, startTime);
        return;
      }

      const match = matchRoute(request.method, url.pathname);

      if (match) {
        const result = await match.handler(request, response, url, match.params);
        statusCode = result.status;
        sendJson(response, result.status, result.body);
      } else if (url.pathname.startsWith("/api/")) {
        statusCode = 404;
        sendJson(response, 404, { error: "Endpoint not found." });
      } else {
        statusCode = await serveStatic(request, response, url);
      }
    } catch (error) {
      statusCode = 500;
      sendJson(response, 500, { error: error.message || "Something went wrong." });
    }

    logRequest(request.method, new URL(request.url, `http://${request.headers.host}`).pathname, statusCode, startTime);
  });
}

// ---------------------------------------------------------------------------
// Start when run directly
// ---------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3177);
  loadCommunity().then(() => {
    createApp().listen(port, () => {
      console.log(`SkillSwap running at http://localhost:${port}`);
    });
  });
}
