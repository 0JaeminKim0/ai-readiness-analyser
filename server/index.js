/* =========================================================================
   Express 서버 (Railway 배포용)
   - 정적 파일(진단/Admin 화면) 서빙
   - /api/config  : 질문/메타 데이터 전달
   - /api/submit  : 제출 → 점수 계산 → Claude 평가 → 저장
   - /api/admin/* : 평가자용 (Bearer 또는 ?key= 비밀번호)
   ========================================================================= */
import express from "express";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { QUESTIONS, DIMS, LEVELS, ENVS, GOALS, INTAKE_FIELDS } from "./data.js";
import { computeScores, extractTextAnswers } from "./scoring.js";
import { generateEvaluation } from "./claude.js";
import {
  insertSubmission,
  getSubmission,
  listSubmissions,
  upsertEvaluation,
  setStatus,
} from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pwc-admin";

const app = express();
app.use(express.json({ limit: "1mb" }));

/* ---------- 공개: 진단에 필요한 설정 데이터 ---------- */
app.get("/api/config", (req, res) => {
  res.json({ QUESTIONS, DIMS, LEVELS, ENVS, GOALS, INTAKE_FIELDS });
});

/* ---------- 공개: 제출 ---------- */
app.post("/api/submit", async (req, res) => {
  try {
    const { intake = {}, goal = "both", envs = [], answers = {}, duration_ms = null } = req.body || {};

    // 결정론적 점수
    const scores = computeScores(answers, goal);
    const textAnswers = extractTextAnswers(answers);

    // Claude 종합 평가 (실패 시 폴백)
    const evalResult = await generateEvaluation({ intake, goal, scores, textAnswers });

    const id = randomUUID();
    const now = new Date().toISOString();
    insertSubmission({
      id,
      created_at: now,
      company: intake.company ?? null,
      department: intake.department ?? null,
      respondent: intake.respondent ?? null,
      role: intake.role ?? null,
      email: intake.email ?? null,
      phone: intake.phone ?? null,
      industry: intake.industry ?? null,
      company_size: intake.company_size ?? null,
      target_process: intake.target_process ?? null,
      goal,
      envs: JSON.stringify(envs),
      answers: JSON.stringify(answers),
      scores: JSON.stringify(scores),
      ai_report: evalResult.markdown,
      ai_source: evalResult.source,
      duration_ms,
      status: "submitted",
    });

    res.json({
      ok: true,
      id,
      scores,
      report: evalResult.markdown,
      source: evalResult.source,
    });
  } catch (err) {
    console.error("[submit] error:", err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

/* ---------- Admin 인증 미들웨어 ---------- */
function adminAuth(req, res, next) {
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const key = bearer || req.query.key || req.headers["x-admin-key"];
  if (key && key === ADMIN_PASSWORD) return next();
  return res.status(401).json({ ok: false, error: "unauthorized" });
}

/* ---------- Admin: 목록 ---------- */
app.get("/api/admin/submissions", adminAuth, (req, res) => {
  res.json({ ok: true, items: listSubmissions() });
});

/* ---------- Admin: 상세 ---------- */
app.get("/api/admin/submissions/:id", adminAuth, (req, res) => {
  const item = getSubmission(req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: "not found" });
  res.json({ ok: true, item, DIMS, LEVELS });
});

/* ---------- Admin: 평가 저장(보정/코멘트) ---------- */
app.post("/api/admin/submissions/:id/evaluation", adminAuth, (req, res) => {
  const item = getSubmission(req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: "not found" });
  upsertEvaluation(req.params.id, req.body || {});
  res.json({ ok: true });
});

/* ---------- Admin: 상태 변경 ---------- */
app.post("/api/admin/submissions/:id/status", adminAuth, (req, res) => {
  const { status } = req.body || {};
  if (!["submitted", "reviewing", "done"].includes(status))
    return res.status(400).json({ ok: false, error: "bad status" });
  setStatus(req.params.id, status);
  res.json({ ok: true });
});

/* ---------- 헬스체크 ---------- */
app.get("/healthz", (req, res) => res.json({ ok: true }));
app.get("/favicon.ico", (req, res) => res.status(204).end());

/* ---------- 정적 파일 ---------- */
app.use(express.static(PUBLIC_DIR));
app.get("/admin", (req, res) => res.sendFile(join(PUBLIC_DIR, "admin.html")));
app.get("/", (req, res) => res.sendFile(join(PUBLIC_DIR, "index.html")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ AI Readiness server on http://0.0.0.0:${PORT}`);
  console.log(`   진단:  /`);
  console.log(`   Admin: /admin  (password: ${ADMIN_PASSWORD === "pwc-admin" ? "기본값 — 운영 시 변경 필수" : "환경변수 설정됨"})`);
});
