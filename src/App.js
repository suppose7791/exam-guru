import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  ⚙️ CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const GEMINI_API_KEY  = "AIzaSyDUscilYY9QNpR1Lodn1Lnz7S-rtMAs8Gg";
const SHEETDB_API_URL = "https://sheetdb.io/api/v1/u4edfjgtz6cdc";

// ─────────────────────────────────────────────────────────────────────────────
//  EXAM DATABASE
// ─────────────────────────────────────────────────────────────────────────────
const EXAM_GROUPS = [
  {
    group: "KPSC — Karnataka Public Service Commission",
    color: "#8B2500",
    exams: [
      { id: "kas", label: "KAS", full: "Karnataka Administrative Service", body: "KPSC", subjects: ["General Studies", "Karnataka History"], pattern: "Prelims & Mains", tips: "Focus on Rajyasangha Acts.", difficulty: "Very High" },
      { id: "fda", label: "FDA", full: "First Division Assistant", body: "KPSC", subjects: ["General Kannada", "GK"], pattern: "200 MCQ", tips: "Kannada grammar is key.", difficulty: "Medium" },
      { id: "vao", label: "VAO", full: "Village Administrative Officer", body: "KEA", subjects: ["Revenue Laws", "Arithmetic"], pattern: "200 MCQ", tips: "Study Land Revenue Act 1964.", difficulty: "Medium" }
    ]
  },
  {
    group: "KSP — Karnataka State Police",
    color: "#003580",
    exams: [
      { id: "psi", label: "PSI", full: "Police Sub-Inspector", body: "KSP", subjects: ["Constitution", "Reasoning"], pattern: "Paper 1 & 2", tips: "Current affairs last 6 months.", difficulty: "High" },
      { id: "pc", label: "PC", full: "Police Constable", body: "KSP", subjects: ["Basic GK", "Maths"], pattern: "100 MCQ", tips: "10th level content.", difficulty: "Medium" }
    ]
  }
];

const ALL_EXAMS = EXAM_GROUPS.flatMap(g => g.exams);

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ExamGuru() {
  // Core UI State
  const [screen, setScreen] = useState("solve");
  const [selectedExam, setSelectedExam] = useState(ALL_EXAMS[0]);
  const [lang, setLang] = useState("English");
  const [darkMode, setDarkMode] = useState(false);
  const [examSearch, setExamSearch] = useState("");

  // Solve Logic
  const [inputText, setInputText] = useState("");
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

  // Refs for Scroll/UI (Ensures useRef is used)
  const resultRef = useRef(null);

  // Gemini API Caller
  const callGemini = useCallback(async (prompt) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  }, []);

  // Solve Action
  const solveQuestion = async () => {
    if (!inputText) return;
    setSolving(true);
    const prompt = `Solve for ${selectedExam.full} in ${lang}: ${inputText}. Return JSON {"answer": "...", "explanation": "...", "exam_tip": "..."}`;
    try {
      const res = await callGemini(prompt);
      setSolveResult(res);
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) { alert("AI Error."); }
    setSolving(false);
  };

  // Mock Action
  const startMock = async () => {
    setMockLoading(true);
    setMockSubmitted(false);
    const prompt = `Generate 3 MCQs for ${selectedExam.full} in ${lang}. Return JSON {"questions": [{"id":1, "question":"...", "options":{"A":"...","B":"...","C":"...","D":"..."}, "correct":"A"}]}`;
    try {
      const res = await callGemini(prompt);
      setMockQuestions(res.questions);
      setScreen("mock");
    } catch (e) { alert("Mock Error."); }
    setMockLoading(false);
  };

  // Feedback Action
  const submitFeedback = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(SHEETDB_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [{ ...feedback, date: new Date().toISOString() }] }),
      });
      alert("Success!");
      setFeedback({ name: "", contact: "", email: "", msg: "" });
    } catch (e) { alert("Feedback Error."); }
    setSubmitting(false);
  };

  const D = darkMode;

  return (
    <div style={{ minHeight: "100vh", background: D ? "#121212" : "#f8f9fa", color: D ? "#fff" : "#333", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>ExamGuru Karnataka 🎓</h2>
        <button onClick={() => setDarkMode(!D)}>{D ? "☀️" : "🌙"}</button>
      </header>

      {/* Exam Selector & Search */}
      <div style={{ margin: "20px 0", padding: "15px", background: D ? "#1e1e1e" : "#fff", borderRadius: "12px" }}>
        <input 
          placeholder="🔍 Search Exam (KAS, PSI...)" 
          value={examSearch} 
          onChange={(e) => setExamSearch(e.target.value)}
          style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        />
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {ALL_EXAMS.filter(e => e.label.toLowerCase().includes(examSearch.toLowerCase())).map(e => (
            <button 
              key={e.id} 
              onClick={() => setSelectedExam(e)}
              style={{ padding: "8px 12px", borderRadius: "20px", border: "1px solid #c4781a", background: selectedExam.id === e.id ? "#c4781a" : "transparent", color: selectedExam.id === e.id ? "#fff" : "#c4781a" }}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <nav style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {["solve", "mock", "feedback"].map(t => (
          <button key={t} onClick={() => setScreen(t)} style={{ flex: 1, padding: "10px", background: screen === t ? "#333" : "#ddd", color: screen === t ? "#fff" : "#333", border: "none", borderRadius: "8px", textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </nav>

      {/* Screen: Solve */}
      {screen === "solve" && (
        <div>
          <textarea 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            placeholder={`Ask a question for ${selectedExam.full}...`} 
            style={{ width: "100%", height: "100px", padding: "10px" }}
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={solveQuestion} disabled={solving} style={{ flex: 2, padding: "15px", background: "#c4781a", color: "#fff", border: "none", borderRadius: "8px" }}>
              {solving ? "Solving..." : "Solve Now"}
            </button>
            <button onClick={startMock} style={{ flex: 1, padding: "15px", background: "#1a5c8a", color: "#fff", border: "none", borderRadius: "8px" }}>
              Practice Test
            </button>
          </div>
          <div ref={resultRef}>
            {solveResult && (
              <div style={{ marginTop: "20px", padding: "15px", background: D ? "#333" : "#e9ecef", borderRadius: "10px" }}>
                <h4 style={{ color: "#c4781a" }}>Answer:</h4>
                <p>{solveResult.answer}</p>
                <p><strong>Explanation:</strong> {solveResult.explanation}</p>
                <small>💡 <b>Tip:</b> {solveResult.exam_tip}</small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen: Mock */}
      {screen === "mock" && (
        <div>
          {mockLoading ? <p>Generating Questions...</p> : (
            mockQuestions.map((q, idx) => (
              <div key={q.id} style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ccc", borderRadius: "8px" }}>
                <p><b>Q{idx+1}:</b> {q.question}</p>
                {Object.entries(q.options).map(([key, val]) => (
                  <button 
                    key={key} 
                    onClick={() => setMockAnswers({...mockAnswers, [q.id]: key})}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px", margin: "5px 0", background: mockAnswers[q.id] === key ? "#c4781a" : "transparent", color: mockAnswers[q.id] === key ? "#fff" : "inherit" }}
                  >
                    {key}: {val}
                  </button>
                ))}
              </div>
            ))
          )}
          {mockQuestions.length > 0 && (
            <button onClick={() => setMockSubmitted(true)} style={{ width: "100%", padding: "15px", background: "green", color: "#fff", border: "none" }}>Submit Test</button>
          )}
          {mockSubmitted && <p style={{ marginTop: "10px", fontWeight: "bold" }}>Review your answers above!</p>}
        </div>
      )}

      {/* Screen: Feedback */}
      {screen === "feedback" && (
        <form onSubmit={submitFeedback} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input placeholder="Name" value={feedback.name} onChange={e => setFeedback({...feedback, name: e.target.value})} required />
          <input placeholder="Contact" value={feedback.contact} onChange={e => setFeedback({...feedback, contact: e.target.value})} required />
          <textarea placeholder="Your Message" value={feedback.msg} onChange={e => setFeedback({...feedback, msg: e.target.value})} required />
          <button type="submit" disabled={submitting} style={{ padding: "10px", background: "#333", color: "#fff" }}>
            {submitting ? "Sending..." : "Submit Feedback"}
          </button>
        </form>
      )}

      <footer style={{ marginTop: "40px", fontSize: "0.8rem", textAlign: "center", opacity: 0.6 }}>
        ExamGuru Karnataka © 2026 | Language: {lang}
      </footer>
    </div>
  );
}
