/* =========================================================================
   JSON 파일 저장소 (네이티브 모듈 없음 — Railway/Nixpacks 빌드 안전)
   - DB_PATH(예: /data/data.db) 기준으로 같은 디렉터리에 store.json 으로 영속
   - 기존 better-sqlite3 버전과 동일한 export 인터페이스 유지
   - submissions: 현업 제출 (답변 JSON + 자동점수 + AI평가)
   - evaluations: 평가자(컨설턴트) 수동 보정/코멘트
   ========================================================================= */
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";

// 기존 DB_PATH(sqlite 파일 경로)와 호환: 같은 디렉터리에 JSON 저장
const DB_PATH = process.env.DB_PATH || "./data/data.db";
const DATA_DIR = dirname(DB_PATH);
const STORE_PATH = join(DATA_DIR, "store.json");

try {
  mkdirSync(DATA_DIR, { recursive: true });
} catch {}

// ---------- 인메모리 상태 + 파일 영속 ----------
let store = { submissions: [], evaluations: {} };

function load() {
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      store = {
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
        evaluations: parsed.evaluations && typeof parsed.evaluations === "object" ? parsed.evaluations : {},
      };
    }
  } catch (e) {
    console.error("[db] store.json load failed, starting empty:", e?.message || e);
    store = { submissions: [], evaluations: {} };
  }
}

function persist() {
  // 원자적 쓰기: temp 파일에 쓰고 rename
  const tmp = STORE_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
  renameSync(tmp, STORE_PATH);
}

load();

// ---------- 공개 API (better-sqlite3 버전과 동일) ----------

export function insertSubmission(s) {
  // submissions 는 그대로 객체로 저장 (envs/answers/scores 는 index.js 에서 JSON 문자열로 들어옴)
  store.submissions.push({ ...s });
  persist();
}

export function getSubmission(id) {
  const row = store.submissions.find((r) => r.id === id);
  if (!row) return null;
  const ev = store.evaluations[id] || null;
  return { ...parseRow(row), evaluation: ev };
}

export function listSubmissions() {
  // created_at 내림차순
  const sorted = [...store.submissions].sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at))
  );
  return sorted.map((s) => {
    const e = store.evaluations[s.id] || {};
    return {
      id: s.id,
      created_at: s.created_at,
      company: s.company,
      department: s.department,
      respondent: s.respondent,
      email: s.email,
      goal: s.goal,
      target_process: s.target_process,
      status: s.status,
      scores: safeParse(s.scores),
      grade: e.grade ?? null,
      override_level: e.override_level ?? null,
    };
  });
}

export function upsertEvaluation(id, e) {
  const updated_at = new Date().toISOString();
  store.evaluations[id] = {
    submission_id: id,
    updated_at,
    evaluator: e.evaluator ?? null,
    override_level: e.override_level ?? null,
    recommend_track: e.recommend_track ?? null,
    grade: e.grade ?? null,
    comment: e.comment ?? null,
    internal_memo: e.internal_memo ?? null,
  };
  // 상태 자동 갱신
  const sub = store.submissions.find((r) => r.id === id);
  if (sub) sub.status = "done";
  persist();
}

export function setStatus(id, status) {
  const sub = store.submissions.find((r) => r.id === id);
  if (sub) {
    sub.status = status;
    persist();
  }
}

// ---------- helpers ----------
function parseRow(r) {
  return {
    ...r,
    envs: safeParse(r.envs),
    answers: safeParse(r.answers),
    scores: safeParse(r.scores),
  };
}
function safeParse(v) {
  if (v == null) return null;
  if (typeof v === "object") return v; // 이미 객체면 그대로
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

export default store;
