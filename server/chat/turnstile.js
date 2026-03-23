import { isLocalRequest } from "./config.js";

const SITEVERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function getTurnstileState(config, request) {
  const hasSiteKey = Boolean(config.turnstileSiteKey);
  const hasSecretKey = Boolean(config.turnstileSecretKey);
  const localRequest = isLocalRequest(request);

  if (hasSiteKey && hasSecretKey) {
    return {
      enabled: true,
      bypass: false,
      siteKey: config.turnstileSiteKey,
      message: "已启用 Cloudflare Turnstile 人机验证。"
    };
  }

  if (!hasSiteKey && !hasSecretKey && localRequest) {
    return {
      enabled: false,
      bypass: true,
      siteKey: "",
      message: "当前是本地开发环境，未配置 Turnstile，已自动启用开发跳过模式。"
    };
  }

  if (!hasSiteKey && !hasSecretKey) {
    return {
      enabled: false,
      bypass: false,
      siteKey: "",
      message: "当前站点尚未配置 Turnstile。"
    };
  }

  return {
    enabled: false,
    bypass: false,
    siteKey: "",
    message: "Turnstile 配置不完整：需要同时提供站点 Key 和 Secret Key。"
  };
}

export async function verifyTurnstile({ token, request, config }) {
  const state = getTurnstileState(config, request);

  if (state.bypass) {
    return {
      ok: true,
      skipped: true,
      message: state.message
    };
  }

  if (!state.enabled) {
    return {
      ok: false,
      status: 503,
      message: state.message
    };
  }

  if (typeof token !== "string" || !token.trim()) {
    return {
      ok: false,
      status: 400,
      message: "请先完成人机验证，再发送问题。"
    };
  }

  const formData = new FormData();
  formData.set("secret", config.turnstileSecretKey);
  formData.set("response", token.trim());

  const remoteIp =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip");

  if (remoteIp) {
    formData.set("remoteip", remoteIp);
  }

  formData.set("idempotency_key", crypto.randomUUID());

  try {
    const response = await fetch(SITEVERIFY_ENDPOINT, {
      method: "POST",
      body: formData
    });
    const data = await response.json();

    if (response.ok && data.success) {
      return {
        ok: true,
        skipped: false,
        message: "Turnstile 验证通过。"
      };
    }

    return {
      ok: false,
      status: 403,
      message: "人机验证未通过，请刷新验证后再试。",
      details: data
    };
  } catch {
    return {
      ok: false,
      status: 502,
      message: "Turnstile 验证请求失败，请稍后重试。"
    };
  }
}
