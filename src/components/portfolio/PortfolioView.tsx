import React, { useState, useEffect } from "react";
import {
  FolderGit2,
  Sparkles,
  Github,
  BarChart3,
  Globe,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  ArrowRight,
  FileText,
  MessageSquareCode,
  Milestone,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Star,
  Layers,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import {
  UserProfile,
  PortfolioProject,
  PortfolioSettings,
  GitHubAnalysis,
  GitHubRepoMetadata,
  PortfolioGapAnalysis,
  ResumeData,
  PublicPortfolioData,
} from "../../types";
import {
  getPortfolioProjects,
  savePortfolioProject,
  deletePortfolioProject,
  getPortfolioSettings,
  savePortfolioSettings,
  getGitHubAnalysis,
  saveGitHubAnalysis,
  savePublicPortfolio,
  deletePublicPortfolio,
} from "../../lib/firebase";
import {
  calculatePortfolioReadiness,
  buildPublicPortfolioData,
} from "../../lib/portfolioUtils";
import { ProjectModal } from "./ProjectModal";
import { ProjectAICard } from "./ProjectAICard";
import { GitHubAnalyzerCard } from "./GitHubAnalyzerCard";
import { PortfolioReadinessCard } from "./PortfolioReadinessCard";
import { PublicPortfolioModal } from "./PublicPortfolioModal";

interface PortfolioViewProps {
  userProfile: UserProfile;
  currentUser?: FirebaseUser | null;
  onOpenAuth?: () => void;
  resumeData?: ResumeData | null;
  onNavigateTab: (tab: string) => void;
  onUpdateResumeProjects?: (newProjects: any[]) => void;
  onAddRoadmapMilestone?: (milestone: any) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  userProfile,
  currentUser,
  onOpenAuth,
  resumeData = null,
  onNavigateTab,
  onUpdateResumeProjects,
  onAddRoadmapMilestone,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"readiness" | "projects" | "github" | "builder">("readiness");

  const effectiveUid = currentUser?.uid || userProfile.id || "guest";

  // State
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings>({
    userId: effectiveUid,
    template: "modern",
    isPublic: false,
    headline: `${userProfile.target_role || "Software Engineer"} Candidate`,
    about: userProfile.bio || "",
    featuredProjectIds: [],
    showGithubStats: true,
    showContactEmail: true,
    showResumeLink: true,
    updatedAt: new Date().toISOString(),
  });
  const [githubAnalysis, setGithubAnalysis] = useState<GitHubAnalysis | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<PortfolioGapAnalysis | null>(null);
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<PortfolioProject | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // AI Analysis for projects
  const [analyzingProjectId, setAnalyzingProjectId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [loadedProjects, loadedSettings, loadedGithub] = await Promise.all([
          getPortfolioProjects(effectiveUid),
          getPortfolioSettings(effectiveUid),
          getGitHubAnalysis(effectiveUid),
        ]);

        if (loadedProjects) setProjects(loadedProjects);
        if (loadedSettings) setSettings(loadedSettings);
        if (loadedGithub) setGithubAnalysis(loadedGithub);
      } catch (err) {
        console.error("Error loading portfolio data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [effectiveUid]);

  // Compute live readiness
  const readiness = calculatePortfolioReadiness(
    userProfile,
    projects,
    githubAnalysis,
    resumeData,
    settings
  );

  // Trigger Gap Analysis
  const handleTriggerGapAnalysis = async () => {
    try {
      setIsAnalyzingGaps(true);
      const resp = await fetch("/api/ai/portfolio/gaps-and-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projects,
          targetRole: userProfile.target_role || "Software Engineer",
          candidateSkills: userProfile.skills || [],
          githubStats: githubAnalysis
            ? {
                publicRepos: githubAnalysis.publicReposCount,
                languages: (githubAnalysis.analysisSummary?.topLanguages || []).map((l) => l.language),
              }
            : undefined,
        }),
      });

      const data = await resp.json();
      if (resp.ok) {
        setGapAnalysis(data);
      }
    } catch (err) {
      console.error("Gap analysis error:", err);
    } finally {
      setIsAnalyzingGaps(false);
    }
  };

  // Auto-run gap analysis on first load if we have target role and readiness is viewed
  useEffect(() => {
    if (!gapAnalysis && !isAnalyzingGaps && !isLoading) {
      handleTriggerGapAnalysis();
    }
  }, [projects.length, isLoading]);

  // Save Project Handler
  const handleSaveProject = async (project: PortfolioProject) => {
    const uid = effectiveUid;
    await savePortfolioProject(uid, project);
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.projectId === project.projectId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = project;
        return next;
      }
      return [...prev, project];
    });
    showToast(`Project "${project.name}" saved.`);
  };

  // Delete Project Handler
  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Are you sure you want to delete this project from your portfolio?")) return;
    const uid = effectiveUid;
    await deletePortfolioProject(uid, projectId);
    setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
    showToast("Project removed from portfolio.");
  };

  // Analyze single project with AI
  const handleAnalyzeProject = async (project: PortfolioProject) => {
    try {
      setAnalyzingProjectId(project.projectId);
      const resp = await fetch("/api/ai/portfolio/analyze-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          targetRole: userProfile.target_role || "Software Engineer",
          candidateSkills: userProfile.skills || [],
        }),
      });

      const data = await resp.json();
      if (!resp.ok || data.error) {
        throw new Error(data.error || "Failed to analyze project");
      }

      const updatedProject: PortfolioProject = {
        ...project,
        aiAnalysis: data,
        updatedAt: new Date().toISOString(),
      };

      await handleSaveProject(updatedProject);
      showToast(`AI insights generated for "${project.name}".`);
    } catch (err: any) {
      console.error("Project analysis error:", err);
      showToast("Error generating AI analysis: " + err.message);
    } finally {
      setAnalyzingProjectId(null);
    }
  };

  // Export bullets to Resume
  const handleExportBulletsToResume = (bullets: string[], projectName: string) => {
    if (onUpdateResumeProjects && resumeData) {
      const existing = resumeData.projects || [];
      const matchIdx = existing.findIndex(
        (p) => p.title.toLowerCase() === projectName.toLowerCase()
      );

      let nextProjects;
      if (matchIdx >= 0) {
        nextProjects = [...existing];
        nextProjects[matchIdx] = {
          ...nextProjects[matchIdx],
          bullets,
        };
      } else {
        nextProjects = [
          ...existing,
          {
            title: projectName,
            role: "Developer",
            organization: "",
            date: "Recent",
            description: bullets.join(". "),
            technologies: [],
            bullets,
          },
        ];
      }
      onUpdateResumeProjects(nextProjects);
      showToast(`Resume Builder updated with project bullets!`);
    } else {
      onNavigateTab("resume");
      showToast("Navigate to Resume Builder to paste your bullets.");
    }
  };

  // Import Repo as Project
  const handleImportRepoAsProject = (repo: GitHubRepoMetadata) => {
    const newProj: PortfolioProject = {
      projectId: `proj_gh_${Date.now()}`,
      userId: effectiveUid,
      name: repo.name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: repo.description || `Full-stack implementation in ${repo.language || "TypeScript"}.`,
      problem: `Engineered to deliver clean ${repo.language || "code"} architecture and reliable features.`,
      technologies: repo.language ? [repo.language, ...(repo.topics || [])] : repo.topics || [],
      role: "Sole Creator",
      features: ["Modular architecture", "Documented repository on GitHub"],
      challenges: "",
      outcome: repo.stars > 0 ? `Earned ${repo.stars} stars on GitHub.` : "Verified public codebase.",
      githubUrl: repo.htmlUrl,
      demoUrl: repo.homepage || "",
      featured: repo.stars > 0 || !projects.length,
      displayOrder: projects.length,
      skills: repo.language ? [repo.language] : [],
      targetRoles: userProfile.target_role ? [userProfile.target_role] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjectToEdit(newProj);
    setIsProjectModalOpen(true);
  };

  // Draft project from AI recommendation
  const handleDraftFromIdea = (recommendation: any) => {
    const draft: PortfolioProject = {
      projectId: `proj_idea_${Date.now()}`,
      userId: effectiveUid,
      name: recommendation.title,
      description: recommendation.problemToSolve,
      problem: recommendation.problemToSolve,
      technologies: recommendation.targetStack || [],
      role: "Lead Developer",
      features: [],
      challenges: "",
      outcome: `Planned for ${userProfile.target_role || "target role"} showcase.`,
      featured: true,
      displayOrder: projects.length,
      skills: recommendation.targetStack || [],
      targetRoles: userProfile.target_role ? [userProfile.target_role] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjectToEdit(draft);
    setIsProjectModalOpen(true);
  };

  // Add project recommendation to Roadmap
  const handleAddProjectToRoadmap = (recommendation: any) => {
    if (onAddRoadmapMilestone) {
      onAddRoadmapMilestone({
        title: `Build: ${recommendation.title}`,
        category: "Projects",
        description: `${recommendation.problemToSolve} (Stack: ${recommendation.targetStack?.join(", ")})`,
        deadline: "In 3 weeks",
        completed: false,
      });
      showToast(`"${recommendation.title}" added to your Career Roadmap!`);
    } else {
      onNavigateTab("roadmap");
    }
  };

  // Publish / Unpublish Portfolio
  const handlePublishToggle = async (isPublic: boolean) => {
    const uid = effectiveUid;
    const publicId = settings.slug || `p_${uid.substring(0, 12)}`;

    const updatedSettings: PortfolioSettings = {
      ...settings,
      isPublic,
      slug: publicId,
      publishedAt: isPublic ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    await savePortfolioSettings(uid, updatedSettings);
    setSettings(updatedSettings);

    if (isPublic) {
      const publicData = buildPublicPortfolioData(
        uid,
        publicId,
        userProfile,
        updatedSettings,
        projects,
        githubAnalysis
      );
      await savePublicPortfolio(publicId, publicData);
      showToast("Portfolio published live! Recruiter link is ready.");
    } else {
      await deletePublicPortfolio(publicId);
      showToast("Portfolio unpublished. Set to private draft.");
    }
  };

  const publicPortfolioData = buildPublicPortfolioData(
    effectiveUid,
    settings.slug || `p_${effectiveUid.substring(0, 12)}`,
    userProfile,
    settings,
    projects,
    githubAnalysis
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-stone-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 border border-stone-800 animate-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FolderGit2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FAF3EC] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
                AI Portfolio & GitHub
              </span>
              <span className="text-xs text-stone-500 font-medium">Recruiter-Ready Showcase</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
              Engineering Portfolio & GitHub Analyzer
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Showcase authentic technical projects with problem statements, live demos, and verified GitHub repositories. Measure portfolio readiness and optimize descriptions for hiring managers.
            </p>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-[#D9D3C8] text-stone-800 text-xs font-bold hover:bg-[#FAF8F5] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-stone-500" />
            <span>Preview & Publish</span>
          </button>
          <button
            onClick={() => {
              setProjectToEdit(null);
              setIsProjectModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E7E2DA] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("readiness")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "readiness"
              ? "bg-[#FAF3EC] text-[#C85A32] border border-[#F3DACF]"
              : "text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Readiness & Gaps</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/80 text-[10px] font-mono">
            {readiness.overallScore}%
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("projects")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "projects"
              ? "bg-[#FAF3EC] text-[#C85A32] border border-[#F3DACF]"
              : "text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]"
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>Project Catalog</span>
          <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-[10px] font-mono">
            {projects.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("github")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "github"
              ? "bg-[#FAF3EC] text-[#C85A32] border border-[#F3DACF]"
              : "text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]"
          }`}
        >
          <Github className="w-4 h-4" />
          <span>GitHub Analyzer</span>
          {githubAnalysis && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono">
              Connected
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("builder")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "builder"
              ? "bg-[#FAF3EC] text-[#C85A32] border border-[#F3DACF]"
              : "text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Showcase Settings</span>
          {settings.isPublic && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono">
              Live
            </span>
          )}
        </button>
      </div>

      {/* SUB-VIEW 1: Readiness & Gap Analysis */}
      {activeSubTab === "readiness" && (
        <PortfolioReadinessCard
          readiness={readiness}
          gapAnalysis={gapAnalysis}
          targetRole={userProfile.target_role || "Software Engineer"}
          onAddProjectToRoadmap={handleAddProjectToRoadmap}
          onDraftProjectFromIdea={handleDraftFromIdea}
          onNavigateToRoadmap={() => onNavigateTab("roadmap")}
          onRefreshGapAnalysis={handleTriggerGapAnalysis}
          isAnalyzingGaps={isAnalyzingGaps}
        />
      )}

      {/* SUB-VIEW 2: Projects Catalog & AI Optimization */}
      {activeSubTab === "projects" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900 font-editorial">
                Candidate Projects ({projects.length})
              </h3>
              <p className="text-xs text-stone-500">
                Detailed technical projects with architecture overviews, live demo links, and interview explanations.
              </p>
            </div>
            <button
              onClick={() => {
                setProjectToEdit(null);
                setIsProjectModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project</span>
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#D9D3C8] p-10 text-center bg-[#FAF8F5]">
              <div className="w-12 h-12 rounded-2xl bg-[#FBEFE9] text-[#C85A32] flex items-center justify-center mx-auto mb-3">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-stone-900">No Portfolio Projects Yet</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
                Add your technical projects to show proof of engineering ability. You can also connect GitHub to import repositories automatically.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setProjectToEdit(null);
                    setIsProjectModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#C85A32] text-white text-xs font-bold hover:bg-[#B24E2A] transition-colors"
                >
                  Create Project Manually
                </button>
                <button
                  onClick={() => setActiveSubTab("github")}
                  className="px-4 py-2 rounded-xl border border-[#D9D3C8] text-stone-700 text-xs font-bold hover:bg-[#FAF8F5] transition-colors"
                >
                  Import from GitHub
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.projectId}
                  className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-6 shadow-xs hover:border-[#D9D3C8] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-stone-900">{project.name}</h4>
                        {project.featured && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FBEFE9] text-[#A64522] border border-[#F3DACF]">
                            Featured
                          </span>
                        )}
                        {project.role && (
                          <span className="text-xs text-stone-400 font-medium">• {project.role}</span>
                        )}
                      </div>

                      {project.problem && (
                        <p className="text-xs text-stone-600">
                          <span className="font-semibold text-stone-800">Problem: </span>
                          {project.problem}
                        </p>
                      )}

                      <p className="text-xs sm:text-sm text-stone-700 leading-relaxed pt-1">
                        {project.description}
                      </p>

                      {/* Tech stack */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {(project.technologies || []).map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E7E2DA] text-stone-700 font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Live links */}
                      <div className="flex items-center gap-3 pt-2 text-xs">
                        {project.demoUrl && (
                          <a
                            href={project.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#C85A32] hover:underline font-semibold flex items-center gap-1"
                          >
                            <span>Live Demo</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {project.githubUrl && (
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1"
                          >
                            <Github className="w-3.5 h-3.5" />
                            <span>Repository</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <button
                        onClick={() => handleAnalyzeProject(project)}
                        disabled={analyzingProjectId === project.projectId}
                        className="px-3 py-1.5 rounded-lg border border-[#F3DACF] bg-[#FAF3EC] text-[#C85A32] text-xs font-semibold hover:bg-[#FBEFE9] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Generate resume bullets, interview questions, and narrative improvements"
                      >
                        {analyzingProjectId === project.projectId ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>{analyzingProjectId === project.projectId ? "Analyzing..." : "AI Optimize"}</span>
                      </button>

                      <button
                        onClick={() => {
                          setProjectToEdit(project);
                          setIsProjectModalOpen(true);
                        }}
                        className="p-2 rounded-lg border border-[#D9D3C8] text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5] transition-colors"
                        title="Edit project details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteProject(project.projectId)}
                        className="p-2 rounded-lg border border-[#D9D3C8] text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* AI Card if analyzed */}
                  {project.aiAnalysis && (
                    <ProjectAICard
                      project={project}
                      analysis={project.aiAnalysis}
                      onApplyImprovedDescription={(newDesc) => {
                        const updated = { ...project, description: newDesc };
                        handleSaveProject(updated);
                      }}
                      onExportBulletsToResume={(bullets) =>
                        handleExportBulletsToResume(bullets, project.name)
                      }
                      onNavigateToInterviewPrep={(name) => onNavigateTab("interview")}
                      onNavigateToRoadmap={() => onNavigateTab("roadmap")}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: GitHub Analyzer */}
      {activeSubTab === "github" && (
        <GitHubAnalyzerCard
          initialAnalysis={githubAnalysis}
          onSaveAnalysis={async (analysis) => {
            const uid = effectiveUid;
            await saveGitHubAnalysis(uid, analysis);
            setGithubAnalysis(analysis);
            showToast("GitHub profile analysis updated.");
          }}
          onImportRepoAsProject={handleImportRepoAsProject}
          existingProjectNames={projects.map((p) => p.name)}
        />
      )}

      {/* SUB-VIEW 4: Showcase & Publishing Settings */}
      {activeSubTab === "builder" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ECE6DC]">
              <div>
                <h3 className="text-base font-bold text-stone-900 font-editorial">
                  Public Showcase Settings & Theme
                </h3>
                <p className="text-xs text-stone-500">
                  Select your portfolio design template, customize candidate headline, and manage public link access.
                </p>
              </div>

              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Launch Live Preview</span>
              </button>
            </div>

            {/* Template Chooser */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Portfolio Presentation Template
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  {
                    id: "modern",
                    name: "Modern Bento",
                    desc: "Terracotta & warm stone accents, bento project layout.",
                  },
                  {
                    id: "minimal",
                    name: "Editorial Minimal",
                    desc: "High-contrast typography, generous negative space.",
                  },
                  {
                    id: "developer",
                    name: "Developer Dark",
                    desc: "Terminal aesthetic, monospaced tech tags, commit timeline.",
                  },
                  {
                    id: "professional",
                    name: "Executive Clean",
                    desc: "Structured corporate clarity, impact bullet points.",
                  },
                ].map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      const next = { ...settings, template: tmpl.id as any };
                      setSettings(next);
                      savePortfolioSettings(effectiveUid, next);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.template === tmpl.id
                        ? "border-[#C85A32] bg-[#FAF3EC] ring-1 ring-[#C85A32]"
                        : "border-[#E7E2DA] bg-[#FAF8F5] hover:bg-white"
                    }`}
                  >
                    <div className="text-xs font-bold text-stone-900">{tmpl.name}</div>
                    <div className="text-[11px] text-stone-500 mt-1 leading-relaxed">{tmpl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Headline and About Bio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Portfolio Headline
                </label>
                <input
                  type="text"
                  value={settings.headline || ""}
                  onChange={(e) => {
                    const next = { ...settings, headline: e.target.value };
                    setSettings(next);
                  }}
                  onBlur={() => savePortfolioSettings(effectiveUid, settings)}
                  placeholder="e.g. Full-Stack Engineer specializing in React & Distributed Systems"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-xs text-stone-900 focus:outline-hidden focus:border-[#C85A32]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Candidate Bio / About Intro
                </label>
                <textarea
                  value={settings.about || ""}
                  onChange={(e) => {
                    const next = { ...settings, about: e.target.value };
                    setSettings(next);
                  }}
                  onBlur={() => savePortfolioSettings(effectiveUid, settings)}
                  rows={2}
                  placeholder="Introduce your engineering focus, passion, and what problems you love solving..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-xs text-stone-900 focus:outline-hidden focus:border-[#C85A32]"
                />
              </div>
            </div>

            {/* Public Publishing Panel */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      settings.isPublic ? "bg-emerald-500" : "bg-stone-300"
                    }`}
                  />
                  <span className="text-xs font-bold text-stone-900">
                    {settings.isPublic ? "Public Portfolio Is Active" : "Public Portfolio Is Private"}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {settings.isPublic
                    ? "Recruiters and hiring managers can access your showcase via your unique link."
                    : "Only you can preview this portfolio until published."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePublishToggle(!settings.isPublic)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    settings.isPublic
                      ? "bg-stone-800 hover:bg-stone-900 text-white"
                      : "bg-[#C85A32] hover:bg-[#B24E2A] text-white"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{settings.isPublic ? "Set to Private" : "Publish Portfolio"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        onSave={handleSaveProject}
        projectToEdit={projectToEdit}
        userId={effectiveUid}
        targetRole={userProfile.target_role}
        candidateSkills={userProfile.skills || []}
        onTriggerAIAnalysis={handleAnalyzeProject}
      />

      {/* Live Preview Modal */}
      <PublicPortfolioModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        portfolioData={publicPortfolioData}
        settings={settings}
        onSaveSettings={async (newSettings) => {
          const uid = effectiveUid;
          await savePortfolioSettings(uid, newSettings);
          setSettings(newSettings);
        }}
        onPublishToggle={handlePublishToggle}
      />
    </div>
  );
};
