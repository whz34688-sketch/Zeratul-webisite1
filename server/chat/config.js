export const DEFAULT_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
export const DEFAULT_OPENAI_THINKING_TYPE = "";
export const DEFAULT_ALLOW_CHAT_WITHOUT_TURNSTILE = false;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 18;
export const MAX_MESSAGE_LENGTH = 1200;
export const MAX_HISTORY_MESSAGES = 8;
export const MAX_RETRIEVAL_MATCHES = 5;
export const MIN_RETRIEVAL_SCORE = 8;

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export function resolveServerConfig(env = {}) {
  return {
    aiModel: readString(env.CF_AI_MODEL) || DEFAULT_AI_MODEL,
    cloudflareAccountId: readString(env.CLOUDFLARE_ACCOUNT_ID),
    cloudflareApiToken: readString(env.CLOUDFLARE_API_TOKEN),
    openAiApiKey: readString(env.OPENAI_API_KEY),
    openAiBaseUrl: readString(env.OPENAI_BASE_URL) || DEFAULT_OPENAI_BASE_URL,
    openAiModel: readString(env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
    openAiThinkingType: readString(env.OPENAI_THINKING_TYPE) || DEFAULT_OPENAI_THINKING_TYPE,
    allowChatWithoutTurnstile: readBoolean(
      env.ALLOW_CHAT_WITHOUT_TURNSTILE,
      DEFAULT_ALLOW_CHAT_WITHOUT_TURNSTILE
    ),
    turnstileSiteKey: readString(env.TURNSTILE_SITE_KEY),
    turnstileSecretKey: readString(env.TURNSTILE_SECRET_KEY),
    rateLimitWindowMs: readPositiveInteger(env.CHAT_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
    rateLimitMaxRequests: readPositiveInteger(
      env.CHAT_RATE_LIMIT_MAX_REQUESTS,
      DEFAULT_RATE_LIMIT_MAX_REQUESTS
    )
  };
}

export function hasAiBinding(env = {}) {
  return Boolean(env.AI && typeof env.AI.run === "function");
}

export function canUseWorkersAi(config, env = {}) {
  return (
    hasAiBinding(env) ||
    Boolean(config.cloudflareAccountId && config.cloudflareApiToken) ||
    Boolean(config.openAiApiKey)
  );
}

export function isLocalRequest(request) {
  try {
    return LOCAL_HOSTNAMES.has(new URL(request.url).hostname);
  } catch {
    return false;
  }
}

function readString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readPositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function readBoolean(value, fallbackValue) {
  if (typeof value !== "string") {
    return fallbackValue;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallbackValue;
}
