const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const rootDir = __dirname;
const postsDir = path.join(rootDir, "posts");
const readingListDir = path.join(rootDir, "reading-list");
const port = Number(process.env.PORT || 4321);
const averageWordsPerMinute = 220;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function countWordsFromHtml(html) {
  const articleMatch = html.match(/<article[^>]*class="post-article"[^>]*>([\s\S]*?)<\/article>/i);
  const articleHtml = articleMatch ? articleMatch[1] : html;
  const text = articleHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text ? text.split(" ").filter(Boolean).length : 0;
}

function formatReadTime(wordCount) {
  const minutes = Math.max(1, Math.ceil(wordCount / averageWordsPerMinute));
  return `${minutes} phút đọc`;
}

async function readPostCollection() {
  const entries = await fs.readdir(postsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html") && !entry.name.startsWith("_"))
    .map((entry) => entry.name);

  const posts = await Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(postsDir, fileName);
      const raw = await fs.readFile(filePath, "utf8");
      const metaMatch = raw.match(
        /<script\s+id="post-meta"\s+type="application\/json">([\s\S]*?)<\/script>/i
      );

      if (!metaMatch) {
        return null;
      }

      const meta = JSON.parse(metaMatch[1]);
      const wordCount = countWordsFromHtml(raw);
      return {
        ...meta,
        href: `posts/${fileName}`,
        wordCount,
        readTime: formatReadTime(wordCount),
      };
    })
  );

  return posts
    .filter(Boolean)
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
}

async function readReadingListCollection() {
  const entries = await fs.readdir(readingListDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("_"))
    .map((entry) => entry.name);

  const books = await Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(readingListDir, fileName);
      return JSON.parse(await fs.readFile(filePath, "utf8"));
    })
  );

  return books.sort((a, b) => (a.order || 9999) - (b.order || 9999));
}

async function serveStatic(response, requestPath) {
  const normalized = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = path.normalize(decodeURIComponent(normalized)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
    });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname === "/api/posts") {
      return sendJson(response, 200, await readPostCollection());
    }

    if (url.pathname === "/api/reading-list") {
      return sendJson(response, 200, await readReadingListCollection());
    }

    return serveStatic(response, url.pathname);
  } catch (error) {
    return sendJson(response, 500, {
      error: "Server error",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, () => {
  console.log(`Thu Vu Tuu Quan server running at http://localhost:${port}`);
});
