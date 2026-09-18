from pathlib import Path

path = Path('/home/ubuntu/banking-fintech-roadmap/client/src/pages/Home.tsx')
home = path.read_text()

home = home.replace(
'''  const { user, loading, isAuthenticated } = useAuth();
  const [active, setActive] = useState<NavKey>("overview");''',
'''  const { user, loading, isAuthenticated } = useAuth();
  const workspaceQuery = trpc.workspace.load.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const saveWorkspaceMutation = trpc.workspace.save.useMutation();
  const recordStudySessionMutation = trpc.study.record.useMutation();
  const [active, setActive] = useState<NavKey>("overview");''')

home = home.replace(
'''  const [studyLog, setStudyLog] = useState<Record<string, number>>(() => loadState("roadmap-study-log", {}));

  useEffect(() => {''',
'''  const [studyLog, setStudyLog] = useState<Record<string, number>>(() => loadState("roadmap-study-log", {}));
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);

  useEffect(() => {''')

home = home.replace(
'''          if (timerMode === "focus") {
            const dayKey = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(new Date().getDay() + 6) % 7];
            setStudyLog((log) => ({ ...log, [dayKey]: (log[dayKey] || 0) + 1 }));
            setTimerSessions((count) => { const next = count + 1; saveState("roadmap-timer-sessions", next); return next; });
          }''',
'''          if (timerMode === "focus") {
            const dayKey = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(new Date().getDay() + 6) % 7];
            setStudyLog((log) => ({ ...log, [dayKey]: (log[dayKey] || 0) + 1 }));
            recordStudySessionMutation.mutate({ sessionDate: new Date().toISOString().slice(0, 10), minutes: 25 });
            setTimerSessions((count) => { const next = count + 1; saveState("roadmap-timer-sessions", next); return next; });
          }''')

home = home.replace(
'''  useEffect(() => { saveState("roadmap-timer-remaining", timerRemaining); }, [timerRemaining]);
  useEffect(() => { if (user?.openId) setProfile(loadState(profileKey(user.openId), emptyProfile)); }, [user?.openId]);
  useEffect(() => { if (user?.openId) saveState(profileKey(user.openId), profile); }, [profile, user?.openId]);
  useEffect(() => { saveState("roadmap-weekly-goal", weeklyGoal); }, [weeklyGoal]);
  useEffect(() => { saveState("roadmap-study-log", studyLog); }, [studyLog]);''',
'''  useEffect(() => { saveState("roadmap-timer-remaining", timerRemaining); }, [timerRemaining]);
  useEffect(() => {
    if (!user || workspaceQuery.isLoading || workspaceHydrated) return;
    const stored = workspaceQuery.data;
    if (stored) {
      setProfile(stored.profile as CareerProfile);
      setSkills(stored.skills as typeof initialSkills);
      setProjects(stored.projects as typeof initialProjects);
      setSql(stored.sql as typeof initialSql);
      setStudyLog(stored.studyLog as Record<string, number>);
      setWeeklyGoal(stored.weeklyGoal);
      setTheme(stored.theme);
      setTimerRemaining(stored.timerRemaining);
      setTimerSessions(stored.timerSessions);
    }
    setWorkspaceHydrated(true);
  }, [user?.id, workspaceQuery.data, workspaceQuery.isLoading, workspaceHydrated]);
  useEffect(() => { if (user?.openId) setProfile(loadState(profileKey(user.openId), emptyProfile)); }, [user?.openId]);
  useEffect(() => { if (user?.openId) saveState(profileKey(user.openId), profile); }, [profile, user?.openId]);
  useEffect(() => { saveState("roadmap-weekly-goal", weeklyGoal); }, [weeklyGoal]);
  useEffect(() => { saveState("roadmap-study-log", studyLog); }, [studyLog]);
  useEffect(() => {
    if (!user || !workspaceHydrated) return;
    const timer = window.setTimeout(() => saveWorkspaceMutation.mutate({
      profile,
      skills,
      projects,
      sql,
      studyLog,
      weeklyGoal,
      theme,
      timerRemaining,
      timerSessions,
    }), 700);
    return () => window.clearTimeout(timer);
  }, [user?.id, workspaceHydrated, profile, skills, projects, sql, studyLog, weeklyGoal, theme, timerRemaining, timerSessions]);''')

# Make the persistent store the visible source of truth in the sidebar.
home = home.replace('<div className="sidebar-footer"><button className="settings-link" onClick={() => notify("Your progress is saved locally in this browser.")}><Settings2 size={16} /> Settings</button><div className="save-note"><CircleCheck size={14} /> autosaved locally</div></div>', '<div className="sidebar-footer"><button className="settings-link" onClick={() => notify(saveWorkspaceMutation.isPending ? "Syncing your workspace…" : "Your progress is synced to your account.")}><Settings2 size={16} /> Settings</button><div className="save-note"><CircleCheck size={14} /> {saveWorkspaceMutation.isPending ? "syncing…" : "synced to account"}</div></div>')

# Pass persistence hooks into the interview page.
home = home.replace(
'''        {active === "interviews" && <Interviews sql={sql} updateSql={updateSql} notify={notify} profile={profile} />}''',
'''        {active === "interviews" && <Interviews sql={sql} updateSql={updateSql} notify={notify} profile={profile} />}''')

# Replace interview local-only state and handlers.
home = home.replace(
'''  const [feedback, setFeedback] = useState<Record<string, { score: number; summary: string; strengths: string[]; improvements: string[]; rewrittenAnswer: string }>>({});
  const generateQuestions = trpc.interviews.generateQuestions.useMutation();
  const evaluateAnswer = trpc.interviews.evaluateAnswer.useMutation();
  const toggleSaved = (question: string) => setSavedQuestions((items) => { const next = items.includes(question) ? items.filter((item) => item !== question) : [...items, question]; saveState("roadmap-saved-questions", next); return next; });
  const saveAnswer = (question: string, answer: string) => { const next = { ...answerNotes, [question]: answer }; setAnswerNotes(next); saveState("roadmap-answer-notes", next); notify("Answer note saved locally."); };
  const getFeedback = (question: string) => { const answer = answerNotes[question] || ""; if (answer.trim().length < 20) { notify("Write at least 20 characters before requesting feedback."); return; } evaluateAnswer.mutate({ question, answer, role: profile.targetJob, field: profile.targetField }, { onSuccess: (result) => { setFeedback((items) => ({ ...items, [question]: result })); notify("AI feedback is ready."); }, onError: () => notify("Feedback could not be generated. Try again shortly.") }); };''',
'''  const [feedback, setFeedback] = useState<Record<string, { score: number; summary: string; strengths: string[]; improvements: string[]; rewrittenAnswer: string }>>({});
  const savedQuestionsQuery = trpc.interviews.saved.useQuery(undefined, { retry: false });
  const saveQuestionMutation = trpc.interviews.save.useMutation();
  const removeQuestionMutation = trpc.interviews.remove.useMutation();
  const generateQuestions = trpc.interviews.generateQuestions.useMutation();
  const evaluateAnswer = trpc.interviews.evaluateAnswer.useMutation();
  useEffect(() => {
    if (!savedQuestionsQuery.data) return;
    setSavedQuestions(savedQuestionsQuery.data.map((item) => item.question));
    setAnswerNotes(Object.fromEntries(savedQuestionsQuery.data.map((item) => [item.question, item.answerNote || ""])));
    setFeedback(Object.fromEntries(savedQuestionsQuery.data.filter((item) => item.feedback).map((item) => [item.question, item.feedback])) as typeof feedback);
    if (savedQuestionsQuery.data.length > 0) setGenerated(savedQuestionsQuery.data.map((item) => ({ category: item.category, question: item.question, why: item.why, followUp: item.followUp })));
  }, [savedQuestionsQuery.data]);
  const saveQuestionRecord = (item: { category: string; question: string; why: string; followUp: string }, answerNote?: string, feedbackValue?: unknown) => saveQuestionMutation.mutate({ ...item, answerNote: answerNote || null, feedback: feedbackValue || null });
  const toggleSaved = (item: { category: string; question: string; why: string; followUp: string }) => {
    const isSaved = savedQuestions.includes(item.question);
    setSavedQuestions((items) => isSaved ? items.filter((question) => question !== item.question) : [...items, item.question]);
    if (isSaved) removeQuestionMutation.mutate({ question: item.question }, { onSuccess: () => notify("Question removed from your saved set.") });
    else saveQuestionRecord(item, answerNotes[item.question], feedback[item.question]);
  };
  const saveAnswer = (question: string, answer: string) => {
    const item = generated.find((candidate) => candidate.question === question);
    const next = { ...answerNotes, [question]: answer };
    setAnswerNotes(next);
    if (item) saveQuestionRecord(item, answer, feedback[question]);
    notify("Answer note saved to your account.");
  };
  const getFeedback = (question: string) => { const answer = answerNotes[question] || ""; if (answer.trim().length < 20) { notify("Write at least 20 characters before requesting feedback."); return; } evaluateAnswer.mutate({ question, answer, role: profile.targetJob, field: profile.targetField }, { onSuccess: (result) => { setFeedback((items) => ({ ...items, [question]: result })); const item = generated.find((candidate) => candidate.question === question); if (item) saveQuestionRecord(item, answer, result); notify("AI feedback is ready and saved."); }, onError: () => notify("Feedback could not be generated. Try again shortly.") }); };''')
home = home.replace('onClick={() => toggleSaved(item.question)}', 'onClick={() => toggleSaved(item)}')

path.write_text(home)
print('patched frontend workspace hydration and persistence mutations')
