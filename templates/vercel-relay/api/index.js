/**
 * Antigravity & Gemini High-Performance Vercel Edge Relay
 * Forwards requests to target URL specified in x-relay-target header
 * Zero latency, edge runtime across global Vercel CDN locations.
 */

export const config = { runtime: "edge" };

export default async function handler(req) {
  const target = req.headers.get("x-relay-target");
  const relayPath = req.headers.get("x-relay-path") || "/";
  
  if (!target) {
    return new Response(JSON.stringify({ 
      error: "Missing x-relay-target header",
      service: "Antigravity Vercel Relay",
      usage: "Send x-relay-target header with the destination API (e.g. https://generativelanguage.googleapis.com)"
    }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // Construct target URL
  const targetUrl = target.replace(/\/$/, "") + relayPath;

  // Clone headers, stripping relay control and host
  const rawHeaders = {};
  for (const [k, v] of req.headers.entries()) {
    rawHeaders[k] = v;
  }
  delete rawHeaders["x-relay-target"];
  delete rawHeaders["x-relay-path"];
  delete rawHeaders["host"];

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: rawHeaders,
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
      duplex: "half",
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Relay Fetch Failed",
      message: err.message,
      targetUrl: targetUrl
    }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
}
