/* =====================================================================
   브라우저 대리 모델 (미리보기 엔진)
   - 서버(FM·LLM) 없이도 체험이 돌아가도록 25개 진단군 확률을 규칙표로 계산한다.
   - 서버 연결 시 교체 지점:  Engine.probs()  → FM API,   Engine.tree() → 트리/LLM API
   ===================================================================== */

const DX = [
  "패혈증", "패혈성 쇼크", "폐렴", "심부전", "심부정맥", "급성 심근경색", "고혈압", "당뇨",
  "지질대사 장애", "만성 신장질환", "급성 신부전", "기타 하기도 질환", "요로 감염", "위장관 출혈",
  "뇌졸중", "갑상선 질환", "빈혈", "전해질 이상", "간질환", "췌장염", "폐색전증", "천식·COPD",
  "골절·외상", "우울·불안", "알코올 관련"
];

/* ---------- 선택지 ---------- */
const AGES = [
  { id: "age_young", label: "20 – 39세" }, { id: "age_mid", label: "40 – 59세" }, { id: "age_old", label: "60세 이상" }
];
const SEXES = [{ id: "sex_f", label: "여성" }, { id: "sex_m", label: "남성" }];
const CHRONIC = [
  { id: "c_htn", label: "고혈압", med: "항고혈압제" },
  { id: "c_dm", label: "당뇨", med: "메트포르민" },
  { id: "c_lipid", label: "고지혈증", med: "스타틴" },
  { id: "c_hf", label: "심부전", med: "이뇨제" },
  { id: "c_af", label: "심방세동", med: "항응고제" },
  { id: "c_ckd", label: "만성 신장질환", med: null },
  { id: "c_copd", label: "천식 · COPD", med: "흡입기" },
  { id: "c_liver", label: "간질환", med: null },
];
const EVENTS = [
  { id: "e_chest", label: "가슴이 조이듯 아프다", icon: "♥", vit: { temp: 0, hr: 1, sbp: 2, spo2: 0, rr: 1 } },
  { id: "e_fever", label: "갑자기 고열과 오한", icon: "°", vit: { temp: 2, hr: 2, sbp: 1, spo2: 0, rr: 1 } },
  { id: "e_dyspnea", label: "숨이 차서 눕지 못한다", icon: "≈", vit: { temp: 0, hr: 1, sbp: 2, spo2: 2, rr: 2 } },
  { id: "e_abd", label: "배가 심하게 아프다", icon: "◍", vit: { temp: 1, hr: 1, sbp: 2, spo2: 0, rr: 0 } },
  { id: "e_trauma", label: "넘어져서 크게 다쳤다", icon: "✕", vit: { temp: 0, hr: 1, sbp: 2, spo2: 0, rr: 1 } },
  { id: "e_conf", label: "의식이 흐려지고 말이 어눌하다", icon: "◌", vit: { temp: 0, hr: 0, sbp: 3, spo2: 0, rr: 0 } },
  { id: "e_edema", label: "다리가 붓고 밤에 숨이 찬다", icon: "▽", vit: { temp: 0, hr: 1, sbp: 2, spo2: 1, rr: 1 } },
];
const EVENTS_OUT = [
  { id: "o_checkup", label: "건강검진에서 이상 수치가 나왔다", icon: "≡", vit: { temp: 0, hr: 0, sbp: 2, spo2: 0, rr: 0 } },
  { id: "o_thirst", label: "물을 많이 마시고 소변이 잦다", icon: "◇", vit: { temp: 0, hr: 0, sbp: 2, spo2: 0, rr: 0 } },
  { id: "o_fatigue", label: "늘 피곤하고 체중이 줄었다", icon: "◡", vit: { temp: 0, hr: 1, sbp: 2, spo2: 0, rr: 0 } },
  { id: "o_headache", label: "뒷목이 뻣뻣하고 어지럽다", icon: "◠", vit: { temp: 0, hr: 0, sbp: 3, spo2: 0, rr: 0 } },
  { id: "o_exert", label: "계단을 오르면 숨이 찬다", icon: "≈", vit: { temp: 0, hr: 1, sbp: 2, spo2: 1, rr: 1 } },
  { id: "o_vision", label: "시야가 흐리고 눈이 뻑뻑하다", icon: "◎", vit: { temp: 0, hr: 0, sbp: 2, spo2: 0, rr: 0 } },
  { id: "o_skin", label: "낫지 않는 피부 병변이 있다", icon: "◍", vit: { temp: 0, hr: 0, sbp: 2, spo2: 0, rr: 0 } },
];
const FREE_KEYWORDS_OUT = [
  ["o_checkup", ["검진", "수치", "결과지", "콜레스테롤", "혈당"]],
  ["o_thirst", ["갈증", "소변", "물", "화장실", "목마"]],
  ["o_fatigue", ["피곤", "피로", "체중", "살", "기운"]],
  ["o_headache", ["뒷목", "두통", "머리", "어지"]],
  ["o_exert", ["계단", "숨", "호흡", "운동"]],
  ["o_vision", ["시야", "눈", "흐리", "시력"]],
  ["o_skin", ["피부", "병변", "가려", "발진", "상처"]],
];
const FREE_KEYWORDS = [
  ["e_chest", ["가슴", "흉통", "조이", "심장"]],
  ["e_fever", ["열", "오한", "떨", "38", "39", "감기"]],
  ["e_dyspnea", ["숨", "호흡", "헐떡", "산소"]],
  ["e_abd", ["배", "복통", "구토", "설사", "속"]],
  ["e_trauma", ["넘어", "다쳤", "부딪", "골절", "사고", "떨어", "교통"]],
  ["e_conf", ["의식", "어눌", "쓰러", "마비", "어지", "기절", "머리"]],
  ["e_edema", ["붓", "부종", "다리", "체중"]],
];

/* ---------- 활력징후: 4단계 → 값 ---------- */
const VITALS = {
  temp: { label: "체온", unit: "℃", levels: ["정상", "미열", "고열", "매우 높음"], vals: [36.7, 37.8, 38.7, 39.8], feat: [null, "temp_hi", "temp_hi", "temp_vhi"] },
  hr:   { label: "심박수", unit: "/min", levels: ["정상", "빠름", "매우 빠름", "위험"], vals: [76, 104, 124, 142], feat: [null, "hr_hi", "hr_hi", "hr_vhi"] },
  sbp:  { label: "수축기 혈압", unit: "mmHg", levels: ["매우 낮음", "낮음", "정상", "높음"], vals: [78, 94, 122, 168], feat: ["sbp_vlo", "sbp_lo", null, "sbp_hi"] },
  spo2: { label: "산소포화도", unit: "%", levels: ["정상", "약간 낮음", "낮음", "위험"], vals: [98, 93, 89, 84], feat: [null, "spo2_lo", "spo2_lo", "spo2_vlo"] },
  rr:   { label: "호흡수", unit: "/min", levels: ["정상", "빠름", "매우 빠름", "위험"], vals: [15, 22, 27, 33], feat: [null, "rr_hi", "rr_hi", "rr_vhi"] },
};
// sbp 기본은 "정상"(index 2). 다른 항목은 index 0 이 정상.
const VITAL_DEFAULT = { temp: 0, hr: 0, sbp: 2, spo2: 0, rr: 0 };

/* ---------- 가중치 표 (희소) ---------- */
const BASE = -3.6;
const W = {
  "패혈증": { e_fever: 2.2, temp_hi: 0.8, temp_vhi: 1.5, hr_hi: 0.5, hr_vhi: 0.9, sbp_lo: 0.5, sbp_vlo: 0.6, rr_hi: 0.5, wbc_hi: 0.8, lac_hi: 1.0, lac_vhi: 1.5, crp_hi: 1.0, e_conf: 0.6, c_ckd: 0.3, c_dm: 0.3, age_old: 0.3, bc_pos: 1.6 },
  "패혈성 쇼크": { e_fever: 1.2, sbp_lo: 1.2, sbp_vlo: 2.3, lac_hi: 0.8, lac_vhi: 1.7, hr_vhi: 0.8, e_conf: 0.6, temp_vhi: 0.5, bc_pos: 0.8 },
  "폐렴": { e_fever: 1.2, e_dyspnea: 1.4, spo2_lo: 0.9, spo2_vlo: 1.2, rr_hi: 0.6, wbc_hi: 0.6, crp_hi: 0.7, c_copd: 0.7, age_old: 0.4, temp_hi: 0.5, cxr_pos: 2.0, cxr_neg: -1.2 },
  "심부전": { c_hf: 2.0, e_dyspnea: 1.2, e_edema: 1.7, bnp_hi: 2.2, bnp_neg: -1.4, spo2_lo: 0.6, c_htn: 0.3, c_af: 0.4, age_old: 0.4, hr_hi: 0.2, cxr_pos: 0.6 },
  "심부정맥": { c_af: 2.0, hr_vhi: 1.2, hr_hi: 0.5, e_conf: 0.4, e_chest: 0.4, c_hf: 0.4, ecg_af: 2.2, ecg_neg: -1.0 },
  "급성 심근경색": { e_chest: 2.3, trop_hi: 2.5, trop_neg: -1.6, c_htn: 0.4, c_dm: 0.5, c_lipid: 0.5, age_old: 0.5, sex_m: 0.3, sbp_lo: 0.3, ecg_st: 2.0 },
  "고혈압": { c_htn: 2.6, sbp_hi: 1.4, age_mid: 0.3, age_old: 0.4 },
  "당뇨": { c_dm: 2.7, glu_hi: 1.0, glu_vhi: 1.8 },
  "지질대사 장애": { c_lipid: 2.7, c_dm: 0.4, c_htn: 0.3, age_mid: 0.2 },
  "만성 신장질환": { c_ckd: 2.7, cr_hi: 1.0, c_dm: 0.4, c_htn: 0.4, hb_lo: 0.4 },
  "급성 신부전": { cr_hi: 1.7, cr_neg: -0.8, sbp_vlo: 0.8, lac_hi: 0.5, e_fever: 0.4, c_ckd: 0.6, e_trauma: 0.3 },
  "기타 하기도 질환": { c_copd: 1.5, e_dyspnea: 1.0, spo2_lo: 0.5, rr_hi: 0.4, e_fever: 0.4 },
  "요로 감염": { e_fever: 1.0, age_old: 0.5, sex_f: 0.6, c_dm: 0.4, wbc_hi: 0.4, e_conf: 0.5 },
  "위장관 출혈": { e_abd: 0.9, hb_lo: 1.9, sbp_lo: 0.6, hr_hi: 0.4, c_liver: 0.7, c_af: 0.4 },
  "뇌졸중": { e_conf: 1.7, c_af: 0.9, c_htn: 0.6, age_old: 0.6, sbp_hi: 0.7 },
  "갑상선 질환": { hr_vhi: 0.4, sex_f: 0.3, hr_hi: 0.2 },
  "빈혈": { hb_lo: 2.3, c_ckd: 0.5, hr_hi: 0.3, sex_f: 0.2 },
  "전해질 이상": { c_ckd: 0.6, e_conf: 0.6, e_abd: 0.4, c_hf: 0.5, cr_hi: 0.4 },
  "간질환": { c_liver: 2.5, e_abd: 0.6, e_conf: 0.4 },
  "췌장염": { e_abd: 1.9, c_lipid: 0.4, wbc_hi: 0.3, crp_hi: 0.3 },
  "폐색전증": { e_dyspnea: 1.0, e_chest: 0.9, spo2_lo: 0.8, hr_hi: 0.6, e_edema: 0.4, c_af: 0.2, cxr_neg: 0.4 },
  "천식·COPD": { c_copd: 2.2, e_dyspnea: 1.2, spo2_lo: 0.6, rr_hi: 0.5 },
  "골절·외상": { e_trauma: 3.0, age_old: 0.3 },
  "우울·불안": { e_chest: 0.4, hr_hi: 0.2, age_young: 0.4 },
  "알코올 관련": { c_liver: 0.8, e_conf: 0.6, e_abd: 0.4, e_trauma: 0.4 },
};

const sig = x => 1 / (1 + Math.exp(-x));

/* ---------- 1시간 채혈 결과 (시나리오에서 유도) ---------- */
const LABS = [
  { id: "wbc", name: "백혈구", unit: "K/µL", normal: 7.4, hi: 14.8, rule: f => f.e_fever || (f.e_abd && f.temp_hi) ? "wbc_hi" : null },
  { id: "crp", name: "CRP", unit: "mg/dL", normal: 0.4, hi: 12.6, rule: f => f.e_fever || f.temp_hi || f.temp_vhi ? "crp_hi" : null },
  { id: "hb", name: "혈색소", unit: "g/dL", normal: 13.8, lo: 8.9, rule: f => (f.e_abd && (f.sbp_lo || f.sbp_vlo)) || (f.c_ckd && f.e_conf) ? "hb_lo" : null },
  { id: "glu", name: "혈당", unit: "mg/dL", normal: 104, hi: 214, vhi: 342, rule: f => f.c_dm ? (f.e_fever ? "glu_vhi" : "glu_hi") : null },
  { id: "cr", name: "크레아티닌", unit: "mg/dL", normal: 0.9, hi: 2.1, rule: f => f.c_ckd || f.sbp_vlo || (f.e_fever && f.sbp_lo) ? "cr_hi" : "cr_neg" },
  { id: "lac", name: "젖산", unit: "mmol/L", normal: 1.1, hi: 3.1, vhi: 5.4, rule: f => f.sbp_vlo ? "lac_vhi" : (f.sbp_lo || (f.e_fever && f.hr_vhi) || f.e_trauma && f.hr_hi) ? "lac_hi" : null },
];

/* ---------- 추가 검사 (게임 + 트리에서 요청) ---------- */
const TESTS = [
  { id: "trop", name: "트로포닌", for: ["급성 심근경색"], sim: f => f.e_chest && (f.age_old || f.c_dm || f.c_lipid || f.c_htn) ? ["trop_hi", "0.84 ng/mL (상승)"] : ["trop_neg", "0.01 ng/mL (정상)"] },
  { id: "bnp", name: "NT-proBNP", for: ["심부전"], sim: f => (f.c_hf || f.e_edema || (f.e_dyspnea && f.age_old)) ? ["bnp_hi", "6,420 pg/mL (상승)"] : ["bnp_neg", "88 pg/mL (정상)"] },
  { id: "bc", name: "혈액배양", for: ["패혈증", "패혈성 쇼크"], sim: f => f.e_fever ? ["bc_pos", "그람음성균 (양성, 48h 후)"] : ["bc_neg", "음성 (48h 후)"] },
  { id: "lac2", name: "젖산 (재검)", for: ["패혈증", "패혈성 쇼크", "급성 신부전"], sim: f => f.sbp_vlo ? ["lac_vhi", "5.8 mmol/L"] : f.sbp_lo || f.e_fever ? ["lac_hi", "3.4 mmol/L"] : ["lac_neg", "1.2 mmol/L (정상)"] },
  { id: "cxr", name: "흉부 X선", for: ["폐렴", "심부전", "기타 하기도 질환", "폐색전증"], sim: f => (f.e_fever && (f.spo2_lo || f.e_dyspnea)) || (f.e_dyspnea && f.c_copd) ? ["cxr_pos", "우하엽 침윤"] : (f.c_hf || f.e_edema) ? ["cxr_edema", "폐부종 소견"] : ["cxr_neg", "특이 소견 없음"] },
  { id: "ecg", name: "심전도", for: ["심부정맥", "급성 심근경색"], sim: f => f.c_af || f.hr_vhi ? ["ecg_af", "심방세동, 심실 반응 빠름"] : f.e_chest && (f.age_old || f.c_dm) ? ["ecg_st", "ST 분절 상승"] : ["ecg_neg", "정상 동율동"] },
  { id: "cr2", name: "크레아티닌 추이", for: ["급성 신부전", "만성 신장질환"], sim: f => f.c_ckd || f.sbp_vlo ? ["cr_hi", "2.3 → 2.6 mg/dL"] : ["cr_neg", "0.9 → 0.9 mg/dL"] },
  { id: "ct", name: "뇌 CT", for: ["뇌졸중"], sim: f => f.e_conf && (f.c_af || f.sbp_hi || f.age_old) ? ["ct_pos", "좌측 중대뇌동맥 영역 저음영"] : ["ct_neg", "급성 병변 없음"] },
  /* --- 트리에서만 쓰는 검사·기록 조회 (게임 카드에는 안 나옴) --- */
  { id: "a1c", name: "HbA1c", for: ["당뇨"], tree: true, sim: f => f.c_dm || f.o_thirst || f.glu_hi || f.glu_vhi ? ["a1c_hi", "8.1 % (상승)"] : ["a1c_neg", "5.4 % (정상)"] },
  { id: "lipid", name: "지질 검사 (LDL·TG·HDL)", for: ["지질대사 장애"], tree: true, sim: f => f.c_lipid || f.lip_hi || f.o_checkup ? ["lip_hi", "LDL 168 · TG 210 · HDL 38 (이상)"] : ["lip_neg", "LDL 98 · TG 110 · HDL 52 (정상)"] },
  { id: "bptrend", name: "혈압 추이 · 가정 혈압", for: ["고혈압"], tree: true, sim: f => f.c_htn || f.sbp_hi || f.o_headache ? ["bp_hi2", "3회 측정 모두 140/90 이상"] : ["bp_neg", "정상 범위"] },
  { id: "egfr", name: "eGFR · 소변 알부민", for: ["만성 신장질환"], tree: true, sim: f => f.c_ckd || f.cr_hi ? ["egfr_lo", "eGFR 41, 알부민뇨 양성"] : ["egfr_neg", "eGFR 92, 알부민뇨 음성"] },
  { id: "ua", name: "소변 검사", for: ["요로 감염"], tree: true, sim: f => f.e_fever && (f.sex_f || f.age_old) ? ["ua_pos", "백혈구·아질산염 양성"] : ["ua_neg", "정상"] },
  { id: "lipase", name: "리파아제", for: ["췌장염"], tree: true, sim: f => f.e_abd ? ["lipase_pos", "612 U/L (상승)"] : ["lipase_neg", "38 U/L (정상)"] },
  { id: "lft", name: "간기능 검사", for: ["간질환", "알코올 관련"], tree: true, sim: f => f.c_liver ? ["lft_hi", "AST 148 · ALT 96 (상승)"] : ["lft_neg", "AST 22 · ALT 19 (정상)"] },
  { id: "hb2", name: "혈색소 추이", for: ["빈혈", "위장관 출혈"], tree: true, sim: f => f.hb_lo ? ["hb_lo2", "8.9 → 8.1 g/dL (하락)"] : ["hb_neg", "13.8 → 13.6 g/dL (안정)"] },
  { id: "lyte", name: "전해질", for: ["전해질 이상"], tree: true, sim: f => f.c_ckd || (f.e_conf && f.c_hf) ? ["lyte_abn", "칼륨 6.1 mmol/L (상승)"] : ["lyte_neg", "나트륨 139 · 칼륨 4.0 (정상)"] },
  { id: "bone", name: "X선 (골격)", for: ["골절·외상"], tree: true, sim: f => f.e_trauma ? ["fx_pos", "대퇴 경부 골절"] : ["fx_neg", "골절 없음"] },
  { id: "pft", name: "흡입기 · 폐기능 기록", for: ["천식·COPD", "기타 하기도 질환"], tree: true, sim: f => f.c_copd ? ["copd_hx", "흡입기 처방, FEV1 61%"] : ["copd_neg", "관련 기록 없음"] },
  { id: "cta", name: "폐 CT 혈관조영", for: ["폐색전증"], tree: true, sim: f => (f.e_dyspnea || f.e_chest) && f.spo2_lo && !f.e_fever && !f.c_hf ? ["pe_pos", "우측 폐동맥 충만 결손"] : ["pe_neg", "색전 없음"] },
  { id: "tsh", name: "TSH · Free T4", for: ["갑상선 질환"], tree: true, sim: f => f.tsh_abn || (f.hr_vhi && !f.e_fever) || (f.o_fatigue && !f.c_dm && !f.o_thirst) ? ["tsh_abn", "TSH 0.02 (억제) · Free T4 상승"] : ["tsh_neg", "TSH 2.1 (정상)"] },
  { id: "fundus", name: "안저 검사", for: ["당뇨", "고혈압"], tree: true, sim: f => f.c_dm || f.o_vision || f.a1c_hi ? ["fundus_pos", "망막 미세혈관 변화"] : ["fundus_neg", "특이 소견 없음"] },
  { id: "carotid", name: "경동맥 초음파", for: ["지질대사 장애", "고혈압", "뇌졸중"], tree: true, sim: f => f.c_lipid || f.lip_hi || (f.age_old && f.c_htn) ? ["imt_hi", "내중막두께 1.1 mm (증가)"] : ["imt_neg", "0.6 mm (정상)"] },
  { id: "hx", name: "과거 진단 · 처방 기록", for: ["우울·불안", "알코올 관련"], tree: true, sim: f => ["hx_neg", "관련 기록 없음"] },
];
Object.assign(W["뇌졸중"], { ct_pos: 2.4, ct_neg: -1.6 });
Object.assign(W["심부전"], { cxr_edema: 1.2 }); Object.assign(W["폐렴"], { cxr_edema: 0.3 }); Object.assign(W["폐색전증"], { cxr_edema: -0.4 });
Object.assign(W["당뇨"], { a1c_hi: 2.2, a1c_neg: -1.6 });
Object.assign(W["지질대사 장애"], { lip_hi: 2.0, lip_neg: -1.4 });
Object.assign(W["고혈압"], { bp_hi2: 2.0, bp_neg: -1.4 });
Object.assign(W["만성 신장질환"], { egfr_lo: 2.0, egfr_neg: -1.4 });
Object.assign(W["요로 감염"], { ua_pos: 2.3, ua_neg: -1.6 });
Object.assign(W["췌장염"], { lipase_pos: 2.4, lipase_neg: -1.6 });
Object.assign(W["간질환"], { lft_hi: 1.8, lft_neg: -1.3 });
Object.assign(W["알코올 관련"], { lft_hi: 0.6, hx_neg: -1.0 });
Object.assign(W["빈혈"], { hb_lo2: 1.6, hb_neg: -1.4 });
Object.assign(W["위장관 출혈"], { hb_lo2: 1.2, hb_neg: -1.2 });
Object.assign(W["전해질 이상"], { lyte_abn: 2.0, lyte_neg: -1.4 });
Object.assign(W["골절·외상"], { fx_pos: 2.0, fx_neg: -1.6 });
Object.assign(W["천식·COPD"], { copd_hx: 1.8, copd_neg: -1.0 });
Object.assign(W["기타 하기도 질환"], { copd_hx: 1.0, copd_neg: -0.8 });
Object.assign(W["폐색전증"], { pe_pos: 2.6, pe_neg: -1.8 });
Object.assign(W["갑상선 질환"], { tsh_abn: 2.2, tsh_neg: -1.4 });
Object.assign(W["당뇨"], { fundus_pos: 1.2, fundus_neg: -0.5 }); Object.assign(W["고혈압"], { fundus_pos: 0.7, imt_hi: 0.5 });
Object.assign(W["지질대사 장애"], { imt_hi: 1.0, imt_neg: -0.5 }); Object.assign(W["뇌졸중"], { imt_hi: 0.6 });
Object.assign(W["우울·불안"], { hx_neg: -1.0 });

/* ---- 외래 사건 가중치 ---- */
Object.assign(W["당뇨"], { o_checkup: 1.0, o_thirst: 1.9, o_fatigue: 0.8, o_vision: 0.9, o_skin: 0.6, a1c_hi: W["당뇨"].a1c_hi || 2.2 });
Object.assign(W["지질대사 장애"], { o_checkup: 1.3, o_fatigue: 0.2, o_vision: 0.2 });
Object.assign(W["고혈압"], { o_checkup: 0.7, o_headache: 1.6, o_vision: 0.6 });
Object.assign(W["갑상선 질환"], { o_fatigue: 1.3, o_thirst: 0.3, o_vision: 0.5, env_out: 0.3 });
Object.assign(W["빈혈"], { o_fatigue: 0.9, o_exert: 0.6, env_out: 0.2 });
Object.assign(W["심부전"], { o_exert: 1.2 });
Object.assign(W["천식·COPD"], { o_exert: 1.0 });
Object.assign(W["기타 하기도 질환"], { o_exert: 0.5 });
Object.assign(W["뇌졸중"], { o_headache: 0.6, o_vision: 0.3 });
Object.assign(W["우울·불안"], { o_fatigue: 0.7, o_headache: 0.3 });
Object.assign(W["만성 신장질환"], { o_checkup: 0.4, o_fatigue: 0.3 });
Object.assign(W["요로 감염"], { o_thirst: 0.5 });
Object.assign(W["간질환"], { o_checkup: 0.4, o_fatigue: 0.3, o_skin: 0.3 });
// 외래에서는 급성 감염·쇼크·외상 사전확률을 낮춘다
["패혈증", "패혈성 쇼크", "골절·외상", "위장관 출혈", "폐색전증", "급성 신부전", "췌장염"].forEach(d => { W[d].env_out = -1.2; });

/* ---- 외래 검진 패널 (1시간 채혈 대신) ---- */
const LABS_OUT = [
  { id: "glu", name: "공복 혈당", unit: "mg/dL", normal: 96, hi: 152, vhi: 238, rule: f => f.c_dm || f.o_thirst ? (f.o_thirst && f.c_dm ? "glu_vhi" : "glu_hi") : (f.o_checkup ? "glu_hi" : null) },
  { id: "ldl", name: "LDL", unit: "mg/dL", normal: 98, hi: 164, rule: f => f.c_lipid || f.o_checkup || f.age_old ? "lip_hi" : "lip_neg" },
  { id: "cr", name: "크레아티닌", unit: "mg/dL", normal: 0.8, hi: 1.9, rule: f => f.c_ckd ? "cr_hi" : "cr_neg" },
  { id: "hb", name: "혈색소", unit: "g/dL", normal: 13.6, lo: 10.2, rule: f => (f.o_fatigue || f.o_exert) && (f.sex_f || f.c_ckd) ? "hb_lo" : null },
];
const GAME_TESTS_OUT_IDS = ["a1c", "lipid", "bptrend", "egfr", "tsh", "fundus", "carotid", "ecg"];

const RELATED = {
  "패혈증": ["패혈성 쇼크", "폐렴", "요로 감염"], "패혈성 쇼크": ["패혈증", "급성 신부전"], "폐렴": ["패혈증", "천식·COPD", "심부전"],
  "심부전": ["폐렴", "심부정맥", "급성 심근경색"], "심부정맥": ["심부전", "급성 심근경색", "갑상선 질환"], "급성 심근경색": ["심부전", "심부정맥", "폐색전증"],
  "고혈압": ["만성 신장질환", "뇌졸중", "지질대사 장애"], "당뇨": ["지질대사 장애", "만성 신장질환", "고혈압"], "지질대사 장애": ["당뇨", "고혈압"],
  "만성 신장질환": ["급성 신부전", "고혈압", "빈혈"], "급성 신부전": ["만성 신장질환", "패혈성 쇼크", "전해질 이상"], "기타 하기도 질환": ["폐렴", "천식·COPD"],
  "요로 감염": ["패혈증", "급성 신부전"], "위장관 출혈": ["빈혈", "간질환"], "뇌졸중": ["고혈압", "심부정맥"], "갑상선 질환": ["심부정맥"], "빈혈": ["위장관 출혈", "만성 신장질환"],
  "전해질 이상": ["급성 신부전", "만성 신장질환"], "간질환": ["위장관 출혈", "알코올 관련"], "췌장염": ["간질환"], "폐색전증": ["급성 심근경색", "폐렴"], "천식·COPD": ["기타 하기도 질환", "폐렴"],
  "골절·외상": ["빈혈"], "우울·불안": ["갑상선 질환"], "알코올 관련": ["간질환"],
};
const GENERIC_TESTS = [
  { id: "g_hx", name: "과거 진단 · 처방 기록", for: [], tree: true, sim: (f, dx) => { const has = (dx === "고혈압" && f.c_htn) || (dx === "당뇨" && f.c_dm) || (dx === "지질대사 장애" && f.c_lipid) || (dx === "심부전" && f.c_hf) || (dx === "심부정맥" && f.c_af) || (dx === "만성 신장질환" && f.c_ckd) || (dx === "천식·COPD" && f.c_copd) || (dx === "간질환" && f.c_liver); return has ? ["hx_pos", "관련 과거 진단·처방 있음"] : ["hx_none", "관련 과거 기록 없음"]; } },
  { id: "g_vit", name: "활력징후 추이 (6시간)", for: [], tree: true, sim: (f, dx) => { const worse = f.sbp_lo || f.sbp_vlo || f.hr_vhi || f.spo2_vlo || f.temp_vhi; return worse ? ["vit_worse", "혈압·심박 악화 추세"] : ["vit_stable", "안정 추세"]; } },
  { id: "g_lab2", name: "추적 혈액검사", for: [], tree: true, sim: (f, dx) => (f.lac_hi || f.lac_vhi || f.wbc_hi || f.crp_hi) ? ["lab_worse", "염증·젖산 상승 지속"] : ["lab_stable", "변화 없음"] },
];
// 일반 기록 조회의 약한 가중치
DX.forEach(d => { W[d].hx_pos = 1.4; W[d].hx_none = -0.4; });
["패혈증", "패혈성 쇼크", "급성 신부전", "위장관 출혈", "폐색전증"].forEach(d => { W[d].vit_worse = 0.6; W[d].lab_worse = 0.5; W[d].vit_stable = -0.3; W[d].lab_stable = -0.3; });
["고혈압", "당뇨", "지질대사 장애", "만성 신장질환", "갑상선 질환", "우울·불안", "알코올 관련", "천식·COPD", "기타 하기도 질환", "골절·외상", "뇌졸중", "빈혈", "간질환", "췌장염", "요로 감염", "전해질 이상", "심부전", "심부정맥", "급성 심근경색", "폐렴"].forEach(d => { W[d].vit_stable = W[d].vit_stable || 0; W[d].lab_stable = W[d].lab_stable || 0; });
// 음성 결과도 확률을 내리도록 약한 음의 가중치
Object.assign(W["패혈증"], { bc_neg: -1.0, lac_neg: -0.6 }); Object.assign(W["패혈성 쇼크"], { bc_neg: -0.6, lac_neg: -0.9 }); Object.assign(W["급성 신부전"], { lac_neg: -0.4 });
Object.assign(W["폐렴"], { bc_neg: -0.3 }); Object.assign(W["요로 감염"], { bc_neg: -0.3 });
const OUTCOMES = {
  trop: ["trop_hi", "trop_neg"], bnp: ["bnp_hi", "bnp_neg"], bc: ["bc_pos", "bc_neg"], lac2: ["lac_vhi", "lac_neg"], cxr: ["cxr_pos", "cxr_neg"],
  ecg: ["ecg_st", "ecg_neg"], cr2: ["cr_hi", "cr_neg"], ct: ["ct_pos", "ct_neg"], a1c: ["a1c_hi", "a1c_neg"], lipid: ["lip_hi", "lip_neg"],
  bptrend: ["bp_hi2", "bp_neg"], egfr: ["egfr_lo", "egfr_neg"], ua: ["ua_pos", "ua_neg"], lipase: ["lipase_pos", "lipase_neg"], lft: ["lft_hi", "lft_neg"],
  hb2: ["hb_lo2", "hb_neg"], lyte: ["lyte_abn", "lyte_neg"], bone: ["fx_pos", "fx_neg"], pft: ["copd_hx", "copd_neg"], cta: ["pe_pos", "pe_neg"],
  tsh: ["tsh_abn", "tsh_neg"], fundus: ["fundus_pos", "fundus_neg"], carotid: ["imt_hi", "imt_neg"],
};
const GAME_TESTS = ["trop", "bnp", "bc", "lac2", "cxr", "ecg", "ct", "bone"].map(id => TESTS.find(t => t.id === id));
const GAME_TESTS_OUT = GAME_TESTS_OUT_IDS.map(id => TESTS.find(t => t.id === id));

/* ---------- 엔진 ---------- */
const Engine = {
  /** 선택 상태 → 특징 집합 */
  features(s) {
    const f = {};
    if (s.age) f[s.age] = 1;
    if (s.sex) f[s.sex] = 1;
    (s.chronic || []).forEach(c => f[c] = 1);
    if (s.event) f[s.event] = 1;
    Object.entries(s.vitals || {}).forEach(([k, lv]) => { const ft = VITALS[k].feat[lv]; if (ft) f[ft] = 1; });
    (s.labs || []).forEach(l => { if (l.feat) f[l.feat] = 1; });
    (s.tests || []).forEach(t => { if (t.feat) f[t.feat] = 1; });
    if (s.env === "out") f.env_out = 1;
    return f;
  },
  probs(s) {
    const f = this.features(s);
    const out = {};
    DX.forEach(d => {
      let z = BASE;
      const w = W[d];
      for (const k in w) if (f[k]) z += w[k];
      out[d] = Math.min(0.97, Math.max(0.01, sig(z)));
    });
    return out;
  },
  top(probs, n = 5) { return Object.entries(probs).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]); },
  /** 1시간 채혈 결과 생성 */
  labs(s) {
    const f = this.features({ ...s, labs: [], tests: [] });
    return (s.env === "out" ? LABS_OUT : LABS).map(L => {
      const feat = L.rule(f);
      let lvl = feat ? feat.split("_")[1] : null;
      if (lvl === "abn") lvl = "lo";
      const val = lvl === "vhi" ? L.vhi : lvl === "hi" ? L.hi : lvl === "lo" ? L.lo : L.normal;
      return { id: L.id, name: L.name, value: `${val} ${L.unit}`, feat: feat || null, flag: lvl && lvl !== "neg" ? lvl : null };
    });
  },
  /** 검사의 기대 정보이득: 양성·음성 두 결과를 확률 가중해 후보 확률이 얼마나 움직이는지 */
  gain(s, test, cands) {
    const before = this.probs(s);
    const f = this.features(s);
    const [expFeat, text] = test.sim(f, cands[0]);
    const outs = OUTCOMES[test.id] || [expFeat];
    const pPos = Math.min(0.85, Math.max(0.15, Math.max(...test.for.map(d => before[d] || 0), 0.15)));
    const moveOf = feat => { const after = this.probs({ ...s, tests: [...(s.tests || []), { id: test.id, feat }] }); const inC = cands.reduce((sum, d) => sum + Math.abs(after[d] - before[d]), 0); const outC = DX.filter(d => !cands.includes(d)).reduce((sum, d) => sum + Math.abs(after[d] - before[d]), 0); return { after, move: inC + 0.5 * outC }; };
    const pos = moveOf(outs[0]); const neg = outs[1] ? moveOf(outs[1]) : pos;
    const move = pPos * pos.move + (1 - pPos) * neg.move;
    const exp = moveOf(expFeat);
    return { feat: expFeat, text, move, before, after: exp.after, pPos };
  },
  /** 진단별 조사 트리 생성 (라운드 최대 3, 라운드마다 1~2개씩 요청) */
  tree(s, dx) {
    const rounds = [];
    let cur = { ...s, tests: [...(s.tests || [])] };
    let p = this.probs(cur)[dx];
    const used = new Set((s.tests || []).map(t => t.id));
    const pool = TESTS.filter(t => t.for.includes(dx) && !used.has(t.id));
    // 진단 특이 검사가 부족하면 관련 진단군의 검사와 기록 조회로 보강
    const related = TESTS.filter(t => !t.for.includes(dx) && !used.has(t.id) && t.for.some(d => RELATED[dx] && RELATED[dx].includes(d)));
    const generic = GENERIC_TESTS.filter(t => !used.has(t.id));
    const plan = [...pool, ...related.slice(0, 2), ...generic.slice(0, 2)];
    const prior = (s.tests || []).filter(t => t.feat && !/_neg$/.test(t.feat)).map(t => t.name);
    for (let r = 1; r <= 3; r++) {
      const take = r === 1 ? Math.min(2, plan.length) : Math.min(2, plan.length);
      const req = plan.splice(0, take);
      const before = p;
      const fetched = [];
      req.forEach(t => {
        const [feat, text] = t.sim(this.features(cur), dx);
        cur.tests.push({ id: t.id, feat });
        fetched.push({ name: t.name, text, feat });
      });
      p = this.probs(cur)[dx];
      const after = p;
      const up = fetched.filter(x => x.feat && !/_neg$/.test(x.feat)).map(x => x.name);
      const down = fetched.filter(x => x.feat && /_neg$/.test(x.feat)).map(x => x.name);
      const moreLeft = plan.length > 0 && r < 3;
      let verdict, judge, text;
      const extreme = after >= 0.95 || after <= 0.08;
      if (after >= 0.9 && (r >= 2 || extreme)) { verdict = "확정"; judge = "auto"; text = `확률 ${after.toFixed(2)}이 확정 임계 0.9에 도달했습니다. 자동 확정.`; }
      else if (after <= 0.2 && (r >= 2 || extreme)) { verdict = "배제"; judge = "auto"; text = `확률 ${after.toFixed(2)}은 배제 임계 0.2 이하입니다. 자동 배제.`; }
      else {
        judge = "llm";
        if (req.length === 0) {
          if (after >= 0.65) { verdict = "확정"; text = `새로 요청할 기록이 없습니다. ${prior.length ? '이미 조회한 ' + prior.join('·') + ' 결과와 ' : ''}관찰창 소견이 한 방향을 가리켜 확정합니다.`; }
          else if (after <= 0.32) { verdict = "배제"; text = `더 볼 기록이 없고 지지하는 소견도 없습니다. 확률 ${after.toFixed(2)}에서 배제.`; }
          else { verdict = "불확실"; text = `새로 가져올 기록이 없습니다. 확률 ${after.toFixed(2)}에서 종료하고 불확실로 남깁니다.`; }
        } else if (moreLeft && (after >= 0.9 || after <= 0.2)) {
          verdict = "추가 조사";
          text = after >= 0.9 ? `${up.join('·') || '조회 결과'}가 ${dx}를 강하게 지지합니다(${after.toFixed(2)}). 다만 첫 라운드라 반대 근거가 없는지 한 번 더 확인합니다.` : `${down.join('·') || '조회 결과'}가 ${dx}와 맞지 않아 ${after.toFixed(2)}까지 내려왔습니다. 놓치는 것이 없도록 한 라운드 더 봅니다.`;
        } else if (r >= 2 && after >= 0.72 && (up.length || prior.length)) {
          verdict = "확정"; text = `${[...up, ...prior].slice(0, 3).join('·')} 결과가 ${dx}에 부합하고 관찰창 소견과 방향이 같습니다. 임계값에는 못 미치지만 두 라운드에 걸쳐 근거가 일관되어 확정합니다.`;
        } else if (r >= 2 && after <= 0.32 && (down.length || fetched.every(x => !x.feat))) {
          verdict = "배제"; text = `${down.length ? down.join('·') + '이 정상 범위이고 ' : '요청한 검사에서 지지하는 소견이 없고 '}확률이 ${after.toFixed(2)}까지 내려왔습니다. 배제.`;
        } else if (moreLeft) {
          verdict = "추가 조사";
          text = Math.abs(after - before) < 0.02 ? `${req.map(t => t.name).join('·')}은 이미 아는 것과 같은 방향이라 확률이 거의 움직이지 않았습니다. 다른 검사를 봅니다.`
            : `${up.length ? up.join('·') + '은 가능성을 올리지만 ' : ''}${down.length ? down.join('·') + '은 반대 방향이라 ' : ''}아직 갈리지 않았습니다. 한 라운드 더 봅니다.`;
        } else if (after >= 0.72 && (up.length || prior.length)) {
          verdict = "확정"; text = `${[...up, ...prior].slice(0, 3).join('·')} 결과가 ${dx}에 부합하고 관찰창 소견과 방향이 같습니다. 근거가 일관되어 확정합니다.`;
        } else if (after <= 0.32) {
          verdict = "배제"; text = `${down.length ? down.join('·') + '이 정상 범위이고 ' : '지지하는 소견이 없고 '}확률이 ${after.toFixed(2)}까지 내려왔습니다. 배제.`;
        } else {
          verdict = "불확실";
          text = `볼 수 있는 검사를 다 봤지만 확정 근거가 부족합니다. ${up.length ? up.join('·') + '은 지지하고 ' : ''}${down.length ? down.join('·') + '은 반대라 ' : ''}확률 ${after.toFixed(2)}에서 불확실로 남깁니다. 억지로 확정하지 않습니다.`;
        }
      }
      rounds.push({ round: r, request: req.map(t => t.name), fetched, before, after, judge, text, verdict });
      if (verdict !== "추가 조사") break;
    }
    return rounds;
  },
  /** 라운드별 전체 후보 확률 (판독문용) */
  roundTable(s, cands, trees) {
    const maxR = Math.max(...cands.map(d => trees[d].length));
    const rows = [];
    for (let r = 1; r <= maxR; r++) {
      rows.push({ round: r, cands: cands.map(d => { const rs = trees[d]; const x = rs[Math.min(r, rs.length) - 1]; const active = r <= rs.length; return { dx: d, p: x.after, active, request: active ? x.request : [], fetched: active ? x.fetched : [], verdict: active ? x.verdict : rs[rs.length - 1].verdict, text: active ? x.text : '' , judge: active ? x.judge : '' }; }) });
    }
    return rows;
  },
  /** LLM 보정·추론 문장 생성 (대리) : 이상 소견을 읽고 상위 후보를 보정 */
  calib(s) {
    const f = this.features(s); const pr = this.probs(s); const top = this.top(pr, 5);
    const ab = [];
    Object.entries(s.vitals || {}).forEach(([k, lv]) => { const v = VITALS[k]; const ft = v.feat[lv]; if (ft) ab.push(`${v.label} ${v.vals[lv]}${v.unit}`); });
    (s.labs || []).forEach(l => { if (l.flag) ab.push(`${l.name} ${l.value}`); });
    const chron = (s.chronic || []).map(c => CHRONIC.find(x => x.id === c).label);
    const changes = {}; const notes = [];
    const support = { "패혈증": ["temp_hi", "temp_vhi", "wbc_hi", "crp_hi", "lac_hi", "lac_vhi", "hr_vhi"], "패혈성 쇼크": ["sbp_lo", "sbp_vlo", "lac_vhi"], "급성 심근경색": ["e_chest", "c_dm", "c_htn", "c_lipid", "age_old"], "심부전": ["c_hf", "e_edema", "spo2_lo", "e_dyspnea"], "폐렴": ["e_fever", "spo2_lo", "spo2_vlo", "rr_hi", "crp_hi"], "당뇨": ["glu_hi", "glu_vhi", "c_dm", "o_thirst"], "고혈압": ["sbp_hi", "c_htn", "o_headache"], "지질대사 장애": ["lip_hi", "c_lipid"], "만성 신장질환": ["cr_hi", "c_ckd"], "급성 신부전": ["cr_hi", "sbp_vlo"], "뇌졸중": ["e_conf", "c_af", "sbp_hi"], "심부정맥": ["c_af", "hr_vhi"], "갑상선 질환": ["o_fatigue", "hr_vhi"], "빈혈": ["hb_lo", "o_fatigue"], "골절·외상": ["e_trauma"], "폐색전증": ["spo2_lo", "e_dyspnea", "e_chest"] };
    top.slice(0, 3).forEach(d => { const n = (support[d] || []).filter(k => f[k]).length; if (n >= 2 && pr[d] < 0.9) { changes[d] = Math.min(0.95, +(pr[d] + 0.06 + 0.02 * (n - 2)).toFixed(2)); notes.push(`${d}는 ${n}개 소견이 같은 방향이라 ${fmt(pr[d])} → ${fmt(changes[d])}로 올립니다`); } });
    const noAb = ab.length === 0;
    const text = noAb
      ? `${chron.length ? '과거 진단(' + chron.join(', ') + ')은 있지만 ' : ''}첫 측정과 검사에 정상 범위를 벗어난 값이 없습니다. 지금 기록만으로는 확률을 움직일 임상 근거가 없어 FM 확률을 그대로 둡니다. 상위 5개를 후보로 올리되, 추가 검사로 갈라야 합니다.`
      : `이상 소견은 ${ab.join(', ')}입니다.${chron.length ? ' 과거 진단으로 ' + chron.join(', ') + '이 있습니다.' : ''} ${notes.length ? notes.join('. ') + '.' : '소견이 한 방향으로 모이지 않아 FM 확률은 그대로 두고 후보에서 가립니다.'} 가장 가능성이 높은 것은 ${top[0]}이고, 이를 확인하거나 배제하려면 지금 검사가 필요합니다.`;
    return { text, changes, abnormal: ab, top };
  },
  /** 자유 입력 → 사건 카드 */
  guessEvent(text, env) {
    const t = (text || "").toLowerCase();
    let best = null, score = 0;
    (env === "out" ? FREE_KEYWORDS_OUT : FREE_KEYWORDS).forEach(([id, kws]) => { const sc = kws.filter(k => t.includes(k)).length; if (sc > score) { score = sc; best = id; } });
    return best;
  },
};
