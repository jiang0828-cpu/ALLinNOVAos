import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const dist = join(root, "dist");
const serverDir = join(dist, "server");
const openaiDir = join(dist, ".openai");

const serverEntry = `export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);

    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (request.method === "GET" && acceptsHtml) {
      const url = new URL(request.url);
      url.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(url, request));
    }

    return assetResponse;
  },
};
`;

await mkdir(serverDir, { recursive: true });
await mkdir(openaiDir, { recursive: true });
await writeFile(join(serverDir, "index.js"), serverEntry);
await copyFile(join(root, ".openai", "hosting.json"), join(openaiDir, "hosting.json"));
