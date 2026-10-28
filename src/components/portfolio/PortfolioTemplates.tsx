import React from "react";
import {
  ExternalLink,
  Github,
  Mail,
  Linkedin,
  Globe,
  GraduationCap,
  Sparkles,
  Terminal,
  Code2,
  Layers,
  Star,
  GitFork,
  ArrowUpRight,
  FolderGit2,
} from "lucide-react";
import { PublicPortfolioData, PortfolioProject, PortfolioTemplateType } from "../../types";

interface PortfolioTemplateProps {
  data: PublicPortfolioData;
  templateOverride?: PortfolioTemplateType;
}

export const PortfolioTemplates: React.FC<PortfolioTemplateProps> = ({
  data,
  templateOverride,
}) => {
  const template = templateOverride || data.settings?.template || "modern";
  const { profile, projects, skills, githubHighlights = [] } = data;

  // Filter projects by featured or display all sorted
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
  });

  // 1. MINIMAL TEMPLATE
  if (template === "minimal") {
    return (
      <div className="bg-[#FAF8F5] text-stone-900 min-h-screen p-6 sm:p-12 font-sans selection:bg-stone-200">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Header */}
          <header className="space-y-4 pb-8 border-b border-stone-200">
            <h1 className="text-3xl sm:text-4xl font-bold font-editorial text-stone-900 tracking-tight">
              {profile.fullName}
            </h1>
            <p className="text-base sm:text-lg text-stone-600 font-medium leading-relaxed">
              {profile.headline || profile.targetRole || "Software Engineer"}
            </p>
            {profile.about && (
              <p className="text-sm text-stone-600 leading-relaxed max-w-2xl font-light">
                {profile.about}
              </p>
            )}

            {/* Links */}
            <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
              {profile.contact.email && (
                <a
                  href={`mailto:${profile.contact.email}`}
                  className="text-stone-700 hover:text-stone-950 underline underline-offset-4"
                >
                  {profile.contact.email}
                </a>
              )}
              {profile.contact.github && (
                <a
                  href={profile.contact.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-700 hover:text-stone-950 underline underline-offset-4"
                >
                  GitHub
                </a>
              )}
              {profile.contact.linkedin && (
                <a
                  href={profile.contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-700 hover:text-stone-950 underline underline-offset-4"
                >
                  LinkedIn
                </a>
              )}
              {profile.education?.college && (
                <span className="text-stone-500 font-light">
                  {profile.education.college} {profile.education.graduationYear ? `(${profile.education.graduationYear})` : ""}
                </span>
              )}
            </div>
          </header>

          {/* Featured Projects */}
          <section className="space-y-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Selected Work ({sortedProjects.length})
            </h2>

            <div className="space-y-8">
              {sortedProjects.map((p) => (
                <article key={p.projectId} className="space-y-3 pb-8 border-b border-stone-200/60 last:border-0">
                  <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <h3 className="text-lg font-bold text-stone-900 tracking-tight font-editorial">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                      {p.demoUrl && (
                        <a
                          href={p.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-stone-900 hover:underline flex items-center gap-1"
                        >
                          <span>Live Demo</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {p.githubUrl && (
                        <a
                          href={p.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-600 hover:text-stone-900 flex items-center gap-1"
                        >
                          <span>Source</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {p.problem && (
                    <p className="text-xs text-stone-500">
                      <span className="font-semibold text-stone-700">Problem:</span> {p.problem}
                    </p>
                  )}

                  <p className="text-sm text-stone-700 leading-relaxed font-light">
                    {p.description}
                  </p>

                  {p.outcome && (
                    <p className="text-xs text-stone-600 bg-stone-100/70 p-2.5 rounded-lg">
                      <span className="font-semibold text-stone-800">Outcome:</span> {p.outcome}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(p.technologies || []).map((t, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-stone-200/60 text-stone-700 font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Skills */}
          {skills.length > 0 && (
            <section className="space-y-4 pt-4 border-t border-stone-200">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Skills & Technologies
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3 py-1 rounded-full border border-stone-300 text-stone-800 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // 2. DEVELOPER TEMPLATE (Dark-accent / Terminal-inspired)
  if (template === "developer") {
    return (
      <div className="bg-[#0D1117] text-[#C9D1D9] min-h-screen p-6 sm:p-12 font-mono selection:bg-[#1F6FEB] selection:text-white">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Terminal Banner */}
          <header className="rounded-2xl bg-[#161B22] border border-[#30363D] p-6 sm:p-8 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-3 border-b border-[#30363D]">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
              <span className="text-xs text-[#8B949E] ml-2">portfolio ~ candidate@jobplanner</span>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-[#58A6FF]">$ whoami</div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {profile.fullName}
              </h1>
              <p className="text-sm text-[#8B949E]">
                &gt; {profile.headline || profile.targetRole || "Software Engineer"}
              </p>
              {profile.about && (
                <p className="text-xs text-[#8B949E] leading-relaxed max-w-2xl font-sans pt-1">
                  {profile.about}
                </p>
              )}
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              {profile.contact.github && (
                <a
                  href={profile.contact.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-white border border-[#30363D] flex items-center gap-1.5 transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
              )}
              {profile.contact.email && (
                <a
                  href={`mailto:${profile.contact.email}`}
                  className="px-3 py-1.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-white border border-[#30363D] flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </a>
              )}
              {profile.contact.linkedin && (
                <a
                  href={profile.contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-white border border-[#30363D] flex items-center gap-1.5 transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          </header>

          {/* Projects */}
          <section className="space-y-4">
            <div className="text-xs text-[#58A6FF] flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <span>ls -la ./featured-projects/</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedProjects.map((p) => (
                <article
                  key={p.projectId}
                  className="rounded-xl bg-[#161B22] border border-[#30363D] p-5 space-y-3 hover:border-[#58A6FF] transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white truncate">{p.name}</h3>
                      {p.featured && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1F6FEB]/20 text-[#58A6FF] border border-[#1F6FEB]/40">
                          featured
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#8B949E] leading-relaxed font-sans line-clamp-3">
                      {p.description}
                    </p>

                    {p.problem && (
                      <p className="text-[11px] text-[#8B949E]">
                        <span className="text-[#E6EDF3]">Problem:</span> {p.problem}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 pt-1">
                      {(p.technologies || []).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#21262D] text-[#58A6FF] border border-[#30363D]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#30363D] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {p.demoUrl && (
                        <a
                          href={p.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2EA043] hover:underline flex items-center gap-1"
                        >
                          <span>deploy</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                      {p.githubUrl && (
                        <a
                          href={p.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8B949E] hover:text-white flex items-center gap-1"
                        >
                          <span>repo</span>
                          <Github className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Verified Skills Stack */}
          {skills.length > 0 && (
            <section className="rounded-xl bg-[#161B22] border border-[#30363D] p-5 space-y-3">
              <div className="text-xs text-[#58A6FF] flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                <span>cat ./skills-manifest.json</span>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                {skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-[#21262D] text-[#C9D1D9] border border-[#30363D]"
                  >
                    "{s}"
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // 3. PROFESSIONAL TEMPLATE (Executive / Corporate)
  if (template === "professional") {
    return (
      <div className="bg-[#F8FAFC] text-slate-800 min-h-screen p-6 sm:p-12 font-sans selection:bg-slate-200">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Header Card */}
          <header className="rounded-2xl bg-white border border-slate-200 p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-editorial">
                  {profile.fullName}
                </h1>
                <p className="text-base text-blue-700 font-semibold mt-1">
                  {profile.headline || profile.targetRole || "Software Engineering Professional"}
                </p>
              </div>

              {/* Contact Icons */}
              <div className="flex items-center gap-2">
                {profile.contact.email && (
                  <a
                    href={`mailto:${profile.contact.email}`}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50 transition-colors"
                    title="Send Email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
                {profile.contact.linkedin && (
                  <a
                    href={profile.contact.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50 transition-colors"
                    title="LinkedIn Profile"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {profile.contact.github && (
                  <a
                    href={profile.contact.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50 transition-colors"
                    title="GitHub Repositories"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {profile.about && (
              <p className="text-sm text-slate-600 leading-relaxed max-w-3xl pt-2 border-t border-slate-100">
                {profile.about}
              </p>
            )}

            {profile.education?.college && (
              <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                <span>
                  {profile.education.degree ? `${profile.education.degree} — ` : ""}
                  {profile.education.college}
                  {profile.education.graduationYear ? ` (Graduating ${profile.education.graduationYear})` : ""}
                </span>
              </div>
            )}
          </header>

          {/* Project Portfolio */}
          <section className="space-y-5">
            <h2 className="text-base font-bold text-slate-900 font-editorial border-b border-slate-200 pb-2">
              Engineering Projects & Systems
            </h2>

            <div className="space-y-4">
              {sortedProjects.map((p) => (
                <article
                  key={p.projectId}
                  className="rounded-xl bg-white border border-slate-200 p-6 space-y-3 shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                      {p.featured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          FEATURED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {p.demoUrl && (
                        <a
                          href={p.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-blue-700 hover:underline flex items-center gap-1"
                        >
                          <span>Live Deployment</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {p.githubUrl && (
                        <a
                          href={p.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>Code Repository</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {p.problem && (
                    <div className="text-xs text-slate-600">
                      <span className="font-bold text-slate-800">Problem Statement: </span>
                      {p.problem}
                    </div>
                  )}

                  <p className="text-sm text-slate-700 leading-relaxed">{p.description}</p>

                  {p.outcome && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700">
                      <span className="font-bold text-slate-900">Quantified Impact / Outcome: </span>
                      {p.outcome}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {(p.technologies || []).map((t, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Competencies */}
          {skills.length > 0 && (
            <section className="rounded-xl bg-white border border-slate-200 p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Technical Competencies
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // 4. MODERN TEMPLATE (Default: JobPlanner Signature Terracotta & Stone Bento)
  return (
    <div className="bg-[#FAF8F5] text-stone-900 min-h-screen p-6 sm:p-12 font-sans selection:bg-[#F2D7CC] selection:text-[#7A2C10]">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Bento Hero Header */}
        <header className="rounded-3xl bg-[#FFFFFF] border border-[#E7E2DA] p-6 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF3EC] text-[#8C4A2F] text-xs font-semibold border border-[#F3DACF]">
                <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>{profile.targetRole || "Software Engineer"} Candidate</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold font-editorial text-stone-900 tracking-tight">
                {profile.fullName}
              </h1>

              <p className="text-base sm:text-lg text-stone-600 font-medium leading-snug">
                {profile.headline || "Engineering high-reliability web applications & software solutions."}
              </p>

              {profile.about && (
                <p className="text-sm text-stone-600 leading-relaxed pt-1">
                  {profile.about}
                </p>
              )}

              {/* Contact Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-3">
                {profile.contact.email && (
                  <a
                    href={`mailto:${profile.contact.email}`}
                    className="px-3.5 py-1.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Get in Touch</span>
                  </a>
                )}
                {profile.contact.github && (
                  <a
                    href={profile.contact.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4EFE7] border border-[#D9D3C8] text-stone-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Github className="w-3.5 h-3.5 text-stone-700" />
                    <span>GitHub Profile</span>
                  </a>
                )}
                {profile.contact.linkedin && (
                  <a
                    href={profile.contact.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4EFE7] border border-[#D9D3C8] text-stone-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-stone-700" />
                    <span>LinkedIn</span>
                  </a>
                )}
              </div>
            </div>

            {/* Avatar / Initials Stamp */}
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-[#E7E2DA] object-cover shadow-xs shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#FBEFE9] text-[#C85A32] border border-[#F3DACF] flex items-center justify-center font-editorial font-bold text-3xl shrink-0">
                {profile.fullName[0]?.toUpperCase() || "C"}
              </div>
            )}
          </div>
        </header>

        {/* Featured Projects Showcase */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-editorial text-stone-900 tracking-tight">
                Featured Projects & Architecture
              </h2>
              <p className="text-xs text-stone-500">
                End-to-end systems built with clean code, verified repositories, and live demos.
              </p>
            </div>
            <span className="text-xs font-semibold text-stone-400">
              {sortedProjects.length} Projects
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {sortedProjects.map((p) => (
              <article
                key={p.projectId}
                className="rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] p-6 sm:p-7 shadow-xs hover:border-[#D9D3C8] transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-stone-900 font-editorial">
                        {p.name}
                      </h3>
                      {p.featured && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FBEFE9] text-[#A64522] border border-[#F3DACF]">
                          Featured
                        </span>
                      )}
                      {p.role && (
                        <span className="text-xs text-stone-400 font-medium">
                          • {p.role}
                        </span>
                      )}
                    </div>

                    {p.problem && (
                      <p className="text-xs text-stone-600 mt-1">
                        <span className="font-semibold text-stone-800">Problem Solved: </span>
                        {p.problem}
                      </p>
                    )}
                  </div>

                  {/* Links */}
                  <div className="flex items-center gap-2 shrink-0">
                    {p.demoUrl && (
                      <a
                        href={p.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <span>Live Demo</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {p.githubUrl && (
                      <a
                        href={p.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F4EFE7] border border-[#D9D3C8] text-stone-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Github className="w-3.5 h-3.5 text-stone-600" />
                        <span>Code</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Screenshots if available */}
                {p.imageUrls && p.imageUrls.length > 0 && (
                  <div className="rounded-xl overflow-hidden border border-[#E7E2DA] max-h-64 bg-stone-100">
                    <img
                      src={p.imageUrls[0]}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  {p.description}
                </p>

                {p.challenges && (
                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs text-stone-700 leading-relaxed">
                    <span className="font-bold text-stone-900">Key Engineering Challenge: </span>
                    {p.challenges}
                  </div>
                )}

                {p.outcome && (
                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs text-stone-700 leading-relaxed">
                    <span className="font-bold text-stone-900">Outcome & Impact: </span>
                    {p.outcome}
                  </div>
                )}

                {/* Technologies */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {(p.technologies || []).map((t, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] text-stone-700 font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Skills Bento Block */}
        {skills.length > 0 && (
          <section className="rounded-3xl bg-[#FFFFFF] border border-[#E7E2DA] p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold font-editorial text-stone-900">
              Technical Stack & Domain Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-stone-800 text-xs font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Public GitHub Highlights if available */}
        {githubHighlights.length > 0 && (
          <section className="rounded-3xl bg-[#FFFFFF] border border-[#E7E2DA] p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-editorial text-stone-900 flex items-center gap-2">
                <Github className="w-5 h-5 text-stone-800" />
                <span>Verified Public Repositories</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {githubHighlights.map((gh) => (
                <a
                  key={gh.name}
                  href={gh.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl border border-[#EDE8E0] bg-[#FAF8F5] hover:border-[#D9D3C8] hover:bg-white transition-all space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-900 group-hover:text-[#C85A32]">
                      {gh.name}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#C85A32]" />
                  </div>
                  {gh.description && (
                    <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                      {gh.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-400">
                    {gh.language && <span>{gh.language}</span>}
                    {gh.stars > 0 && <span>★ {gh.stars}</span>}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-stone-400 py-6 border-t border-[#E7E2DA]">
          Built with JobPlanner Portfolio Builder • Verified Profile
        </footer>
      </div>
    </div>
  );
};
