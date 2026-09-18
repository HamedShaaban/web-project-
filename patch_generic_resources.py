from pathlib import Path
p=Path('/home/ubuntu/banking-fintech-roadmap/client/src/pages/Home.tsx')
s=p.read_text()
# Add a generic resource catalog derived from the user's profile.
marker='const navItems = ['
helper='''function contextualResources(profile: CareerProfile) {\n  const field = profile.targetField || "your field";\n  const job = profile.targetJob || "your role";\n  return [\n    { area: "Role research", title: `${job} on O*NET`, provider: "O*NET Online", href: "https://www.onetonline.org/", use: `Explore tasks, skills, and work context commonly associated with ${job}.` },\n    { area: "Field research", title: `${field} market map`, provider: "Public research", href: "https://www.google.com/search?q=" + encodeURIComponent(field + " industry overview"), use: `Build a current vocabulary for products, customers, constraints, and decisions in ${field}.` },\n    { area: "Communication", title: "Plain-language writing guide", provider: "Google Technical Writing", href: "https://developers.google.com/tech-writing", use: `Practice concise explanations that make your ${job} recommendations easier to trust.` },\n    { area: "Portfolio", title: "GitHub documentation guide", provider: "GitHub Docs", href: "https://docs.github.com/en/get-started/writing-on-github", use: "Package assumptions, evidence, decisions, and next steps in a reviewable artifact." },\n    { area: "Practice", title: "Interview question library", provider: "Indeed Career Guide", href: "https://www.indeed.com/career-advice/interviewing", use: `Compare common ${job} questions and rehearse answers with concrete evidence.` },\n  ];\n}\n\n'''
if helper not in s:s=s.replace(marker,helper+marker)
s=s.replace('{active === "resources" && <Resources search={search} />}', '{active === "resources" && <Resources search={search} profile={profile} />}')
s=s.replace('<button className={tab === "sql" ? "tab-active" : ""} onClick={() => setTab("sql")}><Terminal size={16} /> SQL patterns</button>', '<button className={tab === "sql" ? "tab-active" : ""} onClick={() => setTab("sql")}><Terminal size={16} /> Technical patterns</button>')
s=s.replace('A regulatory submission count is 2.4% below source totals.', 'A key outcome is trending below expectations. How would you investigate?')
s=s.replace('Approval is up, but first-payment success is down.', 'Demand is up, but the intended outcome is down. What would you check first?')
s=s.replace('Model a BNPL order, facility, installment, refund, and payment flow.', 'Model the customer journey, key events, outcomes, and feedback loops for this product or service.')
s=s.replace('Use the BNPL question: what changed in your preparation and how did you close the gap?', 'Use a {profile.targetField} question: what changed in your preparation and how did you close the gap?')
# Replace Resources implementation to use contextual resources.
s=s.replace('function Resources({ search }: { search: string }) { const shown = resources.filter((item) =>', 'function Resources({ search, profile }: { search: string; profile: CareerProfile }) { const sourceResources = contextualResources(profile); const shown = sourceResources.filter((item) =>')
p.write_text(s)
print('patched generic resources and interview practice language')
