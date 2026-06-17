import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = normalize(join(process.cwd(), "dist"));
const port = Number(process.env.PORT || 4322);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json"
};

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  const pathname = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
  const target = normalize(join(root, pathname));

  if (!target.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(target);
    response.writeHead(200, { "content-type": types[extname(target)] || "application/octet-stream" });
    response.end(data);
  } catch {
    try {
      const fallback = await readFile(join(root, "404.html"));
      response.writeHead(404, { "content-type": "text/html" });
      response.end(fallback);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving dist at http://127.0.0.1:${port}`);
});
