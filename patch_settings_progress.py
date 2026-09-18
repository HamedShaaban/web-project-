from pathlib import Path

path = Path('/home/ubuntu/banking-fintech-roadmap/client/src/pages/Home.tsx')
home = path.read_text()

home = home.replace('import { startLogin } from "@/const";\n', 'import { startLogin } from "@/const";\nimport { jsPDF } from "jspdf";\n')
home = home.replace('type NavKey = "overview" | "roadmap" | "skills" | "projects" | "interviews" | "resources";', 'type NavKey = "overview" | "roadmap" | "skills" | "projects" | "interviews" | "resources" | "progress" | "settings";')
home = home.replace('  { key: "resources" as NavKey, label: "Resources", icon: BookOpen },\n];', '  { key: "resources" as NavKey, label: "Resources", icon: BookOpen },\n  { key: "progress" as NavKey, label: "Progress dashboard", icon: TrendingUp },\n  { key: "settings" as NavKey, label: "Profile settings", icon: Settings2 },\n];')

home = home.replace(
'''  const workspaceQuery = trpc.workspace.load.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const saveWorkspaceMutation = trpc.workspace.save.useMutation();
  const recordStudySessionMutation = trpc.study.record.useMutation();''',
'''  const workspaceQuery = trpc.workspace.load.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const studySummaryQuery = trpc.study.summary.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const skillHistoryQuery = trpc.skills.history.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const saveWorkspaceMutation = trpc.workspace.save.useMutation();
  const recordStudySessionMutation = trpc.study.record.useMutation();
  const recordSkillMutation = trpc.skills.record.useMutation();''')

home = home.replace(
'''  const updateSkills = (next: typeof skills) => { setSkills(next); saveState("roadmap-skills", next); };''',
'''  const updateSkills = (next: typeof skills) => {
    const changes = next.filter((skill) => skills.find((current) => current.id === skill.id)?.status !== skill.status).map((skill) => ({ skillId: skill.id, skillName: skill.name, status: skill.status }));
    setSkills(next);
    saveState("roadmap-skills", next);
    if (user && changes.length > 0) recordSkillMutation.mutate({ changes });
  };''')

home = home.replace(
'''        {active === "resources" && <Resources search={search} />}''',
'''        {active === "resources" && <Resources search={search} />}
        {active === "progress" && <ProgressDashboard skills={skills} skillHistory={skillHistoryQuery.data || []} studySessions={studySummaryQuery.data?.sessions || []} weeklyGoal={weeklyGoal} />}
        {active === "settings" && <ProfileSettings profile={profile} onSave={setProfile} notify={notify} />}''')

# Replace interview section action with export + copy.
home = home.replace(
'''  const savedQuestionsQuery = trpc.interviews.saved.useQuery(undefined, { retry: false });
  const saveQuestionMutation = trpc.interviews.save.useMutation();
  const removeQuestionMutation = trpc.interviews.remove.useMutation();''',
'''  const savedQuestionsQuery = trpc.interviews.saved.useQuery(undefined, { retry: false });
  const saveQuestionMutation = trpc.interviews.save.useMutation({ onSuccess: () => savedQuestionsQuery.refetch() });
  const removeQuestionMutation = trpc.interviews.remove.useMutation({ onSuccess: () => savedQuestionsQuery.refetch() });''')

home = home.replace(
'''  const handleGenerate = () => {
    if (!company.trim()) { notify("Add a company name first."); return; }
    generateQuestions.mutate({ company, role, products, metrics, risks, reporting, questionType, count: questionCount }, {
      onSuccess: (data) => { setGenerated(data.questions); notify(`${data.questions.length} questions generated from your checklist.`); },
      onError: () => notify("The generator could not complete this run. Try again in a moment."),
    });
  };''',
'''  const handleGenerate = () => {
    if (!company.trim()) { notify("Add a company name first."); return; }
    generateQuestions.mutate({ company, role, products, metrics, risks, reporting, questionType, count: questionCount }, {
      onSuccess: (data) => { setGenerated(data.questions); notify(`${data.questions.length} questions generated from your checklist.`); },
      onError: () => notify("The generator could not complete this run. Try again in a moment."),
    });
  };
  const exportInterviewPdf = () => {
    const rows = savedQuestionsQuery.data || [];
    if (rows.length === 0) { notify("Save at least one question before exporting."); return; }
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 44;
    const width = 595 - margin * 2;
    let y = 48;
    const addText = (text: string, size: number, color: [number, number, number], gap = 6) => {
      doc.setFontSize(size); doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, width) as string[];
      if (y + lines.length * (size + 3) > 800) { doc.addPage(); y = 48; }
      doc.text(lines, margin, y); y += lines.length * (size + 3) + gap;
    };
    addText(`${profile.targetJob || "Interview"} · Practice export`, 18, [24, 38, 48], 5);
    addText(`${profile.targetField || "Career workspace"} · Generated ${new Date().toLocaleDateString()}`, 9, [90, 110, 115], 18);
    rows.forEach((row, index) => {
      addText(`${String(index + 1).padStart(2, "0")} · ${row.category}`, 11, [67, 139, 103], 5);
      addText(row.question, 12, [24, 38, 48], 6);
      addText(`Why it matters: ${row.why}`, 9, [96, 112, 116], 5);
      addText(`Follow-up: ${row.followUp}`, 9, [96, 112, 116], 6);
      if (row.answerNote) addText(`Your answer: ${row.answerNote}`, 10, [53, 76, 68], 5);
      if (row.feedback) { addText(`AI feedback · ${row.feedback.score}/10: ${row.feedback.summary}`, 10, [79, 145, 105], 5); addText(`Improve next: ${row.feedback.improvements.join(" · ")}`, 9, [84, 105, 93], 13); }
    });
    doc.save(`interview-practice-${new Date().toISOString().slice(0, 10)}.pdf`);
    notify("Your interview practice PDF is downloading.");
  };''')

home = home.replace(
'''<SectionHeader eyebrow="INTERVIEW EXECUTION" title="Interview hub" description="Your production experience is valuable when you narrate the reasoning, not only the result." action={<button className="secondary-button compact" onClick={() => notify("Mock interview checklist copied.")}><ClipboardList size={15} /> Copy checklist</button>} />''',
'''<SectionHeader eyebrow="INTERVIEW EXECUTION" title="Interview hub" description="Your production experience is valuable when you narrate the reasoning, not only the result." action={<div className="header-actions"><button className="secondary-button compact" onClick={exportInterviewPdf}><FileText size={15} /> Export PDF</button><button className="secondary-button compact" onClick={() => notify("Mock interview checklist copied.")}><ClipboardList size={15} /> Copy checklist</button></div>} />''')

# Add settings and progress components before Overview.
components = r'''
function ProfileSettings({ profile, onSave, notify }: { profile: CareerProfile; onSave: (profile: CareerProfile) => void; notify: (message: string) => void }) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => setDraft(profile), [profile]);
  const update = (key: keyof CareerProfile, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => { if (!draft.targetField.trim() || !draft.targetJob.trim()) { notify("Target field and job are required."); return; } onSave(draft); notify("Profile settings saved to your account."); };
  return <><SectionHeader eyebrow="PROFILE SETTINGS" title="Keep the workspace pointed at your next move." description="Update your direction any time. Your dashboard language and interview coaching use these details." action={<button className="primary-button compact" onClick={save}><CheckCircle2 size={15} /> Save profile</button>} /><div className="settings-layout"><div className="settings-intro panel"><div className="settings-avatar">{draft.targetJob.slice(0, 2).toUpperCase() || "ME"}</div><span className="kicker">YOUR CAREER CONTEXT</span><h3>{draft.targetJob || "Choose a target job"}</h3><p>{draft.targetField || "Choose a target field"}</p><div className="settings-rule" /><small>Changing this profile does not delete your saved questions, answers, or study history.</small></div><div className="settings-form panel"><label>Target field<input value={draft.targetField} onChange={(e) => update("targetField", e.target.value)} placeholder="e.g. Climate, healthcare, SaaS, banking" /></label><label>Target job<input value={draft.targetJob} onChange={(e) => update("targetJob", e.target.value)} placeholder="e.g. Product manager, data engineer, sales lead" /></label><label>What interests you?<textarea value={draft.interests} onChange={(e) => update("interests", e.target.value)} placeholder="Topics, products, problems, or industries you want to explore" /></label><label>Experience level<select value={draft.experience} onChange={(e) => update("experience", e.target.value)}><option value="">Choose one</option><option>Starting out</option><option>Some experience</option><option>Experienced professional</option><option>Changing careers</option></select></label><label>What would make this useful?<textarea value={draft.goals} onChange={(e) => update("goals", e.target.value)} placeholder="A promotion, new role, stronger interviews, portfolio, consistency…" /></label></div></div></>;
}

function ProgressDashboard({ skills, skillHistory, studySessions, weeklyGoal }: { skills: typeof initialSkills; skillHistory: Array<{ skillId: number; skillName: string; status: string; recordedAt: Date | string }>; studySessions: Array<{ sessionDate: string; minutes: number }>; weeklyGoal: number }) {
  const statusValue = (status: string) => progressForStatus(status as Status);
  const totalMinutes = studySessions.reduce((sum, session) => sum + session.minutes, 0);
  const currentProgress = Math.round(skills.reduce((sum, skill) => sum + progressForStatus(skill.status), 0) / Math.max(skills.length, 1));
  const historyChanges = skillHistory.length;
  const lastSeven = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); const key = date.toISOString().slice(0, 10); return { key, label: date.toLocaleDateString(undefined, { weekday: "short" }), minutes: studySessions.filter((session) => session.sessionDate === key).reduce((sum, session) => sum + session.minutes, 0) }; });
  const maxMinutes = Math.max(25, ...lastSeven.map((day) => day.minutes));
  const statusBreakdown = statusOptions.map((status) => ({ status, count: skills.filter((skill) => skill.status === status).length }));
  return <><SectionHeader eyebrow="PROGRESS INTELLIGENCE" title="See the work compound." description="A visual view of focus time, current skill readiness, and the status changes you have made over time." action={<div className="progress-range"><Clock3 size={14} /> {studySessions.length} focus sessions</div>} /><div className="progress-metrics"><MetricCard label="Skill readiness" value={`${currentProgress}%`} detail={`${historyChanges} tracked skill changes`} tone="mint" icon={TrendingUp} /><MetricCard label="Focus time" value={`${Math.round(totalMinutes / 60)}h`} detail={`${studySessions.length} completed sessions`} tone="violet" icon={Clock3} /><MetricCard label="Weekly target" value={`${weeklyGoal}`} detail="focus blocks planned" tone="orange" icon={Target} /><MetricCard label="Interview-ready" value={`${skills.filter((skill) => skill.status === "Interview ready" || skill.status === "Job ready").length}`} detail={`of ${skills.length} tracked skills`} tone="blue" icon={Trophy} /></div><div className="progress-dashboard-grid"><div className="progress-chart panel"><div className="panel-heading"><div><span className="kicker">STUDY HISTORY</span><h3>Focus minutes · last 7 days</h3></div><span className="week-chip">TARGET {weeklyGoal}</span></div><div className="history-bars">{lastSeven.map((day) => <div className="history-day" key={day.key}><span>{day.minutes}</span><div className="history-track"><div className="history-fill" style={{ height: `${Math.max(day.minutes ? 12 : 3, (day.minutes / maxMinutes) * 100)}%` }} /></div><small>{day.label}</small></div>)}</div></div><div className="skill-progress panel"><div className="panel-heading"><div><span className="kicker">SKILL TRACKER</span><h3>Current readiness mix</h3></div><Gauge size={17} /></div><div className="progress-skill-list">{statusBreakdown.map((item) => <div className="progress-skill-row" key={item.status}><span>{item.status}</span><ProgressBar value={(item.count / Math.max(skills.length, 1)) * 100} accent={item.status === "Not started" ? "blue" : item.status === "Learning" ? "orange" : item.status === "Practicing" ? "mint" : "violet"} /><b>{item.count}</b></div>)}</div></div></div><div className="history-note"><TrendingUp size={18} /><div><strong>Historical signal</strong><span>Your skill tracker logs each status change from now on, while completed focus sessions are stored by date. Use this view weekly to decide what to practice next.</span></div></div></>;
}

'''
home = home.replace('\nfunction Overview({ skills, projects, stats, projectAvg, navigate, profile, timer, weeklyGoal, setWeeklyGoal, studyLog }: {', '\n' + components + 'function Overview({ skills, projects, stats, projectAvg, navigate, profile, timer, weeklyGoal, setWeeklyGoal, studyLog }: {')

path.write_text(home)
print('patched profile settings, interview PDF export, and historical progress dashboard')
''
