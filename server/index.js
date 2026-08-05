export default {
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
