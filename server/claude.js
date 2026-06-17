/* =========================================================================
   Claude Opus 종합 평가
   - 결정론적 점수(코드 계산) + 자유서술(암묵지)을 받아
     맞춤 진단 해석 / 로드맵을 생성
   - max_tokens 상향 (기존 1000 → 8000)
   - API 실패 시 폴백(규칙 기반 요약) 제공
   ========================================================================= */
import Anthropic from "@anthropic-ai/sdk";
import { DIMS, LEVELS } from "./data.js";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-20250514";
const MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS || 8000); // ★ 종합평가 토큰 한계 상향

let client = null;
function getClient() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

function buildPrompt({ intake, goal, scores, textAnswers }) {
  const dimLines = Object.values(scores.dimensions)
    .map(
      (d) =>
        `- ${d.name}(${d.key}): 레벨 ${d.level}(${d.levelLabel}), 평균 ${d.avg} — ${d.desc}`
    )
    .join("\n");

  const textLines =
    textAnswers.length > 0
      ? textAnswers.map((t) => `Q: ${t.question}\nA: ${t.answer}`).join("\n\n")
      : "(자유서술 응답 없음)";

  const goalLabel =
    goal === "P" ? "예측·분석형 AI" : goal === "G" ? "생성·RAG형 AI" : "예측+생성 둘 다 검토";

  return `당신은 데이터/AI 도입 컨설턴트입니다. 아래 기업의 "데이터 AI Readiness 자가진단" 결과를 해석하고, 실무적으로 바로 쓸 수 있는 맞춤 평가 리포트를 작성하세요.

[기업 정보]
- 회사: ${intake.company || "-"} / ${intake.department || "-"}
- 담당자: ${intake.respondent || "-"} (${intake.role || "-"})
- 산업: ${intake.industry || "-"}, 규모: ${intake.company_size || "-"}
- 진단 대상 업무: ${intake.target_process || "-"}
- AI 도입 목적: ${goalLabel}

[종합 점수]
- 전체 성숙도: 레벨 ${scores.overall.level} (${scores.overall.levelLabel}) — ${scores.overall.levelDesc}
- 평균: ${scores.overall.avg} / 5

[차원별 점수]
${dimLines}

[개선 우선순위(가장 약한 영역)]
${scores.weakest.map((w, i) => `${i + 1}. ${w.name} — 레벨 ${w.level}`).join("\n")}

[현업 자유서술(암묵지)]
${textLines}

다음 형식의 마크다운으로, 한국어로 작성하세요. 추측이 아니라 위 점수·서술에 근거해 구체적으로 쓰세요.

## 종합 진단
(현재 데이터 성숙도를 3~5문장으로 평가. 이 목적(${goalLabel})에 비춰 지금 AI를 투입할 수 있는 상태인지 명확히)

## 강점
- (점수가 높은 영역 기반, 2~4개)

## 핵심 리스크 / 병목
- (가장 약한 영역과 자유서술에서 드러난 암묵지·병목을 연결해 2~4개)

## 암묵지 해석
(현업이 적은 자유서술을 분석해, '사람만 아는 지식'을 어떻게 데이터/문서로 끌어낼지 구체적으로)

## 단계별 로드맵
### 1단계 (0~1개월) — 기초 정비
- ...
### 2단계 (1~3개월) — 구조화·자동화
- ...
### 3단계 (3~6개월) — AI 투입·검증
- ...

## 한 줄 결론
(경영진 보고용 1~2문장)`;
}

export async function generateEvaluation({ intake, goal, scores, textAnswers }) {
  const c = getClient();
  if (!c) {
    return { ok: false, source: "fallback", markdown: fallbackReport({ goal, scores, textAnswers }) };
  }
  try {
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS, // ★ 상향된 토큰 한계
      temperature: 0.4,
      messages: [{ role: "user", content: buildPrompt({ intake, goal, scores, textAnswers }) }],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return {
      ok: true,
      source: "claude",
      model: MODEL,
      maxTokens: MAX_TOKENS,
      usage: msg.usage || null,
      markdown: text || fallbackReport({ goal, scores, textAnswers }),
    };
  } catch (err) {
    console.error("[claude] error:", err?.message || err);
    return {
      ok: false,
      source: "fallback",
      error: String(err?.message || err),
      markdown: fallbackReport({ goal, scores, textAnswers }),
    };
  }
}

/* 규칙 기반 폴백 리포트 (API 키 없음/실패 시) */
function fallbackReport({ goal, scores, textAnswers }) {
  const lv = scores.overall.level;
  const weak = scores.weakest
    .map((w, i) => `${i + 1}. **${w.name}** (레벨 ${w.level})`)
    .join("\n");
  const txt =
    textAnswers.length > 0
      ? textAnswers.map((t) => `- ${t.answer}`).join("\n")
      : "- (응답 없음)";
  return `## 종합 진단
현재 전체 데이터 성숙도는 **레벨 ${lv} (${LEVELS[lv]?.ko})** 입니다. ${LEVELS[lv]?.desc}

> ⚠️ 본 리포트는 AI 해석 없이 생성된 기본 요약입니다. (ANTHROPIC_API_KEY 미설정 또는 호출 실패)

## 개선 우선순위 (가장 약한 영역)
${weak}

## 현업이 남긴 메모(암묵지)
${txt}

## 권장 다음 단계
- 가장 약한 영역부터 데이터 표준화/문서화 착수
- 자유서술에서 언급된 병목 업무를 우선 정비
- 정비 후 파일럿 단위로 AI 적용 검증`;
}
