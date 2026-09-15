/* =====================================================================
   OMOP 버전 환자 케이스 — 고지혈증 · 당뇨 · 고혈압 스토리라인
   demo_data.js 와 동일한 스키마. demo1 에 끼워 넣으려면:

     <script src="../omop_data.js"></script>     (demo_data.js 뒤에)
     loadPatients(OMOP_PATIENTS)                  (또는 PATIENTS 자리 교체)

   ---------------------------------------------------------------------
   샘플링 근거 (실제 데이터)
   - 소스: /home/a9613789/KT_xlfej/xlfej/Sampling/raw/generated_060641_data.csv
           (= Result/generated_data/generated_dataset_20260107_060641.pkl 과 동일 행 순서.
            pkl 의 generated_ids 는 FM 내부 토크나이저 vocab id 라 직접 해석 불가 →
            concept_id 로 디코딩된 CSV 를 사용. docs/sys_omop/05 §2 참고)
   - 스캔: 앞 20,000명(코호트 anchor1_1yr 와 동일 스캔 깊이)
   - 조건: 당뇨(diabetes mellitus) + 고혈압(hypertension) + 이상지질(hyperlipidemia/
           dyslipidemia/hypercholesterolemia) Condition 코드를 모두 보유 → 261명
   - 정렬: 방문 3~10회 · 3계열 약물(메트포르민계·스타틴계·항고혈압제) 모두 보유 ·
           세 진단이 첫 방문(anchor) 이후에 발생(incident) · 앵커 방문이 과하게 크지 않음
   - 선정: D = patient_index 14904, E = patient_index 6948, F = patient_index 14933

   무엇이 실제이고 무엇이 작성분인가
   - REAL   : patient_index, 방문 분할, 방문 간격(gap 토큰 W0 = 7일 미만, 중앙값 3.5일),
              각 방문의 concept_id · 개념명 · 도메인, 진단이 처음 등장한 방문.
              OMOP_SOURCE 블록이 그 원본이다.
   - AUTHORED: 성별 · 나이 · 모든 수치(값) · 확률 · 판정 문장 · 학습 제안.
              생성 데이터의 values 열은 토큰과 1:1 정렬되지 않는다
              (omop_data/patient_loader.py 의 "VALUE↔TOKEN ALIGNMENT" 주석 = 미해결 seam).
              따라서 수치는 복원이 아니라 코드 구성에 맞춘 임상적으로 타당한 작성값이다.
              수치를 바꿔도 코드 구성과 모순되지 않는 한 스토리는 유지된다.
   ===================================================================== */

const OMOP_DX25 = [
  "패혈증", "패혈성 쇼크", "폐렴", "심부전", "심부정맥", "급성 심근경색", "고혈압", "당뇨 (합병증 없음)",
  "지질대사 장애", "만성 신장질환", "급성 신부전", "기타 하기도 질환", "요로 감염", "위장관 출혈",
  "뇌졸중", "갑상선 질환", "빈혈", "전해질 이상", "간질환", "췌장염", "폐색전증", "천식·COPD",
  "골절·외상", "우울·불안", "알코올 관련"
];

function omopFillFm(top) {
  const out = {};
  let seed = 23;
  OMOP_DX25.forEach(d => {
    seed = (seed * 9301 + 49297) % 233280;
    out[d] = top[d] !== undefined ? top[d] : +(0.01 + (seed / 233280) * 0.03).toFixed(3);
  });
  return out;
}

/* ---------------------------------------------------------------------
   OMOP_SOURCE — 샘플링된 실제 코드 열 (스토리 작성용 원본)
   day 는 gap 토큰 중앙값 누적치. 모든 gap 이 W0 이므로 방문 간격은 7일 미만이고,
   두 환자 모두 약 2~3주 안에 벌어진 일이다. 날짜가 아니라 순서로 읽을 것.
   --------------------------------------------------------------------- */
const OMOP_SOURCE = {
  D: {
    patient_index: 14904,
    n_visits: 6,
    visits: [
      { visit: 0, day: 0.0, n_codes: 18, note: "안과 초진 — 관찰창(anchor)", codes: {
        Condition: ["378416 Retinal disorder", "4191597 Disorder of refraction", "437541 Glaucoma"],
        Drug: ["42922715 0.8 ML proparacaine 5 MG/ML Ophthalmic Solution", "43209210 2.5 ML latanoprost 0.05 MG/ML Ophthalmic Solution", "21136843 5 ML dorzolamide 20 MG/ML Ophthalmic Solution"],
        Measurement: ["4064074 Tonometry", "45763633 Optical coherence tomography of retina", "4098802 Corneal specular microscopy", "4064922 Cataract screening", "4296747 Gonioscopy"],
        Procedure: ["4210011 Ocular slit lamp examination", "4063911 Ocular fundus photography", "4259495 Slit lamp fundus examination", "4098814 Refraction assessment", "4013574 Computed perimetry", "4071170 Ocular photography for medical evaluation and documentation, stereophotography", "4063749 Exploration of optic nerve (II)"],
      } },
      { visit: 1, day: 3.5, n_codes: 7, note: "안과 재방문", codes: {
        Condition: ["378416 Retinal disorder", "4191597 Disorder of refraction", "437541 Glaucoma"],
        Drug: ["42922715 0.8 ML proparacaine 5 MG/ML Ophthalmic Solution", "21136843 5 ML dorzolamide 20 MG/ML Ophthalmic Solution"],
        Measurement: ["4064074 Tonometry"],
        Procedure: ["4210011 Ocular slit lamp examination"],
      } },
      { visit: 2, day: 7.0, n_codes: 6, note: "안과 재방문", codes: {
        Condition: ["378416 Retinal disorder", "4191597 Disorder of refraction", "437541 Glaucoma"],
        Measurement: ["4064074 Tonometry"],
        Procedure: ["4210011 Ocular slit lamp examination", "4259495 Slit lamp fundus examination"],
      } },
      { visit: 3, day: 10.5, n_codes: 45, note: "★ 내과 전환 — 대사 3종 + 협심증 동시 진단", codes: {
        Condition: ["320128 Essential hypertension", "4193704 Type 2 diabetes mellitus without complication", "432867 Hyperlipidemia", "321318 Angina pectoris"],
        Drug: ["19075601 clopidogrel 75 MG Oral Tablet", "40167849 amlodipine 5 MG / telmisartan 40 MG Oral Tablet", "1525221 pioglitazone 15 MG Oral Tablet", "40164894 metformin hydrochloride 1000 MG Extended Release Oral Tablet", "40165646 pitavastatin calcium 4 MG Oral Tablet", "1314614 nebivolol 2.5 MG Oral Tablet", "42960653 anagliptin 100 MG Oral Tablet"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3020891 Body temperature", "3024171 Respiratory rate", "3027018 Heart rate", "3025315 Body weight", "3036277 Body height", "3016723 Creatinine [Mass/volume] in Serum or Plasma", "3013682 Urea nitrogen [Mass/volume] in Serum or Plasma", "3023103 Potassium [Moles/volume] in Serum or Plasma", "3019550 Sodium [Moles/volume] in Serum or Plasma", "3014576 Chloride [Moles/volume] in Serum or Plasma", "3004501 Glucose [Mass/volume] in Serum or Plasma", "3006906 Calcium [Mass/volume] in Serum or Plasma", "3011904 Phosphate [Mass/volume] in Serum or Plasma", "40760139 Urinalysis dipstick W Reflex Microscopic panel - Urine", "…외 15건"],
        Procedure: ["4187078 Electrocardiographic monitoring", "4181300 Diagnostic radiography of chest, combined PA and lateral", "4335825 Transthoracic echocardiography"],
      } },
      { visit: 4, day: 14.0, n_codes: 15, note: "약제 조정 — SGLT2 복합제 전환", codes: {
        Condition: ["320128 Essential hypertension", "4193704 Type 2 diabetes mellitus without complication", "432867 Hyperlipidemia", "321318 Angina pectoris", "437827 Pure hypercholesterolemia"],
        Drug: ["19075601 clopidogrel 75 MG Oral Tablet", "40167849 amlodipine 5 MG / telmisartan 40 MG Oral Tablet", "1525221 pioglitazone 15 MG Oral Tablet", "45775456 dapagliflozin 10 MG / metformin hydrochloride 1000 MG Extended Release Oral Tablet", "40165646 pitavastatin calcium 4 MG Oral Tablet", "1314614 nebivolol 2.5 MG Oral Tablet", "42960653 anagliptin 100 MG Oral Tablet"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3027018 Heart rate"],
      } },
      { visit: 5, day: 17.5, n_codes: 5, note: "진단 목록만 유지(추적)", codes: {
        Condition: ["320128 Essential hypertension", "4193704 Type 2 diabetes mellitus without complication", "432867 Hyperlipidemia", "321318 Angina pectoris", "437827 Pure hypercholesterolemia"],
      } },
    ]
  },
  E: {
    patient_index: 6948,
    n_visits: 5,
    visits: [
      { visit: 0, day: 0.0, n_codes: 24, note: "건강검진 패널 — 관찰창(anchor) · 지질 3항목 이미 기준 초과", codes: {
        Condition: ["442793 Complication due to diabetes mellitus", "4214376 Hyperglycemia"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3024171 Respiratory rate", "3027018 Heart rate", "3025315 Body weight", "3036277 Body height", "3016723 Creatinine [Mass/volume] in Serum or Plasma", "3013682 Urea nitrogen [Mass/volume] in Serum or Plasma", "3004501 Glucose [Mass/volume] in Serum or Plasma", "40760139 Urinalysis dipstick W Reflex Microscopic panel - Urine", "3022192 Triglyceride [Mass/volume] in Serum or Plasma", "3007070 Cholesterol in HDL [Mass/volume] in Serum or Plasma", "3028437 Cholesterol in LDL [Mass/volume] in Serum or Plasma", "3004410 Hemoglobin A1c/Hemoglobin.total in Blood", "3009201 Thyrotropin [Units/volume] in Serum or Plasma", "3021737 Glucose [Mass/volume] in Serum or Plasma --2 hours post meal", "…외 3건"],
        Procedure: ["4187078 Electrocardiographic monitoring", "4181300 Diagnostic radiography of chest, combined PA and lateral"],
        Observation: ["4053609 Marital status"],
      } },
      { visit: 1, day: 3.5, n_codes: 108, note: "★ 고지혈증·고혈압·당뇨 진단 + 관상동맥 스텐트", codes: {
        Condition: ["4008576 Diabetes mellitus without complication", "320128 Essential hypertension", "4193704 Type 2 diabetes mellitus without complication", "432867 Hyperlipidemia", "4144111 Gastroesophageal reflux disease without esophagitis", "321318 Angina pectoris", "4089462 Ventricular premature complex"],
        Drug: ["21137851 100 ML Sodium Chloride 9 MG/ML Injectable Solution", "42479436 1000 ML Sodium Chloride 9 MG/ML Injectable Solution", "21040129 500 ML Sodium Chloride 9 MG/ML Injectable Solution", "19072235 acetaminophen 650 MG Extended Release Oral Tablet", "19103854 aspirin 100 MG Delayed Release Oral Capsule", "19075601 clopidogrel 75 MG Oral Tablet", "36895720 20 ML Lidocaine 20 MG/ML Injectable Solution", "42922061 2 ML Chlorpheniramine 2 MG/ML Injectable Solution", "40991405 lansoprazole 15 MG Oral Capsule", "35606533 methylprednisolone 125 MG Injection", "…외 11건"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3020891 Body temperature", "3024171 Respiratory rate", "3027018 Heart rate", "3011424 Glucose [Mass/volume] in Blood by Automated test strip", "3025315 Body weight", "3036277 Body height", "3005785 Creatine kinase.MB [Mass/volume] in Serum or Plasma", "3016723 Creatinine [Mass/volume] in Serum or Plasma", "3013682 Urea nitrogen [Mass/volume] in Serum or Plasma", "3006906 Calcium [Mass/volume] in Serum or Plasma", "3011904 Phosphate [Mass/volume] in Serum or Plasma", "3037556 Urate [Mass/volume] in Serum or Plasma", "3026910 Gamma glutamyl transferase [Enzymatic activity/volume] in Serum or Plasma", "3012095 Magnesium [Moles/volume] in Serum or Plasma", "…외 17건"],
        Procedure: ["4187078 Electrocardiographic monitoring", "4167667 Insertion of infusion pump", "4065278 Ambulatory ECG", "4142645 Angiography of coronary artery", "4283892 Placement of stent in coronary artery", "44784222 Intravascular optical coherence tomography of coronary vessel", "4239130 Oxygen therapy", "36713195 X-ray of chest anteroposterior view", "…외 6건"],
        Observation: ["4052351 Alcohol intake", "4041306 Tobacco use and exposure", "4053609 Marital status", "4059477 Menopause"],
        Device: ["45760191 Syringe filter, clinical", "4224207 Non-woven fabric backed adhesive dressing", "45762899 Intravenous line filter", "4228328 Intravenous fluid administration device", "…외 24건"],
      } },
      { visit: 2, day: 7.0, n_codes: 21, note: "외래 추적 — 지질 재검 + 스타틴·경구약 시작", codes: {
        Condition: ["320128 Essential hypertension", "4193704 Type 2 diabetes mellitus without complication", "432867 Hyperlipidemia", "4144111 Gastroesophageal reflux disease without esophagitis", "321318 Angina pectoris", "315296 Preinfarction syndrome", "4008576 Diabetes mellitus without complication"],
        Drug: ["19075601 clopidogrel 75 MG Oral Tablet", "40991405 lansoprazole 15 MG Oral Capsule", "40164925 metformin hydrochloride 500 MG Extended Release Oral Tablet", "36026843 ezetimibe 10 MG / rosuvastatin 20 MG Oral Tablet", "1592317 dapagliflozin 10 MG / saxagliptin 5 MG Oral Tablet"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3028437 Cholesterol in LDL [Mass/volume] in Serum or Plasma", "3004410 Hemoglobin A1c/Hemoglobin.total in Blood", "3027114 Cholesterol [Mass/volume] in Serum or Plasma", "40760139 Urinalysis dipstick W Reflex Microscopic panel - Urine", "3022192 Triglyceride [Mass/volume] in Serum or Plasma", "3007070 Cholesterol in HDL [Mass/volume] in Serum or Plasma", "3005577 Microalbumin [Mass/time] in 24 hour Urine"],
      } },
      { visit: 3, day: 10.5, n_codes: 21, note: "외래 추적 — 동일 항목", codes: {
        Condition: ["320128 Essential hypertension", "4193704 Type 2 diabetes mellitus without complication", "432867 Hyperlipidemia", "4144111 Gastroesophageal reflux disease without esophagitis", "321318 Angina pectoris", "315296 Preinfarction syndrome", "4008576 Diabetes mellitus without complication"],
        Drug: ["19075601 clopidogrel 75 MG Oral Tablet", "40991405 lansoprazole 15 MG Oral Capsule", "40164925 metformin hydrochloride 500 MG Extended Release Oral Tablet", "36026843 ezetimibe 10 MG / rosuvastatin 20 MG Oral Tablet", "1592317 dapagliflozin 10 MG / saxagliptin 5 MG Oral Tablet"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3027114 Cholesterol [Mass/volume] in Serum or Plasma", "40760139 Urinalysis dipstick W Reflex Microscopic panel - Urine", "3022192 Triglyceride [Mass/volume] in Serum or Plasma", "3007070 Cholesterol in HDL [Mass/volume] in Serum or Plasma", "3028437 Cholesterol in LDL [Mass/volume] in Serum or Plasma", "3004410 Hemoglobin A1c/Hemoglobin.total in Blood", "3005577 Microalbumin [Mass/time] in 24 hour Urine"],
      } },
      { visit: 4, day: 14.0, n_codes: 16, note: "외래 추적 — 동일 항목", codes: {
        Condition: ["320128 Essential hypertension", "4193704 Type 2 diabetes mellitus without complication", "432867 Hyperlipidemia", "4144111 Gastroesophageal reflux disease without esophagitis", "321318 Angina pectoris", "315296 Preinfarction syndrome", "4008576 Diabetes mellitus without complication"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3027114 Cholesterol [Mass/volume] in Serum or Plasma", "40760139 Urinalysis dipstick W Reflex Microscopic panel - Urine", "3022192 Triglyceride [Mass/volume] in Serum or Plasma", "3007070 Cholesterol in HDL [Mass/volume] in Serum or Plasma", "3028437 Cholesterol in LDL [Mass/volume] in Serum or Plasma", "3004410 Hemoglobin A1c/Hemoglobin.total in Blood", "3005577 Microalbumin [Mass/time] in 24 hour Urine"],
      } },
    ]
  },
  F: {
    patient_index: 14933,
    n_visits: 6,
    visits: [
      { visit: 0, day: 0.0, n_codes: 11, note: "피부과 초진 — 관찰창(anchor)", codes: {
        Condition: ["45766714 Inflammatory dermatosis"],
        Drug: ["961050 ranitidine 150 MG Oral Tablet", "42954552 olopatadine 5 MG Oral Tablet", "42968484 bepotastine 7.11 MG Disintegrating Oral Tablet", "42917640 20000 MG prednicarbate 0.0025 MG/MG Topical Lotion"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3020891 Body temperature", "3024171 Respiratory rate", "3027018 Heart rate"],
        Device: ["4225920 Skin protector"],
      } },
      { visit: 1, day: 3.5, n_codes: 29, note: "흉통 — 혈액검사·심전도", codes: {
        Condition: ["77670 Chest pain"],
        Drug: ["42479436 1000 ML Sodium Chloride 9 MG/ML Injectable Solution"],
        Measurement: ["3011424 Glucose [Mass/volume] in Blood by Automated test strip", "3016723 Creatinine [Mass/volume] in Serum or Plasma", "3013682 Urea nitrogen [Mass/volume] in Serum or Plasma", "3006923 Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma", "3013721 Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma", "3024128 Bilirubin.total [Mass/volume] in Serum or Plasma", "3004501 Glucose [Mass/volume] in Serum or Plasma", "3006906 Calcium [Mass/volume] in Serum or Plasma", "40760139 Urinalysis dipstick W Reflex Microscopic panel - Urine", "3012095 Magnesium [Moles/volume] in Serum or Plasma", "3010156 C reactive protein [Mass/volume] in Serum or Plasma by High sensitivity method", "3008295 Osmolality of Serum or Plasma", "3016771 Amylase [Enzymatic activity/volume] in Serum or Plasma", "3047181 Lactate [Moles/volume] in Blood", "3007220 Creatine kinase [Enzymatic activity/volume] in Serum or Plasma", "3005785 Creatine kinase.MB [Mass/volume] in Serum or Plasma", "…외 4건"],
        Procedure: ["36713195 X-ray of chest anteroposterior view", "4163951 Electrocardiographic procedure", "4329772 Diffusion weighted magnetic resonance imaging of brain"],
        Device: ["4219637 Peripheral intravenous catheter", "45762899 Intravenous line filter", "40489931 Catheter stabilization device", "4129115 Hemostatic gauze"],
      } },
      { visit: 2, day: 7.0, n_codes: 14, note: "흉통 — 운동부하 심전도·심초음파(정상 동율동)", codes: {
        Condition: ["77670 Chest pain"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3020891 Body temperature", "3024171 Respiratory rate", "3027018 Heart rate", "3025315 Body weight", "3036277 Body height", "4261794 Electrocardiogram with exercise test", "46235080 Noninvasive arteriosclerosis studies panel"],
        Procedure: ["4187078 Electrocardiographic monitoring", "4335825 Transthoracic echocardiography"],
        Observation: ["4142265 ECG: normal sinus rhythm", "4065279 ECG normal"],
      } },
      { visit: 3, day: 10.5, n_codes: 6, note: "흉통 — 관상동맥 조영", codes: {
        Condition: ["77670 Chest pain"],
        Drug: ["19075601 clopidogrel 75 MG Oral Tablet"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3027018 Heart rate"],
        Procedure: ["4142645 Angiography of coronary artery"],
      } },
      { visit: 4, day: 14.0, n_codes: 30, note: "흉통 — 관상동맥 조영 + 에르고노빈 유발검사", codes: {
        Condition: ["77670 Chest pain"],
        Drug: ["21137851 100 ML Sodium Chloride 9 MG/ML Injectable Solution", "42479436 1000 ML Sodium Chloride 9 MG/ML Injectable Solution", "21040129 500 ML Sodium Chloride 9 MG/ML Injectable Solution", "19075601 clopidogrel 75 MG Oral Tablet", "36895720 20 ML Lidocaine 20 MG/ML Injectable Solution", "42481573 50 ML Sodium Chloride 9 MG/ML Injectable Solution", "19019337 nitroglycerin 0.6 MG Sublingual Tablet", "43771211 5 ML heparin 5000 UNT/ML Injectable Solution", "44058521 Lidocaine 0.025 MG/MG / Prilocaine 0.025 MG/MG Topical Cream", "41333573 1 ML Methylergonovine 0.2 MG/ML Injectable Solution"],
        Measurement: ["4152194 Systolic blood pressure", "4154790 Diastolic blood pressure", "3020891 Body temperature", "3024171 Respiratory rate", "3027018 Heart rate"],
        Procedure: ["4187078 Electrocardiographic monitoring", "4063814 Comprehensive interview and evaluation", "4142645 Angiography of coronary artery", "4217026 Ergonovine provocation test"],
        Device: ["4023557 Filter", "4219637 Peripheral intravenous catheter", "45773488 Intravenous line stopcock", "4129115 Hemostatic gauze", "…외 6건"],
      } },
      { visit: 5, day: 17.5, n_codes: 8, note: "★ 고혈압·고지혈증·당뇨 진단 (혈압 4회 측정 뒤)", codes: {
        Condition: ["320128 Essential hypertension", "432867 Hyperlipidemia", "4144111 Gastroesophageal reflux disease without esophagitis", "321318 Angina pectoris", "4008576 Diabetes mellitus without complication"],
        Drug: ["19075601 clopidogrel 75 MG Oral Tablet", "40165642 pitavastatin calcium 2 MG Oral Tablet"],
        Procedure: ["4257833 Patient transfer management"],
      } },
    ]
  },
};

/* ---------------------------------------------------------------------
   OMOP_PATIENTS — demo_data.js 와 같은 스키마의 체험용 케이스.
   fetched 항목의 "이름"은 위 OMOP_SOURCE 의 실제 코드에서 왔고, 괄호 안 수치는 작성값이다.
   --------------------------------------------------------------------- */
const OMOP_PATIENTS = [
  {
    id: "D",
    name: "실사례 D",
    axis: "가정의학과",
    sex: "여", age: 64,
    summary: "안과 진료 기록만 남은 상태에서 시작. 대사질환 코드는 아직 하나도 없음, 기록 9건.",
    chief: "시야가 흐리고 눈이 뻑뻑함 — 안과 초진",
    source: "OMOP-CDM generated_060641 · patient_index 14904",
    window: {
      label: "내원 후 0 ~ 52분 (OMOP-CDM · 관찰창은 첫 방문 하나뿐)", span: "첫 방문 0~52분",
      records: [
        { t: "0:00", kind: "이동", name: "내원 접수", value: "" },
        { t: "0:08", kind: "검사", name: "안압 (우/좌)", value: "24 / 22 mmHg", flag: "high" },
        { t: "0:15", kind: "검사", name: "세극등 검사", value: "시행" },
        { t: "0:21", kind: "검사", name: "안저 촬영", value: "망막 미세혈관 변화 의심", flag: "high" },
        { t: "0:24", kind: "검사", name: "망막 빛간섭단층촬영", value: "황반부 두께 증가", flag: "high" },
        { t: "0:30", kind: "검사", name: "시야 검사", value: "주변부 결손" },
        { t: "0:37", kind: "검사", name: "굴절 검사", value: "−2.25 D" },
        { t: "0:45", kind: "처방", name: "라타노프로스트 점안액", value: "0.005 %" },
        { t: "0:52", kind: "처방", name: "도르졸라미드 점안액", value: "2 %" },
      ]
    },
    fm: omopFillFm({ "당뇨 (합병증 없음)": 0.34, "고혈압": 0.26, "지질대사 장애": 0.21, "만성 신장질환": 0.09,
                     "갑상선 질환": 0.07, "뇌졸중": 0.05, "빈혈": 0.04 }),
    calib: {
      text: "관찰창은 안과 기록뿐이고 혈당·지질·혈압 수치는 하나도 없습니다. 다만 망막 미세혈관 변화와 황반 두께 증가가 함께 기록됐고, 녹내장으로 안압을 반복 측정하고 있습니다. 이 조합은 당뇨망막병증을 먼저 감별해야 하는 그림이라 당뇨 확률을 0.34에서 0.44로 올립니다. 망막혈관 변화는 고혈압성 변화와도 겹치므로 고혈압도 0.26에서 0.31로 올립니다. 지질은 직접 근거가 없어 그대로 둡니다.",
      changes: { "당뇨 (합병증 없음)": 0.44, "고혈압": 0.31 }
    },
    candidates: [
      { dx: "당뇨 (합병증 없음)", p: 0.44, why: "망막 미세혈관 변화 + 황반 두께 증가. HbA1c·혈당·경구약 이력이 갈림길." },
      { dx: "고혈압", p: 0.31, why: "망막혈관 변화는 고혈압성일 수도 있다. 혈압 측정 2회 이상이면 확정." },
      { dx: "지질대사 장애", p: 0.21, why: "직접 근거 없음. LDL·중성지방·스타틴 처방이 나오면 크게 움직인다." },
      { dx: "만성 신장질환", p: 0.09, why: "당뇨·고혈압의 동반 합병증. 크레아티닌·요검사로 바로 갈린다." },
      { dx: "갑상선 질환", p: 0.07, why: "안구 증상의 대안 설명. TSH·Free T4로 배제 가능." },
    ],
    trees: {
      "당뇨 (합병증 없음)": [
        { round: 1, request: ["당화혈색소", "공복 혈당", "메트포르민", "안저 검사", "요 알부민"], fetched: ["당화혈색소 8.1 %", "공복 혈당 162 mg/dL", "메트포르민 1000mg 서방정 (10.5일)"], before: 0.44, after: 0.88, judge: "llm",
          text: "당화혈색소 8.1과 공복 혈당 162는 진단 기준을 넘고, 메트포르민 서방정 처방까지 확인됩니다. 망막 소견은 이 진단으로 설명됩니다. 확정.", verdict: "확정" },
      ],
      "고혈압": [
        { round: 1, request: ["혈압 추이", "항고혈압제", "심초음파"], fetched: ["혈압 152 / 94 (10.5일)", "암로디핀 5mg + 텔미사르탄 40mg 복합정", "네비볼롤 2.5mg"], before: 0.31, after: 0.86, judge: "auto",
          text: "140/90 이상 측정과 ARB·CCB 복합제, 베타차단제 처방이 함께 확인됩니다. 0.86으로 자동 확정.", verdict: "확정" },
      ],
      "지질대사 장애": [
        { round: 1, request: ["LDL", "HDL", "중성지방", "스타틴"], fetched: ["LDL 158 mg/dL", "HDL 41 mg/dL", "중성지방 214 mg/dL"], before: 0.21, after: 0.63, judge: "llm",
          text: "LDL 158, HDL 41, 중성지방 214로 세 항목 모두 기준을 벗어납니다. 다만 약물 기록이 아직 없어 일시적 상승과 구분되지 않습니다. 추가 조사.", verdict: "추가 조사" },
        { round: 2, request: ["스타틴", "아포지단백 B", "지단백(a)"], fetched: ["피타바스타틴 4mg", "아포지단백 B 112 mg/dL", "지단백(a) 38 mg/dL"], before: 0.63, after: 0.91, judge: "auto",
          text: "스타틴 처방과 아포지단백 B 상승이 확인되어 0.91. 자동 확정.", verdict: "확정" },
      ],
      "만성 신장질환": [
        { round: 1, request: ["크레아티닌", "요소질소", "요 단백", "eGFR"], fetched: ["크레아티닌 0.9 mg/dL", "요소질소 16 mg/dL", "요검사 단백 음성"], before: 0.09, after: 0.06, judge: "auto",
          text: "크레아티닌·요소질소 정상, 단백뇨 없음. 당뇨·고혈압은 있으나 아직 신장 침범 근거가 없습니다. 자동 배제.", verdict: "배제" },
      ],
      "갑상선 질환": [
        { round: 1, request: ["TSH", "Free T4"], fetched: ["TSH 1.8 mIU/L"], before: 0.07, after: 0.04, judge: "auto",
          text: "TSH 정상. 안구 증상은 녹내장·망막질환으로 설명됩니다. 자동 배제.", verdict: "배제" },
      ],
    },
    truth: ["당뇨 (합병증 없음)", "고혈압", "지질대사 장애"],
    timeline: {
      unit: "일", axisLabel: "첫 방문 이후 경과 일수 (OMOP gap 토큰 기준)",
      ticks: [0, 3.5, 7, 10.5, 14, 17.5],
      lead: "안과 기록만 있던 첫 방문에서 모델은 대사질환 세 개를 요청했습니다. 그 진단이 실제 기록에 붙기까지 얼마나 걸렸는지 봅니다.",
      headline: { num: "10.5일", cap: "진단 의심으로 올린 시점부터\n실제 진단 기록까지" },
      rank: { n: 1, of: 25, at: "첫 방문 52분" },
      trackNote: "눈금은 이 환자의 실제 방문일입니다. 각 방문의 모든 기록이 아니라 진단·처방이 바뀐 지점만 찍었습니다.",
      summary: "실제로는 안과를 세 번 더 다닌 뒤 열흘째 내과에서야 고혈압·2형 당뇨·고지혈증이 함께 코딩됐습니다. 모델은 첫 방문의 망막 소견만으로 같은 세 진단을 요청했습니다.",
      minor: [{ at: 0, n: 18 }, { at: 3.5, n: 7 }, { at: 7, n: 6 }, { at: 10.5, n: 45 }, { at: 14, n: 15 }, { at: 17.5, n: 5 }],
      minorLabel: "6회 방문 · 실제 코드 96건",
      focus: "당뇨 (합병증 없음)",
      traj: [
        { at: 0,    p: 0.44, obs: true, label: "안과 기록 9건만으로 당뇨를 의심", sub: "망막 미세혈관 변화 → 당화혈색소 요청" },
        { at: 10.5, p: 0.88, label: "당화혈색소 8.1 · 메트포르민 기록을 읽고 확정" },
      ],
      real: [
        { at: 0,    name: "안과 초진", sub: "망막질환 · 녹내장", side: "down" },
        { at: 3.5,  name: "안과 재방문 ×2", sub: "7일까지 안과 진료만 이어짐", side: "up" },
        { at: 10.5, name: "내과 전환 — 대사 3종 동시 진단", sub: "HbA1c 8.1 · LDL 158 · 메트포르민 시작", key: true, side: "down" },
        { at: 14,   name: "SGLT2 복합제 전환", side: "up" },
      ],
      gaps: [
        { to: 10.5, label: "후보 지목 → 실제 진단 기록까지 10.5일", big: true },
      ]
    },
    learning: {
      bank: [
        { dx: "당뇨 (합병증 없음)", miss: 9, over: 2 },
        { dx: "지질대사 장애", miss: 6, over: 1 },
        { dx: "만성 신장질환", miss: 1, over: 5 },
      ],
      proposal: {
        dx: "당뇨 (합병증 없음)",
        text: "안과 단독 방문이라 대사 검사가 없다는 이유로 확률을 낮추지 말 것. 망막 미세혈관 변화나 황반 두께 증가가 기록돼 있으면 당화혈색소를 먼저 요청하고, 검사가 없더라도 확률을 유지한 채 추가 조사로 넘길 것."
      },
      gate: { mean: 0.041, lo: 0.012, hi: 0.070, n: 40, adopted: true },
      holdout: { delta: 0.018, lo: 0.001, hi: 0.036 }
    }
  },

  {
    id: "E",
    name: "실사례 E",
    axis: "가정의학과",
    sex: "남", age: 61,
    summary: "건강검진 패널을 들고 외래 방문. 지질 수치는 이미 기준을 넘었지만 진단은 붙지 않은 상태, 기록 11건.",
    chief: "건강검진 결과지를 들고 상담차 방문, 뚜렷한 증상 없음",
    source: "OMOP-CDM generated_060641 · patient_index 6948",
    window: {
      label: "내원 후 0 ~ 48분 (OMOP-CDM · 관찰창은 첫 방문 하나뿐)", span: "첫 방문 0~48분",
      records: [
        { t: "0:00", kind: "이동", name: "내원 접수", value: "" },
        { t: "0:04", kind: "활력", name: "혈압", value: "138 / 86 mmHg" },
        { t: "0:04", kind: "활력", name: "심박수", value: "74 /min" },
        { t: "0:05", kind: "활력", name: "체중", value: "81.6 kg" },
        { t: "0:08", kind: "소견", name: "당뇨 합병증 · 고혈당", value: "기왕력", flag: "high" },
        { t: "0:22", kind: "검사", name: "LDL", value: "168 mg/dL", flag: "high" },
        { t: "0:22", kind: "검사", name: "중성지방", value: "210 mg/dL", flag: "high" },
        { t: "0:22", kind: "검사", name: "HDL", value: "38 mg/dL", flag: "low" },
        { t: "0:22", kind: "검사", name: "당화혈색소", value: "8.2 %", flag: "high" },
        { t: "0:30", kind: "검사", name: "크레아티닌", value: "0.9 mg/dL" },
        { t: "0:48", kind: "검사", name: "경동맥 내중막두께", value: "1.04 mm", flag: "high" },
      ]
    },
    fm: omopFillFm({ "지질대사 장애": 0.52, "당뇨 (합병증 없음)": 0.48, "고혈압": 0.24,
                     "급성 심근경색": 0.09, "만성 신장질환": 0.08, "갑상선 질환": 0.05 }),
    calib: {
      text: "검진 패널이 통째로 들어와 있습니다. LDL 168, 중성지방 210, HDL 38은 세 항목 모두 기준을 벗어났고 경동맥 내중막두께 1.04까지 함께 보면 지질대사 장애를 0.52에서 0.61로 올립니다. 당화혈색소 8.2와 당뇨 합병증 기왕력으로 당뇨도 0.48에서 0.55로 올립니다. 혈압 138/86은 경계 범위라 그대로 둡니다.",
      changes: { "지질대사 장애": 0.61, "당뇨 (합병증 없음)": 0.55 }
    },
    candidates: [
      { dx: "지질대사 장애", p: 0.61, why: "LDL 168 · 중성지방 210 · HDL 38. 스타틴 처방과 재검이 확정을 가른다." },
      { dx: "당뇨 (합병증 없음)", p: 0.55, why: "당화혈색소 8.2, 합병증 기왕력. 경구약과 미세알부민뇨로 분류가 갈린다." },
      { dx: "고혈압", p: 0.24, why: "138/86 경계 범위. 반복 측정이 기준을 넘는지가 갈림길." },
      { dx: "급성 심근경색", p: 0.09, why: "현재 증상 기록 없음. 경동맥 내중막두께만으로는 부족하다." },
      { dx: "만성 신장질환", p: 0.08, why: "크레아티닌 0.9 정상. 미세알부민뇨로 배제." },
    ],
    trees: {
      "지질대사 장애": [
        { round: 1, request: ["LDL 재검", "총 콜레스테롤", "스타틴", "에제티미브"], fetched: ["LDL 재검 (7.0일)", "총 콜레스테롤 (7.0일)", "중성지방 재검 (7.0일)", "에제티미브 10mg + 로수바스타틴 20mg (7.0일)"], before: 0.61, after: 0.93, judge: "auto",
          text: "지질 패널이 통째로 재검됐고 에제티미브·로수바스타틴 복합제가 시작됐습니다. 검진 수치와 치료가 모두 일치합니다. 0.93으로 자동 확정.", verdict: "확정" },
      ],
      "당뇨 (합병증 없음)": [
        { round: 1, request: ["당화혈색소 재검", "경구 혈당강하제", "미세알부민뇨"], fetched: ["당화혈색소 재검 (7.0일)", "메트포르민 500mg 서방정 (7.0일)", "다파글리플로진 + 삭사글립틴 (7.0일)", "미세알부민뇨 음성 (7.0일)"], before: 0.55, after: 0.90, judge: "auto",
          text: "경구 혈당강하제 두 종이 시작됐고 미세알부민뇨는 음성입니다. 0.90으로 자동 확정.", verdict: "확정" },
      ],
      "고혈압": [
        { round: 1, request: ["혈압 재측정", "항고혈압제"], fetched: ["혈압 재측정 (7.0일)", "혈압 재측정 (10.5일)", "혈압 재측정 (14.0일)"], before: 0.24, after: 0.66, judge: "llm",
          text: "혈압이 세 번 더 기록됐지만 항고혈압제 처방은 끝내 없습니다. 측정 자체는 반복됐으므로 불확실로 남깁니다.", verdict: "불확실" },
      ],
      "급성 심근경색": [
        { round: 1, request: ["트로포닌", "CK-MB", "심전도", "관상동맥 조영"], fetched: ["관상동맥 조영 (3.5일)", "관상동맥 스텐트 삽입 (3.5일)", "심근효소 (3.5일)"], before: 0.09, after: 0.34, judge: "llm",
          text: "사흘 뒤 관상동맥 조영과 스텐트 삽입이 확인됩니다. 다만 퇴원 진단은 협심증이고 심근경색 코드는 붙지 않았습니다. 0.34로 두되 배제하지 않고 불확실로 남깁니다.", verdict: "불확실" },
      ],
      "만성 신장질환": [
        { round: 1, request: ["크레아티닌", "미세알부민뇨", "요검사"], fetched: ["미세알부민뇨 음성 (7.0일)", "요검사 (7.0일)"], before: 0.08, after: 0.05, judge: "auto",
          text: "미세알부민뇨 음성, 요검사 정상. 자동 배제.", verdict: "배제" },
      ],
    },
    truth: ["지질대사 장애", "당뇨 (합병증 없음)", "고혈압"],
    timeline: {
      unit: "일", axisLabel: "첫 방문 이후 경과 일수 (OMOP gap 토큰 기준)",
      ticks: [0, 3.5, 7, 10.5, 14],
      lead: "검진에서 지질 수치는 이미 기준을 넘어 있었습니다. 그런데 진단은 그날 붙지 않았습니다. 그 사이에 무슨 일이 있었는지 봅니다.",
      focus: "지질대사 장애",
      headline: { num: "3.5일", cap: "이상 수치가 기록됐는데도\n진단 없이 지나간 시간" },
      rank: { n: 1, of: 25, at: "첫 방문 48분" },
      minor: [{ at: 0, n: 24 }, { at: 3.5, n: 108 }, { at: 7, n: 21 }, { at: 10.5, n: 21 }, { at: 14, n: 16 }],
      minorLabel: "5회 방문 · 실제 코드 190건",
      trackNote: "눈금은 이 환자의 실제 방문일이고 기록 눈금은 방문별 실제 코드 수입니다. 3.5일차 방문은 관상동맥 시술이 함께 이뤄져 눈금이 특히 촘촘합니다.",
      summary: "LDL 168 · 중성지방 210 · HDL 38은 첫 방문에 이미 나와 있었습니다. 그런데 고지혈증 진단은 사흘 뒤, 관상동맥 스텐트를 받는 자리에서야 함께 붙었고 스타틴은 이레째 시작됐습니다. 모델은 검진 수치만 보고 첫 방문에 지질대사 장애를 의심으로 올렸습니다.",
      traj: [
        { at: 0, p: 0.61, obs: true, label: "검진 패널 11건만으로 지질대사 장애를 의심", sub: "LDL 168 · 중성지방 210 · HDL 38" },
        { at: 7, p: 0.93, label: "지질 재검과 스타틴 복합제 처방을 읽고 확정" },
      ],
      real: [
        { at: 0,    name: "건강검진 외래", sub: "지질 3항목 기준 초과 — 진단은 붙지 않음", side: "up" },
        { at: 3.5,  name: "고지혈증 · 고혈압 · 2형 당뇨 진단", sub: "같은 날 관상동맥 스텐트 삽입", key: true, side: "down" },
        { at: 7,    name: "에제티미브 + 로수바스타틴 시작", sub: "지질 패널 재검", key: true, side: "up" },
        { at: 10.5, name: "지질 · 당화혈색소 추적", side: "down" },
        { at: 14,   name: "동일 검사 반복", side: "up" },
      ],
      gaps: [
        { to: 3.5, label: "이상 수치가 나왔는데도 진단 없이 지나간 3.5일", big: true },
        { to: 7,   label: "의심으로 올린 시점 → 스타틴 시작까지 7일" },
      ]
    },
    learning: {
      bank: [
        { dx: "지질대사 장애", miss: 8, over: 1 },
        { dx: "고혈압", miss: 3, over: 5 },
        { dx: "급성 심근경색", miss: 2, over: 7 },
      ],
      proposal: {
        dx: "지질대사 장애",
        text: "검진 패널에서 LDL·중성지방·HDL이 함께 기준을 벗어나면 스타틴 처방이 아직 없어도 확률을 올릴 것. 특히 경동맥 내중막두께가 함께 높으면 치료 시작 기록을 기다리지 말고 상위 후보로 둘 것."
      },
      gate: { mean: 0.039, lo: 0.011, hi: 0.067, n: 40, adopted: true },
      holdout: { delta: 0.016, lo: -0.002, hi: 0.034 }
    }
  },

  {
    id: "F",
    name: "실사례 F",
    axis: "가정의학과",
    sex: "여", age: 58,
    summary: "피부 질환으로 외래 방문. 혈액검사는 하나도 없고 활력징후만 측정됨, 기록 9건.",
    chief: "다리와 발에 낫지 않는 피부 병변, 가려움 — 피부과 방문",
    source: "OMOP-CDM generated_060641 · patient_index 14933",
    window: {
      label: "내원 후 0 ~ 32분 (OMOP-CDM · 관찰창은 첫 방문 하나뿐)", span: "첫 방문 0~32분",
      records: [
        { t: "0:00", kind: "이동", name: "내원 접수", value: "" },
        { t: "0:05", kind: "활력", name: "혈압", value: "152 / 94 mmHg", flag: "high" },
        { t: "0:05", kind: "활력", name: "심박수", value: "78 /min" },
        { t: "0:06", kind: "활력", name: "체온", value: "36.7 ℃" },
        { t: "0:06", kind: "활력", name: "호흡수", value: "16 /min" },
        { t: "0:10", kind: "소견", name: "염증성 피부질환", value: "있음" },
        { t: "0:28", kind: "처방", name: "베포타스틴", value: "7.11 mg" },
        { t: "0:28", kind: "처방", name: "올로파타딘", value: "5 mg" },
        { t: "0:30", kind: "처방", name: "프레드니카르베이트 연고", value: "0.25 %" },
        { t: "0:32", kind: "처방", name: "라니티딘", value: "150 mg" },
      ]
    },
    fm: omopFillFm({ "고혈압": 0.38, "지질대사 장애": 0.19, "당뇨 (합병증 없음)": 0.17,
                 "급성 심근경색": 0.08, "만성 신장질환": 0.07, "갑상선 질환": 0.05 }),
    calib: {
      text: "관찰창은 피부과 기록뿐이고 혈액검사가 하나도 없습니다. 혈압 152/94가 유일한 이상치입니다. 피부 질환으로 온 환자라도 측정된 혈압이 140/90을 넘으면 그냥 지나칠 수 없으므로 고혈압을 0.38에서 0.46으로 올립니다. 지질과 당뇨는 지지할 기록도 반박할 기록도 없어 FM 확률을 그대로 둡니다.",
      changes: { "고혈압": 0.46 }
    },
    candidates: [
      { dx: "고혈압", p: 0.46, why: "152/94 단일 측정. 이후 방문에서 반복 측정이 기준을 넘는지가 전부." },
      { dx: "지질대사 장애", p: 0.19, why: "직접 근거 없음. 지질 검사나 스타틴 처방이 나오면 크게 움직인다." },
      { dx: "당뇨 (합병증 없음)", p: 0.17, why: "직접 근거 없음. 혈당·당화혈색소·경구약이 갈림길." },
      { dx: "급성 심근경색", p: 0.08, why: "현재 근거 없음. 흉통·심근효소·관상동맥 검사가 나오면 재검토." },
      { dx: "만성 신장질환", p: 0.07, why: "신장 지표 자체가 없음. 크레아티닌으로 바로 갈린다." },
    ],
    trees: {
      "고혈압": [
        { round: 1, request: ["혈압 재측정", "항고혈압제", "체중", "심초음파"], fetched: ["혈압 재측정 (7.0일)", "체중 · 신장 측정 (7.0일)", "심초음파 (7.0일)"], before: 0.46, after: 0.62, judge: "llm",
          text: "혈압이 한 번 더 기록됐고 심초음파까지 시행됐습니다. 다만 항고혈압제 처방이 없어 확정하기엔 이릅니다. 추가 조사.", verdict: "추가 조사" },
        { round: 2, request: ["혈압 추이", "항고혈압제", "안저 검사"], fetched: ["혈압 재측정 (10.5일)", "혈압 재측정 (14.0일)"], before: 0.62, after: 0.81, judge: "llm",
          text: "네 번의 방문에서 모두 혈압이 기록됐습니다. 항고혈압제는 끝내 처방되지 않았지만 반복 측정만으로 진단 기준을 충족합니다. 확정.", verdict: "확정" },
      ],
      "지질대사 장애": [
        { round: 1, request: ["LDL", "중성지방", "총 콜레스테롤", "스타틴"], fetched: ["피타바스타틴 2mg (17.5일)"], before: 0.19, after: 0.64, judge: "llm",
          text: "스타틴이 처방됐습니다. 그런데 이 환자에게는 지질 검사 기록이 한 건도 없어 수치로 뒷받침할 수가 없습니다. 처방만 보고 확정하지 않고 불확실로 남깁니다.", verdict: "불확실" },
      ],
      "당뇨 (합병증 없음)": [
        { round: 1, request: ["당화혈색소", "공복 혈당", "경구 혈당강하제", "요 알부민"], fetched: ["혈당 (3.5일)", "혈당 재검 (7.0일)"], before: 0.17, after: 0.61, judge: "llm",
          text: "혈당이 두 번 측정됐지만 당화혈색소도, 경구 혈당강하제도 없습니다. 진단 기준을 확인할 수 없어 불확실로 남깁니다.", verdict: "불확실" },
      ],
      "급성 심근경색": [
        { round: 1, request: ["트로포닌", "CK-MB", "심전도", "관상동맥 조영"], fetched: ["심전도 정상 동율동 (7.0일)", "운동부하 심전도 (7.0일)", "관상동맥 조영 (10.5일)", "에르고노빈 유발검사 (14.0일)"], before: 0.08, after: 0.09, judge: "llm",
          text: "흉통으로 관상동맥 조영까지 갔지만 심전도는 정상 동율동이고 심근효소 기록이 없습니다. 에르고노빈 유발검사는 경색이 아니라 혈관연축을 보려는 검사입니다. 배제.", verdict: "배제" },
      ],
      "만성 신장질환": [
        { round: 1, request: ["크레아티닌", "요소질소", "요검사"], fetched: ["크레아티닌 (3.5일)", "요소질소 (3.5일)", "요검사 (3.5일)"], before: 0.07, after: 0.05, judge: "auto",
          text: "크레아티닌·요소질소·요검사 모두 정상 범위. 자동 배제.", verdict: "배제" },
      ],
    },
    truth: ["고혈압", "지질대사 장애", "당뇨 (합병증 없음)"],
    timeline: {
      unit: "일", axisLabel: "첫 방문 이후 경과 일수 (OMOP gap 토큰 기준)",
      ticks: [0, 3.5, 7, 10.5, 14, 17.5],
      lead: "피부 질환으로 온 외래에서 혈압 한 번이 측정됐습니다. 그 한 번으로 모델이 무엇을 의심했고, 실제 진단은 몇 번의 방문을 지나 언제 붙었는지 봅니다.",
      focus: "고혈압",
      headline: { num: "17.5일", cap: "진단 의심으로 올린 시점부터\n고혈압 진단 기록까지" },
      rank: { n: 1, of: 25, at: "첫 방문 32분" },
      minor: [{ at: 0, n: 11 }, { at: 3.5, n: 29 }, { at: 7, n: 14 }, { at: 10.5, n: 6 }, { at: 14, n: 30 }, { at: 17.5, n: 8 }],
      minorLabel: "6회 방문 · 실제 코드 98건",
      trackNote: "눈금은 이 환자의 실제 방문일이고 기록 눈금은 방문별 실제 코드 수입니다. 3.5일부터 14일까지는 흉통 정밀검사가 이어진 구간으로, 이 체험의 대사질환 이야기에서는 배경으로만 둡니다.",
      summary: "혈압은 네 번 측정됐습니다. 그런데도 고혈압 진단은 다섯 번의 방문을 지나 17.5일째에야 붙었고, 그 사이 환자는 흉통으로 관상동맥 조영을 두 번 받았습니다. 모델은 첫 피부과 방문의 혈압 한 번만 보고 의심으로 올렸습니다.",
      traj: [
        { at: 0,  p: 0.46, obs: true, label: "피부과 기록 9건만으로 고혈압을 의심", sub: "혈압 152/94 · 혈액검사 없음" },
        { at: 7,  p: 0.62, label: "혈압 재측정 · 심초음파 기록을 읽고 상향" },
        { at: 14, p: 0.81, label: "네 번의 혈압 기록을 모두 읽고 확정" },
      ],
      real: [
        { at: 0,    name: "피부과 외래", sub: "염증성 피부질환 · 혈압 측정", side: "up" },
        { at: 3.5,  name: "흉통 — 혈액검사 · 심전도", side: "down" },
        { at: 7,    name: "운동부하 심전도 · 심초음파", sub: "정상 동율동", side: "up" },
        { at: 14,   name: "관상동맥 조영 · 유발검사", side: "up" },
        { at: 17.5, name: "고혈압 · 고지혈증 · 당뇨 진단", key: true, side: "down" },
      ],
      gaps: [
        { to: 17.5, label: "의심으로 올린 시점 → 고혈압 진단 기록까지 17.5일", big: true },
      ]
    },
    learning: {
      bank: [
        { dx: "고혈압", miss: 7, over: 2 },
        { dx: "지질대사 장애", miss: 5, over: 0 },
        { dx: "급성 심근경색", miss: 1, over: 8 },
      ],
      proposal: {
        dx: "고혈압",
        text: "다른 과 방문이라 혈액검사가 없다는 이유로 확률을 낮추지 말 것. 진료과와 무관하게 측정된 혈압이 140/90을 넘으면 후보로 올리고, 이후 방문의 혈압 기록을 가장 먼저 요청할 것."
      },
      gate: { mean: 0.033, lo: 0.007, hi: 0.058, n: 40, adopted: true },
      holdout: { delta: 0.019, lo: 0.001, hi: 0.037 }
    }
  },
];

if (typeof window !== "undefined") { window.OMOP_PATIENTS = OMOP_PATIENTS; window.OMOP_SOURCE = OMOP_SOURCE; }
