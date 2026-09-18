import React, { useMemo, useState } from 'react';
import { useStudy } from '../context/StudyContext';
import quizBank from '../data/quizBank';
import clinicalCases from '../data/clinicalCases';

const STORAGE_KEY = 'medidocs_learning_hub_v1';

const readStore = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
};
const writeStore = (value) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
};

const answerKey = (question) => String(question?.answer ?? '');


const labs = [
  { name:'Hemoglobin', low:'Anaemia pattern', high:'Polycythaemia/dehydration pattern', range:'Adult reference ranges vary by laboratory' },
  { name:'White cell count', low:'Leukopenia pattern', high:'Leukocytosis pattern', range:'Interpret with differential and clinical context' },
  { name:'Platelets', low:'Thrombocytopenia pattern', high:'Thrombocytosis pattern', range:'Interpret with bleeding/thrombotic risk and context' },
  { name:'Sodium', low:'Hyponatraemia pattern', high:'Hypernatraemia pattern', range:'Interpret with volume status and glucose' },
  { name:'Potassium', low:'Hypokalaemia pattern', high:'Hyperkalaemia pattern', range:'Abnormalities can affect cardiac conduction' }
];

const tools = [
  { id:'bmi', title:'BMI', inputs:['weight','height'] },
  { id:'bsa', title:'Body Surface Area', inputs:['weight','height'] },
  { id:'gcs', title:'GCS quick check', inputs:['eye','verbal','motor'] },
  { id:'crcl', title:'Creatinine Clearance', inputs:['age','weight','creatinine','sex'] },
  { id:'anion', title:'Anion Gap', inputs:['sodium','chloride','bicarbonate'] },
  { id:'calcium', title:'Corrected Calcium', inputs:['calcium','albumin'] }
];

const calculate = (tool, v) => {
  const n = Object.fromEntries(Object.entries(v).map(([k,x]) => [k, Number(x)]));
  if (tool === 'bmi') return n.height > 0 ? (n.weight / ((n.height / 100) ** 2)).toFixed(1) : '';
  if (tool === 'bsa') return n.weight > 0 && n.height > 0 ? Math.sqrt((n.height * n.weight) / 3600).toFixed(2) : '';
  if (tool === 'gcs') return n.eye >= 1 && n.eye <= 4 && n.verbal >= 1 && n.verbal <= 5 && n.motor >= 1 && n.motor <= 6 ? n.eye + n.verbal + n.motor : '';
  if (tool === 'crcl') {
    if (!n.age || n.age < 18 || n.age > 120 || !n.weight || n.weight <= 0 || !n.creatinine || n.creatinine <= 0) return '';
    const base = ((140 - n.age) * n.weight) / (72 * n.creatinine);
    return (n.sex === 1 ? base * 0.85 : base).toFixed(1) + ' mL/min';
  }
  if (tool === 'anion') return Number.isFinite(n.sodium) && Number.isFinite(n.chloride) && Number.isFinite(n.bicarbonate) ? n.sodium - (n.chloride + n.bicarbonate) : '';
  if (tool === 'calcium') return Number.isFinite(n.calcium) && Number.isFinite(n.albumin) ? (n.calcium + 0.8 * (4 - n.albumin)).toFixed(2) : '';
  return '';
};

const inputLabel = (name) => ({ weight:'Weight (kg)', height:'Height (cm)', age:'Age (years)', creatinine:'Creatinine (mg/dL)', sodium:'Na', chloride:'Cl', bicarbonate:'HCO₃', calcium:'Calcium', albumin:'Albumin (g/dL)', eye:'Eye (1-4)', verbal:'Verbal (1-5)', motor:'Motor (1-6)', sex:'Female adjustment' }[name] || name);

export default function LearningHub({ onClose, onOpenQuiz }) {
  const { recordLearningReview, learningReviews, learningStatsByCourse } = useStudy();
  const [tab, setTab] = useState('daily');
  const [caseIndex, setCaseIndex] = useState(0);
  const [caseStageIndex, setCaseStageIndex] = useState(0);
  const [caseAnswers, setCaseAnswers] = useState(() => readStore().caseAnswers || {});
  const [tool, setTool] = useState(tools[0]);
  const [values, setValues] = useState({});
  const [review, setReview] = useState(() => readStore().review || {});
  const [selectedLab, setSelectedLab] = useState(labs[0]);
  const [labAnswers, setLabAnswers] = useState({});
  const [ecgAnswers, setEcgAnswers] = useState({});
  const [osceChecks, setOsceChecks] = useState({});
  const [caseScores, setCaseScores] = useState(() => readStore().caseScores || {});
  const [plannerMinutes, setPlannerMinutes] = useState(() => readStore().plannerMinutes || 60);
  const [dailyGoal, setDailyGoal] = useState(() => readStore().dailyGoal || 20);
  const [dailyAnswers, setDailyAnswers] = useState(() => {
    const store = readStore();
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    return store.dailyDay === day ? (store.dailyAnswers || {}) : {};
  });

  const daily20 = useMemo(() => {
    const all = quizBank.flatMap(q => q.questions.map(x => ({...x, course:q.course, difficulty:q.difficulty || 1})));
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    let seed = [...day].reduce((a,c)=>((a*31)+c.charCodeAt(0))>>>0,0);
    const arr = [...all];
    for (let i=arr.length-1;i>0;i-=1){ seed=(seed*1664525+1013904223)>>>0; const j=seed%(i+1); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr.slice(0,20);
  }, []);

  const dailyAnswered = daily20.filter(q => dailyAnswers[q.id]).length;
  const dailyCorrect = daily20.reduce((total, q) => total + (dailyAnswers[q.id] === answerKey(q) ? 1 : 0), 0);
  const topicStats = daily20.reduce((stats, q) => {
    const selected = dailyAnswers[q.id];
    if (!selected) return stats;
    const course = q.course || 'General';
    if (!stats[course]) stats[course] = { answered: 0, correct: 0 };
    stats[course].answered += 1;
    if (selected === answerKey(q)) stats[course].correct += 1;
    return stats;
  }, {});
  const weakestTopic = Object.entries(topicStats)
    .filter(([, stats]) => stats.answered > 0)
    .sort((a, b) => (a[1].correct / a[1].answered) - (b[1].correct / b[1].answered))[0];
  const dueReviews = learningReviews.filter((item) => {
    const due = item.nextReview?.toDate ? item.nextReview.toDate() : new Date(item.nextReview || 0);
    return Number.isNaN(due.getTime()) || due <= new Date();
  });
  const scheduledReviews = learningReviews.length;
  const performanceByCourse = useMemo(() => {
    const aggregate = { ...learningStatsByCourse };
    // Older accounts may not have the aggregate yet. Fall back to the review
    // records so the adaptive engine remains backward compatible.
    if (!Object.keys(aggregate).length) {
      return learningReviews.reduce((stats, item) => {
        const course = item.course || 'General';
        if (!stats[course]) stats[course] = { attempts: 0, correct: 0 };
        if (typeof item.correct === 'boolean') {
          stats[course].attempts += 1;
          if (item.correct) stats[course].correct += 1;
        }
        return stats;
      }, {});
    }
    return aggregate;
  }, [learningReviews, learningStatsByCourse]);
  const reviewById = useMemo(() => Object.fromEntries(learningReviews.map(item => [String(item.itemId || item.id), item])), [learningReviews]);
  const adaptiveQuestions = useMemo(() => {
    const all = quizBank.flatMap(q => q.questions.map(x => ({ ...x, course: q.course, difficulty: q.difficulty || 1 })));
    const ranked = all.map(q => {
      const saved = reviewById[String(q.id)];
      const due = saved?.nextReview?.toDate ? saved.nextReview.toDate() : new Date(saved?.nextReview || 0);
      const isDue = !saved || Number.isNaN(due.getTime()) || due <= new Date();
      const rating = saved?.rating || 'new';
      const courseStats = performanceByCourse[q.course || 'General'] || { attempts: 0, correct: 0 };
      const accuracy = courseStats.attempts ? courseStats.correct / courseStats.attempts : 0.5;
      const weaknessBoost = Math.max(0, 1 - accuracy);
      const priority =
        (isDue ? (rating === 'again' ? 30 : rating === 'hard' ? 20 : 10) : 0) +
        weaknessBoost * 10 +
        (saved ? 0 : 2);
      return { q, priority };
    }).sort((a, b) => b.priority - a.priority);
    return ranked.slice(0, 20).map(item => item.q);
  }, [reviewById, performanceByCourse]);

  const adaptiveReviewList = useMemo(() => {
    const candidates = [
      ...dueReviews
        .map(item => adaptiveQuestions.find(q => q.id === item.itemId))
        .filter(Boolean),
      ...adaptiveQuestions
    ];

    return candidates
      .filter((q, index, list) => list.findIndex(item => item.id === q.id) === index)
      .slice(0, 10);
  }, [dueReviews, adaptiveQuestions]);

  const markReview = (id, rating, metadata = {}) => {
    const next = {...review, [id]: {rating, reviewedAt:new Date().toISOString()}};
    setReview(next); writeStore({...readStore(), review:next});
    void recordLearningReview(id, rating, { source: 'learning-hub', ...metadata });
  };

  const markDailyAnswer = (id, option, answer) => {
    if (dailyAnswers[id]) return;
    setDailyAnswers(prev => {
      if (prev[id]) return prev;
      const next = { ...prev, [id]: option };
      const store = readStore(); const now = new Date(); const day = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; writeStore({ ...store, dailyDay: day, dailyAnswers: next });
      return next;
    });
    markReview(id, option === answer ? 'easy' : 'again', { course: daily20.find(q => q.id === id)?.course || 'General', correct: option === answer });
  };

  const currentCase = clinicalCases[caseIndex];
  const currentStage = currentCase?.stages?.[caseStageIndex];
  const currentCaseKey = currentStage ? currentCase.id + ':' + currentStage.id : '';
  const currentCaseAnswer = currentCaseKey ? caseAnswers[currentCaseKey] : undefined;
  const result = calculate(tool.id, values);

  const planner = useMemo(() => {
    const entries = Object.entries(performanceByCourse);
    const rankedCourses = entries
      .map(([course, stats]) => ({
        course,
        attempts: Number(stats.attempts) || 0,
        correct: Number(stats.correct) || 0,
        accuracy: stats.attempts ? (Number(stats.correct) || 0) / stats.attempts : 0
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
    const weakest = rankedCourses[0]?.course || 'General';
    const dueCount = dueReviews.length;
    const minutes = Math.max(20, Math.min(240, Number(plannerMinutes) || 60));
    const blocks = [
      { title: 'Spaced review', minutes: Math.min(20, Math.max(10, Math.round(minutes * 0.25))), detail: dueCount ? `Review ${Math.min(dueCount, 10)} due items` : 'No overdue reviews. Preview upcoming material.' },
      { title: 'Weak-area practice', minutes: Math.min(30, Math.max(15, Math.round(minutes * 0.35))), detail: `Practice ${weakest}` },
      { title: 'New learning', minutes: Math.max(10, minutes - Math.min(20, Math.max(10, Math.round(minutes * 0.25))) - Math.min(30, Math.max(15, Math.round(minutes * 0.35)))), detail: 'Study one focused topic, then self-test.' }
    ];
    return { minutes, weakest, dueCount, rankedCourses, blocks };
  }, [performanceByCourse, dueReviews.length, plannerMinutes]);

  const labQuestions = useMemo(() => [
    { id:'lab-hb', prompt:'A patient has low haemoglobin. Which pattern is this?', options:['Anaemia','Polycythaemia','Normal haemoglobin','Thrombocytosis'], answer:0 },
    { id:'lab-na', prompt:'A sodium of 124 mmol/L is best described as:', options:['Hyponatraemia','Hypernatraemia','Normal sodium','Hyperkalaemia'], answer:0 },
    { id:'lab-k', prompt:'A potassium of 6.2 mmol/L should prompt attention to:', options:['Cardiac effects and urgent assessment','Only skin examination','Lipid profile only','No follow-up'], answer:0 }
  ], []);

  const ecgQuestions = useMemo(() => [
    { id:'ecg-rate', prompt:'A regular rhythm at 120 beats/min is:', options:['Tachycardia','Bradycardia','Normal adult rate','Asystole'], answer:0 },
    { id:'ecg-rhythm', prompt:'For basic rhythm identification, the first systematic check should include:', options:['Regularity and P waves','Skin colour only','Urine output only','Serum calcium only'], answer:0 },
    { id:'ecg-intervals', prompt:'Which set belongs to a basic ECG interval assessment?', options:['PR, QRS and QT/QTc','Hb, WBC and platelets','Na, K and chloride','BMI, BSA and GCS'], answer:0 }
  ], []);

  const osceItems = useMemo(() => [
    'Introduce yourself, confirm identity and obtain consent',
    'Assess general appearance and vital signs',
    'Inspect chest and respiratory effort',
    'Palpate, percuss and auscultate systematically',
    'Summarize findings, differential diagnoses and management plan'
  ], []);

  const osceCompleted = Object.values(osceChecks).filter(Boolean).length;
  const osceScore = Math.round((osceCompleted / osceItems.length) * 100);
  const labAnswered = Object.keys(labAnswers).length;
  const labCorrect = labQuestions.filter(q => labAnswers[q.id] === q.answer).length;
  const ecgAnswered = Object.keys(ecgAnswers).length;
  const ecgCorrect = ecgQuestions.filter(q => ecgAnswers[q.id] === q.answer).length;

  return <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 flex items-center justify-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="MediDocs Learning Hub">
    <div className="w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div><h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">MediDocs Learning Hub</h2><p className="text-sm text-gray-500 dark:text-slate-400">Daily practice, clinical reasoning, calculators and review tools.</p></div>
        <button onClick={onClose} aria-label="Close learning hub" className="min-w-11 min-h-11 rounded-full bg-gray-100 dark:bg-slate-800 text-xl">✕</button>
      </header>
      <nav className="flex gap-2 overflow-x-auto p-3 border-b border-gray-100 dark:border-slate-800">
        {[['daily','Daily 20'],['cases','Clinical Cases'],['review','Spaced Review'],['labs','Lab Trainer'],['ecg','ECG Mode'],['osce','OSCE Mode'],['calc','Calculators']].map(([id,label]) =>
          <button key={id} onClick={()=>setTab(id)} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold ${tab===id?'bg-emerald-600 text-white':'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200'}`}>{label}</button>
        )}
      </nav>
      <main className="p-4 sm:p-6">
        {tab==='daily' && <section>
          <div className="flex flex-wrap justify-between gap-3 mb-5"><div><h3 className="text-xl font-bold text-gray-900 dark:text-white">Daily 20</h3><p className="text-sm text-gray-500 dark:text-slate-400">{dailyAnswered}/20 answered · {dailyCorrect} correct. A short daily set, because apparently procrastination needs metrics.</p>{weakestTopic && <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200">Focus next: {weakestTopic[0]} · {weakestTopic[1].correct}/{weakestTopic[1].answered} correct</div>}</div><button onClick={onOpenQuiz} className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold">Open full quiz</button></div>
          <div className="grid gap-3">{daily20.map((q,i)=><article key={q.id+i} className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4"><div className="flex justify-between gap-3"><span className="text-xs font-bold text-emerald-600">{i+1}/20 · {q.course}</span><span className="text-xs text-gray-500">Level {q.difficulty}</span></div><p className="mt-2 font-semibold text-gray-900 dark:text-white">{q.question}</p><div className="grid sm:grid-cols-2 gap-2 mt-3">{q.options.map(o=><button key={o} onClick={()=>markDailyAnswer(q.id, o, q.answer)} disabled={Boolean(dailyAnswers[q.id])} className={`text-left px-3 py-2 rounded-lg text-sm ${dailyAnswers[q.id] === o ? (o === answerKey(q) ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40') : 'bg-gray-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700'}`}>{o}</button>)}</div></article>)}</div>
        </section>}

        {tab==='planner' && <section><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-bold text-gray-900 dark:text-white">Personal Study Plan</h3><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Generated from your review queue and course performance. Humans finally get a plan before opening seventeen tabs.</p></div><label className="text-sm font-semibold">Minutes today<input type="number" min="20" max="240" value={plannerMinutes} onChange={e=>{const value=Math.max(20,Math.min(240,Number(e.target.value)||20));setPlannerMinutes(value);writeStore({...readStore(),plannerMinutes:value})}} className="block mt-1 w-28 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"/></label></div><div className="grid sm:grid-cols-3 gap-3 mt-5">{planner.blocks.map(b=><article key={b.title} className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4"><p className="text-xs font-bold text-emerald-600">{b.minutes} min</p><h4 className="font-bold mt-1 text-gray-900 dark:text-white">{b.title}</h4><p className="text-sm text-gray-500 dark:text-slate-400 mt-2">{b.detail}</p></article>)}</div><div className="mt-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-5"><p className="font-bold text-emerald-900 dark:text-emerald-200">Today’s focus</p><p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">{planner.weakest} · {planner.dueCount} due reviews · {planner.minutes} minutes planned</p><div className="mt-4 flex flex-wrap gap-2">{planner.rankedCourses.slice(0,4).map(item=><span key={item.course} className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold">{item.course}: {Math.round(item.accuracy*100)}%</span>)}</div></div></section>}

        {tab==='cases' && <section>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="text-xl font-bold text-gray-900 dark:text-white">Clinical Reasoning Simulator</h3><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Work through presentation, differential, investigation and reassessment instead of merely guessing one answer.</p></div>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">Case {caseIndex+1}/{clinicalCases.length}</span>
          </div>
          <div className="mt-5 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 bg-gray-50 dark:bg-slate-800">
              <div className="flex flex-wrap gap-2 items-center"><span className="text-xs font-bold text-emerald-600">{currentCase?.focus}</span><span className="text-xs rounded-full bg-white dark:bg-slate-900 px-2 py-1">{currentCase?.difficulty}</span></div>
              <h4 className="text-lg font-bold mt-2 text-gray-900 dark:text-white">{currentStage?.title}</h4>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">{currentStage?.prompt}</p>
              <div className="grid gap-2 mt-4">{currentStage?.options.map((option,index)=><button key={option} disabled={currentCaseAnswer!==undefined} onClick={()=>{const correct=index===currentStage.answer;const nextAnswers={...caseAnswers,[currentCaseKey]:index};setCaseAnswers(nextAnswers);writeStore({...readStore(),caseAnswers:nextAnswers});void recordLearningReview(currentCaseKey,correct?'easy':'again',{source:'clinical-case',course:'Clinical Reasoning',caseId:currentCase.id,stageId:currentStage.id,correct});}} className={'text-left p-3 rounded-xl border '+(currentCaseAnswer===index?(index===currentStage.answer?'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40':'border-red-500 bg-red-50 dark:bg-red-950/30'):'border-gray-200 dark:border-slate-700')}>{option}</button>)}</div>
              {currentCaseAnswer!==undefined&&<div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-900"><strong>{currentCaseAnswer===currentStage.answer?'Correct':'Review this step'}</strong><p className="text-sm mt-1 text-gray-600 dark:text-slate-300">{currentStage?.explanation}</p></div>}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex flex-wrap gap-2 justify-between">
              <button disabled={caseStageIndex===0} onClick={()=>setCaseStageIndex(index=>Math.max(0,index-1))} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 disabled:opacity-40">Previous stage</button>
              <span className="px-3 py-2 text-xs font-semibold text-gray-500">Stage {caseStageIndex+1}/{currentCase?.stages?.length||0}</span>
              <button onClick={()=>{if(caseStageIndex<currentCase.stages.length-1)setCaseStageIndex(index=>index+1);else{setCaseIndex(index=>(index+1)%clinicalCases.length);setCaseStageIndex(0);}}} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">{caseStageIndex<currentCase.stages.length-1?'Next stage':'Next case'}</button>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-gray-200 dark:border-slate-700 p-4"><p className="text-sm font-bold">Case progress</p><p className="text-sm text-gray-500 mt-1">{currentCase.stages.filter(stage=>caseAnswers[currentCase.id+':'+stage.id]!==undefined).length}/{currentCase.stages.length} stages answered</p></div>
          <p className="text-xs text-gray-500 mt-4">Educational simulation only. It does not replace supervision, local protocols or clinical judgment.</p>
        </section>}
        {tab==='review' && <section><h3 className="text-xl font-bold text-gray-900 dark:text-white">Spaced Review</h3><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Review due items first. Ratings sync to your account when signed in.</p><div className="grid gap-3 mt-5">{adaptiveReviewList.map(q=><article key={q.id} className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4"><p className="font-semibold text-gray-900 dark:text-white">{q.question}</p><div className="flex gap-2 mt-3">{['again','hard','easy'].map(r=><button key={r} onClick={()=>markReview(q.id,r)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 capitalize">{r}</button>)}<span className="ml-auto text-xs text-gray-500 self-center">{review[q.id]?.rating || 'Due'}</span></div></article>)}</div></section>}

        {tab==='labs' && <section><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-bold text-gray-900 dark:text-white">Lab Interpretation Trainer</h3><p className="text-sm text-gray-500 mt-1">{labAnswered}/{labQuestions.length} answered · {labCorrect} correct</p></div></div><div className="grid gap-3 mt-5">{labQuestions.map(q=><article key={q.id} className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4"><p className="font-semibold text-gray-900 dark:text-white">{q.prompt}</p><div className="grid sm:grid-cols-2 gap-2 mt-3">{q.options.map((o,i)=><button disabled={labAnswers[q.id]!==undefined} key={o} onClick={()=>setLabAnswers(a=>({...a,[q.id]:i}))} className={`text-left px-3 py-2 rounded-xl ${labAnswers[q.id]===i?(i===q.answer?'bg-emerald-100 dark:bg-emerald-900/40':'bg-red-100 dark:bg-red-900/40'):'bg-gray-50 dark:bg-slate-800'}`}>{o}</button>)}</div></article>)}</div><div className="mt-4 rounded-xl border border-gray-200 dark:border-slate-700 p-4"><p className="text-xs text-gray-500">Reference library</p><div className="flex gap-2 overflow-x-auto mt-2">{labs.map(l=><button key={l.name} onClick={()=>setSelectedLab(l)} className="shrink-0 px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800">{l.name}</button>)}</div><p className="text-sm mt-3">{selectedLab.range}. Low: {selectedLab.low}. High: {selectedLab.high}.</p><p className="text-xs text-gray-500 mt-3">Educational interpretation only. Use the reporting laboratory's reference interval and clinical context.</p></div></section>}

        {tab==='ecg' && <section><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-bold text-gray-900 dark:text-white">ECG Learning Mode</h3><p className="text-sm text-gray-500 mt-1">{ecgAnswered}/{ecgQuestions.length} answered · {ecgCorrect} correct</p></div></div><div className="grid gap-3 mt-5">{ecgQuestions.map(q=><article key={q.id} className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4"><p className="font-semibold">{q.prompt}</p><div className="grid sm:grid-cols-2 gap-2 mt-3">{q.options.map((o,i)=><button disabled={ecgAnswers[q.id]!==undefined} key={o} onClick={()=>setEcgAnswers(a=>({...a,[q.id]:i}))} className={`text-left px-3 py-2 rounded-xl ${ecgAnswers[q.id]===i?(i===q.answer?'bg-emerald-100 dark:bg-emerald-900/40':'bg-red-100 dark:bg-red-900/40'):'bg-gray-50 dark:bg-slate-800'}`}>{o}</button>)}</div></article>)}</div><div className="mt-4 grid md:grid-cols-2 gap-3">{[['Rate','Estimate ventricular rate and classify it.'],['Rhythm','Check regularity and P waves.'],['Axis','Use lead I and aVF for a first-pass axis screen.'],['Intervals','Assess PR, QRS and QT/QTc.']].map(([t,d])=><article key={t} className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700"><h4 className="font-bold">{t}</h4><p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{d}</p></article>)}</div><p className="text-xs text-gray-500 mt-4">Educational practice only. Image-based ECG interpretation can be added when ECG datasets are available.</p></section>}

        {tab==='osce' && <section><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-bold text-gray-900 dark:text-white">OSCE Practice Mode</h3><p className="text-sm text-gray-500 mt-1">{osceCompleted}/{osceItems.length} checklist items · {osceScore}% complete</p></div><span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">Respiratory station</span></div><div className="mt-5 rounded-2xl border border-gray-200 dark:border-slate-700 p-5"><p className="font-semibold">Station: Focused respiratory assessment</p><div className="mt-4 space-y-2">{osceItems.map((item,index)=><button key={item} onClick={()=>setOsceChecks(s=>({...s,[index]:!s[index]}))} className={`w-full text-left p-3 rounded-xl border ${osceChecks[index]?'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30':'border-gray-200 dark:border-slate-700'}`}><span className="mr-2">{osceChecks[index]?'☑':'☐'}</span>{item}</button>)}</div><div className="mt-5 p-4 rounded-xl bg-gray-50 dark:bg-slate-800"><p className="text-sm font-bold">Self-assessment</p><p className="text-sm mt-1 text-gray-600 dark:text-slate-300">Repeat until you can complete every item smoothly and explain why each step matters.</p></div></div></section>}

        {tab==='calc' && <section><h3 className="text-xl font-bold text-gray-900 dark:text-white">Medical Calculators</h3><div className="grid md:grid-cols-[240px_1fr] gap-4 mt-5"><div className="space-y-2">{tools.map(t=><button key={t.id} onClick={()=>{setTool(t);setValues({})}} className={`w-full text-left p-3 rounded-xl ${tool.id===t.id?'bg-emerald-600 text-white':'bg-gray-100 dark:bg-slate-800'}`}>{t.title}</button>)}</div><div className="rounded-2xl border border-gray-200 dark:border-slate-700 p-5"><div className="grid sm:grid-cols-2 gap-3">{tool.inputs.map(k=><label key={k} className="text-sm font-medium">{inputLabel(k)}<input type={k==='sex'?'checkbox':'number'} checked={k==='sex'?!!values[k]:values[k]||''} onChange={e=>setValues(v=>({...v,[k]:k==='sex'?(e.target.checked?1:0):e.target.value}))} className="mt-1 w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3" /></label>)}</div><div className="mt-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30"><span className="text-sm text-gray-500">Result</span><div className="text-2xl font-bold mt-1">{result || 'Enter values'}</div></div><p className="text-xs text-gray-500 mt-4">Educational calculators only. Verify units, assumptions and local clinical guidance before clinical use.</p></div></div></section>}
      </main>
    </div>
  </div>;
}
