import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { jsPDF } from "jspdf";
import {
  ArrowUpRight,
  CheckCircle2,
  BarChart3,
  Bot,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Clock3,
  Compass,
  Database,
  FileText,
  Flag,
  FolderKanban,
  Gauge,
  Github,
  GraduationCap,
  LayoutDashboard,
  Link2,
  Menu,
  Moon,
  Pause,
  Play,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
  Sun,
  TimerReset,
  UserRound,
  Sparkles,
  Target,
  Terminal,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";

type Status = "Not started" | "Learning" | "Practicing" | "Comfortable" | "Interview ready" | "Job ready";
type NavKey = "overview" | "roadmap" | "skills" | "projects" | "interviews" | "resources" | "progress" | "settings";

const statusOptions: Status[] = ["Not started", "Learning", "Practicing", "Comfortable", "Interview ready", "Job ready"];

type CareerProfile = { targetField: string; targetJob: string; interests: string; experience: string; goals: string };
const emptyProfile: CareerProfile = { targetField: "", targetJob: "", interests: "", experience: "", goals: "" };
function profileKey(openId?: string) { return `roadmap-profile-${openId || "guest"}`; }

const initialSkills = [
  { id: 1, name: "Business SQL", area: "Technical", priority: "P0", week: 2, status: "Practicing" as Status, evidence: "10 timed problems + validation queries" },
  { id: 2, name: "Grain & join cardinality", area: "Technical", priority: "P0", week: 3, status: "Learning" as Status, evidence: "ERD, grain sheet, join-inflation example" },
  { id: 3, name: "Dimensional modeling", area: "Technical", priority: "P0", week: 3, status: "Learning" as Status, evidence: "Star schema + SCD example" },
  { id: 4, name: "BigQuery & query economics", area: "Technical", priority: "P0", week: 4, status: "Not started" as Status, evidence: "Partitioned query + scan comparison" },
  { id: 5, name: "dbt models & tests", area: "Technical", priority: "P0", week: 5, status: "Not started" as Status, evidence: "Working DAG with generic + singular tests" },
  { id: 6, name: "Git workflow", area: "Technical", priority: "P0", week: 5, status: "Learning" as Status, evidence: "Feature branch, commits, PR-style review" },
  { id: 7, name: "Python / pandas reconciliation", area: "Technical", priority: "P1", week: 6, status: "Not started" as Status, evidence: "Exception file + audit summary" },
  { id: 8, name: "Lending lifecycle", area: "Domain", priority: "P0", week: 7, status: "Learning" as Status, evidence: "Product-to-data matrix" },
  { id: 9, name: "BNPL domain", area: "Domain", priority: "P0", week: 7, status: "Learning" as Status, evidence: "90-second reporting comparison" },
  { id: 10, name: "Credit risk metrics", area: "Risk", priority: "P0", week: 8, status: "Not started" as Status, evidence: "Vintage, roll, cure, default analysis" },
  { id: 11, name: "Data-quality controls", area: "Governance", priority: "P0", week: 9, status: "Practicing" as Status, evidence: "Control catalogue + evidence design" },
  { id: 12, name: "Governance & lineage", area: "Governance", priority: "P1", week: 9, status: "Learning" as Status, evidence: "Source-to-report lineage diagram" },
  { id: 13, name: "Product analytics", area: "Business", priority: "P1", week: 10, status: "Not started" as Status, evidence: "Funnel + cohort analysis" },
  { id: 14, name: "Statistics for analysts", area: "Business", priority: "P1", week: 10, status: "Learning" as Status, evidence: "Metric uncertainty + bias note" },
  { id: 15, name: "Live SQL interviews", area: "Interview", priority: "P0", week: 11, status: "Not started" as Status, evidence: "Four timed mocks" },
  { id: 16, name: "Behavioral stories", area: "Interview", priority: "P0", week: 11, status: "Learning" as Status, evidence: "Five STAR-L stories" },
  { id: 17, name: "Capstone project", area: "Portfolio", priority: "P0", week: 12, status: "Not started" as Status, evidence: "Published README + walkthrough" },
];

const weeks = [
  { n: 1, title: "Baseline & banking map", label: "START", color: "mint", focus: "Translate production reporting experience into interview evidence.", deliverable: "Synthetic customer / facility / payment dataset", questions: "How do you prevent duplicate rows after a join?" },
  { n: 2, title: "Advanced business SQL", label: "BUILD", color: "blue", focus: "Windows, deduplication, anti-joins, dates, reconciliation.", deliverable: "Eight business SQL cases + error log", questions: "When is a LEFT JOIN safer than an INNER JOIN?" },
  { n: 3, title: "Modeling & warehouses", label: "MODEL", color: "violet", focus: "Grain, keys, facts, dimensions, star schema, SCD.", deliverable: "Credit bureau ERD + star schema", questions: "What does one row represent in every table?" },
  { n: 4, title: "BigQuery economics", label: "SCALE", color: "orange", focus: "QUALIFY, SAFE_CAST, arrays, partitioning, clustering, cost.", deliverable: "Before / after scan-cost comparison", questions: "How would you reduce bytes scanned?" },
  { n: 5, title: "dbt, Git & tests", label: "SHIP", color: "pink", focus: "Models, ref, sources, tests, docs, branches, pull requests.", deliverable: "Staging → marts dbt project", questions: "When would you use an incremental model?" },
  { n: 6, title: "Python for analysts", label: "AUTOMATE", color: "mint", focus: "pandas, files, JSON, merges, validation, exception reports.", deliverable: "Two-extract reconciliation script", questions: "When is Python better than SQL?" },
  { n: 7, title: "Lending & BNPL", label: "DOMAIN", color: "blue", focus: "Lifecycle, economics, entities, reporting and bureau implications.", deliverable: "Product-to-data matrix", questions: "How does BNPL differ from traditional lending in reporting?" },
  { n: 8, title: "Credit risk analytics", label: "RISK", color: "violet", focus: "DPD, default, PD/LGD/EAD, vintages, rolls, cure.", deliverable: "Portfolio metrics pack", questions: "What is the difference between DPD and default?" },
  { n: 9, title: "Data quality & RCA", label: "CONTROL", color: "orange", focus: "Dimensions, lineage, ownership, controls, auditability.", deliverable: "Control catalogue + lineage diagram", questions: "How do you find the first failing stage?" },
  { n: 10, title: "Product metrics & stats", label: "MEASURE", color: "pink", focus: "Funnels, cohorts, margin, sampling, bias, inference.", deliverable: "Application-to-repayment funnel", questions: "Why can conversion rise while portfolio quality falls?" },
  { n: 11, title: "Role-specific interviews", label: "REHEARSE", color: "mint", focus: "SQL mocks, product case, risk case, behavioral stories.", deliverable: "Four mock sessions + mistake log", questions: "Walk me through a production incident." },
  { n: 12, title: "Capstone & job-ready pack", label: "LAUNCH", color: "blue", focus: "End-to-end demo, README, Git history, trade-offs.", deliverable: "Credit bureau + portfolio capstone", questions: "What would you change in production?" },
];

const initialProjects = [
  { id: 1, name: "Credit Bureau Reporting", short: "Source → submission", week: 12, status: "Not started" as Status, metric: "0 / 6 artifacts", artifacts: ["ERD", "Data dictionary", "SQL", "DQ tests", "Lineage", "README"] },
  { id: 2, name: "BNPL Portfolio Analytics", short: "Order → exposure", week: 7, status: "Learning" as Status, metric: "1 / 5 artifacts", artifacts: ["Metric map", "SQL analysis", "Cohorts", "Risk memo", "Demo"] },
  { id: 3, name: "Credit Risk Analysis", short: "Portfolio → risk", week: 8, status: "Not started" as Status, metric: "0 / 5 artifacts", artifacts: ["Risk dictionary", "Vintage", "Roll rates", "Dashboard", "Memo"] },
  { id: 4, name: "DQ & Reconciliation", short: "Controls → evidence", week: 9, status: "Practicing" as Status, metric: "2 / 5 artifacts", artifacts: ["Rule catalogue", "Exception report", "Issue log", "Runbook", "Lineage"] },
  { id: 5, name: "BigQuery + dbt Mart", short: "Raw → governed", week: 12, status: "Not started" as Status, metric: "0 / 6 artifacts", artifacts: ["Sources", "Models", "Tests", "Docs", "Git history", "Demo"] },
];

const initialSql = [
  { id: 1, pattern: "Latest row per entity", technique: "ROW_NUMBER / QUALIFY", level: "Easy", status: "Practicing" as Status, note: "Remember tie-breakers." },
  { id: 2, pattern: "Top N per group", technique: "DENSE_RANK", level: "Easy", status: "Not started" as Status, note: "" },
  { id: 3, pattern: "Deduplication", technique: "ROW_NUMBER + business key", level: "Easy", status: "Not started" as Status, note: "" },
  { id: 4, pattern: "Missing records", technique: "LEFT anti-join", level: "Easy", status: "Not started" as Status, note: "" },
  { id: 5, pattern: "Conditional aggregation", technique: "COUNTIF / CASE", level: "Easy", status: "Not started" as Status, note: "" },
  { id: 6, pattern: "Running totals", technique: "SUM OVER", level: "Medium", status: "Not started" as Status, note: "" },
  { id: 7, pattern: "Status transitions", technique: "LAG + CASE", level: "Medium", status: "Not started" as Status, note: "" },
  { id: 8, pattern: "Cohort analysis", technique: "DATE_TRUNC + cohort", level: "Interview ready", status: "Not started" as Status, note: "" },
  { id: 9, pattern: "Many-to-many join control", technique: "Pre-aggregation / bridge", level: "Interview ready", status: "Not started" as Status, note: "" },
  { id: 10, pattern: "Reconciliation", technique: "Counts, sums, exceptions", level: "Interview ready", status: "Not started" as Status, note: "" },
];

const resources = [
  { area: "BigQuery", title: "BigQuery overview", provider: "Google Cloud", href: "https://docs.cloud.google.com/bigquery/docs/introduction", use: "Warehouse model, GoogleSQL, partitioning, cost-aware queries" },
  { area: "dbt", title: "dbt Fundamentals", provider: "dbt Learn", href: "https://learn.getdbt.com/courses/dbt-fundamentals", use: "Sources, models, tests, docs, lineage" },
  { area: "Git", title: "Pro Git, 2nd edition", provider: "Git SCM", href: "https://git-scm.com/book/en/v2", use: "Branches, commits, review, rollback" },
  { area: "Regulatory reporting", title: "Comptroller's Handbook: Regulatory Reporting", provider: "OCC", href: "https://www.occ.gov/publications-and-resources/publications/comptrollers-handbook/files/regulatory-reporting/index-regulatory-reporting.html", use: "Source-to-report controls and evidence" },
  { area: "Risk", title: "Credit Risk Management topics", provider: "Federal Reserve", href: "https://www.federalreserve.gov/supervisionreg/topics/credit_risk.htm", use: "Underwriting, exposure, monitoring, expected loss" },
  { area: "BNPL", title: "Risk Management of BNPL Lending", provider: "OCC", href: "https://www.occ.gov/news-issuances/bulletins/2023/bulletin-2023-37.html", use: "Short-tenor risk, first-payment default, disputes" },
  { area: "Data quality", title: "BCBS 239", provider: "Basel Committee", href: "https://www.bis.org/publ/bcbs239.htm", use: "Governance, completeness, timeliness, lineage" },
  { area: "Statistics", title: "OpenIntro Statistics", provider: "OpenIntro", href: "https://www.openintro.org/book/os/", use: "Inference, sampling, uncertainty, regression basics" },
];

function contextualWeeks(profile: CareerProfile) {
  const field = profile.targetField || "your field";
  const job = profile.targetJob || "your target role";
  const interest = profile.interests || "the problems you care about";
  const stages = [
    ["Map the opportunity", `Understand what excellent ${job} work looks like in ${field}.`, `Role map, vocabulary sheet, and a clear problem statement`, `How would you define success for ${job}?`],
    ["Build the toolkit", `Choose the methods, tools, and habits that make you effective in ${job}.`, `A small working example using your preferred tools`, `Why did you choose that approach?`],
    ["Model the work", `Turn ${interest} into a repeatable workflow with clear inputs, outputs, and trade-offs.`, `Workflow map and decision log`, `What assumptions or constraints shape the model?`],
    ["Practice decisions", `Work through realistic ${job} scenarios instead of collecting theory.`, `Three timed cases with an error log`, `What would you do first and why?`],
    ["Create evidence", `Ship a small artifact that proves how you think and execute.`, `A reviewable portfolio artifact`, `How would you explain the result to a stakeholder?`],
    ["Improve communication", `Practice concise updates, written reasoning, and stakeholder alignment.`, `One-page narrative and presentation outline`, `How did you adapt your message to the audience?`],
    ["Deepen domain context", `Study the customers, products, and constraints that matter in ${field}.`, `Domain-to-decision matrix`, `Which domain assumption could change your recommendation?`],
    ["Measure impact", `Connect your work to outcomes, metrics, and meaningful decisions.`, `Metric tree and impact hypothesis`, `Which metric would you monitor after launch?`],
    ["Strengthen quality", `Add validation, review, and risk checks to make your work dependable.`, `Quality checklist and review notes`, `How would you find the first failing stage?`],
    ["Run a full case", `Solve an end-to-end ${job} case from ambiguity to recommendation.`, `Case walkthrough with alternatives`, `What would you change with more time?`],
    ["Rehearse interviews", `Practice role-specific questions and stories with calm, structured answers.`, `Four mock sessions and a mistake log`, `Walk me through your reasoning step by step.`],
    ["Launch your next move", `Package your evidence and make a confident plan for ${job} opportunities.`, `Portfolio, resume bullets, and next-steps plan`, `What would you change in production?`],
  ];
  return stages.map(([title, focus, deliverable, questions], index) => ({ n: index + 1, title, label: ["START", "BUILD", "MODEL", "PRACTICE", "SHIP", "COMMUNICATE", "DOMAIN", "MEASURE", "CONTROL", "CASE", "REHEARSE", "LAUNCH"][index], color: ["mint", "blue", "violet", "orange", "pink", "mint", "blue", "violet", "orange", "pink", "mint", "blue"][index], focus, deliverable, questions }));
}

function contextualProjects(profile: CareerProfile, items: typeof initialProjects) {
  const field = profile.targetField || "your field";
  const job = profile.targetJob || "your role";
  return items.map((item, index) => ({ ...item, name: index === 0 ? `${job} case study` : `${field} workflow ${index + 1}`, short: index === 0 ? "Brief → evidence" : "Context → decision", artifacts: ["Brief", "Model", "Analysis", "Validation", "Recommendation", "README"].slice(0, item.artifacts.length) }));
}

function contextualSkills(profile: CareerProfile, items: typeof initialSkills) {
  const field = profile.targetField || "your field";
  const job = profile.targetJob || "your role";
  const labels = [`${field} fundamentals`, `${job} workflow mapping`, "Problem framing & requirements", "Core tools for the role", "Quality checks & validation", "Stakeholder communication", "Portfolio evidence", "Domain context", "Decision metrics", "Case problem solving", "Interview storytelling", "Execution systems", "Presentation craft", "Impact measurement", "Role-specific practice", "Behavioral stories", "Capstone project"];
  const areas = ["Domain", "Role craft", "Role craft", "Technical", "Quality", "Communication", "Portfolio", "Domain", "Business", "Interview", "Interview", "Execution", "Communication", "Business", "Interview", "Interview", "Portfolio"];
  return items.map((item, index) => ({ ...item, name: labels[index] || item.name, area: areas[index] || item.area, evidence: `Evidence for ${job}: ${item.evidence.toLowerCase()}` }));
}

function contextualResources(profile: CareerProfile) {
  const field = profile.targetField || "your field";
  const job = profile.targetJob || "your role";
  return [
    { area: "Role research", title: `${job} on O*NET`, provider: "O*NET Online", href: "https://www.onetonline.org/", use: `Explore tasks, skills, and work context commonly associated with ${job}.` },
    { area: "Field research", title: `${field} market map`, provider: "Public research", href: "https://www.google.com/search?q=" + encodeURIComponent(field + " industry overview"), use: `Build a current vocabulary for products, customers, constraints, and decisions in ${field}.` },
    { area: "Communication", title: "Plain-language writing guide", provider: "Google Technical Writing", href: "https://developers.google.com/tech-writing", use: `Practice concise explanations that make your ${job} recommendations easier to trust.` },
    { area: "Portfolio", title: "GitHub documentation guide", provider: "GitHub Docs", href: "https://docs.github.com/en/get-started/writing-on-github", use: "Package assumptions, evidence, decisions, and next steps in a reviewable artifact." },
    { area: "Practice", title: "Interview question library", provider: "Indeed Career Guide", href: "https://www.indeed.com/career-advice/interviewing", use: `Compare common ${job} questions and rehearse answers with concrete evidence.` },
  ];
}

const navItems = [
  { key: "overview" as NavKey, label: "Overview", icon: LayoutDashboard },
  { key: "roadmap" as NavKey, label: "12-week roadmap", icon: Compass },
  { key: "skills" as NavKey, label: "Skill tracker", icon: Gauge },
  { key: "projects" as NavKey, label: "Portfolio projects", icon: FolderKanban },
  { key: "interviews" as NavKey, label: "Interview hub", icon: BriefcaseBusiness },
  { key: "resources" as NavKey, label: "Resources", icon: BookOpen },
  { key: "progress" as NavKey, label: "Progress dashboard", icon: TrendingUp },
  { key: "settings" as NavKey, label: "Profile settings", icon: Settings2 },
];

function loadState<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveState(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function progressForStatus(status: Status) {
  return { "Not started": 0, Learning: 20, Practicing: 45, Comfortable: 70, "Interview ready": 88, "Job ready": 100 }[status];
}

function StatusPill({ status }: { status: Status }) {
  return <span className={`status-pill status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>;
}

function ProgressBar({ value, accent = "mint" }: { value: number; accent?: string }) {
  return <div className="progress-track"><div className={`progress-fill fill-${accent}`} style={{ width: `${value}%` }} /></div>;
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="section-header"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

function MetricCard({ label, value, detail, tone = "mint", icon: Icon }: { label: string; value: string; detail: string; tone?: string; icon: React.ComponentType<{ size?: number }> }) {
  return <div className={`metric-card tone-${tone}`}><div className="metric-top"><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><small>{detail}</small></div>;
}

function EmptyState({ icon: Icon, title, body }: { icon: React.ComponentType<{ size?: number }>; title: string; body: string }) {
  return <div className="empty-state"><Icon size={22} /><div><strong>{title}</strong><p>{body}</p></div></div>;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function Home() {
  const { user, loading, isAuthenticated, login, logout } = useAuth();
  const workspaceQuery = trpc.workspace.load.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const studySummaryQuery = trpc.study.summary.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const skillHistoryQuery = trpc.skills.history.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const saveWorkspaceMutation = trpc.workspace.save.useMutation();
  const recordStudySessionMutation = trpc.study.record.useMutation();
  const recordSkillMutation = trpc.skills.record.useMutation();
  const [active, setActive] = useState<NavKey>("overview");
  const [skills, setSkills] = useState(() => loadState("roadmap-skills", initialSkills));
  const [projects, setProjects] = useState(() => loadState("roadmap-projects", initialProjects));
  const [sql, setSql] = useState(() => loadState("roadmap-sql", initialSql));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => loadState("roadmap-theme", "light"));
  const [timerMode, setTimerMode] = useState<"focus" | "short">("focus");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(() => loadState("roadmap-timer-remaining", 25 * 60));
  const [timerSessions, setTimerSessions] = useState(() => loadState("roadmap-timer-sessions", 0));
  const [profile, setProfile] = useState<CareerProfile>(() => loadState(profileKey(), emptyProfile));
  const [weeklyGoal, setWeeklyGoal] = useState(() => loadState("roadmap-weekly-goal", 5));
  const [studyLog, setStudyLog] = useState<Record<string, number>>(() => loadState("roadmap-study-log", {}));
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [guestMode, setGuestMode] = useState(() => loadState("roadmap-guest-mode", false));

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", theme === "dark");
    saveState("roadmap-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!timerRunning) return;
    const tick = window.setInterval(() => {
      setTimerRemaining((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          if (timerMode === "focus") {
            const dayKey = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(new Date().getDay() + 6) % 7];
            setStudyLog((log) => ({ ...log, [dayKey]: (log[dayKey] || 0) + 1 }));
            recordStudySessionMutation.mutate({ sessionDate: new Date().toISOString().slice(0, 10), minutes: 25 });
            setTimerSessions((count) => { const next = count + 1; saveState("roadmap-timer-sessions", next); return next; });
          }
          return timerMode === "focus" ? 25 * 60 : 5 * 60;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [timerRunning, timerMode]);

  useEffect(() => { saveState("roadmap-timer-remaining", timerRemaining); }, [timerRemaining]);
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
  }, [user?.id, workspaceHydrated, profile, skills, projects, sql, studyLog, weeklyGoal, theme, timerRemaining, timerSessions]);

  const updateSkills = (next: typeof skills) => {
    const changes = next.filter((skill) => skills.find((current) => current.id === skill.id)?.status !== skill.status).map((skill) => ({ skillId: skill.id, skillName: skill.name, status: skill.status }));
    setSkills(next);
    saveState("roadmap-skills", next);
    if (user && changes.length > 0) recordSkillMutation.mutate({ changes });
  };
  const updateProjects = (next: typeof projects) => { setProjects(next); saveState("roadmap-projects", next); };
  const updateSql = (next: typeof sql) => { setSql(next); saveState("roadmap-sql", next); };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };

  const skillStats = useMemo(() => {
    const avg = skills.reduce((sum, skill) => sum + progressForStatus(skill.status), 0) / skills.length;
    const critical = skills.filter((skill) => skill.priority === "P0");
    const criticalReady = critical.filter((skill) => skill.status === "Interview ready" || skill.status === "Job ready").length;
    return { avg: Math.round(avg), criticalReady, criticalTotal: critical.length, ready: skills.filter((skill) => skill.status === "Interview ready" || skill.status === "Job ready").length };
  }, [skills]);
  const projectAvg = Math.round(projects.reduce((sum, project) => sum + progressForStatus(project.status), 0) / projects.length);
  const searchableSkills = contextualSkills(profile, skills);
  const filteredSkills = skills.filter((skill, index) => `${searchableSkills[index]?.name} ${searchableSkills[index]?.area} ${skill.priority}`.toLowerCase().includes(search.toLowerCase()));

  const navigate = (key: NavKey) => { setActive(key); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const changeTimerMode = (mode: "focus" | "short") => { setTimerMode(mode); setTimerRunning(false); setTimerRemaining(mode === "focus" ? 25 * 60 : 5 * 60); };
  const resetTimer = () => { setTimerRunning(false); setTimerRemaining(timerMode === "focus" ? 25 * 60 : 5 * 60); };

  const enterGuestMode = () => {
    saveState("roadmap-guest-mode", true);
    setGuestMode(true);
  };

  const handleSignOut = () => {
    saveState("roadmap-guest-mode", false);
    setGuestMode(false);
    logout().catch(() => notify("Signed out."));
  };

  const handleLocalSignIn = async () => {
    try {
      await login({ name: "Demo User", email: "user@example.com" });
      notify("Signed in successfully!");
    } catch {
      enterGuestMode();
    }
  };

  if (loading) return <LoginPage loading onLogin={handleLocalSignIn} onContinueGuest={enterGuestMode} />;
  if (!isAuthenticated && !guestMode) return <LoginPage onLogin={handleLocalSignIn} onContinueGuest={enterGuestMode} />;
  if (!profile.targetField || !profile.targetJob) return <OnboardingPage userName={user?.name || "there"} initialProfile={profile} onSave={setProfile} />;

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><span>R</span></div><div><strong>ROADMAP<span>/OS</span></strong><small>career control room</small></div></div>
      <div className="profile-strip"><div className="avatar">{profile.targetJob ? profile.targetJob.slice(0, 2).toUpperCase() : "ME"}</div><div><strong>{profile.targetJob || "Your career profile"}</strong><small>{profile.targetField || "Personalized workspace"}</small></div><span className="live-dot" /></div>
      <div className="side-label">Workspace</div>
      <nav>{navItems.map(({ key, label, icon: Icon }) => <button key={key} className={`nav-item ${active === key ? "nav-active" : ""}`} onClick={() => navigate(key)}><Icon size={17} /><span>{label}</span>{active === key && <ChevronRight size={14} className="nav-arrow" />}</button>)}</nav>
      <div className="side-label side-label-bottom">Focus stack</div>
      <div className="focus-stack"><div><span className="focus-dot mint" />{profile.targetField || "Field"} foundations</div><div><span className="focus-dot violet" />{profile.targetJob || "Role"} craft</div><div><span className="focus-dot orange" />Evidence + communication</div></div>
      <div className="sidebar-footer"><button className="settings-link" onClick={() => notify(saveWorkspaceMutation.isPending ? "Syncing your workspace…" : "Your progress is synced.")}><Settings2 size={16} /> Settings</button><div className="save-note"><CircleCheck size={14} /> {saveWorkspaceMutation.isPending ? "syncing…" : (isAuthenticated ? "synced to account" : "saved locally")}</div><button className="logout-link" onClick={handleSignOut}><UserRound size={15} /> Sign out</button></div>
    </aside>
    {sidebarOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

    <main className="main-canvas">
      <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="crumb"><span>CAREER OS</span><ChevronRight size={14} /><strong>{navItems.find((n) => n.key === active)?.label.toUpperCase()}</strong></div><div className="top-actions"><div className="search-box"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search skills, projects…" /></div><button className="icon-button" onClick={() => notify("All changes are saved locally.")}><CircleCheck size={17} /></button><button className="icon-button theme-toggle" aria-label="Toggle dark mode" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button><div className="top-avatar">DR</div></div></header>
      <div className="content-wrap">
        {active === "overview" && <Overview skills={skills} projects={contextualProjects(profile, projects)} stats={skillStats} projectAvg={projectAvg} navigate={navigate} profile={profile} timer={{ mode: timerMode, remaining: timerRemaining, running: timerRunning, sessions: timerSessions, onModeChange: changeTimerMode, onToggle: () => setTimerRunning((value) => !value), onReset: resetTimer }} weeklyGoal={weeklyGoal} setWeeklyGoal={setWeeklyGoal} studyLog={studyLog} />}
        {active === "roadmap" && <Roadmap profile={profile} />}
        {active === "skills" && <Skills skills={filteredSkills} allSkills={skills} updateSkills={updateSkills} search={search} profile={profile} />}
        {active === "projects" && <Projects projects={projects} updateProjects={updateProjects} notify={notify} profile={profile} />}
        {active === "interviews" && <Interviews sql={sql} updateSql={updateSql} notify={notify} profile={profile} />}
        {active === "resources" && <Resources search={search} profile={profile} />}
        {active === "progress" && <ProgressDashboard skills={skills} skillHistory={skillHistoryQuery.data || []} studySessions={studySummaryQuery.data?.sessions || []} weeklyGoal={weeklyGoal} />}
        {active === "settings" && <ProfileSettings profile={profile} onSave={setProfile} notify={notify} />}
      </div>
      <footer className="site-footer"><span>ROADMAP/OS · v1.0</span><span>Designed for sustainable compounding, not course collecting.</span><span>Local-first workspace</span></footer>
    </main>
    {toast && <div className="toast"><CircleCheck size={17} /> {toast}</div>}
  </div>;
}


function LoginPage({ loading = false, onLogin, onContinueGuest }: { loading?: boolean; onLogin?: () => Promise<void>; onContinueGuest?: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (import.meta.env.VITE_OAUTH_PORTAL_URL) {
      startLogin();
    } else if (onLogin) {
      setSubmitting(true);
      try {
        await onLogin();
      } finally {
        setSubmitting(false);
      }
    }
  };

  return <div className="auth-page"><div className="auth-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core"><span>ROADMAP/OS</span><strong>CAREER</strong><small>control room</small></div></div><div className="auth-card"><div className="brand"><div className="brand-mark"><span>R</span></div><div><strong>ROADMAP<span>/OS</span></strong><small>career control room</small></div></div><span className="eyebrow">A general data-career workspace for your next move</span><h1>Make your preparation<br /><em>specific to you.</em></h1><p>Sign in or explore as a guest to choose a data-career direction, target role, and interests. The workspace builds a practical learning system around the work you actually want.</p><div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", marginTop: "0.5rem" }}><button type="button" className="primary-button auth-button" onClick={handleSignIn} disabled={loading || submitting}><UserRound size={16} /> {loading || submitting ? "Signing you in…" : "Sign In"}<ArrowUpRight size={16} /></button>{onContinueGuest && <button type="button" className="secondary-button" style={{ justifyContent: "center", width: "100%" }} onClick={onContinueGuest}><Sparkles size={16} /> Continue as Guest (Local Workspace)</button>}</div><small className="auth-note">Your roadmap, saved questions, and study history stay saved in your workspace.</small></div></div>;
}

function OnboardingPage({ userName, initialProfile, onSave }: { userName: string; initialProfile: CareerProfile; onSave: (profile: CareerProfile) => void }) {
  const [draft, setDraft] = useState(initialProfile);
  const update = (key: keyof CareerProfile, value: string) => setDraft((profile) => ({ ...profile, [key]: value }));
  const ready = Boolean(draft.targetField.trim() && draft.targetJob.trim());
  return <div className="onboarding-page"><div className="onboarding-card"><div className="eyebrow mint-eyebrow"><span className="pulse" />PROFILE SETUP · 01</div><h1>Let’s shape this around<br /><em>what you want next.</em></h1><p>Hi {userName}. Choose a direction now; you can refine it later. The workspace will use this context to make the roadmap, interview practice, and weekly goals feel like yours.</p><div className="onboarding-grid"><label>Target field<input value={draft.targetField} onChange={(e) => update("targetField", e.target.value)} placeholder="e.g. Banking, climate, healthcare, SaaS" /></label><label>Target job<input value={draft.targetJob} onChange={(e) => update("targetJob", e.target.value)} placeholder="e.g. Product analyst, data engineer, sales lead" /></label><label>What interests you?<textarea value={draft.interests} onChange={(e) => update("interests", e.target.value)} placeholder="Topics, products, problems, or industries you want to explore" /></label><label>Experience level<select value={draft.experience} onChange={(e) => update("experience", e.target.value)}><option value="">Choose one</option><option>Starting out</option><option>Some experience</option><option>Experienced professional</option><option>Changing careers</option></select></label><label className="onboarding-wide">What would make this workspace useful?<textarea value={draft.goals} onChange={(e) => update("goals", e.target.value)} placeholder="A promotion, a new role, stronger interviews, a portfolio, better consistency…" /></label></div><button className="primary-button" disabled={!ready} onClick={() => onSave(draft)}><CheckCircle2 size={16} /> Build my workspace <ArrowUpRight size={16} /></button></div></div>;
}


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

function Overview({ skills, projects, stats, projectAvg, navigate, profile, timer, weeklyGoal, setWeeklyGoal, studyLog }: { skills: typeof initialSkills; projects: typeof initialProjects; stats: { avg: number; criticalReady: number; criticalTotal: number; ready: number }; projectAvg: number; navigate: (key: NavKey) => void; profile: CareerProfile; timer: { mode: "focus" | "short"; remaining: number; running: boolean; sessions: number; onModeChange: (mode: "focus" | "short") => void; onToggle: () => void; onReset: () => void }; weeklyGoal: number; setWeeklyGoal: (goal: number) => void; studyLog: Record<string, number> }) {
  const week = contextualWeeks(profile)[0];
  const statusCounts = statusOptions.map((status) => ({ status, count: skills.filter((skill) => skill.status === status).length }));
  return <>
    <section className="hero-block"><div className="hero-copy"><div className="eyebrow mint-eyebrow"><span className="pulse" />12-WEEK CAREER SPRINT · WEEK 01</div><h1>Build range for<br /><em>{profile.targetJob}.</em></h1><p>Your personalized operating system for moving toward {profile.targetJob} in {profile.targetField}, shaped around {profile.interests || "the skills and interests you choose"}.</p><div className="hero-actions"><button className="primary-button" onClick={() => navigate("roadmap")}><Zap size={16} /> Start this week <ArrowUpRight size={16} /></button><button className="secondary-button" onClick={() => navigate("skills")}><Gauge size={16} /> Update tracker</button></div></div><div className="hero-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core"><span>W01</span><strong>{stats.avg}%</strong><small>momentum</small></div><div className="orbit-tag tag-top"><span>{profile.targetField.slice(0, 12).toUpperCase()}</span><b>●</b></div><div className="orbit-tag tag-right"><span>{profile.targetJob.slice(0, 12).toUpperCase()}</span><b>↗</b></div><div className="orbit-tag tag-bottom"><span>{(profile.interests || "FOCUS").slice(0, 12).toUpperCase()}</span><b>＋</b></div></div></section>
    <div className="metric-grid"><MetricCard label="Skill momentum" value={`${stats.avg}%`} detail={`${stats.ready} of ${skills.length} skills interview/job ready`} tone="mint" icon={TrendingUp} /><MetricCard label="Priority stack" value={`${stats.criticalReady}/${stats.criticalTotal}`} detail="priority skills at interview or job ready" tone="violet" icon={Target} /><MetricCard label="Project momentum" value={`${projectAvg}%`} detail={`${projects.filter((p) => p.status !== "Not started").length} projects have started`} tone="orange" icon={FolderKanban} /><MetricCard label="Weekly goal" value={`${weeklyGoal}`} detail="focus blocks planned" tone="blue" icon={Clock3} /></div>
    <SkillRecommendations profile={profile} />
    <div className="dashboard-grid"><div className="panel next-panel"><div className="panel-heading"><div><span className="kicker">NEXT UP</span><h3>Week 01 · {week.title}</h3></div><span className="week-chip">{week.label}</span></div><p className="panel-lede">{week.focus}</p><div className="next-row"><div className="next-icon"><Database size={18} /></div><div><strong>Build the first role artifact</strong><span>{week.deliverable}</span></div><ChevronRight size={18} /></div><div className="next-row"><div className="next-icon violet-bg"><Terminal size={18} /></div><div><strong>Practice the role decision story</strong><span>{week.questions}</span></div><ChevronRight size={18} /></div><button className="text-button" onClick={() => navigate("roadmap")}>Open full week plan <ArrowUpRight size={15} /></button></div><div className="panel status-panel"><div className="panel-heading"><div><span className="kicker">SKILL DISTRIBUTION</span><h3>Where your stack sits</h3></div><button className="mini-link" onClick={() => navigate("skills")}>View tracker <ArrowUpRight size={14} /></button></div><div className="donut-wrap"><div className="donut" style={{ background: `conic-gradient(#9ee7c2 0 ${Math.max(stats.avg, 5)}%, #8775e6 ${Math.max(stats.avg, 5)}% ${Math.max(stats.avg + 20, 30)}%, #f0a56b ${Math.max(stats.avg + 20, 30)}% 100%)` }}><div className="donut-hole"><strong>{stats.avg}%</strong><span>avg. progress</span></div></div><div className="legend">{statusCounts.slice(0, 4).map((item) => <div key={item.status}><span className={`legend-dot dot-${item.status.toLowerCase().replaceAll(" ", "-")}`} /><span>{item.status}</span><b>{item.count}</b></div>)}</div></div></div></div>
    <StudyTimer {...timer} /><StudyGoalPanel weeklyGoal={weeklyGoal} setWeeklyGoal={setWeeklyGoal} studyLog={studyLog} /><section className="section-block"><SectionHeader eyebrow="PORTFOLIO RADAR" title="Build one proof-of-work spine" description="Five projects, one narrative: from source data to governed decision support." action={<button className="secondary-button compact" onClick={() => navigate("projects")}>Open projects <ArrowUpRight size={14} /></button>} /><div className="project-grid">{projects.map((project) => <MiniProject key={project.id} project={project} onClick={() => navigate("projects")} />)}</div></section>
    <section className="quote-strip"><Sparkles size={20} /><p>“Your differentiator is not that you can write SQL. It is that you can explain what the product means, what the data should do, how to control it, and what decision it supports.”</p><span>— your interview operating principle</span></section>
  </>;
}

function MiniProject({ project, onClick }: { project: (typeof initialProjects)[number]; onClick: () => void }) {
  const value = progressForStatus(project.status);
  return <button className="mini-project" onClick={onClick}><div className="mini-project-top"><span className={`project-number p-${project.id}`}>0{project.id}</span><StatusPill status={project.status} /></div><strong>{project.name}</strong><small>{project.short} · target W{project.week}</small><div className="mini-project-progress"><ProgressBar value={value} accent={project.id % 2 === 0 ? "violet" : "mint"} /><span>{value}%</span></div></button>;
}

function StudyTimer({ mode, remaining, running, sessions, onModeChange, onToggle, onReset }: { mode: "focus" | "short"; remaining: number; running: boolean; sessions: number; onModeChange: (mode: "focus" | "short") => void; onToggle: () => void; onReset: () => void }) {
  const total = mode === "focus" ? 25 * 60 : 5 * 60;
  const progress = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  return <section className="timer-panel panel"><div className="timer-copy"><span className="kicker">FOCUS ENGINE</span><h3>Protect the next block.</h3><p>One focused session is enough to move the roadmap forward. Your completed focus blocks stay on this device.</p><div className="timer-modes"><button className={mode === "focus" ? "timer-mode-active" : ""} onClick={() => onModeChange("focus")}>Focus · 25m</button><button className={mode === "short" ? "timer-mode-active" : ""} onClick={() => onModeChange("short")}>Reset · 5m</button></div></div><div className="timer-dial" style={{ background: `conic-gradient(var(--mint) 0 ${progress}%, rgba(255,255,255,.12) ${progress}% 100%)` }}><div className="timer-dial-inner"><span>{mode === "focus" ? "DEEP WORK" : "RESET"}</span><strong>{formatTime(remaining)}</strong><small>{running ? "in session" : "ready when you are"}</small></div></div><div className="timer-actions"><button className="primary-button timer-button" onClick={onToggle}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? "Pause" : "Start"}</button><button className="secondary-button compact" onClick={onReset}><TimerReset size={15} /> Reset</button><div className="session-count"><strong>{sessions}</strong><span>focus blocks<br />completed</span></div></div></section>
}


function StudyGoalPanel({ weeklyGoal, setWeeklyGoal, studyLog }: { weeklyGoal: number; setWeeklyGoal: (goal: number) => void; studyLog: Record<string, number> }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const completed = days.reduce((sum, day) => sum + (studyLog[day] || 0), 0);
  const max = Math.max(3, ...days.map((day) => studyLog[day] || 0));
  return <section className="goal-panel panel"><div className="goal-copy"><span className="kicker">WEEKLY GOAL</span><h3>Make consistency visible.</h3><p>{completed} of {weeklyGoal} focus blocks completed this week.</p><label>Target sessions<input type="number" min="1" max="40" value={weeklyGoal} onChange={(e) => setWeeklyGoal(Math.max(1, Number(e.target.value) || 1))} /></label></div><div className="goal-chart" aria-label="Weekly study sessions chart">{days.map((day) => { const count = studyLog[day] || 0; return <div className="goal-bar-wrap" key={day}><span>{count}</span><div className="goal-bar-track"><div className="goal-bar" style={{ height: `${Math.max(count ? 12 : 3, (count / max) * 100)}%` }} /></div><small>{day}</small></div>; })}</div><div className="goal-progress"><div className="goal-progress-top"><span>Weekly progress</span><strong>{Math.min(100, Math.round((completed / Math.max(weeklyGoal, 1)) * 100))}%</strong></div><ProgressBar value={Math.min(100, Math.round((completed / Math.max(weeklyGoal, 1)) * 100))} accent="mint" /><small>Complete a focus block to update today’s bar.</small></div></section>
}

function SkillRecommendations({ profile }: { profile: CareerProfile }) {
  const recommendSkills = trpc.skills.recommend.useMutation();
  const [recommendations, setRecommendations] = useState<Array<{ skill: string; category: string; why: string; practice: string; priority: string; week: number }>>([]);
  const generate = () => {
    recommendSkills.mutate({ role: profile.targetJob || "Data professional", field: profile.targetField || "Any industry", interests: profile.interests, experience: profile.experience, goals: profile.goals }, { onSuccess: (result) => setRecommendations(result.recommendations) });
  };
  return <section className="recommendation-panel panel"><div className="recommendation-head"><div><span className="kicker">AI CAREER SIGNAL</span><h3>Skills worth learning next</h3><p>Recommendations for <strong>{profile.targetJob || "your target role"}</strong> in <strong>{profile.targetField || "your target field"}</strong>, balanced across technical data work and career evidence.</p></div><button className="primary-button compact" onClick={generate} disabled={recommendSkills.isPending}><Sparkles size={15} /> {recommendSkills.isPending ? "Thinking…" : recommendations.length ? "Refresh recommendations" : "Recommend skills"}</button></div>{recommendations.length > 0 && <div className="recommendation-grid">{recommendations.map((item) => <article className="recommendation-card" key={`${item.skill}-${item.week}`}><div className="recommendation-card-top"><span>{item.category}</span><b>{item.priority}</b></div><h4>{item.skill}</h4><p>{item.why}</p><div className="recommendation-practice"><strong>Practice</strong><span>{item.practice}</span></div><small>Suggested week {String(item.week).padStart(2, "0")}</small></article>)}</div>}</section>;
}

function Roadmap({ profile }: { profile: CareerProfile }) {
  const [expanded, setExpanded] = useState(1);
  const roadmapWeeks = contextualWeeks(profile);
  return <><SectionHeader eyebrow="THE SEQUENCE" title={`A 12-week progression for ${profile.targetJob || "your next role"}`} description={`A practical sequence for building evidence in ${profile.targetField || "your field"}, shaped around ${profile.interests || "the work you want to do"}.`} action={<div className="roadmap-summary"><span>12 weeks</span><span>60% hands-on</span><span>15% interviews</span></div>} /><div className="roadmap-list">{roadmapWeeks.map((week) => <div key={week.n} className={`week-card week-${week.color} ${expanded === week.n ? "week-expanded" : ""}`}><button className="week-trigger" onClick={() => setExpanded(expanded === week.n ? 0 : week.n)}><div className="week-index">{String(week.n).padStart(2, "0")}</div><div className="week-title"><span>{week.label}</span><strong>{week.title}</strong></div><div className="week-focus">{week.focus}</div><div className="week-arrow">{expanded === week.n ? <X size={18} /> : <ChevronRight size={18} />}</div></button>{expanded === week.n && <div className="week-detail"><div><span className="detail-label">Deliverable</span><strong>{week.deliverable}</strong></div><div><span className="detail-label">Interview prompt</span><strong>{week.questions}</strong></div><div><span className="detail-label">Required depth</span><strong>{week.n === 1 || week.n === 2 || week.n >= 7 ? "Hands-on + interview critical" : "Hands-on required"}</strong></div></div>}</div>)}</div><div className="schedule-panel"><div><span className="kicker">WEEKLY CADENCE</span><h3>Protect the rhythm</h3></div><div className="cadence-grid"><div><b>MON</b><span>30m theory<br />45m practice</span></div><div><b>TUE</b><span>Domain study<br />Recall quiz</span></div><div><b>WED</b><span>90m build<br />No passive learning</span></div><div><b>THU</b><span>Interview Qs<br />Revision</span></div><div><b>FRI</b><span>Light review<br />or rest</span></div><div><b>WEEKEND</b><span>Project + mock<br />3–4 hours</span></div></div></div></>;
}

function Skills({ skills, allSkills, updateSkills, search, profile }: { skills: typeof initialSkills; allSkills: typeof initialSkills; updateSkills: (skills: typeof initialSkills) => void; search: string; profile: CareerProfile }) {
  const [area, setArea] = useState("All");
  const displayAllSkills = contextualSkills(profile, allSkills);
  const displaySkills = contextualSkills(profile, skills);
  const areas = ["All", ...Array.from(new Set(displayAllSkills.map((skill) => skill.area)))];
  const shown = displaySkills.filter((skill) => area === "All" || skill.area === area);
  const avg = Math.round(displayAllSkills.reduce((sum, skill) => sum + progressForStatus(skill.status), 0) / displayAllSkills.length);
  return <><SectionHeader eyebrow="EVIDENCE, NOT INTENTION" title="Skill tracker" description="Progress moves when you can point to an artifact, a solved problem, or a practiced answer." action={<div className="tracker-score"><strong>{avg}%</strong><span>overall progress</span></div>} /><div className="filter-row"><div className="filter-tabs">{areas.map((item) => <button key={item} className={area === item ? "filter-active" : ""} onClick={() => setArea(item)}>{item}</button>)}</div><span className="filter-note">{shown.length} skills {search && `matching “${search}”`}</span></div><div className="skills-table panel"><div className="table-head skill-grid"><span>Skill</span><span>Area</span><span>Target</span><span>Priority</span><span>Status</span><span>Evidence</span><span>Progress</span></div>{shown.map((skill) => <div className="table-row skill-grid" key={skill.id}><div className="skill-name"><span className="skill-icon"><BarChart3 size={14} /></span><strong>{skill.name}</strong></div><span className="muted-cell">{skill.area}</span><span className="week-cell">W{skill.week}</span><span className={`priority priority-${skill.priority.toLowerCase()}`}>{skill.priority}</span><select value={skill.status} onChange={(e) => updateSkills(allSkills.map((item) => item.id === skill.id ? { ...item, status: e.target.value as Status } : item))}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select><span className="evidence-cell">{skill.evidence}</span><div className="table-progress"><ProgressBar value={progressForStatus(skill.status)} accent={skill.priority === "P0" ? "mint" : "violet"} /><small>{progressForStatus(skill.status)}%</small></div></div>)}</div><div className="tracker-note"><Flag size={17} /><div><strong>Rule of thumb</strong><span>“Learning” is exposure. “Practicing” is repetition. “Interview ready” means you can explain the trade-offs aloud and validate your answer.</span></div></div></>;
}

function Projects({ projects, updateProjects, notify, profile }: { projects: typeof initialProjects; updateProjects: (projects: typeof initialProjects) => void; notify: (message: string) => void; profile: CareerProfile }) {
  const [selected, setSelected] = useState(projects[0].id);
  const displayProjects = projects.map((item, index) => ({ ...item, name: index === 0 ? `${profile.targetJob || "Target role"} case study` : `${profile.targetField || "Domain"} workflow ${index + 1}`, short: index === 0 ? "Brief → evidence" : "Context → decision", artifacts: ["Brief", "Model", "Analysis", "Validation", "Recommendation", "README"].slice(0, item.artifacts.length) }));
  const project = displayProjects.find((item) => item.id === selected) ?? displayProjects[0];
  const value = progressForStatus(project.status);
  return <><SectionHeader eyebrow="PROOF-OF-WORK" title="Portfolio projects" description="A project is useful when it proves how you think, execute, validate, and communicate in your target role." action={<button className="primary-button compact" onClick={() => notify("Project template copied to your local workspace.")}><Plus size={15} /> New project note</button>} /><div className="project-layout"><div className="project-nav panel">{displayProjects.map((item) => <button className={`project-nav-item ${selected === item.id ? "selected" : ""}`} key={item.id} onClick={() => setSelected(item.id)}><span className={`project-number p-${item.id}`}>0{item.id}</span><div><strong>{item.name}</strong><small>{item.short}</small></div><ChevronRight size={16} /></button>)}</div><div className="project-detail panel"><div className="detail-hero"><div><span className="kicker">PROJECT 0{project.id} · TARGET WEEK {project.week}</span><h3>{project.name}</h3><p>{project.short}. Build the work story end to end: context → approach → evidence → validation → decision.</p></div><StatusPill status={project.status} /></div><div className="detail-progress"><div><span>Milestone completion</span><strong>{value}%</strong></div><ProgressBar value={value} accent="mint" /><select value={project.status} onChange={(e) => updateProjects(projects.map((item) => item.id === project.id ? { ...item, status: e.target.value as Status, metric: `${Math.round(value / 20)}/5 artifacts` } : item))}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></div><div className="artifact-grid">{project.artifacts.map((artifact, index) => <div className={`artifact ${index < Math.round(value / 20) ? "artifact-done" : ""}`} key={artifact}>{index < Math.round(value / 20) ? <Check size={15} /> : <span>{index + 1}</span>}<strong>{artifact}</strong><small>{index < Math.round(value / 20) ? "Evidence captured" : "Not started"}</small></div>)}</div><div className="project-story"><div><span className="detail-label">Interview talking point</span><p>“I clarified the problem, made the assumptions explicit, built a reviewable artifact, validated the result, and explained the trade-offs behind my recommendation.”</p></div><button className="secondary-button compact" onClick={() => notify("README outline copied to your notes.")}><FileText size={15} /> Copy README outline</button></div></div></div></>;
}

function Interviews({ sql, updateSql, notify, profile }: { sql: typeof initialSql; updateSql: (sql: typeof initialSql) => void; notify: (message: string) => void; profile: CareerProfile }) {
  const [tab, setTab] = useState<"sql" | "cases" | "stories">("sql");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState(profile.targetJob || "");
  useEffect(() => { if (profile.targetJob) setRole(profile.targetJob); }, [profile.targetJob]);
  const [products, setProducts] = useState("");
  const [metrics, setMetrics] = useState("");
  const [risks, setRisks] = useState("");
  const [reporting, setReporting] = useState("");
  const [questionType, setQuestionType] = useState<"mixed" | "technical" | "domain" | "behavioral" | "case">("mixed");
  const [questionCount, setQuestionCount] = useState(5);
  const { user } = useAuth();
  const [generated, setGenerated] = useState<Array<{ category: string; question: string; why: string; followUp: string }>>([]);
  const [savedQuestions, setSavedQuestions] = useState<string[]>(() => loadState("roadmap-saved-questions", []));
  const [answerNotes, setAnswerNotes] = useState<Record<string, string>>(() => loadState("roadmap-answer-notes", {}));
  const [feedback, setFeedback] = useState<Record<string, { score: number; summary: string; strengths: string[]; improvements: string[]; rewrittenAnswer: string }>>(() => loadState("roadmap-feedback", {}));
  const savedQuestionsQuery = trpc.interviews.saved.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const saveQuestionMutation = trpc.interviews.save.useMutation({ onSuccess: () => savedQuestionsQuery.refetch() });
  const removeQuestionMutation = trpc.interviews.remove.useMutation({ onSuccess: () => savedQuestionsQuery.refetch() });
  const generateQuestions = trpc.interviews.generateQuestions.useMutation();
  const evaluateAnswer = trpc.interviews.evaluateAnswer.useMutation();
  useEffect(() => {
    if (!savedQuestionsQuery.data) return;
    setSavedQuestions(savedQuestionsQuery.data.map((item) => item.question));
    setAnswerNotes(Object.fromEntries(savedQuestionsQuery.data.map((item) => [item.question, item.answerNote || ""])));
    setFeedback(Object.fromEntries(savedQuestionsQuery.data.filter((item) => item.feedback).map((item) => [item.question, item.feedback])) as typeof feedback);
    if (savedQuestionsQuery.data.length > 0) setGenerated(savedQuestionsQuery.data.map((item) => ({ category: item.category, question: item.question, why: item.why, followUp: item.followUp })));
  }, [savedQuestionsQuery.data]);
  const saveQuestionRecord = (item: { category: string; question: string; why: string; followUp: string }, answerNote?: string, feedbackValue?: unknown) => {
    if (user) {
      saveQuestionMutation.mutate({ ...item, answerNote: answerNote || null, feedback: feedbackValue || null });
    }
  };
  const toggleSaved = (item: { category: string; question: string; why: string; followUp: string }) => {
    const isSaved = savedQuestions.includes(item.question);
    const nextSaved = isSaved ? savedQuestions.filter((question) => question !== item.question) : [...savedQuestions, item.question];
    setSavedQuestions(nextSaved);
    saveState("roadmap-saved-questions", nextSaved);
    if (isSaved) {
      if (user) removeQuestionMutation.mutate({ question: item.question }, { onSuccess: () => notify("Question removed from your saved set.") });
      else notify("Question removed from your saved set.");
    } else {
      if (user) saveQuestionRecord(item, answerNotes[item.question], feedback[item.question]);
      notify("Question saved to your practice set.");
    }
  };
  const saveAnswer = (question: string, answer: string) => {
    const item = generated.find((candidate) => candidate.question === question);
    const next = { ...answerNotes, [question]: answer };
    setAnswerNotes(next);
    saveState("roadmap-answer-notes", next);
    if (item && user) saveQuestionRecord(item, answer, feedback[question]);
    notify("Answer note saved.");
  };
  const getFeedback = (question: string) => {
    const answer = answerNotes[question] || "";
    if (answer.trim().length < 20) {
      notify("Write at least 20 characters before requesting feedback.");
      return;
    }
    evaluateAnswer.mutate({ question, answer, role: profile.targetJob, field: profile.targetField }, {
      onSuccess: (result) => {
        setFeedback((items) => {
          const next = { ...items, [question]: result };
          saveState("roadmap-feedback", next);
          return next;
        });
        const item = generated.find((candidate) => candidate.question === question);
        if (item && user) saveQuestionRecord(item, answer, result);
        notify("AI feedback is ready.");
      },
      onError: () => notify("Feedback could not be generated. Try again shortly.")
    });
  };
  const handleGenerate = () => {
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
  };
  return <><SectionHeader eyebrow="INTERVIEW EXECUTION" title="Interview hub" description="Your production experience is valuable when you narrate the reasoning, not only the result." action={<div className="header-actions"><button className="secondary-button compact" onClick={exportInterviewPdf}><FileText size={15} /> Export PDF</button><button className="secondary-button compact" onClick={() => notify("Mock interview checklist copied.")}><ClipboardList size={15} /> Copy checklist</button></div>} /><div className="interview-banner"><div className="interview-mark"><BriefcaseBusiness size={24} /></div><div><span className="kicker">THE LIVE-CODING VOICE</span><h3>Explain the decision before you present the solution.</h3><p>“I’ll clarify the outcome, state my assumptions, explain the approach, and validate the recommendation against the evidence.”</p></div></div><section className="ai-generator panel"><div className="ai-generator-head"><div className="ai-spark"><Bot size={19} /></div><div><span className="kicker">AI MOCK INTERVIEW GENERATOR</span><h3>Turn company research into questions worth practicing.</h3><p>Use the checklist below. The generator will create role-specific questions grounded in product, metrics, risks, and reporting context.</p></div><span className="ai-badge">BUILT-IN AI</span></div><div className="ai-form-grid"><label>Company<input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Tamara, Tabby, a bank…" /></label><label>Target role<input value={role} onChange={(e) => setRole(e.target.value)} placeholder={profile.targetJob || "e.g. Product designer, teacher, analyst"} /></label><label>Question mix<select value={questionType} onChange={(e) => setQuestionType(e.target.value as typeof questionType)}><option value="mixed">Mixed interview</option><option value="technical">Technical</option><option value="domain">Domain / product</option><option value="case">Case study</option><option value="behavioral">Behavioral</option></select></label><label>Count<select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}><option value={3}>3 questions</option><option value={5}>5 questions</option><option value={8}>8 questions</option></select></label><label className="ai-wide">Products, services, or workflow<textarea value={products} onChange={(e) => setProducts(e.target.value)} placeholder="What does the organization do? Who uses it? What workflow or experience matters?" /></label><label>Key metrics<textarea value={metrics} onChange={(e) => setMetrics(e.target.value)} placeholder="Adoption, quality, speed, retention, impact…" /></label><label>Main risks<textarea value={risks} onChange={(e) => setRisks(e.target.value)} placeholder="Customer, operational, market, quality…" /></label><label className="ai-wide">Reporting obligations<textarea value={reporting} onChange={(e) => setReporting(e.target.value)} placeholder="Policy, compliance, quality, SLA, or professional standards…" /></label></div><div className="ai-generator-footer"><span><CircleCheck size={14} /> Keep assumptions explicit; verify local regulation before interviews.</span><button className="primary-button compact" onClick={handleGenerate} disabled={generateQuestions.isPending}><Sparkles size={15} />{generateQuestions.isPending ? "Generating…" : "Generate questions"}</button></div>{generated.length > 0 && <div className="generated-questions"><div className="generated-heading"><span className="kicker">YOUR PRACTICE SET</span><strong>{generated.length} questions · generated from this checklist</strong><span className="saved-count">{savedQuestions.length} saved</span></div>{generated.map((item, index) => <div className="generated-question" key={`${item.question}-${index}`}><div className="generated-number">0{index + 1}</div><div><div className="question-line"><span className="question-category">{item.category}</span><button className="save-question" onClick={() => toggleSaved(item)}>{savedQuestions.includes(item.question) ? "Saved" : "Save question"}</button></div><h4>{item.question}</h4><p><strong>Why it matters:</strong> {item.why}</p><p><strong>Follow-up:</strong> {item.followUp}</p><textarea className="answer-note" value={answerNotes[item.question] || ""} onChange={(e) => setAnswerNotes((notes) => ({ ...notes, [item.question]: e.target.value }))} placeholder="Write your answer here…" /><div className="answer-actions"><button className="secondary-button compact" onClick={() => saveAnswer(item.question, answerNotes[item.question] || "")}><FileText size={14} /> Save answer note</button><button className="primary-button compact" onClick={() => getFeedback(item.question)} disabled={evaluateAnswer.isPending}><Sparkles size={14} /> {evaluateAnswer.isPending ? "Evaluating…" : "Get AI feedback"}</button></div>{feedback[item.question] && <div className="feedback-card"><div className="feedback-score"><strong>{feedback[item.question].score}/10</strong><span>{feedback[item.question].summary}</span></div><div className="feedback-columns"><div><b>Strengths</b>{feedback[item.question].strengths.map((point) => <span key={point}>+ {point}</span>)}</div><div><b>Improve next</b>{feedback[item.question].improvements.map((point) => <span key={point}>→ {point}</span>)}</div></div><details><summary>See a stronger version</summary><p>{feedback[item.question].rewrittenAnswer}</p></details></div>}</div></div>)}</div>}</section><div className="interview-tabs"><button className={tab === "sql" ? "tab-active" : ""} onClick={() => setTab("sql")}><Terminal size={16} /> Technical patterns</button><button className={tab === "cases" ? "tab-active" : ""} onClick={() => setTab("cases")}><Target size={16} /> Case frameworks</button><button className={tab === "stories" ? "tab-active" : ""} onClick={() => setTab("stories")}><Trophy size={16} /> Behavioral stories</button></div>{tab === "sql" && <div className="sql-table panel"><div className="table-head sql-grid"><span>Pattern</span><span>Technique</span><span>Level</span><span>Status</span><span>Learning note</span></div>{sql.map((item) => <div className="table-row sql-grid" key={item.id}><div className="skill-name"><span className="skill-icon"><Terminal size={14} /></span><strong>{item.pattern}</strong></div><span className="muted-cell">{item.technique}</span><span className={`level level-${item.level.toLowerCase().replaceAll(" ", "-")}`}>{item.level}</span><select value={item.status} onChange={(e) => updateSql(sql.map((row) => row.id === item.id ? { ...row, status: e.target.value as Status } : row))}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select><input className="note-input" value={item.note} onChange={(e) => updateSql(sql.map((row) => row.id === item.id ? { ...row, note: e.target.value } : row))} placeholder="Add a learning note…" /></div>)}</div>}{tab === "cases" && <div className="case-grid"><CaseCard number="01" title="Root-cause analysis" steps="Understand → quantify impact → reproduce → isolate → fix → validate → monitor" prompt="A key outcome is trending below expectations. How would you investigate?" /><CaseCard number="02" title="Product metric decline" steps="Define metric → inspect funnel → segment → check data quality → test hypotheses" prompt="Demand is up, but the intended outcome is down. What would you check first?" /><CaseCard number="03" title="Data model design" steps="Business process → grain → keys → history → access pattern → controls" prompt="Model the customer journey, key events, outcomes, and feedback loops for this product or service." /></div>}{tab === "stories" && <div className="story-grid"><StoryCard title="Production issue" body="A missing-record, duplicate, or count-mismatch story with impact and the first failing stage." /><StoryCard title="Ambiguous requirement" body="How you clarified business rules and translated them into SQL and validation logic." /><StoryCard title="Stakeholder tension" body="How you balanced reporting deadline, correctness, and a cross-functional disagreement." /><StoryCard title="Control improvement" body="A repeatable check or documentation change that reduced future investigation effort." /><StoryCard title="Learning gap" body={`Use a ${profile.targetField} question: what changed in your preparation and how did you close the gap?`} /></div>}</>;
}

function CaseCard({ number, title, steps, prompt }: { number: string; title: string; steps: string; prompt: string }) { return <div className="case-card"><span className="case-number">{number}</span><h3>{title}</h3><p className="case-prompt">{prompt}</p><div className="case-steps"><span>Framework</span><strong>{steps}</strong></div><button className="text-button">Practice aloud <ArrowUpRight size={14} /></button></div>; }
function StoryCard({ title, body }: { title: string; body: string }) { return <div className="story-card"><div className="story-icon"><Sparkles size={16} /></div><h3>{title}</h3><p>{body}</p><span className="story-structure">SITUATION · TASK · ACTION · RESULT · LEARNING</span></div>; }

function Resources({ search, profile }: { search: string; profile: CareerProfile }) { const sourceResources = contextualResources(profile); const shown = sourceResources.filter((item) => `${item.area} ${item.title} ${item.provider} ${item.use}`.toLowerCase().includes(search.toLowerCase())); return <><SectionHeader eyebrow="CURATED INPUT" title="Resources" description="One to three resources per topic. The rule: study just enough to build, explain, and apply." action={<div className="resource-count"><BookOpen size={15} /> {shown.length} references</div>} /><div className="resource-grid">{shown.map((item) => <a className="resource-card" key={item.title} href={item.href} target="_blank" rel="noreferrer"><div className="resource-top"><span className="resource-area">{item.area}</span><ArrowUpRight size={16} /></div><h3>{item.title}</h3><span className="resource-provider">{item.provider}</span><p>{item.use}</p><div className="resource-link"><Link2 size={13} /> Open source</div></a>)}</div><div className="resource-note"><BookOpen size={18} /><div><strong>Scope rule</strong><span>Every field has its own vocabulary, standards, and decision context. Verify current requirements and professional norms for the target field before relying on an external source.</span></div></div></>; }
