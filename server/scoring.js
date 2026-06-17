/* =========================================================================
   결정론적 점수 계산
   - 같은 답 = 같은 점수 (재현성 보장)
   - 차원별 평균 → 레벨(1~5) 산출 → 트랙별 종합
   ========================================================================= */
import { DIMS, LEVELS, QUESTIONS } from "./data.js";

/**
 * answers: { [questionId]: number(score 1~5) | string(text) }
 * goal:    "P" | "G" | "both"
 * 반환: 차원별 점수, 레벨, 트랙별 종합, 전체 종합
 */
export function computeScores(answers, goal) {
  // 1) 차원별로 점수 수집
  const dimScores = {}; // dimKey -> { sum, count, weightSum }
  for (const q of QUESTIONS) {
    if (q.type === "text" || !q.dim) continue;
    const raw = answers[q.id];
    if (raw == null || raw === "") continue;
    const score = Number(raw);
    if (!Number.isFinite(score)) continue;
    const w = q.weight || 1;
    if (!dimScores[q.dim]) dimScores[q.dim] = { sum: 0, weightSum: 0, count: 0 };
    dimScores[q.dim].sum += score * w;
    dimScores[q.dim].weightSum += w;
    dimScores[q.dim].count += 1;
  }

  // 2) 차원별 평균 → 레벨(반올림, 1~5)
  const dimensions = {};
  for (const [dimKey, agg] of Object.entries(dimScores)) {
    const avg = agg.weightSum > 0 ? agg.sum / agg.weightSum : 0;
    const level = Math.max(1, Math.min(5, Math.round(avg)));
    dimensions[dimKey] = {
      key: dimKey,
      name: DIMS[dimKey]?.name || dimKey,
      track: DIMS[dimKey]?.track || "both",
      desc: DIMS[dimKey]?.desc || "",
      avg: Number(avg.toFixed(2)),
      level,
      levelLabel: LEVELS[level]?.ko || "",
      count: agg.count,
    };
  }

  // 3) 트랙별 종합 (공통 차원은 항상 포함)
  const inTrack = (dimTrack) => {
    if (dimTrack === "both") return true;
    if (goal === "both") return true;
    return dimTrack === goal;
  };

  const relevant = Object.values(dimensions).filter((d) => inTrack(d.track));
  const overallAvg =
    relevant.length > 0
      ? relevant.reduce((s, d) => s + d.avg, 0) / relevant.length
      : 0;
  const overallLevel = Math.max(1, Math.min(5, Math.round(overallAvg)));

  // 트랙별 분리 점수
  const trackSummary = {};
  for (const t of ["both", "P", "G"]) {
    const ds = Object.values(dimensions).filter((d) => d.track === t);
    if (ds.length === 0) continue;
    const a = ds.reduce((s, d) => s + d.avg, 0) / ds.length;
    trackSummary[t] = {
      avg: Number(a.toFixed(2)),
      level: Math.max(1, Math.min(5, Math.round(a))),
      dims: ds.map((d) => d.key),
    };
  }

  // 4) 가장 약한 차원 Top3 (개선 우선순위)
  const weakest = [...relevant]
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3)
    .map((d) => ({ key: d.key, name: d.name, level: d.level, avg: d.avg }));

  return {
    goal,
    dimensions,
    overall: {
      avg: Number(overallAvg.toFixed(2)),
      level: overallLevel,
      levelLabel: LEVELS[overallLevel]?.ko || "",
      levelDesc: LEVELS[overallLevel]?.desc || "",
    },
    trackSummary,
    weakest,
    answeredCount: relevant.reduce((s, d) => s + d.count, 0),
  };
}

/** 자유서술 답변만 추출 (Claude 해석용) */
export function extractTextAnswers(answers) {
  const out = [];
  for (const q of QUESTIONS) {
    if (q.type !== "text") continue;
    const v = answers[q.id];
    if (v && String(v).trim()) {
      out.push({ id: q.id, question: q.q, answer: String(v).trim() });
    }
  }
  return out;
}
