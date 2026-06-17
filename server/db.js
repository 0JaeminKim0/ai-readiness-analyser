/* =========================================================================
   SQLite 저장소 (better-sqlite3)
   - Railway Volume 에 영속 (DB_PATH 환경변수)
   - submissions: 현업 제출 (답변 JSON + 자동점수 + AI평가)
   - evaluations: 평가자(컨설턴트) 수동 보정/코멘트
   ========================================================================= */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH || "./data/data.db";
try {
  mkdirSync(dirname(DB_PATH), { recursive: true });
} catch {}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS submissions (
  id           TEXT PRIMARY KEY,
  created_at   TEXT NOT NULL,
  company      TEXT,
  department   TEXT,
  respondent   TEXT,
  role         TEXT,
  email        TEXT,
  phone        TEXT,
  industry     TEXT,
  company_size TEXT,
  target_process TEXT,
  goal         TEXT,
  envs         TEXT,          -- JSON array
  answers      TEXT,          -- JSON object
  scores       TEXT,          -- JSON object (결정론적 점수)
  ai_report    TEXT,          -- Claude markdown
  ai_source    TEXT,          -- claude | fallback
  duration_ms  INTEGER,
  status       TEXT DEFAULT 'submitted'  -- submitted | reviewing | done
);

CREATE TABLE IF NOT EXISTS evaluations (
  submission_id TEXT PRIMARY KEY,
  updated_at    TEXT NOT NULL,
  evaluator     TEXT,
  override_level INTEGER,     -- 평가자 보정 종합 레벨
  recommend_track TEXT,       -- P | G | both
  grade         TEXT,         -- 종합 등급(예: A/B/C)
  comment       TEXT,         -- 고객용 코멘트
  internal_memo TEXT,         -- 내부 비공개 메모
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);
`);

export function insertSubmission(s) {
  const stmt = db.prepare(`
    INSERT INTO submissions
      (id, created_at, company, department, respondent, role, email, phone,
       industry, company_size, target_process, goal, envs, answers, scores,
       ai_report, ai_source, duration_ms, status)
    VALUES
      (@id, @created_at, @company, @department, @respondent, @role, @email, @phone,
       @industry, @company_size, @target_process, @goal, @envs, @answers, @scores,
       @ai_report, @ai_source, @duration_ms, @status)
  `);
  stmt.run(s);
}

export function getSubmission(id) {
  const row = db.prepare("SELECT * FROM submissions WHERE id = ?").get(id);
  if (!row) return null;
  const ev = db.prepare("SELECT * FROM evaluations WHERE submission_id = ?").get(id);
  return { ...parseRow(row), evaluation: ev || null };
}

export function listSubmissions() {
  const rows = db
    .prepare(
      `SELECT s.id, s.created_at, s.company, s.department, s.respondent, s.email,
              s.goal, s.target_process, s.status, s.scores,
              e.grade, e.override_level
       FROM submissions s
       LEFT JOIN evaluations e ON e.submission_id = s.id
       ORDER BY s.created_at DESC`
    )
    .all();
  return rows.map((r) => ({
    ...r,
    scores: safeParse(r.scores),
  }));
}

export function upsertEvaluation(id, e) {
  const updated_at = new Date().toISOString();
  db.prepare(
    `INSERT INTO evaluations
       (submission_id, updated_at, evaluator, override_level, recommend_track, grade, comment, internal_memo)
     VALUES (@submission_id, @updated_at, @evaluator, @override_level, @recommend_track, @grade, @comment, @internal_memo)
     ON CONFLICT(submission_id) DO UPDATE SET
       updated_at=@updated_at, evaluator=@evaluator, override_level=@override_level,
       recommend_track=@recommend_track, grade=@grade, comment=@comment, internal_memo=@internal_memo`
  ).run({
    submission_id: id,
    updated_at,
    evaluator: e.evaluator ?? null,
    override_level: e.override_level ?? null,
    recommend_track: e.recommend_track ?? null,
    grade: e.grade ?? null,
    comment: e.comment ?? null,
    internal_memo: e.internal_memo ?? null,
  });
  // 상태 자동 갱신
  db.prepare("UPDATE submissions SET status='done' WHERE id=?").run(id);
}

export function setStatus(id, status) {
  db.prepare("UPDATE submissions SET status=? WHERE id=?").run(status, id);
}

function parseRow(r) {
  return {
    ...r,
    envs: safeParse(r.envs),
    answers: safeParse(r.answers),
    scores: safeParse(r.scores),
  };
}
function safeParse(v) {
  try {
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export default db;
