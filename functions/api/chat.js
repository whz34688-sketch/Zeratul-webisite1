import {
  MAX_MESSAGE_LENGTH,
  canUseWorkersAi,
  resolveServerConfig
} from "../../server/chat/config.js";
import { retrieveRelevantChunks } from "../../server/chat/knowledge.js";
import { buildChatMessages, buildNoMatchAnswer, sanitizeHistory } from "../../server/chat/prompt.js";
import { checkRateLimit } from "../../server/chat/rate-limit.js";
import { verifyTurnstile } from "../../server/chat/turnstile.js";
import { runWorkersAi } from "../../server/chat/ai.js";

export async function onRequestPost(context) {
  const config = resolveServerConfig(context.env);

  if (!canUseWorkersAi(config, context.env)) {
    return jsonResponse(
      {
        error:
          "聊天接口已加载，但 AI 还没有配置完成。请先配置 AI 绑定、Cloudflare Workers AI，或填写 OPENAI_API_KEY。"
      },
      503
    );
  }

  let body;

  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "请求体格式不正确，请使用 JSON。"}, 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim().slice(0, 120) : "";
  const history = sanitizeHistory(body.history);
  const turnstileToken =
    typeof body.turnstileToken === "string" ? body.turnstileToken.trim() : "";

  if (!message) {
    return jsonResponse({ error: "问题不能为空。"}, 400);
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(
      { error: `问题太长了，请控制在 ${MAX_MESSAGE_LENGTH} 个字符以内。` },
      400
    );
  }

  const rateLimitKey = buildRateLimitKey(context.request, sessionId);
  const rateLimit = checkRateLimit({
    key: rateLimitKey,
    windowMs: config.rateLimitWindowMs,
    maxRequests: config.rateLimitMaxRequests
  });

  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        error: "发送太频繁了，请稍等一会儿再继续问。",
        retryAfterMs: rateLimit.retryAfterMs
      },
      429,
      {
        "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000))
      }
    );
  }

  const turnstile = await verifyTurnstile({
    token: turnstileToken,
    request: context.request,
    config
  });

  if (!turnstile.ok) {
    return jsonResponse({ error: turnstile.message }, turnstile.status || 403);
  }

  const retrieval = retrieveRelevantChunks(message, history);

  if (!retrieval.enoughConfidence || !retrieval.matches.length) {
    return jsonResponse({
      answer: buildNoMatchAnswer(message),
      metadata: {
        matched: false,
        topScore: retrieval.topScore
      }
    });
  }

  try {
    const answer = await runWorkersAi({
      env: context.env,
      config,
      messages: buildChatMessages({
        question: message,
        history,
        matches: retrieval.matches
      })
    });

    return jsonResponse({
      answer,
      metadata: {
        matched: true,
        topScore: retrieval.topScore,
        sources: retrieval.matches.map((match) => ({
          title: match.fullTitle,
          score: match.score
        }))
      }
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "聊天接口调用失败，请稍后重试。"
      },
      502
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS"
    }
  });
}

export async function onRequestGet() {
  return jsonResponse({ error: "请使用 POST /api/chat。" }, 405, {
    Allow: "POST, OPTIONS"
  });
}

function buildRateLimitKey(request, sessionId) {
  const forwardedIp =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "";
  const normalizedIp = forwardedIp.split(",")[0].trim();

  if (normalizedIp) {
    return `ip:${normalizedIp}`;
  }

  if (sessionId) {
    return `session:${sessionId}`;
  }

  return "anonymous";
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
