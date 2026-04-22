import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  ⚙️  CONFIGURATION — Replace these two values before deploying
// ─────────────────────────────────────────────────────────────────────────────
const GEMINI_API_KEY  = process.env.REACT_APP_GEMINI_KEY;
const SHEETDB_API_URL = process.env.REACT_APP_SHEETDB_URL;

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS & KARNATAKA EXAM DATA
// ─────────────────────────────────────────────────────────────────────────────
const EXAMS = [
  { id: "kas",      label: "KAS",      full: "Karnataka Administrative Service (KPSC)", syllabus: "General Studies, Karnataka History & Geography" },
  { id: "fda_sda",  label: "FDA/SDA",  full: "First/Second Division Assistant (KPSC/KEA)", syllabus: "General Kannada/English, Constitution, GK" },
  { id: "pdo",      label: "PDO",      full: "Panchayat Development Officer", syllabus: "RDPR Act, Rural Development, Specific Paper 2" },
  { id: "psi",      label: "PSI",      full: "Police Sub-Inspector", syllabus: "Translation, Precis Writing, Mental Ability, GS" },
  { id: "pc",       label: "PC",       full: "Police Constable", syllabus: "Basic GS, Karnataka State Board Syllabus (Class 10-12)" },
  { id: "kset",     label: "KSET",     full: "Karnataka State Eligibility Test", syllabus: "Teaching & Research Aptitude, Subject Specific" },
  { id: "gpstr",    label: "GPSTR",    full: "Graduate Primary School Teacher", syllabus: "Educational Psychology, Subject Pedagogy" },
  { id: "va",       label: "VA",       full: "Village Administrative Officer", syllabus: "Land Records, Revenue Dept Laws, GK" },
  { id: "banking",  label: "Banking",  full: "IBPS / SBI / RBI", syllabus: "Speed Maths, Logical Reasoning, Banking Awareness" },
  { id: "ssc",      label: "SSC",      full: "Staff Selection Commission", syllabus: "Quant, English, General Intelligence" },
];

const SUBJECTS = [
  { id: "reasoning", label: "Reasoning",        icon: "🧠" },
  { id: "maths",     label: "Quantitative",     icon: "📐" },
  { id: "english",   label: "English",          icon: "📝" },
  { id: "gk",        label: "General Knowledge",icon: "🌍" },
  { id: "current",   label: "Current Affairs",  icon: "📰" },
  { id: "kannada",   label: "Kannada",          icon: "ಕ"  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  AI PROMPTS (Syllabus-Aware)
// ─────────────────────────────────────────────────────────────────────────────
const SOLVE_PROMPT = (exam, subject, lang, question) =>
`You are ExamGuru — an expert coach for ${exam}. 
Subject area: ${subject}. Preferred language: ${lang}.

RULES:
1. Detect if the question is related to Karnataka (History, Geography, or Administration). 
2. Cite Karnataka State Board (KSEAB) facts where applicable.
3. Return ONLY valid JSON.

JSON schema:
{
  "detected_language": "English|Kannada|Hindi",
  "question_type": "...",
  "subject_area": "...",
  "answer": "...",
  "explanation": "...",
  "steps": ["..."],
  "exam_tip": "Specific tip for ${exam}",
  "difficulty": "Easy|Medium|Hard",
  "similar_topics": ["..."]
}

Question: ${question}`;

const MOCK_PROMPT = (exam, subject, lang, count) => {
  const selected = EXAMS.find(e => e.full === exam) || { syllabus: "General Syllabus" };
  return `You are ExamGuru. Generate ${count} MCQ questions for the ${exam} exam.
  Focus: ${selected.syllabus}. Language: ${lang}.
  Return ONLY valid JSON:
  {
    "questions": [
      { "id":1, "question":"...", "options":{"A":"...","B":"...","C":"...","D":"..."}, "correct":"A", "explanation":"...", "topic":"..." }
    ]
  }`;
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ExamGuru() {
  const [screen, setScreen] = useState("solve");
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [lang, setLang] = useState("English");
  const [darkMode, setDarkMode] = useState(false);

  // Solve Logic
  const [inputText, setInputText] = useState("");
  const [inputImageB64, setInputImageB64] = useState(null);
  const [solving, setSolving] = useState(false);
  const [solveResult, setSolveResult] = useState(null);

  // Mock Test Logic
  const [mockQuestions, setMockQuestions] = useState([]);
  const [mockLoading, setMockLoading] = useState(false);
  const [mockAnswers, setMockAnswers] = useState({});
  const [mockSubmitted, setMockSubmitted] = useState(false);

  // Feedback Logic
  const [feedback, setFeedback] = useState({ name: "", contact: "", email: "", msg: "" });
  const [submitting, setSubmitting] = useState(false);

  // API Call Helper
  async function callGemini(prompt, imageB64 = null) {
    const parts = [{ text: prompt }];
    if (imageB64) parts.push({ inline_data: { mime_type: "image/jpeg", data: imageB64 } });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  }

  const solveQuestion = async () => {
    if (!inputText && !inputImageB64) return;
    if (!selectedExam || !selectedSubject) return alert("Select Exam & Subject first!");
    setSolving(true);
    try {
      const res = await callGemini(SOLVE_PROMPT(selectedExam.full, selectedSubject.label, lang, inputText));
      setSolveResult(res);
    } catch (e) { alert("AI Error. Check API Key."); }
    setSolving(false);
  };

  const startMock = async () => {
    setMockLoading(true);
    try {
      const res = await callGemini(MOCK_PROMPT(selectedExam.full, selectedSubject.label, lang, 5));
      setMockQuestions(res.questions);
      setMockSubmitted(false);
    } catch (e) { alert("Mock Error."); }
    setMockLoading(false);
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(SHEETDB_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [{ ...feedback, exam: selectedExam?.label, date: new Date().toLocaleDateString() }]
        }),
      });
      alert("Feedback saved to Excel!");
      setFeedback({ name: "", contact: "", email: "", msg: "" });
    } catch (e) { alert("Error saving feedback."); }
    setSubmitting(false);
  };

  const D = darkMode;

  return (
    <div style={{ minHeight: "100vh", background: D ? "#121212" : "#f8f9fa", color: D ? "#fff" : "#333", fontFamily: "sans-serif", padding: "20px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>ExamGuru 🎓</h2>
        <button onClick={() => setDarkMode(!D)} style={{ padding: "8px 15px", borderRadius: "20px" }}>{D ? "☀️ Light" : "🌙 Dark"}</button>
      </header>

      {/* Selector Section */}
      <div style={{ background: D ? "#1e1e1e" : "#fff", padding: "15px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <p style={{ fontSize: "0.8rem", color: "gray" }}>SELECT EXAM & SUBJECT</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
          {EXAMS.map(e => (
            <button key={e.id} onClick={() => setSelectedExam(e)} style={{ background: selectedExam?.id === e.id ? "#c4781a" : "transparent", border: "1px solid #c4781a", color: selectedExam?.id === e.id ? "#fff" : "#c4781a", padding: "5px 12px", borderRadius: "15px", cursor: "pointer" }}>{e.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SUBJECTS.map(s => (
            <button key={s.id} onClick={() => setSelectedSubject(s)} style={{ background: selectedSubject?.id === s.id ? "#1a5c8a" : "transparent", border: "1px solid #1a5c8a", color: selectedSubject?.id === s.id ? "#fff" : "#1a5c8a", padding: "5px 12px", borderRadius: "15px", cursor: "pointer" }}>{s.icon} {s.label}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <nav style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setScreen("solve")} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: screen === "solve" ? "#333" : "#ddd", color: screen === "solve" ? "#fff" : "#333" }}>Solve</button>
        <button onClick={() => setScreen("mock")} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: screen === "mock" ? "#333" : "#ddd", color: screen === "mock" ? "#fff" : "#333" }}>Mock Test</button>
        <button onClick={() => setScreen("feedback")} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: screen === "feedback" ? "#333" : "#ddd", color: screen === "feedback" ? "#fff" : "#333" }}>Feedback</button>
      </nav>

      {/* Tab Content */}
      {screen === "solve" && (
        <div style={{ background: D ? "#1e1e1e" : "#fff", padding: "20px", borderRadius: "12px" }}>
          <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type question here..." style={{ width: "100%", height: "100px", padding: "10px", borderRadius: "8px" }} />
          <button onClick={solveQuestion} disabled={solving} style={{ width: "
