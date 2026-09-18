from pathlib import Path
p=Path('/home/ubuntu/banking-fintech-roadmap/client/src/pages/Home.tsx')
s=p.read_text()
s=s.replace('<div className="focus-stack"><div><span className="focus-dot mint" />SQL + modeling</div><div><span className="focus-dot violet" />Risk + BNPL</div><div><span className="focus-dot orange" />Modern data stack</div></div>', '<div className="focus-stack"><div><span className="focus-dot mint" />{profile.targetField || "Field"} foundations</div><div><span className="focus-dot violet" />{profile.targetJob || "Role"} craft</div><div><span className="focus-dot orange" />Evidence + communication</div></div>')
s=s.replace('const filteredSkills = skills.filter((skill) => `${skill.name} ${skill.area} ${skill.priority}`.toLowerCase().includes(search.toLowerCase()));', 'const searchableSkills = contextualSkills(profile, skills);\n  const filteredSkills = skills.filter((skill, index) => `${searchableSkills[index]?.name} ${searchableSkills[index]?.area} ${skill.priority}`.toLowerCase().includes(search.toLowerCase()));')
s=s.replace('Regulatory and credit-bureau treatment is jurisdiction- and product-specific. Always verify the target regulator’s current data dictionary, taxonomy/version, cadence, accounting basis, and product classification.', 'Every field has its own vocabulary, standards, and decision context. Verify current requirements and professional norms for the target field before relying on an external source.')
p.write_text(s)
print('completed profile-aware cleanup')
