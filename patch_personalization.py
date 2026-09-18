from pathlib import Path
import re

root = Path('/home/ubuntu/banking-fintech-roadmap')

routers = (root / 'server/routers.ts').read_text()
feedback_insert = r'''
    evaluateAnswer: publicProcedure
      .input(z.object({
        question: z.string().min(1).max(1400),
        answer: z.string().min(20).max(5000),
        role: z.string().max(120).default(""),
        field: z.string().max(120).default(""),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a precise interview coach. Evaluate a written answer fairly and constructively for clarity, structure, technical accuracy, business relevance, and evidence. Do not invent facts about an employer. Return JSON only with a score from 1 to 10, a concise summary, three strengths, three improvements, and a rewritten answer that preserves the candidate's voice.",
            },
            {
              role: "user",
              content: `Evaluate this answer for a ${input.role || "professional"} candidate in ${input.field || "their target field"}.\nQuestion: ${input.question}\nWritten answer: ${input.answer}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "answer_feedback",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  score: { type: "integer", minimum: 1, maximum: 10 },
                  summary: { type: "string" },
                  strengths: { type: "array", items: { type: "string" } },
                  improvements: { type: "array", items: { type: "string" } },
                  rewrittenAnswer: { type: "string" },
                },
                required: ["score", "summary", "strengths", "improvements", "rewrittenAnswer"],
                additionalProperties: false,
              },
            },
          },
          reasoning: { effort: "low" },
        });
        const content = response.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("The feedback service returned no usable content.");
        return JSON.parse(content) as { score: number; summary: string; strengths: string[]; improvements: string[]; rewrittenAnswer: string };
      }),
'''
routers = routers.replace('    generateQuestions: publicProcedure\n', '    generateQuestions: publicProcedure\n', 1)
routers = routers.replace('      }),\n  }),\n});', '      }),\n' + feedback_insert + '  }),\n});')
(root / 'server/routers.ts').write_text(routers)

home_path = root / 'client/src/pages/Home.tsx'
home = home_path.read_text()
home = home.replace('import { useEffect, useMemo, useState } from "react";\nimport { trpc } from "@/lib/trpc";', 'import { useEffect, useMemo, useState } from "react";\nimport { trpc } from "@/lib/trpc";\nimport { useAuth } from "@/ _core/hooks/useAuth";\nimport { startLogin } from "@/const";'.replace('@/ _core', '@/_core'))
home = home.replace('  ArrowUpRight,\n', '  ArrowUpRight,\n  CheckCircle2,\n')
home = home.replace('  TimerReset,\n', '  TimerReset,\n  UserRound,\n')

profile_helpers = r'''
type CareerProfile = { targetField: string; targetJob: string; interests: string; experience: string; goals: string };
const emptyProfile: CareerProfile = { targetField: "", targetJob: "", interests: "", experience: "", goals: "" };
function profileKey(openId?: string) { return `roadmap-profile-${openId || "guest"}`; }
'''
home = home.replace('const statusOptions: Status[] = ["Not started", "Learning", "Practicing", "Comfortable", "Interview ready", "Job ready"];\n', 'const statusOptions: Status[] = ["Not started", "Learning", "Practicing", "Comfortable", "Interview ready", "Job ready"];\n' + profile_helpers)

# Add auth, personalization, and weekly study state.
home = home.replace('export default function Home() {\n  const [active, setActive] = useState<NavKey>("overview");', '''export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [active, setActive] = useState<NavKey>("overview");''')
home = home.replace('  const [timerSessions, setTimerSessions] = useState(() => loadState("roadmap-timer-sessions", 0));\n', '''  const [timerSessions, setTimerSessions] = useState(() => loadState("roadmap-timer-sessions", 0));
  const [profile, setProfile] = useState<CareerProfile>(() => loadState(profileKey(), emptyProfile));
  const [weeklyGoal, setWeeklyGoal] = useState(() => loadState("roadmap-weekly-goal", 5));
  const [studyLog, setStudyLog] = useState<Record<string, number>>(() => loadState("roadmap-study-log", {}));
''')
home = home.replace('  useEffect(() => { saveState("roadmap-timer-remaining", timerRemaining); }, [timerRemaining]);\n', '''  useEffect(() => { saveState("roadmap-timer-remaining", timerRemaining); }, [timerRemaining]);
  useEffect(() => { if (user?.openId) setProfile(loadState(profileKey(user.openId), emptyProfile)); }, [user?.openId]);
  useEffect(() => { if (user?.openId) saveState(profileKey(user.openId), profile); }, [profile, user?.openId]);
  useEffect(() => { saveState("roadmap-weekly-goal", weeklyGoal); }, [weeklyGoal]);
  useEffect(() => { saveState("roadmap-study-log", studyLog); }, [studyLog]);
''')
# Increment daily study log alongside focus completion.
home = home.replace('if (timerMode === "focus") {\n            setTimerSessions', 'if (timerMode === "focus") {\n            const dayKey = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(new Date().getDay() + 6) % 7];\n            setStudyLog((log) => ({ ...log, [dayKey]: (log[dayKey] || 0) + 1 }));\n            setTimerSessions')

# Dynamic content and props.
home = home.replace('{active === "overview" && <Overview skills={skills} projects={projects} stats={skillStats} projectAvg={projectAvg} navigate={navigate} timer={{ mode: timerMode, remaining: timerRemaining, running: timerRunning, sessions: timerSessions, onModeChange: changeTimerMode, onToggle: () => setTimerRunning((value) => !value), onReset: resetTimer }} />}', '{active === "overview" && <Overview skills={skills} projects={projects} stats={skillStats} projectAvg={projectAvg} navigate={navigate} profile={profile} timer={{ mode: timerMode, remaining: timerRemaining, running: timerRunning, sessions: timerSessions, onModeChange: changeTimerMode, onToggle: () => setTimerRunning((value) => !value), onReset: resetTimer }} weeklyGoal={weeklyGoal} setWeeklyGoal={setWeeklyGoal} studyLog={studyLog} />}')
home = home.replace('{active === "interviews" && <Interviews sql={sql} updateSql={updateSql} notify={notify} />}', '{active === "interviews" && <Interviews sql={sql} updateSql={updateSql} notify={notify} profile={profile} />}')
home = home.replace('<div className="profile-strip"><div className="avatar">DR</div><div><strong>Data Reporting</strong><small>Egypt · banking & fintech</small></div><span className="live-dot" /></div>', '<div className="profile-strip"><div className="avatar">{profile.targetJob ? profile.targetJob.slice(0, 2).toUpperCase() : "ME"}</div><div><strong>{profile.targetJob || "Your career profile"}</strong><small>{profile.targetField || "Personalized workspace"}</small></div><span className="live-dot" /></div>')
home = home.replace('  return <div className="app-shell">', '''  if (loading) return <LoginPage loading />;
  if (!isAuthenticated) return <LoginPage />;
  if (!profile.targetField || !profile.targetJob) return <OnboardingPage userName={user?.name || "there"} initialProfile={profile} onSave={setProfile} />;

  return <div className="app-shell">''')

# Overview signature and dynamic hero copy.
home = home.replace('function Overview({ skills, projects, stats, projectAvg, navigate, timer }: { skills: typeof initialSkills; projects: typeof initialProjects; stats: { avg: number; criticalReady: number; criticalTotal: number; ready: number }; projectAvg: number; navigate: (key: NavKey) => void; timer:', 'function Overview({ skills, projects, stats, projectAvg, navigate, profile, timer, weeklyGoal, setWeeklyGoal, studyLog }: { skills: typeof initialSkills; projects: typeof initialProjects; stats: { avg: number; criticalReady: number; criticalTotal: number; ready: number }; projectAvg: number; navigate: (key: NavKey) => void; profile: CareerProfile; timer:')
home = home.replace('onReset: () => void } }) {\n  const week = weeks[0];', 'onReset: () => void }; weeklyGoal: number; setWeeklyGoal: (goal: number) => void; studyLog: Record<string, number> }) {\n  const week = weeks[0];', 1)
home = home.replace('<h1>Turn reporting depth<br /><em>into career range.</em></h1><p>Your operating system for moving from production regulatory reporting into banking analytics, risk, data quality, governance, and analytics engineering.</p>', '<h1>Build range for<br /><em>{profile.targetJob}.</em></h1><p>Your personalized operating system for moving toward {profile.targetJob} in {profile.targetField}, shaped around {profile.interests || "the skills and interests you choose"}.</p>')
home = home.replace('<StudyTimer {...timer} /><section className="section-block">', '<StudyTimer {...timer} /><StudyGoalPanel weeklyGoal={weeklyGoal} setWeeklyGoal={setWeeklyGoal} studyLog={studyLog} /><section className="section-block">')

# Add onboarding and login components before Overview.
login_components = r'''
function LoginPage({ loading = false }: { loading?: boolean }) {
  return <div className="auth-page"><div className="auth-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core"><span>ROADMAP/OS</span><strong>CAREER</strong><small>control room</small></div></div><div className="auth-card"><div className="brand"><div className="brand-mark"><span>R</span></div><div><strong>ROADMAP<span>/OS</span></strong><small>career control room</small></div></div><span className="eyebrow">A workspace for your next move</span><h1>Make your preparation<br /><em>specific to you.</em></h1><p>Sign in to set a target field, choose a role, and build a learning system around the work you actually want.</p><button className="primary-button auth-button" onClick={() => startLogin()} disabled={loading}><UserRound size={16} /> {loading ? "Loading your workspace…" : "Continue with Manus"}<ArrowUpRight size={16} /></button><small className="auth-note">Your roadmap, saved questions, and study history stay attached to your account.</small></div></div>;
}

function OnboardingPage({ userName, initialProfile, onSave }: { userName: string; initialProfile: CareerProfile; onSave: (profile: CareerProfile) => void }) {
  const [draft, setDraft] = useState(initialProfile);
  const update = (key: keyof CareerProfile, value: string) => setDraft((profile) => ({ ...profile, [key]: value }));
  const ready = Boolean(draft.targetField.trim() && draft.targetJob.trim());
  return <div className="onboarding-page"><div className="onboarding-card"><div className="eyebrow mint-eyebrow"><span className="pulse" />PROFILE SETUP · 01</div><h1>Let’s shape this around<br /><em>what you want next.</em></h1><p>Hi {userName}. Choose a direction now; you can refine it later. The workspace will use this context to make the roadmap, interview practice, and weekly goals feel like yours.</p><div className="onboarding-grid"><label>Target field<input value={draft.targetField} onChange={(e) => update("targetField", e.target.value)} placeholder="e.g. Banking, climate, healthcare, SaaS" /></label><label>Target job<input value={draft.targetJob} onChange={(e) => update("targetJob", e.target.value)} placeholder="e.g. Product analyst, data engineer, sales lead" /></label><label>What interests you?<textarea value={draft.interests} onChange={(e) => update("interests", e.target.value)} placeholder="Topics, products, problems, or industries you want to explore" /></label><label>Experience level<select value={draft.experience} onChange={(e) => update("experience", e.target.value)}><option value="">Choose one</option><option>Starting out</option><option>Some experience</option><option>Experienced professional</option><option>Changing careers</option></select></label><label className="onboarding-wide">What would make this workspace useful?<textarea value={draft.goals} onChange={(e) => update("goals", e.target.value)} placeholder="A promotion, a new role, stronger interviews, a portfolio, better consistency…" /></label></div><button className="primary-button" disabled={!ready} onClick={() => onSave(draft)}><CheckCircle2 size={16} /> Build my workspace <ArrowUpRight size={16} /></button></div></div>;
}

'''
home = home.replace('\nfunction Overview({ skills, projects, stats, projectAvg, navigate, profile, timer, weeklyGoal, setWeeklyGoal, studyLog }: {', '\n' + login_components + 'function Overview({ skills, projects, stats, projectAvg, navigate, profile, timer, weeklyGoal, setWeeklyGoal, studyLog }: {')

# Insert study goal chart before Roadmap.
study_goal = r'''
function StudyGoalPanel({ weeklyGoal, setWeeklyGoal, studyLog }: { weeklyGoal: number; setWeeklyGoal: (goal: number) => void; studyLog: Record<string, number> }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const completed = days.reduce((sum, day) => sum + (studyLog[day] || 0), 0);
  const max = Math.max(3, ...days.map((day) => studyLog[day] || 0));
  return <section className="goal-panel panel"><div className="goal-copy"><span className="kicker">WEEKLY GOAL</span><h3>Make consistency visible.</h3><p>{completed} of {weeklyGoal} focus blocks completed this week.</p><label>Target sessions<input type="number" min="1" max="40" value={weeklyGoal} onChange={(e) => setWeeklyGoal(Math.max(1, Number(e.target.value) || 1))} /></label></div><div className="goal-chart" aria-label="Weekly study sessions chart">{days.map((day) => { const count = studyLog[day] || 0; return <div className="goal-bar-wrap" key={day}><span>{count}</span><div className="goal-bar-track"><div className="goal-bar" style={{ height: `${Math.max(count ? 12 : 3, (count / max) * 100)}%` }} /></div><small>{day}</small></div>; })}</div><div className="goal-progress"><div className="goal-progress-top"><span>Weekly progress</span><strong>{Math.min(100, Math.round((completed / Math.max(weeklyGoal, 1)) * 100))}%</strong></div><ProgressBar value={Math.min(100, Math.round((completed / Math.max(weeklyGoal, 1)) * 100))} accent="mint" /><small>Complete a focus block to update today’s bar.</small></div></section>
}

'''
home = home.replace('\nfunction Roadmap() {', '\n' + study_goal + 'function Roadmap() {')

# Extend Interview signature and insert feedback/save logic in generated question block.
home = home.replace('function Interviews({ sql, updateSql, notify }: { sql: typeof initialSql; updateSql: (sql: typeof initialSql) => void; notify: (message: string) => void }) {', 'function Interviews({ sql, updateSql, notify, profile }: { sql: typeof initialSql; updateSql: (sql: typeof initialSql) => void; notify: (message: string) => void; profile: CareerProfile }) {')
home = home.replace('  const [generated, setGenerated] = useState<Array<{ category: string; question: string; why: string; followUp: string }>>([]);\n  const generateQuestions', '  const [generated, setGenerated] = useState<Array<{ category: string; question: string; why: string; followUp: string }>>([]);\n  const [savedQuestions, setSavedQuestions] = useState<string[]>(() => loadState("roadmap-saved-questions", []));\n  const [answerNotes, setAnswerNotes] = useState<Record<string, string>>(() => loadState("roadmap-answer-notes", {}));\n  const [feedback, setFeedback] = useState<Record<string, { score: number; summary: string; strengths: string[]; improvements: string[]; rewrittenAnswer: string }>>({});\n  const generateQuestions')
home = home.replace('  const generateQuestions = trpc.interviews.generateQuestions.useMutation();', '  const generateQuestions = trpc.interviews.generateQuestions.useMutation();\n  const evaluateAnswer = trpc.interviews.evaluateAnswer.useMutation();\n  const toggleSaved = (question: string) => setSavedQuestions((items) => { const next = items.includes(question) ? items.filter((item) => item !== question) : [...items, question]; saveState("roadmap-saved-questions", next); return next; });\n  const saveAnswer = (question: string, answer: string) => { const next = { ...answerNotes, [question]: answer }; setAnswerNotes(next); saveState("roadmap-answer-notes", next); notify("Answer note saved locally."); };\n  const getFeedback = (question: string) => { const answer = answerNotes[question] || ""; if (answer.trim().length < 20) { notify("Write at least 20 characters before requesting feedback."); return; } evaluateAnswer.mutate({ question, answer, role: profile.targetJob, field: profile.targetField }, { onSuccess: (result) => { setFeedback((items) => ({ ...items, [question]: result })); notify("AI feedback is ready."); }, onError: () => notify("Feedback could not be generated. Try again shortly.") }); };')
old_question = '<div className="generated-question" key={`${item.question}-${index}`}><div className="generated-number">0{index + 1}</div><div><span className="question-category">{item.category}</span><h4>{item.question}</h4><p><strong>Why it matters:</strong> {item.why}</p><p><strong>Follow-up:</strong> {item.followUp}</p></div></div>'
new_question = '<div className="generated-question" key={`${item.question}-${index}`}><div className="generated-number">0{index + 1}</div><div><div className="question-line"><span className="question-category">{item.category}</span><button className="save-question" onClick={() => toggleSaved(item.question)}>{savedQuestions.includes(item.question) ? "Saved" : "Save question"}</button></div><h4>{item.question}</h4><p><strong>Why it matters:</strong> {item.why}</p><p><strong>Follow-up:</strong> {item.followUp}</p><textarea className="answer-note" value={answerNotes[item.question] || ""} onChange={(e) => setAnswerNotes((notes) => ({ ...notes, [item.question]: e.target.value }))} placeholder="Write your answer here…" /><div className="answer-actions"><button className="secondary-button compact" onClick={() => saveAnswer(item.question, answerNotes[item.question] || "")}><FileText size={14} /> Save answer note</button><button className="primary-button compact" onClick={() => getFeedback(item.question)} disabled={evaluateAnswer.isPending}><Sparkles size={14} /> {evaluateAnswer.isPending ? "Evaluating…" : "Get AI feedback"}</button></div>{feedback[item.question] && <div className="feedback-card"><div className="feedback-score"><strong>{feedback[item.question].score}/10</strong><span>{feedback[item.question].summary}</span></div><div className="feedback-columns"><div><b>Strengths</b>{feedback[item.question].strengths.map((point) => <span key={point}>+ {point}</span>)}</div><div><b>Improve next</b>{feedback[item.question].improvements.map((point) => <span key={point}>→ {point}</span>)}</div></div><details><summary>See a stronger version</summary><p>{feedback[item.question].rewrittenAnswer}</p></details></div>}</div></div>'
if old_question not in home: raise SystemExit('generated question markup not found')
home = home.replace(old_question, new_question)
home = home.replace('<div className="generated-heading"><span className="kicker">YOUR PRACTICE SET</span><strong>{generated.length} questions · generated from this checklist</strong></div>', '<div className="generated-heading"><span className="kicker">YOUR PRACTICE SET</span><strong>{generated.length} questions · generated from this checklist</strong><span className="saved-count">{savedQuestions.length} saved</span></div>')

home_path.write_text(home)

css = root / 'client/src/index.css'
css_append = r'''
/* General onboarding and account entry */
.auth-page, .onboarding-page { min-height: 100vh; display: grid; place-items: center; padding: 30px; background: linear-gradient(135deg, #10202b 0%, #183642 55%, #24534e 100%); position: relative; overflow: hidden; }.auth-page:before, .onboarding-page:before { content: ''; position: absolute; width: 700px; height: 700px; border: 1px solid rgba(158,231,194,.14); border-radius: 50%; right: -250px; top: -280px; box-shadow: 0 0 0 70px rgba(158,231,194,.03), 0 0 0 140px rgba(158,231,194,.02); }.auth-card, .onboarding-card { position: relative; z-index: 1; width: min(650px, 100%); padding: 40px; border: 1px solid rgba(255,255,255,.12); border-radius: 18px; color: white; background: rgba(255,255,255,.08); backdrop-filter: blur(18px); box-shadow: 0 28px 70px rgba(0,0,0,.22); }.auth-card .brand { display: inline-flex; border: 0; padding: 0; margin-bottom: 58px; }.auth-card h1, .onboarding-card h1 { margin: 18px 0 15px; font-size: clamp(36px, 5vw, 58px); }.auth-card h1 em, .onboarding-card h1 em { color: var(--mint); font-style: normal; }.auth-card p, .onboarding-card > p { max-width: 540px; color: #bfd0ce; font-size: 13px; line-height: 1.7; }.auth-button { margin-top: 18px; }.auth-note { display: block; margin-top: 15px; color: #8ca9a7; font: 9px 'DM Mono'; }.auth-orbit { position: absolute; width: 245px; height: 245px; left: 11%; top: 19%; opacity: .55; }.onboarding-card { width: min(900px, 100%); }.onboarding-card > p { max-width: 680px; }.onboarding-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 13px; margin: 24px 0; }.onboarding-grid label { display: grid; gap: 6px; color: #9db7b5; font: 9px 'DM Mono'; letter-spacing: .06em; text-transform: uppercase; }.onboarding-grid input, .onboarding-grid select, .onboarding-grid textarea { width: 100%; padding: 10px 11px; border: 1px solid rgba(255,255,255,.18); border-radius: 7px; outline: 0; color: white; background: rgba(0,0,0,.16); font: 11px 'Manrope'; text-transform: none; letter-spacing: normal; }.onboarding-grid textarea { min-height: 78px; resize: vertical; }.onboarding-grid input::placeholder, .onboarding-grid textarea::placeholder { color: #89a4a3; }.onboarding-grid input:focus, .onboarding-grid select:focus, .onboarding-grid textarea:focus { border-color: var(--mint); box-shadow: 0 0 0 3px rgba(158,231,194,.13); }.onboarding-wide { grid-column: span 2; }.onboarding-card button:disabled { cursor: not-allowed; opacity: .5; }
/* Weekly study goal chart */
.goal-panel { display: grid; grid-template-columns: 1.05fr 1.5fr 1fr; align-items: center; gap: 28px; margin-top: 13px; padding: 20px 24px; }.goal-copy h3 { margin-top: 7px; }.goal-copy p { margin: 8px 0 14px; color: #718084; font-size: 11px; }.goal-copy label { display: flex; align-items: center; gap: 9px; color: #849294; font: 9px 'DM Mono'; text-transform: uppercase; }.goal-copy input { width: 54px; padding: 6px 7px; border: 1px solid var(--line); border-radius: 6px; background: var(--paper); color: var(--ink); font: 11px 'Manrope'; }.goal-chart { height: 92px; display: flex; align-items: end; justify-content: space-around; gap: 8px; padding: 0 5px; border-bottom: 1px solid var(--line); }.goal-bar-wrap { height: 100%; display: grid; align-content: end; justify-items: center; gap: 4px; min-width: 24px; }.goal-bar-wrap > span { min-height: 11px; color: #719182; font: 9px 'DM Mono'; }.goal-bar-track { width: 18px; height: 60px; display: flex; align-items: end; border-radius: 5px 5px 0 0; background: #edf2ef; overflow: hidden; }.goal-bar { width: 100%; border-radius: 5px 5px 0 0; background: linear-gradient(#9ee7c2, #6fc598); transition: height .3s ease; }.goal-bar-wrap small { color: #839092; font: 9px 'DM Mono'; transform: translateY(18px); }.goal-progress-top { display: flex; justify-content: space-between; color: #7b898a; font: 10px 'DM Mono'; }.goal-progress-top strong { color: #4f9770; }.goal-progress .progress-track { margin: 9px 0 6px; }.goal-progress > small { color: #9aa6a6; font-size: 9px; }
/* Saved questions and answer feedback */
.question-line { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.save-question, .saved-count { padding: 5px 7px; border: 1px solid #cfe4d6; border-radius: 5px; color: #4f8e6b; background: #eaf7ee; font: 9px 'DM Mono'; }.saved-count { margin-left: auto; }.answer-note { width: 100%; min-height: 76px; resize: vertical; margin-top: 13px; padding: 10px; border: 1px solid #dce7e1; border-radius: 7px; outline: 0; color: var(--ink); background: var(--paper); font: 11px/1.5 'Manrope'; }.answer-note:focus { border-color: #7fc7a2; box-shadow: 0 0 0 3px rgba(127,199,162,.12); }.answer-actions { display: flex; gap: 8px; margin-top: 8px; }.feedback-card { margin-top: 13px; padding: 14px; border: 1px solid #cfe4d6; border-radius: 8px; background: #f1f9f3; }.feedback-score { display: flex; align-items: center; gap: 10px; }.feedback-score strong { color: #4f9971; font: 700 24px 'Space Grotesk'; }.feedback-score span { color: #638173; font-size: 10px; line-height: 1.4; }.feedback-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 12px; }.feedback-columns div { display: grid; gap: 5px; }.feedback-columns b { color: #547361; font: 9px 'DM Mono'; letter-spacing: .08em; text-transform: uppercase; }.feedback-columns span { color: #71847a; font-size: 10px; line-height: 1.35; }.feedback-card details { margin-top: 12px; color: #5a806a; font-size: 10px; }.feedback-card details p { padding-top: 7px; color: #6d7f76; font-size: 10px; line-height: 1.5; }
.dark-mode .goal-panel, .dark-mode .feedback-card { background: #1b2d37; border-color: #35634e; }.dark-mode .goal-copy p, .dark-mode .goal-progress > small, .dark-mode .feedback-columns span, .dark-mode .feedback-card details p { color: #a7bdb1; }.dark-mode .goal-bar-track { background: #243b42; }.dark-mode .answer-note { background: #172832; border-color: #3a515a; }.dark-mode .feedback-card { background: #183329; }.dark-mode .feedback-score span, .dark-mode .feedback-columns b, .dark-mode .feedback-card details { color: #b9d4c3; }
@media (max-width: 900px) { .auth-orbit { display: none; }.goal-panel { grid-template-columns: 1fr 1.3fr; }.goal-progress { grid-column: 1 / 3; }.onboarding-card { padding: 28px; } }
@media (max-width: 560px) { .auth-card, .onboarding-card { padding: 25px 20px; }.auth-card .brand { margin-bottom: 38px; }.onboarding-grid { grid-template-columns: 1fr; }.onboarding-wide { grid-column: auto; }.goal-panel { grid-template-columns: 1fr; gap: 20px; }.goal-progress { grid-column: auto; }.feedback-columns { grid-template-columns: 1fr; }.answer-actions { flex-wrap: wrap; } }
'''
css.write_text(css.read_text() + css_append)
print('patched onboarding, AI feedback, saved answers, and weekly goal chart')
