import React, { useMemo, useState } from 'react';
import { useStudy } from '../context/StudyContext';
import quizBank from '../data/quizBank';

const STORAGE_KEY = 'medidocs_learning_hub_v1';

const readStore = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
};
const writeStore = (value) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
};

const answerKey = (question) => String(question?.answer ?? '');


const cases = [
  { id:'case-malaria', title:'Febrile illness', focus:'Clinical reasoning', prompt:'A 22-year-old presents with fever, chills and headache after living in a malaria-endemic area. What should be considered early in the assessment?', options:['Malaria testing and severity assessment','Ignore travel and exposure history','Start antibiotics without assessment','Order only a lipid profile'], answer:0, explanation:'In endemic settings, malaria is an important differential. Assess severity and confirm with appropriate testing while considering other causes of fever.' },
  { id:'case-asthma', title:'Acute wheeze', focus:'Respiratory', prompt:'A patient with recurrent episodic wheeze and chest tightness has reduced peak expiratory flow during symptoms. Which diagnosis is most consistent?', options:['Asthma','Appendicitis','Nephrotic syndrome','Iron deficiency'], answer:0, explanation:'Variable respiratory symptoms and variable expiratory airflow limitation are characteristic features of asthma.' },
  { id:'case-dehydration', title:'Dehydration', focus:'Acute care', prompt:'A patient has thirst, dry mucous membranes and reduced urine output after several days of vomiting. What is the immediate priority?', options:['Assess circulation and fluid status','Give a high-fat meal first','Delay assessment for 24 hours','Restrict all fluids'], answer:0, explanation:'Assess airway, breathing and circulation, vital signs and volume status, then treat the cause and replace fluid appropriately.' }
];

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
  const [caseAnswer, setCaseAnswer] = useState(null);
  const [tool, setTool] = useState(tools[0]);
  const [values, setValues] = useState({});
  const [review, setReview] = useState(() => readStore().review || {});
  const [selectedLab, setSelectedLab] = useState(labs[0]);
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
      const courseStats = performanceByCourse[q.course || 'General'] || { attempts: 0, correct: 0 }; const accuracy = courseStats.attempts ? courseStats.correct / courseStats.attempts : 0.5; const weaknessBoost = Math.max(0, 1 - accuracy); const priority = (isDue ? (rating === 'again' ? 30 : rating === 'hard' ? 20 : 10) : 0) + weaknessBoost * 10 + (saved ? 0 : 2);
      return { q, priority };
    }).sort((a,b) => b.priority - a.priority);
    return ranked.slice(0, 20).map(item => item.q);
  }, [reviewById, performanceByCourse]);

  const markReview = (id, rating, metadata = {}) => {
    const next = {...review, [id]: {rating, reviewedAt:new Date().toISOString()}};
    setReview(next); writeStore({...readStore(), review:next});
    void recordLearningReview(id, rating, { source: 'learning-hub', ...metadata });
  };

  const markDailyAnswer = (id, option, answer) => {
    setDailyAnswers(prev => {
      const next = { ...prev, [id]: option };
      const store = readStore(); const now = new Date(); const day = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; writeStore({ ...store, dailyDay: day, dailyAnswers: next });
      return next;
    });
    markReview(id, option === answer ? 'easy' : 'again', { course: daily20.find(q => q.id === id)?.course || 'General', correct: option === answer });
  };

  const currentCase = cases[caseIndex];
  const result = calculate(tool.id, values);

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
          <div className="grid gap-3">{daily20.map((q,i)=><article key={q.id+i} className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4"><div className="flex justify-between gap-3"><span className="text-xs font-bold text-emerald-600">{i+1}/20 · {q.course}</span><span className="text-xs text-gray-500">Level {q.difficulty}</span></div><p className="mt-2 font-semibold text-gray-900 dark:text-white">{q.question}</p><div className="grid sm:grid-cols-2 gap-2 mt-3">{q.options.map(o=><button key={o} onClick={()=>markDailyAnswer(q.id, o, q.answer)} className={`text-left px-3 py-2 rounded-lg text-sm ${dailyAnswers[q.id] === o ? (o === answerKey(q) ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40') : 'bg-gray-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700'}`}>{o}</button>)}</div></article>)}</div>
        </section>}

        {tab==='cases' && <section><h3 className="text-xl font-bold text-gray-900 dark:text-white">{currentCase.title}</h3><p className="text-sm text-emerald-600 mt-1">{currentCase.focus}</p><div className="mt-5 rounded-2xl bg-gray-50 dark:bg-slate-800 p-5"><p className="font-semibold text-gray-900 dark:text-white">{currentCase.prompt}</p><div className="grid gap-2 mt-4">{currentCase.options.map((o,i)=><button key={o} onClick={()=>setCaseAnswer(i)} className={`text-left p-3 rounded-xl border ${caseAnswer===i?(i===currentCase.answer?'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40':'border-red-500 bg-red-50 dark:bg-red-950/30'):'border-gray-200 dark:border-slate-700'}`}>{o}</button>)}</div>{caseAnswer!==null&&<div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-900"><strong>{caseAnswer===currentCase.answer?'Correct':'Review this'}</strong><p className="text-sm mt-1 text-gray-600 dark:text-slate-300">{currentCase.explanation}</p></div>}</div><div className="flex justify-between mt-4"><button disabled={caseIndex===0} onClick={()=>{setCaseIndex(i=>i-1);setCaseAnswer(null)}} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800">Previous</button><button onClick={()=>{setCaseIndex(i=>(i+1)%cases.length);setCaseAnswer(null)}} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Next case</button></div></section>}

        {tab==='review' && <section><h3 className="text-xl font-bold text-gray-900 dark:text-white">Spaced Review</h3><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Review due items first. Ratings sync to your account when signed in.</p><div className="grid gap-3 mt-5">{adaptiveReviewList.map(q=><article key={q.id} className="rounded-2xl border border-gray-200 dark:border-slate-700 p-4"><p className="font-semibold text-gray-900 dark:text-white">{q.question}</p><div className="flex gap-2 mt-3">{['again','hard','easy'].map(r=><button key={r} onClick={()=>markReview(q.id,r)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 capitalize">{r}</button>)}<span className="ml-auto text-xs text-gray-500 self-center">{review[q.id]?.rating || 'Due'}</span></div></article>)}</div></section>}

        {tab==='labs' && <section><h3 className="text-xl font-bold text-gray-900 dark:text-white">Lab Interpretation Trainer</h3><div className="grid md:grid-cols-[220px_1fr] gap-4 mt-5"><div className="space-y-2">{labs.map(l=><button key={l.name} onClick={()=>setSelectedLab(l)} className={`w-full text-left p-3 rounded-xl ${selectedLab.name===l.name?'bg-emerald-600 text-white':'bg-gray-100 dark:bg-slate-800'}`}>{l.name}</button>)}</div><div className="rounded-2xl border border-gray-200 dark:border-slate-700 p-5"><p className="text-sm text-gray-500">Reference</p><p className="font-semibold mt-1">{selectedLab.range}</p><div className="grid sm:grid-cols-2 gap-3 mt-5"><div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30"><strong>Low</strong><p className="text-sm mt-1">{selectedLab.low}</p></div><div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30"><strong>High</strong><p className="text-sm mt-1">{selectedLab.high}</p></div></div><p className="text-xs text-gray-500 mt-5">Educational interpretation only. Use the reporting laboratory's reference interval and clinical context.</p></div></div></section>}

        {tab==='ecg' && <section><h3 className="text-xl font-bold text-gray-900 dark:text-white">ECG Learning Mode</h3><div className="mt-5 grid md:grid-cols-2 gap-4">{[['Rate','Estimate ventricular rate and decide whether it is bradycardic, normal or tachycardic.'],['Rhythm','Check regularity and identify P waves before naming the rhythm.'],['Axis','Use lead I and aVF as a quick first-pass axis screen.'],['Intervals','Assess PR, QRS and QT/QTc systematically.']].map(([t,d])=><article key={t} className="p-5 rounded-2xl border border-gray-200 dark:border-slate-700"><h4 className="font-bold">{t}</h4><p className="text-sm text-gray-600 dark:text-slate-300 mt-2">{d}</p></article>)}</div><div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800 text-sm">ECG cases can be expanded with uploaded image questions later. For now this mode gives you a repeatable interpretation sequence instead of the classic human tradition of staring at the tracing and hoping.</div></section>}

        {tab==='osce' && <section><h3 className="text-xl font-bold text-gray-900 dark:text-white">OSCE Practice Mode</h3><div className="mt-5 rounded-2xl border border-gray-200 dark:border-slate-700 p-5"><p className="font-semibold">Station: Focused respiratory assessment</p><ol className="list-decimal ml-5 mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-300">{['Introduce yourself, confirm patient identity and obtain consent','Assess general appearance and vital signs','Inspect chest and respiratory effort','Palpate, percuss and auscultate systematically','Summarize findings, give differential diagnoses and plan'].map(x=><li key={x}>{x}</li>)}</ol><div className="mt-5 grid sm:grid-cols-3 gap-2">{['Not done','Needs practice','Confident'].map(x=><button key={x} onClick={()=>{const s=readStore();writeStore({...s,osce:{...(s.osce||{}),respiratory:x}})}} className="p-3 rounded-xl bg-gray-100 dark:bg-slate-800">{x}</button>)}</div></div></section>}

        {tab==='calc' && <section><h3 className="text-xl font-bold text-gray-900 dark:text-white">Medical Calculators</h3><div className="grid md:grid-cols-[240px_1fr] gap-4 mt-5"><div className="space-y-2">{tools.map(t=><button key={t.id} onClick={()=>{setTool(t);setValues({})}} className={`w-full text-left p-3 rounded-xl ${tool.id===t.id?'bg-emerald-600 text-white':'bg-gray-100 dark:bg-slate-800'}`}>{t.title}</button>)}</div><div className="rounded-2xl border border-gray-200 dark:border-slate-700 p-5"><div className="grid sm:grid-cols-2 gap-3">{tool.inputs.map(k=><label key={k} className="text-sm font-medium">{inputLabel(k)}<input type={k==='sex'?'checkbox':'number'} checked={k==='sex'?!!values[k]:values[k]||''} onChange={e=>setValues(v=>({...v,[k]:k==='sex'?(e.target.checked?1:0):e.target.value}))} className="mt-1 w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3" /></label>)}</div><div className="mt-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30"><span className="text-sm text-gray-500">Result</span><div className="text-2xl font-bold mt-1">{result || 'Enter values'}</div></div><p className="text-xs text-gray-500 mt-4">Educational calculators only. Verify units, assumptions and local clinical guidance before clinical use.</p></div></div></section>}
      </main>
    </div>
  </div>;
}
