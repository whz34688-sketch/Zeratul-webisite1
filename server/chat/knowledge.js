import knowledgeMarkdown from "./knowledge-source.js";
import { MAX_RETRIEVAL_MATCHES, MIN_RETRIEVAL_SCORE } from "./config.js";

let knowledgeBaseCache = null;

const TOPIC_BOOSTS = [
  {
    test: /(联系|邮箱|微信|公众号|合作)/,
    boostTest: /(联系方式|联系信息|合作|Q18|Q19|Q20|Q21|边界)/,
    value: 6
  },
  {
    test: /(项目|小程序|萌宠匹配师|网站|公众号|视频号)/,
    boostTest: /(项目|萌宠匹配师|个人网站|公众号|视频号|作品)/,
    value: 5
  },
  {
    test: /(工具|技能|代码|会什么|学习什么|方向|AI)/,
    boostTest: /(工具|技能|代码|学习|方向|你擅长哪些工具或能力|Q4|Q6|Q7)/,
    value: 4.5
  },
  {
    test: /(隐私|住址|电话|手机号|证件|家庭|学校|专业|年级|不公开|边界|不回答)/,
    boostTest: /(不公开|不回答|边界|哪些问题 AI 不回答|哪些信息不公开)/,
    value: 7
  }
];

const STOP_TERMS = new Set([
  "你",
  "我",
  "他",
  "她",
  "它",
  "什么",
  "怎么",
  "哪些",
  "哪个",
  "现在",
  "主要",
  "可以",
  "一下",
  "这个",
  "那个",
  "今天",
  "是否",
  "会不会",
  "接不接"
]);

export function getKnowledgeBase() {
  if (!knowledgeBaseCache) {
    knowledgeBaseCache = buildKnowledgeBase(knowledgeMarkdown);
  }

  return knowledgeBaseCache;
}

export function retrieveRelevantChunks(question, history = []) {
  const knowledgeBase = getKnowledgeBase();
  const retrievalQuery = buildRetrievalQuery(question, history);
  const scoredChunks = knowledgeBase.chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(retrievalQuery, chunk)
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!scoredChunks.length) {
    return {
      matches: [],
      topScore: 0,
      enoughConfidence: false
    };
  }

  const topScore = scoredChunks[0].score;
  const matches = scoredChunks
    .filter((chunk, index) => index < MAX_RETRIEVAL_MATCHES && chunk.score >= Math.max(2.5, topScore * 0.32))
    .map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      fullTitle: chunk.fullTitle,
      level: chunk.level,
      score: chunk.score,
      content: trimChunkContent(chunk.content),
      rawText: chunk.rawText
    }));

  return {
    matches,
    topScore,
    enoughConfidence: topScore >= MIN_RETRIEVAL_SCORE
  };
}

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\r/g, "")
    .replace(/[ \t\n`~!@#$%^&*()_+\-=[\]{};:'"\\|,.<>/?，。！？；：、“”‘’（）【】《》]/g, "");
}

function buildKnowledgeBase(markdown) {
  const rawChunks = parseMarkdownIntoChunks(markdown);

  return {
    raw: markdown,
    chunks: rawChunks.map((chunk, index) => {
      const fullTitle = chunk.path.join(" / ");
      const rawText = [fullTitle, chunk.content].filter(Boolean).join("\n");

      return {
        id: `kb-${index + 1}`,
        level: chunk.level,
        title: chunk.title,
        path: chunk.path,
        fullTitle,
        content: chunk.content,
        rawText,
        normalizedTitle: normalizeText(fullTitle),
        normalizedText: normalizeText(rawText)
      };
    })
  };
}

function parseMarkdownIntoChunks(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const headingStack = [];
  const chunks = [];
  let currentChunk = null;

  function flushChunk() {
    if (!currentChunk) {
      return;
    }

    const content = currentChunk.lines.join("\n").trim();
    chunks.push({
      level: currentChunk.level,
      title: currentChunk.title,
      path: currentChunk.path.slice(),
      content
    });
    currentChunk = null;
  }

  lines.forEach((line) => {
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);

    if (!headingMatch) {
      if (currentChunk) {
        currentChunk.lines.push(line);
      }
      return;
    }

    const level = headingMatch[1].length;
    const title = headingMatch[2].trim();

    while (headingStack.length && headingStack[headingStack.length - 1].level >= level) {
      headingStack.pop();
    }

    headingStack.push({ level, title });

    if (level === 2 || level === 3) {
      flushChunk();
      currentChunk = {
        level,
        title,
        path: headingStack.map((item) => item.title),
        lines: []
      };
      return;
    }

    if (currentChunk) {
      currentChunk.lines.push(line);
    }
  });

  flushChunk();
  return chunks.filter((chunk) => chunk.content || chunk.title);
}

function buildRetrievalQuery(question, history) {
  const sanitizedQuestion = String(question || "").trim();

  if (normalizeText(sanitizedQuestion).length >= 10) {
    return sanitizedQuestion;
  }

  const previousUserMessage = Array.isArray(history)
    ? [...history]
        .reverse()
        .find((entry) => entry && entry.role === "user" && typeof entry.content === "string")
    : null;

  if (!previousUserMessage) {
    return sanitizedQuestion;
  }

  return `${previousUserMessage.content}\n${sanitizedQuestion}`;
}

function scoreChunk(query, chunk) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return 0;
  }

  let score = 0;
  const queryTerms = extractTerms(query);

  if (chunk.normalizedTitle.includes(normalizedQuery)) {
    score += 28;
  }

  if (chunk.normalizedText.includes(normalizedQuery)) {
    score += 18;
  }

  queryTerms.forEach((term) => {
    if (term.length < 2) {
      return;
    }

    const termWeight = getTermWeight(term);

    if (chunk.normalizedTitle.includes(term)) {
      score += termWeight * 2.8;
    }

    if (chunk.normalizedText.includes(term)) {
      score += termWeight;
    }
  });

  TOPIC_BOOSTS.forEach((boostRule) => {
    if (boostRule.test.test(query) && boostRule.boostTest.test(chunk.fullTitle)) {
      score += boostRule.value;
    }
  });

  if (/模块 3：常见问题 faq/i.test(chunk.fullTitle) || /^q\d+/i.test(chunk.title)) {
    score *= 1.08;
  }

  return Number(score.toFixed(2));
}

function extractTerms(input) {
  const source = String(input || "").toLowerCase();
  const englishTerms = source.match(/[a-z0-9][a-z0-9.+-]*/g) || [];
  const chineseSegments = source.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const terms = new Set();

  englishTerms.forEach((term) => {
    if (term.length >= 2 && !STOP_TERMS.has(term)) {
      terms.add(term);
    }
  });

  chineseSegments.forEach((segment) => {
    if (segment.length <= 14 && !STOP_TERMS.has(segment)) {
      terms.add(segment);
    }

    const maxN = Math.min(4, segment.length);
    for (let size = 2; size <= maxN; size += 1) {
      for (let index = 0; index <= segment.length - size; index += 1) {
        const term = segment.slice(index, index + size);
        if (!STOP_TERMS.has(term)) {
          terms.add(term);
        }
      }
    }
  });

  return Array.from(terms);
}

function getTermWeight(term) {
  if (term.length >= 6) {
    return 4.6;
  }

  if (term.length >= 4) {
    return 3.3;
  }

  if (term.length === 3) {
    return 2.4;
  }

  return 1.5;
}

function trimChunkContent(content) {
  const normalized = String(content || "").trim();

  if (normalized.length <= 1200) {
    return normalized;
  }

  return `${normalized.slice(0, 1200).trim()}...`;
}
