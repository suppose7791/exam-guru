import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  ⚙️ CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const GEMINI_API_KEY  = "AIzaSyDUscilYY9QNpR1Lodn1Lnz7S-rtMAs8Gg";
const SHEETDB_API_URL = "https://sheetdb.io/api/v1/u4edfjgtz6cdc";

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

const SOLVE_PROMPT = (exam, subject, lang, question) =>
`You are ExamGuru — an expert coach for ${exam}. 
Subject area: ${subject}. Preferred language: ${lang}.
RULES:
1. Detect if the question is related to Karnataka (History, Geography, or Administration). 
2. Cite Karnataka State Board (KSEAB) facts where applicable.
3. Return ONLY valid JSON.
{
  "answer": "...",
  "explanation": "...",
  "exam_tip": "Specific tip for ${exam}"
}
Question: ${question}`;

export default function ExamGuru() {
  const [screen, setScreen] = useState("solve");
  const [selectedExam, setSelectedExam] = useState(EXAMS[0]);
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [lang, setLang] = useState("English");
  const [darkMode, setDarkMode] = useState(false);
  const [inputText, setInputText] = useState("");
  const [solving, setSolving] = useState(false);
  const [solveResult, setSolveResult] = useState(null);

  const callGemini = async (prompt) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  };

  const solveQuestion = async () => {
    if (!inputText) return;
    setSolving(true);
    try {
      const res = await callGemini(SOLVE_PROMPT(selectedExam.full, selectedSubject.label, lang, inputText));
      setSolveResult(res);
    } catch (e) { alert("AI Error."); }
    setSolving(false);
  };

  const D = darkMode;

  return (
    <div style={{ minHeight: "100vh", background: D ? "#121212" : "#f8f9fa", color: D ? "#fff" : "#333", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2>ExamGuru 🎓</h2>
        <button onClick={() => setDarkMode(!D)}>{D ? "☀️" : "🌙"}</button>
      </header>

      <div style={{ background: D ? "#1e1e1e" : "#fff", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
         <p>Select Exam: {selectedExam?.label} | Subject: {selectedSubject?.label}</p>
      </div>

      <textarea 
        value={inputText} 
        onChange={(e) => setInputText(e.target.value)} 
        placeholder="Type your question..." 
        style={{ width: "100%", height: "100px", marginBottom: "10px", padding: "10px" }}
      />
      
      <button 
        onClick={solveQuestion} 
        disabled={solving} 
        style={{ width: "100%", padding: "15px", background: "#c4781a", color: "#fff", border: "none", borderRadius: "8px" }}
      >
        {solving ? "Analyzing..." : "Solve Now"}
      </button>

      {solveResult && (
        <div style={{ marginTop: "20px", padding: "15px", background: D ? "#333" : "#e9ecef", borderRadius: "10px" }}>
          <h4>Answer:</h4>
          <p>{solveResult.answer}</p>
          <small><b>Tip:</b> {solveResult.exam_tip}</small>
        </div>
      )}
    </div>
  );
}
