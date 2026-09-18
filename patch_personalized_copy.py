from pathlib import Path
p=Path('/home/ubuntu/banking-fintech-roadmap/client/src/pages/Home.tsx')
s=p.read_text()
# Dynamic projects for read-only overview cards; keep raw project records for persistence edits.
marker='function contextualSkills(profile: CareerProfile, items: typeof initialSkills) {'
helper='''function contextualProjects(profile: CareerProfile, items: typeof initialProjects) {\n  const field = profile.targetField || "your field";\n  const job = profile.targetJob || "your role";\n  return items.map((item, index) => ({ ...item, name: index === 0 ? `${job} case study` : `${field} workflow ${index + 1}`, short: index === 0 ? "Brief → evidence" : "Context → decision", artifacts: ["Brief", "Model", "Analysis", "Validation", "Recommendation", "README"].slice(0, item.artifacts.length) }));\n}\n\n'''
if helper not in s: s=s.replace(marker,helper+marker)
# Only overview gets contextual display objects.
s=s.replace('Overview skills={skills} projects={projects} stats=', 'Overview skills={skills} projects={contextualProjects(profile, projects)} stats=')
# Project nav should use contextual display list inside project component.
s=s.replace('<div className="project-nav panel">{projects.map((item) =>', '<div className="project-nav panel">{displayProjects.map((item) =>')
# Role selector becomes a free-form field and initializes from profile.
s=s.replace('const [role, setRole] = useState("Data Analyst");', 'const [role, setRole] = useState(profile.targetJob || "");\n  useEffect(() => { if (profile.targetJob) setRole(profile.targetJob); }, [profile.targetJob]);')
s=s.replace('<label>Target role<select value={role} onChange={(e) => setRole(e.target.value)}><option>Data Analyst</option><option>Fintech Data Analyst</option><option>Regulatory Reporting Analyst</option><option>Risk Analyst</option><option>Analytics Engineer</option><option>Banking Data Consultant</option></select></label>', '<label>Target role<input value={role} onChange={(e) => setRole(e.target.value)} placeholder={profile.targetJob || "e.g. Product designer, teacher, analyst"} /></label>')
# Replace banking-specific interview banner language with profile-aware language.
s=s.replace('Say the grain before you write the query.', 'Explain the decision before you present the solution.')
s=s.replace('“One output row represents a facility-month. I’ll define the eligible population, confirm join cardinality, and validate the result with control totals.”', '“I’ll clarify the outcome, state my assumptions, explain the approach, and validate the recommendation against the evidence.”')
s=s.replace('Products and lifecycle', 'Products, services, or workflow')
s=s.replace('What do they sell? Who uses it? What entities and events exist?', 'What does the organization do? Who uses it? What workflow or experience matters?')
s=s.replace('Revenue, GMV, approval, retention…', 'Adoption, quality, speed, retention, impact…')
s=s.replace('Credit, fraud, operational, data…', 'Customer, operational, market, quality…')
s=s.replace('Regulatory, bureau, audit, SLA, local rules…', 'Policy, compliance, quality, SLA, or professional standards…')
p.write_text(s)
print('patched generic project and interview language')
