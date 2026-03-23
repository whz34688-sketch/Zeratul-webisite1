# 前哨Zeratul 个人网站

这个项目仍然保持原来的静态站结构，但现在已经新增了一个真实可用的 `Zeratul chat` tab。

它的实现方式是：

- 前端继续沿用 `index.html + content.js + app.js + styles.css`
- 后端新增 Cloudflare Pages Functions
- 聊天回答基于 `knowledge/Zeratul个人信息库.md`
- 回答流程走“知识库切块检索 -> 命中片段 -> Workers AI 作答”

---

## 当前主要结构

- `index.html`：页面骨架
- `content.js`：主要文案、tab 内容、聊天区配置
- `styles.css`：整站样式和聊天区样式
- `app.js`：内容渲染、tab 切换、动效、聊天前端交互
- `knowledge/Zeratul个人信息库.md`：聊天知识库
- `functions/api/chat.js`：聊天接口
- `functions/api/chat-config.js`：前端读取公开运行配置
- `server/chat/*.js`：知识库解析、检索、提示词、Turnstile、限流、Workers AI 调用

---

## 你以后优先改哪里

### 改网站内容

优先改 `content.js`。

里面集中管理了：

- 首页主标题
- 首页介绍
- 每个 tab 的卡片内容
- 联系方式
- `Zeratul chat` 的欢迎语、范围提示、快捷问题按钮

### 改聊天知识库

优先改 `knowledge/Zeratul个人信息库.md`。

后端不会把整份知识库直接塞给模型，而是会先按标题切块、再做检索，所以这份 Markdown 的标题结构越清楚，聊天命中效果越稳定。

### 改聊天后端逻辑

优先看：

- `server/chat/knowledge.js`
- `server/chat/prompt.js`
- `functions/api/chat.js`

---

## 本地开发

### 1. 安装依赖

```powershell
npm install
```

### 2. 配环境变量

复制一份示例文件：

```powershell
Copy-Item .dev.vars.example .dev.vars
```

然后至少补这些变量：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CF_AI_MODEL`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `CHAT_RATE_LIMIT_WINDOW_MS`
- `CHAT_RATE_LIMIT_MAX_REQUESTS`

说明：

- 如果你本地没有配 Turnstile，`localhost` 下会自动走开发跳过逻辑，不会让整站跑不起来。
- 如果你后面给 Pages 加了名为 `AI` 的 Workers AI binding，运行时代码会优先使用这个 binding。
- 如果没有 `AI` binding，后端会退回到 `CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN` 的 Workers AI REST 调用方式。
- 如果你更想直接用 OpenAI 或兼容 OpenAI 的接口，也可以只填 `OPENAI_API_KEY` 这一组。
- 如果你用的是向量引擎这类 OpenAI 兼容中转站，不要只给 key，还要按文档填写它的 `OPENAI_BASE_URL` 和具体 `OPENAI_MODEL`。例如 DeepSeek 聊天文档写的是 `https://api.vectorengine.ai/v1` 与 `deepseek-v3-1-250821`。

### 3. 启动本地服务

```powershell
npm run dev
```

然后打开 Wrangler 输出的本地地址。

如果你已经配置了本地 `AI` binding，也可以用：

```powershell
npm run dev:ai-binding
```

### 4. 本地验证路径

1. 打开网站
2. 点击最后一个 tab：`Zeratul chat`
3. 试着问：
   - `你现在主要在做什么？`
   - `你做过哪些项目？`
   - `你会哪些 AI 工具？`
4. 确认能返回基于知识库的回答

---

## 聊天接口说明

### `POST /api/chat`

请求体示例：

```json
{
  "message": "你现在主要在做什么？",
  "history": [],
  "turnstileToken": "",
  "sessionId": "local-session-id"
}
```

返回体示例：

```json
{
  "answer": "我现在主要在持续学习 AI、持续做真实项目、持续建立自己的内容表达入口。",
  "metadata": {
    "matched": true
  }
}
```

### `GET /api/chat-config`

前端会从这里拿：

- 聊天服务是否已准备好
- 当前是否启用 Turnstile
- Turnstile 是否处于本地开发跳过模式
- 基础限流配置

---

## 当前实现取舍

### 检索

- 这是一个适合 MVP 的轻量检索版
- 按 Markdown 标题层级切块
- 用关键词 / 标题命中 / FAQ 与边界加权做打分
- 不依赖外部向量数据库

后续如果要升级，可以再接：

- embeddings
- KV / D1 / Durable Object
- 更正式的 RAG 管线

### 限流

- 现在是基于内存 `Map` 的 IP / session 限流
- 适合本地开发和 MVP
- 后续部署到正式环境时，更推荐换成 KV 或 Durable Object

### Turnstile

- 已经预留并接入
- 本地没配 key 时，`localhost` 下允许开发跳过
- 正式部署时建议一定补齐真实 key

---

## Cloudflare 部署时最少要补什么

至少补这几项：

1. Pages 项目里的环境变量 / Secrets
2. `CLOUDFLARE_ACCOUNT_ID`
3. `CLOUDFLARE_API_TOKEN`
4. `CF_AI_MODEL`
5. `TURNSTILE_SITE_KEY`
6. `TURNSTILE_SECRET_KEY`

如果你不想在运行时使用 API Token，也可以在 Pages / Workers 里额外配置一个名字为 `AI` 的 Workers AI binding，代码会优先使用它。
