from pathlib import Path

path = Path('/home/ubuntu/banking-fintech-roadmap/client/src/pages/Home.tsx')
home = path.read_text()

# Add generic profile-driven content helpers before navigation definitions.
marker = 'const navItems = ['
helpers = r'''function contextualWeeks(profile: CareerProfile) {
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

function contextualSkills(profile: CareerProfile, items: typeof initialSkills) {
  const field = profile.targetField || "your field";
  const job = profile.targetJob || "your role";
  const labels = [`${field} fundamentals`, `${job} workflow mapping`, "Problem framing & requirements", "Core tools for the role", "Quality checks & validation", "Stakeholder communication", "Portfolio evidence", "Domain context", "Decision metrics", "Case problem solving", "Interview storytelling", "Execution systems", "Presentation craft", "Impact measurement", "Role-specific practice", "Behavioral stories", "Capstone project"];
  const areas = ["Domain", "Role craft", "Role craft", "Technical", "Quality", "Communication", "Portfolio", "Domain", "Business", "Interview", "Interview", "Execution", "Communication", "Business", "Interview", "Interview", "Portfolio"];
  return items.map((item, index) => ({ ...item, name: labels[index] || item.name, area: areas[index] || item.area, evidence: `Evidence for ${job}: ${item.evidence.toLowerCase()}` }));
}

'''
if helpers not in home:
    home = home.replace(marker, helpers + marker)

home = home.replace('{active === "roadmap" && <Roadmap />}', '{active === "roadmap" && <Roadmap profile={profile} />}')
home = home.replace('{active === "skills" && <Skills skills={filteredSkills} allSkills={skills} updateSkills={updateSkills} search={search} />}', '{active === "skills" && <Skills skills={filteredSkills} allSkills={skills} updateSkills={updateSkills} search={search} profile={profile} />}')
home = home.replace('{active === "projects" && <Projects projects={projects} updateProjects={updateProjects} notify={notify} />}', '{active === "projects" && <Projects projects={projects} updateProjects={updateProjects} notify={notify} profile={profile} />}')

# Make overview use the contextual sequence and wording.
home = home.replace('const week = weeks[0];', 'const week = contextualWeeks(profile)[0];')
home = home.replace('Critical stack', 'Priority stack').replace('P0 skills at interview or job ready', 'priority skills at interview or job ready')
home = home.replace('<MetricCard label="Weekly capacity" value="9.5–13h" detail="Sustainable pace alongside full-time work" tone="blue" icon={Clock3} />', '<MetricCard label="Weekly goal" value={`${weeklyGoal}`} detail="focus blocks planned" tone="blue" icon={Clock3} />')
home = home.replace('Build the baseline dataset', 'Build the first role artifact')
home = home.replace('Practice the live-coding voice', 'Practice the role decision story')
home = home.replace('<span>SQL</span>', '<span>{profile.targetField.slice(0, 12).toUpperCase()}</span>')
home = home.replace('<span>RISK</span>', '<span>{profile.targetJob.slice(0, 12).toUpperCase()}</span>')
home = home.replace('<span>DBT</span>', '<span>{(profile.interests || "FOCUS").slice(0, 12).toUpperCase()}</span>')

# Replace the fixed roadmap implementation.
start = home.index('function Roadmap() {')
end = home.index('\nfunction Skills(', start)
roadmap = r'''function Roadmap({ profile }: { profile: CareerProfile }) {
  const [expanded, setExpanded] = useState(1);
  const roadmapWeeks = contextualWeeks(profile);
  return <><SectionHeader eyebrow="THE SEQUENCE" title={`A 12-week progression for ${profile.targetJob || "your next role"}`} description={`A practical sequence for building evidence in ${profile.targetField || "your field"}, shaped around ${profile.interests || "the work you want to do"}.`} action={<div className="roadmap-summary"><span>12 weeks</span><span>60% hands-on</span><span>15% interviews</span></div>} /><div className="roadmap-list">{roadmapWeeks.map((week) => <div key={week.n} className={`week-card week-${week.color} ${expanded === week.n ? "week-expanded" : ""}`}><button className="week-trigger" onClick={() => setExpanded(expanded === week.n ? 0 : week.n)}><div className="week-index">{String(week.n).padStart(2, "0")}</div><div className="week-title"><span>{week.label}</span><strong>{week.title}</strong></div><div className="week-focus">{week.focus}</div><div className="week-arrow">{expanded === week.n ? <X size={18} /> : <ChevronRight size={18} />}</div></button>{expanded === week.n && <div className="week-detail"><div><span className="detail-label">Deliverable</span><strong>{week.deliverable}</strong></div><div><span className="detail-label">Interview prompt</span><strong>{week.questions}</strong></div><div><span className="detail-label">Required depth</span><strong>{week.n === 1 || week.n === 2 || week.n >= 7 ? "Hands-on + interview critical" : "Hands-on required"}</strong></div></div>}</div>)}</div><div className="schedule-panel"><div><span className="kicker">WEEKLY CADENCE</span><h3>Protect the rhythm</h3></div><div className="cadence-grid"><div><b>MON</b><span>30m theory<br />45m practice</span></div><div><b>TUE</b><span>Domain study<br />Recall quiz</span></div><div><b>WED</b><span>90m build<br />No passive learning</span></div><div><b>THU</b><span>Interview Qs<br />Revision</span></div><div><b>FRI</b><span>Light review<br />or rest</span></div><div><b>WEEKEND</b><span>Project + mock<br />3–4 hours</span></div></div></div></>;
}
'''
home = home[:start] + roadmap + home[end:]

# Use profile-derived labels in skills without losing status data.
home = home.replace('function Skills({ skills, allSkills, updateSkills, search }: { skills: typeof initialSkills; allSkills: typeof initialSkills; updateSkills: (skills: typeof initialSkills) => void; search: string }) {\n  const [area, setArea] = useState("All");\n  const areas = ["All", ...Array.from(new Set(allSkills.map((skill) => skill.area)))];\n  const shown = skills.filter((skill) => area === "All" || skill.area === area);\n  const avg = Math.round(allSkills.reduce((sum, skill) => sum + progressForStatus(skill.status), 0) / allSkills.length);', 'function Skills({ skills, allSkills, updateSkills, search, profile }: { skills: typeof initialSkills; allSkills: typeof initialSkills; updateSkills: (skills: typeof initialSkills) => void; search: string; profile: CareerProfile }) {\n  const [area, setArea] = useState("All");\n  const displayAllSkills = contextualSkills(profile, allSkills);\n  const displaySkills = contextualSkills(profile, skills);\n  const areas = ["All", ...Array.from(new Set(displayAllSkills.map((skill) => skill.area)))];\n  const shown = displaySkills.filter((skill) => area === "All" || skill.area === area);\n  const avg = Math.round(displayAllSkills.reduce((sum, skill) => sum + progressForStatus(skill.status), 0) / displayAllSkills.length);')

# Genericize project visible copy and labels by profile.
home = home.replace('function Projects({ projects, updateProjects, notify }: { projects: typeof initialProjects; updateProjects: (projects: typeof initialProjects) => void; notify: (message: string) => void }) {\n  const [selected, setSelected] = useState(projects[0].id);\n  const project = projects.find((item) => item.id === selected) ?? projects[0];', 'function Projects({ projects, updateProjects, notify, profile }: { projects: typeof initialProjects; updateProjects: (projects: typeof initialProjects) => void; notify: (message: string) => void; profile: CareerProfile }) {\n  const [selected, setSelected] = useState(projects[0].id);\n  const displayProjects = projects.map((item, index) => ({ ...item, name: index === 0 ? `${profile.targetJob || "Target role"} case study` : `${profile.targetField || "Domain"} workflow ${index + 1}`, short: index === 0 ? "Brief → evidence" : "Context → decision", artifacts: ["Brief", "Model", "Analysis", "Validation", "Recommendation", "README"].slice(0, item.artifacts.length) }));\n  const project = displayProjects.find((item) => item.id === selected) ?? displayProjects[0];')
home = home.replace('A project is only useful when it gives you a confident story about business context, data model, controls, and trade-offs.', 'A project is useful when it proves how you think, execute, validate, and communicate in your target role.')
home = home.replace('Build the data story end to end: product context → entities → transformations → controls → decision.', 'Build the work story end to end: context → approach → evidence → validation → decision.')
home = home.replace('“I separated the business process from the reporting output, named the grain of each model, added controls at the points where errors could enter, and documented how I would prove the final number.”', '“I clarified the problem, made the assumptions explicit, built a reviewable artifact, validated the result, and explained the trade-offs behind my recommendation.”')

path.write_text(home)
print('patched profile-aware roadmap content and component wiring')
''
