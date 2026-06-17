/* =========================================================================
   데이터 AI Readiness 자가진단 - 데이터 모델 (서버 측 진실 원본)
   - 환경(엑셀/시스템/메신저/종이)을 먼저 고르면 해당 질문만 노출
   - 점수는 결정론적으로 계산 (같은 답 = 같은 점수)
   - 자유서술(암묵지) 해석 + 종합 평가는 Claude Opus 가 담당
   ========================================================================= */

/* ---------- 차원(Dimension) 메타 ----------
   track: "both"(공통) | "P"(예측·분석형) | "G"(생성·RAG형) */
export const DIMS = {
  C1: { name: "데이터 품질", track: "both", desc: "표기·형식의 일관성, 결측·중복" },
  C2: { name: "접근성·통합", track: "both", desc: "추출·연계 용이성, 사일로" },
  C3: { name: "거버넌스·보안", track: "both", desc: "오너십, 권한, 민감정보" },
  C4: { name: "구조·메타데이터", track: "both", desc: "기계가독성, 데이터 사전" },
  C5: { name: "인프라·파이프라인", track: "both", desc: "갱신 자동화, 이력" },
  P1: { name: "양·이력 깊이", track: "P", desc: "축적 기간, 연속성" },
  P2: { name: "라벨·결과값", track: "P", desc: "정답값 기록 여부" },
  P3: { name: "대표성·편향", track: "P", desc: "쏠림, 드문 케이스 비율" },
  P4: { name: "피처화 가능성", track: "P", desc: "영향 요인 기록 여부" },
  G1: { name: "디지털화", track: "G", desc: "텍스트 추출 가능 여부" },
  G2: { name: "청킹·자기완결성", track: "G", desc: "답이 한 곳에 모이는지" },
  G3: { name: "최신성·버전", track: "G", desc: "유효본 구분" },
  G4: { name: "권한 세분화", track: "G", desc: "문서 단위 권한 (RAG 누수 방지)" },
  G5: { name: "암묵지 의존도", track: "G", desc: "판단 기준의 문서화" },
};

/* ---------- 성숙도 레벨 ---------- */
export const LEVELS = {
  1: { ko: "Ad-hoc", desc: "AI 투입 불가. 기초 정비부터" },
  2: { ko: "인지", desc: "문제는 인지, 산발적 대응" },
  3: { ko: "정형화", desc: "정제·접근은 되나 자동화 미흡" },
  4: { ko: "관리", desc: "자동화·표준 갖춤. 실전 투입 가능" },
  5: { ko: "최적화", desc: "거버넌스·검증까지 완비" },
};

/* ---------- 환경 정의 ---------- */
export const ENVS = [
  { id: "excel", label: "엑셀/스프레드시트", icon: "📊", desc: "수기로 관리하는 표·시트가 데이터의 중심" },
  { id: "system", label: "사내 시스템/DB", icon: "🗄️", desc: "ERP·CRM·그룹웨어 등 시스템에 데이터가 쌓임" },
  { id: "messenger", label: "메신저/이메일", icon: "💬", desc: "업무 지식·결정이 대화·메일에 흩어져 있음" },
  { id: "paper", label: "종이/스캔 문서", icon: "📄", desc: "출력물·스캔본·PDF 위주로 기록" },
];

/* ---------- AI 도입 목적(트랙) ---------- */
export const GOALS = [
  {
    id: "P",
    label: "예측·분석형 AI",
    icon: "📈",
    desc: "수요예측, 이탈예측, 이상탐지, 수치 분석 등 — 정형 데이터로 결과를 예측",
  },
  {
    id: "G",
    label: "생성·RAG형 AI",
    icon: "🤖",
    desc: "문서 기반 챗봇, 검색·요약, 보고서 자동작성 등 — 문서/지식을 활용해 생성",
  },
  {
    id: "both",
    label: "둘 다 / 아직 미정",
    icon: "🔀",
    desc: "두 방향 모두 검토 중이거나 아직 정하지 못함",
  },
];

/* ---------- 질문 정의 ----------
   각 질문:
   - id           : 고유 ID
   - dim          : 연결된 차원(DIMS 키) → 점수 집계 단위
   - track        : "both" | "P" | "G"  (목적별 노출)
   - envs         : 노출될 환경 배열. ["*"] 이면 모든 환경
   - q            : 질문 텍스트
   - options      : [{ label, score(1~5) }] 결정론적 점수
   - weight       : 차원 내 가중치 (기본 1)
   서술형(자유응답):
   - type:"text"  : 점수 없음. Claude 해석용 암묵지 수집
*/
export const QUESTIONS = [
  /* ===================== 공통(C1~C5) ===================== */
  {
    id: "C1_1", dim: "C1", track: "both", envs: ["*"],
    q: "동일한 항목(예: 거래처명, 날짜, 금액)이 항상 같은 형식으로 기록되나요?",
    options: [
      { label: "사람마다·시점마다 제각각이다", score: 1 },
      { label: "대체로 비슷하나 예외가 잦다", score: 2 },
      { label: "기본 규칙은 있으나 강제되지 않는다", score: 3 },
      { label: "입력 규칙이 있고 대부분 지켜진다", score: 4 },
      { label: "검증/제약으로 형식이 강제된다", score: 5 },
    ],
  },
  {
    id: "C1_2", dim: "C1", track: "both", envs: ["*"],
    q: "결측값(빈칸)·중복 데이터는 얼마나 자주 발생하나요?",
    options: [
      { label: "매우 흔하고 관리하지 않는다", score: 1 },
      { label: "자주 있고 그때그때 수기로 고친다", score: 2 },
      { label: "가끔 있고 발견하면 정리한다", score: 3 },
      { label: "드물고 정기적으로 점검한다", score: 4 },
      { label: "거의 없고 자동 검증으로 차단된다", score: 5 },
    ],
  },
  {
    id: "C2_1", dim: "C2", track: "both", envs: ["*"],
    q: "필요한 데이터를 한곳에서 추출/조회하기가 얼마나 쉬운가요?",
    options: [
      { label: "여기저기 흩어져 찾기 매우 어렵다", score: 1 },
      { label: "담당자에게 물어봐야 겨우 찾는다", score: 2 },
      { label: "위치는 알지만 수작업 취합이 필요하다", score: 3 },
      { label: "정해진 경로로 비교적 쉽게 뽑는다", score: 4 },
      { label: "API/쿼리로 즉시 통합 추출된다", score: 5 },
    ],
  },
  {
    id: "C2_2", dim: "C2", track: "both", envs: ["system", "excel"],
    q: "부서·시스템 간 데이터가 서로 연결(매칭)되나요?",
    options: [
      { label: "전혀 연결되지 않는 사일로 상태다", score: 1 },
      { label: "수작업으로만 짜맞춘다", score: 2 },
      { label: "일부 공통키로 부분 연결된다", score: 3 },
      { label: "표준 키로 대부분 연결된다", score: 4 },
      { label: "통합 ID 체계로 완전히 연계된다", score: 5 },
    ],
  },
  {
    id: "C3_1", dim: "C3", track: "both", envs: ["*"],
    q: "이 데이터의 '주인(오너)'과 관리 책임이 명확한가요?",
    options: [
      { label: "누가 책임지는지 모른다", score: 1 },
      { label: "암묵적으로 누군가 한다", score: 2 },
      { label: "담당자는 있으나 문서화 안 됨", score: 3 },
      { label: "오너·역할이 정의되어 있다", score: 4 },
      { label: "거버넌스 체계로 관리·감사된다", score: 5 },
    ],
  },
  {
    id: "C3_2", dim: "C3", track: "both", envs: ["*"],
    q: "개인정보·기밀 등 민감정보 접근 권한이 통제되나요?",
    options: [
      { label: "누구나 열람 가능하다", score: 1 },
      { label: "통제 의식은 있으나 실제론 느슨하다", score: 2 },
      { label: "폴더/파일 단위로 일부 제한한다", score: 3 },
      { label: "역할 기반 권한이 적용된다", score: 4 },
      { label: "세분화 권한+접근 로그까지 관리된다", score: 5 },
    ],
  },
  {
    id: "C4_1", dim: "C4", track: "both", envs: ["*"],
    q: "각 항목의 의미를 설명한 자료(데이터 사전/설명서)가 있나요?",
    options: [
      { label: "없다. 아는 사람만 안다", score: 1 },
      { label: "개인 메모 수준으로 일부 있다", score: 2 },
      { label: "일부 핵심 항목만 설명되어 있다", score: 3 },
      { label: "주요 데이터에 사전이 정비돼 있다", score: 4 },
      { label: "전 항목 표준 메타데이터로 관리된다", score: 5 },
    ],
  },
  {
    id: "C5_1", dim: "C5", track: "both", envs: ["*"],
    q: "데이터가 최신으로 갱신되는 과정이 자동화되어 있나요?",
    options: [
      { label: "전부 수기 입력/복사·붙여넣기다", score: 1 },
      { label: "대부분 수작업, 일부만 자동", score: 2 },
      { label: "정기 수작업 절차가 정해져 있다", score: 3 },
      { label: "상당 부분 자동 갱신된다", score: 4 },
      { label: "파이프라인+이력관리까지 자동화", score: 5 },
    ],
  },

  /* ===================== 예측·분석형(P) ===================== */
  {
    id: "P1_1", dim: "P1", track: "P", envs: ["*"],
    q: "분석에 쓸 데이터가 얼마나 오랜 기간 축적돼 있나요?",
    options: [
      { label: "거의 없거나 최근 것만 있다", score: 1 },
      { label: "6개월~1년 미만", score: 2 },
      { label: "1~2년 정도", score: 3 },
      { label: "2~3년치 연속 데이터", score: 4 },
      { label: "3년 이상 끊김 없이 축적", score: 5 },
    ],
  },
  {
    id: "P2_1", dim: "P2", track: "P", envs: ["*"],
    q: "예측하려는 '결과값(정답)'이 데이터에 함께 기록되나요? (예: 실제 판매량, 이탈 여부)",
    options: [
      { label: "결과값을 따로 기록하지 않는다", score: 1 },
      { label: "일부만, 비정기적으로 기록", score: 2 },
      { label: "기록은 하나 입력·실제 시점이 어긋난다", score: 3 },
      { label: "대부분 시점과 함께 기록된다", score: 4 },
      { label: "모든 케이스에 결과값이 라벨링된다", score: 5 },
    ],
  },
  {
    id: "P3_1", dim: "P3", track: "P", envs: ["*"],
    q: "데이터가 특정 기간·대상에 쏠려 있지 않고 다양한 경우를 포함하나요?",
    options: [
      { label: "특정 케이스에 심하게 쏠려 있다", score: 1 },
      { label: "쏠림이 있고 드문 케이스는 거의 없다", score: 2 },
      { label: "보통이며 일부 편향이 있다", score: 3 },
      { label: "대체로 고르게 분포한다", score: 4 },
      { label: "드문 케이스까지 대표성 있게 포함", score: 5 },
    ],
  },
  {
    id: "P4_1", dim: "P4", track: "P", envs: ["*"],
    q: "결과에 영향을 줄 만한 '요인'들이 데이터로 함께 남아 있나요? (예: 프로모션, 날씨, 요일)",
    options: [
      { label: "결과만 있고 요인 정보는 없다", score: 1 },
      { label: "극히 일부 요인만 있다", score: 2 },
      { label: "주요 요인 일부가 기록된다", score: 3 },
      { label: "대부분의 핵심 요인이 기록된다", score: 4 },
      { label: "외부 데이터까지 풍부히 결합 가능", score: 5 },
    ],
  },

  /* ===================== 생성·RAG형(G) ===================== */
  {
    id: "G1_1", dim: "G1", track: "G", envs: ["paper", "*"],
    q: "활용하려는 문서에서 텍스트를 컴퓨터가 바로 읽어낼 수 있나요?",
    options: [
      { label: "대부분 종이/이미지라 추출 불가", score: 1 },
      { label: "스캔본 위주, OCR 안 돼 있음", score: 2 },
      { label: "혼재(일부 디지털·일부 종이)", score: 3 },
      { label: "대부분 디지털 텍스트 문서다", score: 4 },
      { label: "전부 구조화된 디지털 문서다", score: 5 },
    ],
  },
  {
    id: "G2_1", dim: "G2", track: "G", envs: ["*"],
    q: "하나의 질문에 대한 답이 보통 한 문서/한 곳에 모여 있나요, 흩어져 있나요?",
    options: [
      { label: "여러 문서·대화에 파편적으로 흩어짐", score: 1 },
      { label: "대체로 흩어져 있어 짜맞춰야 한다", score: 2 },
      { label: "절반 정도는 한곳에 정리돼 있다", score: 3 },
      { label: "대부분 자기완결적 문서로 정리됨", score: 4 },
      { label: "주제별로 완결성 있게 구조화됨", score: 5 },
    ],
  },
  {
    id: "G3_1", dim: "G3", track: "G", envs: ["*"],
    q: "여러 버전 중 '현재 유효한 최신본'을 명확히 구분할 수 있나요?",
    options: [
      { label: "최신본이 무엇인지 알 수 없다", score: 1 },
      { label: "파일명·날짜로 추측해야 한다", score: 2 },
      { label: "일부는 버전이 관리된다", score: 3 },
      { label: "대부분 최신본이 명확히 구분된다", score: 4 },
      { label: "버전·유효기간이 체계적으로 관리됨", score: 5 },
    ],
  },
  {
    id: "G4_1", dim: "G4", track: "G", envs: ["*"],
    q: "문서별 열람 권한이 나뉘어 있나요? (RAG 답변에 비공개 정보가 새지 않도록)",
    options: [
      { label: "권한 구분이 전혀 없다", score: 1 },
      { label: "거의 모두 공유 상태다", score: 2 },
      { label: "폴더 단위로만 나뉜다", score: 3 },
      { label: "문서/그룹 단위로 권한이 있다", score: 4 },
      { label: "문서 단위 세분화+감사 가능", score: 5 },
    ],
  },
  {
    id: "G5_1", dim: "G5", track: "G", envs: ["*"],
    q: "업무 판단 기준이 문서로 적혀 있나요, 사람 머릿속(암묵지)에 있나요?",
    options: [
      { label: "거의 전부 사람 머릿속에 있다", score: 1 },
      { label: "대부분 암묵지, 일부만 문서화", score: 2 },
      { label: "절반 정도는 문서로 있다", score: 3 },
      { label: "대부분 문서화되어 있다", score: 4 },
      { label: "기준·예외까지 문서로 체계화됨", score: 5 },
    ],
  },

  /* ===================== 자유서술(암묵지 수집) ===================== */
  {
    id: "T1", dim: null, track: "both", envs: ["*"], type: "text",
    q: "현재 이 업무에서 '사람만 할 수 있다'고 느끼는 판단/노하우가 있다면 구체적으로 적어주세요.",
    placeholder: "예: 거래처별 특수 단가 적용 규칙은 베테랑 직원만 알고 있음...",
  },
  {
    id: "T2", dim: null, track: "both", envs: ["*"], type: "text",
    q: "데이터·문서 관리에서 가장 답답하거나 시간이 많이 드는 부분은 무엇인가요?",
    placeholder: "예: 매달 여러 시스템에서 엑셀을 뽑아 수기로 합치는 데 3일이 걸린다...",
  },
  {
    id: "T3", dim: null, track: "both", envs: ["*"], type: "text",
    q: "AI로 가장 먼저 해결하고 싶은 구체적인 업무/목표가 있다면 적어주세요.",
    placeholder: "예: 고객 문의에 대한 1차 답변을 사내 규정 문서 기반으로 자동 작성하고 싶다...",
  },
];

/* ---------- 응답자 시작 정보 필드 ---------- */
export const INTAKE_FIELDS = [
  { id: "company", label: "회사명", type: "text", required: true, placeholder: "(주)예시" },
  { id: "department", label: "사업부/팀명", type: "text", required: true, placeholder: "영업관리팀" },
  { id: "respondent", label: "담당자명", type: "text", required: true, placeholder: "홍길동" },
  { id: "role", label: "직책/역할", type: "text", required: false, placeholder: "팀장 / 데이터 담당" },
  { id: "email", label: "이메일", type: "email", required: true, placeholder: "name@company.com" },
  { id: "phone", label: "연락처", type: "text", required: false, placeholder: "010-0000-0000" },
  { id: "industry", label: "산업/업종", type: "text", required: false, placeholder: "제조 / 유통 / 금융 등" },
  { id: "company_size", label: "회사 규모(임직원 수)", type: "select", required: false,
    options: ["~50명", "51~300명", "301~1000명", "1000명 초과"] },
  { id: "target_process", label: "진단 대상 업무/프로세스", type: "text", required: true,
    placeholder: "예: 월별 수요예측, 고객 문의 응대" },
];
