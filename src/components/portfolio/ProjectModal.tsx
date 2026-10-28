import React, { useState } from "react";
import {
  X,
  Upload,
  Sparkles,
  Link,
  Github,
  Check,
  AlertCircle,
  FolderGit2,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { PortfolioProject } from "../../types";
import { uploadPortfolioProjectImage } from "../../lib/firebase";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: PortfolioProject) => Promise<void>;
  projectToEdit?: PortfolioProject | null;
  userId: string;
  targetRole?: string;
  candidateSkills?: string[];
  onTriggerAIAnalysis?: (project: PortfolioProject) => Promise<void>;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projectToEdit,
  userId,
  targetRole,
  candidateSkills = [],
  onTriggerAIAnalysis,
}) => {
  const [name, setName] = useState(projectToEdit?.name || "");
  const [description, setDescription] = useState(projectToEdit?.description || "");
  const [problem, setProblem] = useState(projectToEdit?.problem || "");
  const [technologiesText, setTechnologiesText] = useState(
    (projectToEdit?.technologies || []).join(", ")
  );
  const [role, setRole] = useState(projectToEdit?.role || "Sole Developer");
  const [featuresText, setFeaturesText] = useState(
    (projectToEdit?.features || []).join("\n")
  );
  const [challenges, setChallenges] = useState(projectToEdit?.challenges || "");
  const [outcome, setOutcome] = useState(projectToEdit?.outcome || "");
  const [githubUrl, setGithubUrl] = useState(projectToEdit?.githubUrl || "");
  const [demoUrl, setDemoUrl] = useState(projectToEdit?.demoUrl || "");
  const [featured, setFeatured] = useState(Boolean(projectToEdit?.featured));
  const [startDate, setStartDate] = useState(projectToEdit?.startDate || "");
  const [endDate, setEndDate] = useState(projectToEdit?.endDate || "Present");
  const [imageUrls, setImageUrls] = useState<string[]>(projectToEdit?.imageUrls || []);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if projectToEdit changes
  React.useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name || "");
      setDescription(projectToEdit.description || "");
      setProblem(projectToEdit.problem || "");
      setTechnologiesText((projectToEdit.technologies || []).join(", "));
      setRole(projectToEdit.role || "Sole Developer");
      setFeaturesText((projectToEdit.features || []).join("\n"));
      setChallenges(projectToEdit.challenges || "");
      setOutcome(projectToEdit.outcome || "");
      setGithubUrl(projectToEdit.githubUrl || "");
      setDemoUrl(projectToEdit.demoUrl || "");
      setFeatured(Boolean(projectToEdit.featured));
      setStartDate(projectToEdit.startDate || "");
      setEndDate(projectToEdit.endDate || "Present");
      setImageUrls(projectToEdit.imageUrls || []);
    } else {
      setName("");
      setDescription("");
      setProblem("");
      setTechnologiesText("");
      setRole("Sole Developer");
      setFeaturesText("");
      setChallenges("");
      setOutcome("");
      setGithubUrl("");
      setDemoUrl("");
      setFeatured(false);
      setStartDate("");
      setEndDate("Present");
      setImageUrls([]);
    }
    setError(null);
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      setError("Image file size must be less than 4MB.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const projectId = projectToEdit?.projectId || `proj_${Date.now()}`;
      const downloadUrl = await uploadPortfolioProjectImage(userId || "guest", projectId, file);
      setImageUrls((prev) => [...prev, downloadUrl]);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError("Could not upload screenshot. Please try again or use a URL.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a project name.");
      return;
    }

    const techArray = technologiesText
      .split(/[,;\n]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const featureArray = featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    const projectId = projectToEdit?.projectId || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const projectData: PortfolioProject = {
      projectId,
      userId: userId || "guest",
      name: name.trim(),
      description: description.trim(),
      problem: problem.trim(),
      technologies: techArray,
      role: role.trim(),
      features: featureArray,
      challenges: challenges.trim(),
      outcome: outcome.trim(),
      githubUrl: githubUrl.trim(),
      demoUrl: demoUrl.trim(),
      imageUrls,
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      featured,
      displayOrder: projectToEdit?.displayOrder ?? 0,
      skills: techArray,
      targetRoles: targetRole ? [targetRole] : [],
      createdAt: projectToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiAnalysis: projectToEdit?.aiAnalysis,
    };

    try {
      setIsSaving(true);
      await onSave(projectData);
      onClose();
    } catch (err: any) {
      setError("Failed to save project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInlineAIAnalyze = async () => {
    if (!name.trim()) {
      setError("Please enter at least a project name and description first.");
      return;
    }

    const techArray = technologiesText
      .split(/[,;\n]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const currentProjectDraft: PortfolioProject = {
      projectId: projectToEdit?.projectId || `proj_${Date.now()}`,
      userId: userId || "guest",
      name: name.trim(),
      description: description.trim(),
      problem: problem.trim(),
      technologies: techArray,
      role: role.trim(),
      features: featuresText.split("\n").filter(Boolean),
      challenges: challenges.trim(),
      outcome: outcome.trim(),
      githubUrl: githubUrl.trim(),
      demoUrl: demoUrl.trim(),
      imageUrls,
      startDate,
      endDate,
      featured,
      displayOrder: 0,
      skills: techArray,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onTriggerAIAnalysis) {
      try {
        setIsAnalyzing(true);
        await onTriggerAIAnalysis(currentProjectDraft);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#FFFFFF] border border-[#E7E2DA] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E7E2DA] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C85A32] text-white flex items-center justify-center">
              <FolderGit2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 font-editorial">
                {projectToEdit ? "Edit Portfolio Project" : "Add Portfolio Project"}
              </h2>
              <p className="text-xs text-stone-500">
                Ground your project in real engineering challenges, architecture, and live links.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Name & Featured Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Distributed Task Scheduler & Realtime Dashboard"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-stone-900 text-sm focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32]"
                required
              />
            </div>
            <div className="flex sm:items-end">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] w-full cursor-pointer hover:bg-[#F4EFE7] transition-colors">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded text-[#C85A32] focus:ring-[#C85A32] h-4 w-4"
                />
                <span className="text-xs font-semibold text-stone-800">
                  Feature on Portfolio Hero
                </span>
              </label>
            </div>
          </div>

          {/* Problem Statement */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Problem Solved / Motivation
              </label>
              <span className="text-[11px] text-stone-400">High impact for recruiters</span>
            </div>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={2}
              placeholder="What user or technical problem did this project address? Why did you build it?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-stone-900 text-sm focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32]"
            />
          </div>

          {/* Core Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Project Overview & Architecture
              </label>
              {onTriggerAIAnalysis && (
                <button
                  type="button"
                  onClick={handleInlineAIAnalyze}
                  disabled={isAnalyzing}
                  className="text-xs text-[#C85A32] hover:text-[#9A3E1E] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAnalyzing ? "Analyzing..." : "Optimize with AI"}</span>
                </button>
              )}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the overall system, architecture layers, API design, or user workflow..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-stone-900 text-sm focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32]"
            />
          </div>

          {/* Technologies & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Technologies Used (Comma-separated)
              </label>
              <input
                type="text"
                value={technologiesText}
                onChange={(e) => setTechnologiesText(e.target.value)}
                placeholder="React, TypeScript, Node.js, PostgreSQL, Tailwind"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-stone-900 text-sm focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32]"
              />
              {candidateSkills.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-[10px] text-stone-400">Quick add:</span>
                  {candidateSkills.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        if (!technologiesText.includes(s)) {
                          setTechnologiesText((prev) => (prev ? `${prev}, ${s}` : s));
                        }
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-[#FBEFE9] hover:text-[#C85A32]"
                    >
                      +{s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Your Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Sole Creator, Backend Lead, Frontend Engineer..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-stone-900 text-sm focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32]"
              />
            </div>
          </div>

          {/* URLs: GitHub & Live Demo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-stone-600" />
                <span>GitHub Repository URL</span>
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/project"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-stone-900 text-sm focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-stone-600" />
                <span>Live Demo / Production URL</span>
              </label>
              <input
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://myproject.vercel.app"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-stone-900 text-sm focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32]"
              />
            </div>
          </div>

          {/* Key Challenges & Measurable Outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Technical Obstacle / Key Challenge
              </label>
              <textarea
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                rows={2}
                placeholder="e.g. Preventing race conditions in asynchronous queues; Optimizing rendering time..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-stone-900 text-sm focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Outcome / Concrete Result
              </label>
              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                rows={2}
                placeholder="e.g. Deployed working prototype handling 50+ concurrent requests; Completed test suite with 85% coverage..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-stone-900 text-sm focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32]"
              />
            </div>
          </div>

          {/* Screenshots & Assets */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-stone-600" />
              <span>Project Screenshots / Demo Previews</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="relative group w-24 h-16 rounded-lg border border-[#E7E2DA] overflow-hidden bg-stone-100">
                  <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 rounded-md bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <label className="h-16 px-4 rounded-xl border-2 border-dashed border-[#D9D3C8] hover:border-[#C85A32] bg-[#FAF8F5] hover:bg-[#FDF6F2] flex items-center gap-2 text-xs font-medium text-stone-600 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-stone-400" />
                <span>{isUploading ? "Uploading..." : "Upload Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E7E2DA] bg-[#FAF8F5] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#D9D3C8] text-stone-700 text-xs font-semibold hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : projectToEdit ? "Save Changes" : "Create Project"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
