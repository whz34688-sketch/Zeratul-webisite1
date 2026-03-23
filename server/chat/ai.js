import { hasAiBinding } from "./config.js";

export async function runWorkersAi({ env, config, messages }) {
  const payload = {
    messages,
    max_tokens: 520,
    temperature: 0.2,
    top_p: 0.88
  };

  if (hasAiBinding(env)) {
    const result = await env.AI.run(config.aiModel, payload);
    return extractAnswer(result);
  }

  if (config.cloudflareAccountId && config.cloudflareApiToken) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/ai/run/${encodeURIComponent(
      config.aiModel
    )}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.cloudflareApiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok || data.success === false) {
      const errorMessage =
        data.errors && data.errors.length
          ? data.errors.map((item) => item.message || item.code || "未知错误").join("；")
          : `Workers AI 请求失败（${response.status}）。`;
      throw new Error(errorMessage);
    }

    return extractAnswer(data);
  }

  if (config.openAiApiKey) {
    const endpoint = `${config.openAiBaseUrl.replace(/\/$/, "")}/chat/completions`;
    const payload = buildCompatibleChatPayload({ config, messages });
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openAiApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ||
        data?.message ||
        `OpenAI 兼容接口请求失败（${response.status}）。`;
      throw new Error(errorMessage);
    }

    return extractAnswer(data);
  }

  throw new Error(
    "AI 服务尚未配置。请配置 AI 绑定、Cloudflare Workers AI，或填写 OPENAI_API_KEY。"
  );
}

function buildCompatibleChatPayload({ config, messages }) {
  const payload = {
    model: config.openAiModel,
    messages,
    temperature: 0.2,
    max_tokens: 520
  };

  if (config.openAiThinkingType) {
    payload.thinking = {
      type: config.openAiThinkingType
    };
  }

  return payload;
}

function extractAnswer(result) {
  if (typeof result === "string" && result.trim()) {
    return result.trim();
  }

  const answer =
    result?.response ||
    result?.result?.response ||
    result?.choices?.[0]?.message?.content ||
    result?.result ||
    result?.message ||
    "";

  if (typeof answer === "string" && answer.trim()) {
    return answer.trim();
  }

  throw new Error("Workers AI 返回了空结果。");
}
