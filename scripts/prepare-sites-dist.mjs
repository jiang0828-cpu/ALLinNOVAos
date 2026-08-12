import { mkdir, copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const dist = join(root, "dist");
const serverDir = join(dist, "server");
const openaiDir = join(dist, ".openai");

async function collectAssetFiles(dir, routePrefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(dir, entry.name);
    const routePath = `${routePrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await collectAssetFiles(absolutePath, routePath));
      continue;
    }

    if (routePath.startsWith("/server/") || routePath.startsWith("/.openai/")) {
      continue;
    }

    files.push({ absolutePath, routePath });
  }

  return files;
}

function contentTypeFor(path) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}

await mkdir(serverDir, { recursive: true });
await mkdir(openaiDir, { recursive: true });
await copyFile(join(root, ".openai", "hosting.json"), join(openaiDir, "hosting.json"));

const assetEntries = await Promise.all(
  (await collectAssetFiles(dist)).map(async ({ absolutePath, routePath }) => ({
    path: routePath,
    contentType: contentTypeFor(routePath),
    body: (await readFile(absolutePath)).toString("base64"),
  }))
);

const serverEntry = `const assets = ${JSON.stringify(assetEntries)};
const assetMap = new Map(assets.flatMap((asset) => {
  const aliases = [asset.path];
  if (asset.path === "/index.html") aliases.push("/");
  return aliases.map((path) => [path, asset]);
}));

function serveAsset(asset) {
  const body = Uint8Array.from(atob(asset.body), (char) => char.charCodeAt(0));
  return new Response(body, {
    headers: {
      "content-type": asset.contentType,
      "cache-control": asset.path.includes("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const asset = assetMap.get(url.pathname);

    if (asset) {
      return serveAsset(asset);
    }

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (request.method === "GET" && acceptsHtml) {
      return serveAsset(assetMap.get("/index.html"));
    }

    return new Response("Not Found", { status: 404 });
  },
};
`;

await writeFile(join(serverDir, "index.js"), serverEntry);
