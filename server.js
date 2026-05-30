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

export async function loadCommunity() {
  const raw = await readFile(dataPath, "utf8");
  return JSON.parse(raw);
}

export async function saveCommunity(data) {
  await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

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

export function validateRequest(payload) {
  const name = normalizeText(payload.name);
  const need = normalizeText(payload.need);
  const offer = normalizeText(payload.offer);
  const area = normalizeText(payload.area);

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
      status: "Open"
    }
  };
}

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

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, name: "SkillSwap API" });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/members") {
    const community = await loadCommunity();
    const q = url.searchParams.get("q") || "";
    sendJson(response, 200, { members: filterMembers(community.members, q) });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/requests") {
    const community = await loadCommunity();
    sendJson(response, 200, { requests: community.requests });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/requests") {
    const payload = await parseJsonBody(request);
    const result = validateRequest(payload);

    if (result.error) {
      sendJson(response, 400, { error: result.error });
      return true;
    }

    const community = await loadCommunity();
    community.requests = [result.value, ...community.requests];
    await saveCommunity(community);
    sendJson(response, 201, { request: result.value });
    return true;
  }

  return false;
}

async function serveStatic(request, response, url) {
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    await access(filePath);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream"
  });

  createReadStream(filePath).pipe(response);
}

export function createApp() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const handled = await handleApi(request, response, url);

      if (!handled) {
        await serveStatic(request, response, url);
      }
    } catch (error) {
      sendJson(response, 500, { error: error.message || "Something went wrong." });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3177);
  createApp().listen(port, () => {
    console.log(`SkillSwap running at http://localhost:${port}`);
  });
}
