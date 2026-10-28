import {
  UserProfile,
  ResumeData,
  PortfolioProject,
  GitHubAnalysis,
  PortfolioReadinessBreakdown,
  PortfolioSettings,
  PublicPortfolioData,
} from "../types";

/**
 * Calculates authentic portfolio readiness score and diagnostic checklist.
 * Never invents scores if critical baseline data is completely absent.
 */
export function calculatePortfolioReadiness(
  profile: UserProfile,
  projects: PortfolioProject[],
  github: GitHubAnalysis | null,
  resume: ResumeData | null,
  settings: PortfolioSettings | null
): PortfolioReadinessBreakdown {
  const checklist: Array<{ item: string; completed: boolean; impact: string }> = [];

  // 1. Profile section (max 15)
  let profileScore = 0;
  const candidateName = (profile.full_name || profile.name || "").trim();
  const hasName = Boolean(candidateName);
  const hasTargetRole = Boolean(profile.target_role && profile.target_role.trim());
  const candidateBio = profile.bio || settings?.about || "";
  const hasBio = Boolean(candidateBio && candidateBio.trim().length > 20);
  const hasContact = Boolean(profile.email) || Boolean(profile.linkedin_url) || Boolean(profile.github_url);

  if (hasName) profileScore += 4;
  if (hasTargetRole) profileScore += 4;
  if (hasBio) profileScore += 4;
  if (hasContact) profileScore += 3;

  checklist.push({
    item: "Complete candidate bio and target role",
    completed: hasName && hasTargetRole && hasBio,
    impact: "High",
  });

  // 2. Skills section (max 15)
  let skillsScore = 0;
  const skillCount = Array.isArray(profile.skills) ? profile.skills.length : 0;
  if (skillCount >= 1) skillsScore += 5;
  if (skillCount >= 4) skillsScore += 5;
  if (skillCount >= 7) skillsScore += 5;

  checklist.push({
    item: "List at least 4 verified technical skills",
    completed: skillCount >= 4,
    impact: "High",
  });

  // 3. Projects section (max 30)
  let projectsScore = 0;
  const projectCount = projects.length;
  const hasLiveDemo = projects.some((p) => Boolean(p.demoUrl && p.demoUrl.trim()));
  const hasGithubLink = projects.some((p) => Boolean(p.githubUrl && p.githubUrl.trim()));
  const hasDetailedProblem = projects.some((p) => Boolean(p.problem && p.problem.trim().length > 15));

  if (projectCount >= 1) projectsScore += 10;
  if (projectCount >= 2) projectsScore += 8;
  if (hasLiveDemo) projectsScore += 5;
  if (hasGithubLink) projectsScore += 4;
  if (hasDetailedProblem) projectsScore += 3;

  checklist.push({
    item: "Showcase at least 2 distinct technical projects",
    completed: projectCount >= 2,
    impact: "Critical",
  });
  checklist.push({
    item: "Provide live demo or deployment URL for at least 1 project",
    completed: hasLiveDemo,
    impact: "High",
  });
  checklist.push({
    item: "Link source code repository on GitHub",
    completed: hasGithubLink,
    impact: "High",
  });

  // 4. GitHub Presence (max 15)
  let githubScore = 0;
  const isGithubConnected = Boolean(github && github.username);
  const repoCount = github?.repositories ? github.repositories.length : 0;
  const hasRepoWithReadme = github?.repositories ? github.repositories.some((r) => r.stars > 0 || r.description) : false;

  if (isGithubConnected) githubScore += 5;
  if (repoCount >= 2) githubScore += 5;
  if (hasRepoWithReadme) githubScore += 5;

  checklist.push({
    item: "Connect authentic public GitHub profile",
    completed: isGithubConnected,
    impact: "High",
  });
  checklist.push({
    item: "Maintain active repositories with descriptions and documentation",
    completed: repoCount >= 2 && hasRepoWithReadme,
    impact: "Medium",
  });

  // 5. Resume Alignment (max 15)
  let resumeScore = 0;
  const hasResume = Boolean(resume && (resume.skills?.length || resume.projects?.length));
  const hasProjectBullets = Boolean(
    resume?.projects &&
      resume.projects.some(
        (p: any) => (Array.isArray(p.points) && p.points.length > 0) || Boolean(p.description)
      )
  );

  if (hasResume) resumeScore += 8;
  if (hasProjectBullets) resumeScore += 7;

  checklist.push({
    item: "Align portfolio projects with Resume Builder entries",
    completed: hasResume && hasProjectBullets,
    impact: "High",
  });

  // 6. Presentation & Polish (max 10)
  let presentationScore = 0;
  const hasHeadline = Boolean(settings?.headline && settings.headline.trim().length > 10);
  const hasFeatured = Boolean(settings?.featuredProjectIds && settings.featuredProjectIds.length > 0) || projects.some((p) => p.featured);
  const isPublished = Boolean(settings?.isPublic);

  if (hasHeadline) presentationScore += 4;
  if (hasFeatured) presentationScore += 3;
  if (isPublished) presentationScore += 3;

  checklist.push({
    item: "Select featured projects and customize presentation template",
    completed: hasHeadline && hasFeatured,
    impact: "Medium",
  });
  checklist.push({
    item: "Publish public portfolio link for recruiters",
    completed: isPublished,
    impact: "Medium",
  });

  const totalScore = profileScore + skillsScore + projectsScore + githubScore + resumeScore + presentationScore;

  const categories = {
    profile: {
      score: profileScore,
      label: `${profileScore} / 15`,
      details: hasBio ? "Bio and target role specified" : "Incomplete bio or role context",
    },
    skills: {
      score: skillsScore,
      label: `${skillsScore} / 15`,
      details: `${skillCount} skills listed`,
    },
    projects: {
      score: projectsScore,
      label: `${projectsScore} / 30`,
      details: `${projectCount} projects added (${hasLiveDemo ? "Live demo present" : "No live demo"})`,
    },
    github: {
      score: githubScore,
      label: `${githubScore} / 15`,
      details: isGithubConnected ? `@${github?.username} (${repoCount} repos)` : "GitHub profile not connected",
    },
    resume: {
      score: resumeScore,
      label: `${resumeScore} / 15`,
      details: hasResume ? "Aligned with career resume" : "Resume not yet synced",
    },
    presentation: {
      score: presentationScore,
      label: `${presentationScore} / 10`,
      details: isPublished ? "Public link active" : "Draft status",
    },
  };

  let summary = "Add projects and connect your GitHub profile to measure portfolio readiness.";
  if (totalScore >= 80) {
    summary = "Recruiter-ready portfolio showcasing live demos, verified GitHub repositories, and clear problem narratives.";
  } else if (totalScore >= 50) {
    summary = "Solid foundation. Adding live project demo links and deeper technical challenge descriptions will significantly increase recruiter interest.";
  } else if (totalScore >= 25) {
    summary = "Portfolio in development. Connect your public GitHub and add 2 detailed technical projects with problem statements.";
  }

  return {
    overallScore: totalScore,
    isCalculable: true,
    categories,
    completedChecklist: checklist,
    summary,
  };
}

/**
 * Builds public-ready sanitized portfolio data
 */
export function buildPublicPortfolioData(
  userId: string,
  publicId: string,
  profile: UserProfile,
  settings: PortfolioSettings,
  projects: PortfolioProject[],
  github: GitHubAnalysis | null
): PublicPortfolioData {
  return {
    publicId,
    userId,
    profile: {
      fullName: profile.full_name || profile.name || "Candidate",
      headline: settings.headline || `${profile.target_role || "Software Engineer"} Candidate`,
      about: settings.about || profile.bio || "",
      targetRole: profile.target_role || "Software Engineer",
      avatarUrl: profile.avatar_url || profile.profile_image_url || github?.avatarUrl,
      education: {
        college: profile.college || profile.education?.college,
        degree: profile.degree || profile.education?.degree,
        branch: profile.branch || profile.education?.branch,
        graduationYear: profile.graduation_year
          ? String(profile.graduation_year)
          : profile.education?.graduation_year
          ? String(profile.education.graduation_year)
          : undefined,
      },
      contact: {
        email: profile.email,
        linkedin: profile.linkedin_url,
        github: profile.github_url || (github ? github.profileUrl : undefined),
        website: profile.portfolio_url,
      },
    },
    settings,
    projects: projects.filter((p) => p.name && p.name.trim()),
    skills: profile.skills || [],
    githubHighlights: github?.repositories
      ? github.repositories.filter((r) => !r.isFork && (r.stars > 0 || r.description)).slice(0, 6)
      : [],
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Generates standalone downloadable HTML file for candidate portfolio
 */
export function generateStandalonePortfolioHtml(data: PublicPortfolioData): string {
  const { profile, projects, skills, settings } = data;
  const accent = settings.template === "minimal" ? "#292524" : settings.template === "developer" ? "#0F172A" : "#C85A32";

  const projectCardsHtml = projects
    .map(
      (p) => `
    <article style="background:#ffffff;border:1px solid #e7e2da;border-radius:14px;padding:24px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <h3 style="margin:0;font-size:20px;color:#1c1917;">${escapeHtml(p.name)}</h3>
        ${p.featured ? '<span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;">FEATURED</span>' : ''}
      </div>
      ${p.problem ? `<p style="margin:8px 0 4px;font-size:13px;color:#78716c;font-weight:600;">Problem: <span style="font-weight:400;color:#44403c;">${escapeHtml(p.problem)}</span></p>` : ''}
      <p style="margin:8px 0;font-size:14px;color:#44403c;line-height:1.6;">${escapeHtml(p.description || '')}</p>
      ${p.challenges ? `<p style="margin:8px 0 4px;font-size:13px;color:#78716c;font-weight:600;">Key Challenge: <span style="font-weight:400;color:#44403c;">${escapeHtml(p.challenges)}</span></p>` : ''}
      ${p.outcome ? `<p style="margin:8px 0 4px;font-size:13px;color:#78716c;font-weight:600;">Outcome: <span style="font-weight:400;color:#44403c;">${escapeHtml(p.outcome)}</span></p>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 16px;">
        ${(p.technologies || []).map((t) => `<span style="background:#f5f2eb;color:#44403c;font-size:12px;padding:3px 10px;border-radius:6px;">${escapeHtml(t)}</span>`).join('')}
      </div>
      <div style="display:flex;gap:12px;font-size:13px;">
        ${p.demoUrl ? `<a href="${escapeHtml(p.demoUrl)}" target="_blank" rel="noopener noreferrer" style="color:${accent};font-weight:600;text-decoration:none;">↗ Live Demo</a>` : ''}
        ${p.githubUrl ? `<a href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener noreferrer" style="color:#44403c;font-weight:600;text-decoration:none;">GitHub Repo</a>` : ''}
      </div>
    </article>`
    )
    .join('\n');

  const skillsHtml = skills
    .map((s) => `<span style="background:#ffffff;border:1px solid #e7e2da;color:#292524;padding:6px 14px;border-radius:8px;font-size:13px;font-weight:500;">${escapeHtml(s)}</span>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(profile.fullName)} — Portfolio</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf8f5; color: #1c1917; line-height: 1.5; padding: 40px 20px; }
    .container { max-width: 860px; margin: 0 auto; }
    header { border-bottom: 1px solid #e7e2da; padding-bottom: 32px; margin-bottom: 36px; }
    h1 { font-size: 32px; margin: 0 0 8px; color: #1c1917; }
    .headline { font-size: 18px; color: ${accent}; font-weight: 600; margin: 0 0 12px; }
    .bio { font-size: 15px; color: #57534e; max-width: 680px; margin: 0 0 18px; line-height: 1.6; }
    .links a { color: #57534e; text-decoration: none; margin-right: 16px; font-size: 13px; font-weight: 500; }
    .links a:hover { color: ${accent}; }
    section { margin-bottom: 40px; }
    h2 { font-size: 20px; margin: 0 0 20px; border-bottom: 2px solid ${accent}; display: inline-block; padding-bottom: 4px; }
    .skills-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    footer { text-align: center; font-size: 12px; color: #a8a29e; border-top: 1px solid #e7e2da; padding-top: 24px; margin-top: 60px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(profile.fullName)}</h1>
      <div class="headline">${escapeHtml(profile.headline || profile.targetRole || 'Software Engineer')}</div>
      ${profile.about ? `<p class="bio">${escapeHtml(profile.about)}</p>` : ''}
      <div class="links">
        ${profile.contact.email ? `<a href="mailto:${escapeHtml(profile.contact.email)}">✉ Email</a>` : ''}
        ${profile.contact.github ? `<a href="${escapeHtml(profile.contact.github)}" target="_blank" rel="noopener">GitHub</a>` : ''}
        ${profile.contact.linkedin ? `<a href="${escapeHtml(profile.contact.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ''}
        ${profile.education?.college ? `<span>🎓 ${escapeHtml(profile.education.college)}</span>` : ''}
      </div>
    </header>

    <section>
      <h2>Featured Projects</h2>
      ${projectCardsHtml || '<p style="color:#78716c;">No projects listed yet.</p>'}
    </section>

    <section>
      <h2>Core Skills & Technologies</h2>
      <div class="skills-grid">
        ${skillsHtml || '<p style="color:#78716c;">No skills listed yet.</p>'}
      </div>
    </section>

    <footer>
      Created with JobPlanner — For Students & Freshers
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
