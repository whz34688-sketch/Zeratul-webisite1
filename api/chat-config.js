import { canUseWorkersAi, resolveServerConfig } from "../server/chat/config.js";
import { getTurnstileState } from "../server/chat/turnstile.js";

export const config = {
  runtime: "edge"
};

export default async function handler(request) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "请使用 GET /api/chat-config。" }, 405, {
      Allow: "GET"
    });
  }

  const serverConfig = resolveServerConfig(process.env);
  const turnstile = getTurnstileState(serverConfig, request);

  return jsonResponse({
    ready: canUseWorkersAi(serverConfig),
    mode:
      serverConfig.cloudflareAccountId && serverConfig.cloudflareApiToken
        ? "rest"
        : serverConfig.openAiApiKey
          ? "openai-compatible"
          : "unconfigured",
    turnstile,
    rateLimit: {
      windowMs: serverConfig.rateLimitWindowMs,
      maxRequests: serverConfig.rateLimitMaxRequests
    }
  });
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=UTF-8",
      ...extraHeaders
    }
  });
}
