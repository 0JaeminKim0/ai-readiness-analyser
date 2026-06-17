# 데이터 AI Readiness 자가진단 (PwC)

현업에게 진단 링크를 보내 응답을 받고, 컨설턴트가 Admin 콘솔에서 결과를 평가하는 풀스택 웹앱입니다.

## 개요
- **목표**: 기업의 데이터 성숙도를 레벨(1~5)로 진단하고, Claude Opus 기반 맞춤 평가 리포트를 제공
- **흐름**: 현업이 `/` 에서 진단 응답 → 제출 시 **"감사합니다" 완료 화면으로 종료(결과 비공개)** → 백엔드에서 점수 계산 + Claude 종합평가 → DB 저장 → 컨설턴트만 `/admin` 에서 결과 검토·보정·코멘트
- **결과 비공개 정책**: 현업 화면과 `/api/submit` 응답에는 점수·리포트가 일절 포함되지 않음. 결과는 오직 `/admin` 콘솔(비밀번호 인증)에서만 조회 가능
- **브랜딩**: PwC 워드마크 + 주황 계열 컬러

## 주요 기능
- 시작 전 기본정보 입력 (회사명, 팀, 담당자, 이메일, 산업/규모, 대상 업무 등)
- AI 도입 목적 선택 (예측·분석형 / 생성·RAG형 / 둘다)
- 데이터 환경 선택(엑셀/시스템/메신저/종이) → 해당 질문만 노출
- 결정론적 점수 계산 (같은 답 = 같은 점수, 차원 14종)
- Claude Opus 종합 평가 리포트 (`max_tokens` 상향, 미설정 시 폴백)
- Admin: 응답 목록/상세, 자동점수 확인, 수동 레벨 보정·등급·코멘트·내부메모, 상태 관리

## 기능 진입 경로 (URI)
| 경로 | 메서드 | 인증 | 설명 |
|---|---|---|---|
| `/` | GET | - | 현업용 진단 화면 (링크 배포 대상) |
| `/admin` | GET | 화면 내 비밀번호 | 평가자 콘솔 |
| `/api/config` | GET | - | 질문/메타 데이터 |
| `/api/submit` | POST | - | 제출 → 점수+AI평가+저장 (응답은 `{ok,received}` 만, 결과 미반환) |
| `/api/admin/submissions` | GET | `X-Admin-Key` | 응답 목록 |
| `/api/admin/submissions/:id` | GET | `X-Admin-Key` | 응답 상세 |
| `/api/admin/submissions/:id/evaluation` | POST | `X-Admin-Key` | 평가 저장 |
| `/api/admin/submissions/:id/status` | POST | `X-Admin-Key` | 상태 변경 |
| `/healthz` | GET | - | 헬스체크 |

## 데이터 구조 / 저장소
- **저장소**: SQLite (`better-sqlite3`), `DB_PATH` 경로에 영속 (Railway Volume 권장)
- **테이블**
  - `submissions`: 응답자 정보 + `answers`(JSON) + `scores`(JSON) + `ai_report` + 상태
  - `evaluations`: 평가자 보정 레벨/추천 트랙/등급/코멘트/내부메모

## 환경 변수 (`.env.example` 참고)
| 변수 | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API 키. 미설정 시 폴백 리포트로 동작 |
| `CLAUDE_MODEL` | 기본 `claude-opus-4-20250514` |
| `CLAUDE_MAX_TOKENS` | 종합평가 출력 토큰 한계 (기본 **8000**, 기존 1000에서 상향) |
| `ADMIN_PASSWORD` | `/admin` 접속 비밀번호 (**운영 시 반드시 변경**) |
| `DB_PATH` | SQLite 경로 (Railway Volume: 예 `/data/data.db`) |
| `PORT` | Railway가 자동 주입 |

## 로컬 실행
```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... ADMIN_PASSWORD=mypw node server/index.js
# 진단: http://localhost:3000   Admin: http://localhost:3000/admin
```

## Railway 배포
1. GitHub에 푸시 → Railway에서 New Project → Deploy from GitHub Repo
2. **Variables** 에 `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`, `CLAUDE_MAX_TOKENS=8000`, `DB_PATH=/data/data.db` 설정
3. **Volume** 추가 후 마운트 경로를 `/data` 로 지정 (SQLite 영속 — 필수)
4. 시작 명령은 `node server/index.js` (railway.json/Procfile 자동 적용)
5. 배포 후 도메인의 `/` 링크를 현업에 배포, `/admin` 은 컨설턴트만 사용

## 미구현 / 다음 단계
- 결과 PDF 리포트 내보내기
- 평가자 다중 계정/권한 분리
- 진행 중 이어하기(localStorage 임시저장)
- 산업별 벤치마크 비교

## 배포 상태
- **플랫폼**: Railway (Nixpacks)
- **스택**: Node.js + Express + better-sqlite3 + React(CDN) + Anthropic SDK
- **최종 업데이트**: 2026-06-17
