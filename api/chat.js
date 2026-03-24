import {
  MAX_MESSAGE_LENGTH,
  canUseWorkersAi,
  resolveServerConfig
} from "../server/chat/config.js";
import { retrieveRelevantChunks } from "../server/chat/knowledge.js";
import { buildChatMessages, buildNoMatchAnswer, sanitizeHistory } from "../server/chat/prompt.js";
import { checkRateLimit } from "../server/chat/rate-limit.js";
import { verifyTurnstile } from "../server/chat/turnstile.js";
import { runWorkersAi } from "../server/chat/ai.js";

export const config = {
  runtime: "edge"
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: "POST, OPTIONS"
      }
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "请使用 POST /api/chat。" }, 405, {
      Allow: "POST, OPTIONS"
    });
  }

  const serverConfig = resolveServerConfig(process.env);

  if (!canUseWorkersAi(serverConfig)) {
    return jsonResponse(
      {
        error:
          "聊天接口已加载，但 AI 还没有配置完成。请先配置 Vercel 环境变量里的 AI 参数。"
      },
      503
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "请求体格式不正确，请使用 JSON。" }, 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim().slice(0, 120) : "";
  const history = sanitizeHistory(body.history);
  const turnstileToken =
    typeof body.turnstileToken === "string" ? body.turnstileToken.trim() : "";

  if (!message) {
    return jsonResponse({ error: "问题不能为空。" }, 400);
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(
      { error: `问题太长了，请控制在 ${MAX_MESSAGE_LENGTH} 个字符以内。` },
      400
    );
  }

  const rateLimitKey = buildRateLimitKey(request, sessionId);
  const rateLimit = checkRateLimit({
    key: rateLimitKey,
    windowMs: serverConfig.rateLimitWindowMs,
    maxRequests: serverConfig.rateLimitMaxRequests
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
    request,
    config: serverConfig
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
      env: {},
      config: serverConfig,
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

function buildRateLimitKey(request, sessionId) {
  const forwardedIp =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("CF-Connecting-IP") ||
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
