import { canUseWorkersAi, hasAiBinding, resolveServerConfig } from "../../server/chat/config.js";
import { getTurnstileState } from "../../server/chat/turnstile.js";

export async function onRequestGet(context) {
  const config = resolveServerConfig(context.env);
  const turnstile = getTurnstileState(config, context.request);

  return jsonResponse({
    ready: canUseWorkersAi(config, context.env),
    mode: hasAiBinding(context.env)
      ? "binding"
      : config.cloudflareAccountId && config.cloudflareApiToken
        ? "rest"
        : config.openAiApiKey
          ? "openai-compatible"
        : "unconfigured",
    turnstile,
    rateLimit: {
      windowMs: config.rateLimitWindowMs,
      maxRequests: config.rateLimitMaxRequests
    }
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=UTF-8"
    }
  });
}
