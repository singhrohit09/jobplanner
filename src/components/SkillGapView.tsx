import React, { useState, useEffect, useRef } from "react";
import {
  GitCompare,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  RefreshCw,
  FileText,
  Briefcase,
  Layers,
  Code2,
  FolderGit2,
  Milestone,
  BookOpen,
  TrendingUp,
  Award,
  Clock,
  ShieldCheck,
  ChevronDown,
  X,
  Lock,
  Upload,
  FileUp,
  ExternalLink,
  Check,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import confetti from "canvas-confetti";
import {
  UserProfile,
  SkillGapAnalysisResult,
  SkillGapItem,
  SkillPriority,
} from "../types";
import {
  FirestoreUserData,
  ResumeMetadata,
  getLatestSkillGapAnalysis,
  saveSkillGapAnalysis,
  uploadResumeFile,
  replaceResumeFile,
  validateResumeFile,
} from "../lib/firebase";
import { ROLE_BENCHMARKS } from "../lib/defaultData";

interface SkillGapViewProps {
  profile: UserProfile;
  currentUser?: FirebaseUser | null;
  firestoreUserData?: Partial<FirestoreUserData> | null;
  onAddSkill: (skillName: string) => void;
  onRemoveSkill: (skillName: string) => void;
  onNavigate: (tab: string) => void;
  onOpenAuth?: () => void;
  onUpdateResume?: (data: ResumeMetadata | null) => void;
}

export const SkillGapView: React.FC<SkillGapViewProps> = ({
  profile,
  currentUser,
  firestoreUserData,
  onAddSkill,
  onRemoveSkill,
  onNavigate,
  onOpenAuth,
  onUpdateResume,
}) => {
  // State
  const [analysis, setAnalysis] = useState<SkillGapAnalysisResult | null>(null);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isServiceBusy, setIsServiceBusy] = useState<boolean>(false);

  // Resume Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [localResumeBase64, setLocalResumeBase64] = useState<string | null>(null);
  const [localResumeMeta, setLocalResumeMeta] = useState<ResumeMetadata | null>(null);

  // Filters & Tabs
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    "all" | "strong" | "improve" | "missing" | "recommended"
  >("all");
  const [activeSection, setActiveSection] = useState<"skills" | "roadmap" | "projects">("skills");

  // Custom skill input
  const [newSkillInput, setNewSkillInput] = useState<string>("");
  const [isAddSkillOpen, setIsAddSkillOpen] = useState<boolean>(false);

  // Active target role (read directly from Firestore / profile)
  const targetRole =
    firestoreUserData?.targetRole || profile.target_role || "Software Engineer";

  // Resume details from Firestore or local state
  const activeResumeURL = localResumeMeta?.resumeURL || firestoreUserData?.resumeURL;
  const activeResumeFileName = localResumeMeta?.resumeFileName || firestoreUserData?.resumeFileName;
  const activeResumeFileType = localResumeMeta?.resumeFileType || firestoreUserData?.resumeFileType;
  const activeResumeFileSize = localResumeMeta?.resumeFileSize || firestoreUserData?.resumeFileSize;
  const activeResumeUploadedAt = localResumeMeta?.resumeUploadedAt || firestoreUserData?.resumeUploadedAt;
  const hasResume = Boolean(activeResumeURL || localResumeBase64);

  // Format file size helper
  const formatFileSize = (bytes?: number) => {
    if (!bytes || isNaN(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 1. Hydrate saved analysis from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSaved() {
      if (!currentUser) {
        setIsLoadingSaved(false);
        return;
      }
      try {
        setIsLoadingSaved(true);
        const saved = await getLatestSkillGapAnalysis(currentUser.uid);
        if (isMounted && saved) {
          setAnalysis(saved);
        }
      } catch (err: any) {
        console.warn("Notice loading saved skill gap analysis:", err?.message || err);
      } finally {
        if (isMounted) setIsLoadingSaved(false);
      }
    }

    loadSaved();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // 2. Deterministic Benchmark Fallback Generator (Rule-based, 100% resilient)
  const generateBenchmarkDiagnostic = (
    role: string,
    skillsList: string[],
    resumeName?: string
  ): SkillGapAnalysisResult => {
    const roleKey = Object.keys(ROLE_BENCHMARKS).find(
      (k) => role.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(role.toLowerCase())
    ) || Object.keys(ROLE_BENCHMARKS)[0];

    const benchmark = ROLE_BENCHMARKS[roleKey];
    const userSkillsLower = skillsList.map((s) => s.toLowerCase().trim());

    const strongSkills: SkillGapItem[] = [];
    const improvementSkills: SkillGapItem[] = [];
    const missingSkills: SkillGapItem[] = [];

    const coreSkillsList = benchmark.requiredSkills || [];

    coreSkillsList.forEach((core) => {
      const coreLower = core.toLowerCase();
      const matched = userSkillsLower.some(
        (us) => us.includes(coreLower) || coreLower.includes(us)
      );

      if (matched) {
        if (userSkillsLower.length < 4 || (profile.projects || []).length === 0) {
          improvementSkills.push({
            name: core,
            category: "Core Competency",
            currentLevel: "Beginner",
            requiredLevel: "Proficient",
            gapLevel: "Moderate",
            priority: "HIGH",
            reason: `Found in your profile, but needs deeper real-world project proof and advanced interview drills.`,
            recommendedAction: `Complete 5 practical exercises and showcase within a deployed capstone project.`,
          });
        } else {
          strongSkills.push({
            name: core,
            category: "Core Competency",
            currentLevel: "Proficient",
            requiredLevel: "Working Knowledge",
            gapLevel: "None",
            priority: "LOW",
            reason: `Clearly demonstrated in your profile and resume. Solid foundation established for ${role}.`,
            recommendedAction: `Highlight specific metrics and problem sets in your resume bullet points.`,
          });
        }
      } else {
        missingSkills.push({
          name: core,
          category: "Core Competency",
          currentLevel: "None",
          requiredLevel: "Proficient",
          gapLevel: "High",
          priority: "HIGH",
          reason: `Critical requirement for entry-level ${role} positions that is currently absent.`,
          recommendedAction: `Dedicate focused study time to understand core mechanics and complete a mini-project.`,
        });
      }
    });

    const recommendedSkills: SkillGapItem[] = (benchmark.recommendedSkills || []).map((rec) => ({
      name: rec,
      category: "Complementary",
      currentLevel: "None",
      requiredLevel: "Familiarity",
      gapLevel: "Low",
      priority: "MEDIUM",
      reason: `Valuable complementary skill that gives you a distinct competitive edge for ${role}.`,
      recommendedAction: "Review documentation and build a quick sample integration.",
    }));

    const total = coreSkillsList.length;
    const score = Math.min(
      95,
      Math.max(
        35,
        Math.round(
          (strongSkills.length / Math.max(total, 1)) * 60 +
            (improvementSkills.length / Math.max(total, 1)) * 20 +
            (resumeName ? 15 : 0) +
            Math.min(10, (profile.projects?.length || 0) * 5)
        )
      )
    );

    return {
      readinessScore: score,
      summary: `Industry benchmark evaluation for ${role}. You have verified foundational competence in ${
        strongSkills.map((s) => s.name).slice(0, 3).join(", ") || "software fundamentals"
      }, with highest-priority gaps in ${
        missingSkills.map((s) => s.name).slice(0, 2).join(" and ") || "specialized tooling"
      }.`,
      scoreExplanation: `Your readiness score is ${score}/100 based on matching ${strongSkills.length} out of ${total} core industry requirements for ${role}.${
        resumeName ? " Extra credit applied for verified resume documentation." : ""
      }`,
      strongSkills,
      improvementSkills,
      missingSkills,
      recommendedSkills,
      learningRoadmap: [
        {
          stage: 1,
          title: "Foundations & Core Syntax",
          description: "Solidify core language syntax, version control, and data manipulation.",
          skills: strongSkills.length > 0 ? strongSkills.slice(0, 2).map((s) => s.name) : ["Git", "Core Languages"],
        },
        {
          stage: 2,
          title: "Primary Frameworks & Tooling",
          description: "Build deep proficiency in the primary tools and libraries expected on the job.",
          skills: missingSkills.filter((m) => m.priority === "HIGH").slice(0, 3).map((m) => m.name),
        },
        {
          stage: 3,
          title: "Production Architecture & Databases",
          description: "Integrate database storage, containerization, and clean architectural patterns.",
          skills: missingSkills.slice(3, 6).map((m) => m.name),
        },
        {
          stage: 4,
          title: "Interview Readiness & Capstones",
          description: "Complete full-stack capstone projects and practice rigorous technical interview drills.",
          skills: ["System Design", "Behavioral STAR", "Mock Interviews"],
        },
      ],
      projectRecommendations: [
        {
          title: `Full-Stack ${role} Capstone System`,
          whatToBuild: `Design, implement, and deploy an end-to-end application solving a realistic domain challenge in ${role}, complete with automated tests and CI/CD.`,
          skillsDemonstrated: missingSkills.slice(0, 3).map((m) => m.name),
          whyItHelps: `Proves to hiring managers that you can build production-ready software independently.`,
        },
        {
          title: `Production API & Microservice Service`,
          whatToBuild: `Implement clean REST/GraphQL endpoints with database integration, unit testing, and Docker containerization.`,
          skillsDemonstrated: ["REST APIs", "Databases", "Docker"],
          whyItHelps: `Demonstrates backend engineering discipline and container readiness.`,
        },
      ],
      analyzedAt: new Date().toISOString(),
      targetRole: role,
    };
  };

  // 3. Trigger AI Analysis
  const handleRunAnalysis = async (
    overrideResumeMeta?: ResumeMetadata | null,
    overrideBase64?: string | null
  ) => {
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth();
      }
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setIsServiceBusy(false);

    const activeMeta = overrideResumeMeta !== undefined ? overrideResumeMeta : localResumeMeta;
    const activeB64 = overrideBase64 !== undefined ? overrideBase64 : localResumeBase64;

    const resumeInfoPayload = (activeMeta?.resumeURL || firestoreUserData?.resumeURL)
      ? {
          resumeURL: activeMeta?.resumeURL || firestoreUserData?.resumeURL,
          resumeFileName: activeMeta?.resumeFileName || firestoreUserData?.resumeFileName,
          resumeFileType: activeMeta?.resumeFileType || firestoreUserData?.resumeFileType,
          resumeFileSize: activeMeta?.resumeFileSize || firestoreUserData?.resumeFileSize,
        }
      : null;

    try {
      const payload: any = {
        targetRole,
        skills: firestoreUserData?.skills || profile.skills || [],
        experienceLevel:
          firestoreUserData?.experienceLevel ||
          profile.experience_level ||
          "Fresher / 0 Years",
        industry: firestoreUserData?.industry || "Technology",
        education: {
          college: firestoreUserData?.college || profile.education?.college || "",
          degree: firestoreUserData?.degree || profile.education?.degree || "",
          branch: firestoreUserData?.branch || profile.education?.branch || "",
          currentYear: firestoreUserData?.currentYear || "",
          graduationYear:
            firestoreUserData?.graduationYear ||
            profile.education?.graduation_year ||
            "",
          cgpa: firestoreUserData?.cgpa || profile.education?.cgpa || "",
        },
        projects: profile.projects || [],
        resumeInfo: resumeInfoPayload,
      };

      if (activeB64) {
        payload.resumeBase64 = activeB64;
        payload.resumeFileName = activeMeta?.resumeFileName || activeResumeFileName || "resume.pdf";
        payload.resumeFileType = activeMeta?.resumeFileType || activeResumeFileType || "application/pdf";
      }

      const response = await fetch("/api/ai/analyze-skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (response.status === 503 || errJson.error?.includes("503") || errJson.error?.includes("busy")) {
          setIsServiceBusy(true);
          throw new Error("The AI service is currently busy. Please try again in a few seconds.");
        }
        throw new Error(errJson.error || `Server returned status ${response.status}`);
      }

      const result: SkillGapAnalysisResult = await response.json();
      result.analyzedAt = new Date().toISOString();
      result.targetRole = targetRole;

      // Save to Firestore users/{uid}/skillGapAnalysis/latest
      await saveSkillGapAnalysis(currentUser.uid, result);

      setAnalysis(result);
      setError(null);
      setIsServiceBusy(false);

      // Celebrate high readiness with subtle confetti
      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.65 },
          colors: ["#C85A32", "#345B3C", "#E6B89C", "#D97706"],
        });
      } catch {}
    } catch (err: any) {
      console.error("Skill Gap Analysis error:", err);
      const isBusy =
        err.message?.includes("503") ||
        err.message?.includes("busy") ||
        err.message?.includes("high-demand") ||
        err.message?.includes("high demand") ||
        err.message?.includes("Service Unavailable");

      if (isBusy) {
        setIsServiceBusy(true);
        setError("The AI service is currently busy. Please try again in a few seconds.");
      } else {
        setError(
          err.message ||
            "We couldn't generate the analysis right now. Please verify your connection and try again."
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 4. Instant Benchmark Diagnostic Fallback Handler
  const handleRunBenchmarkFallback = async () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setIsServiceBusy(false);

    try {
      const skillsList = firestoreUserData?.skills || profile.skills || [];
      const resumeName = activeResumeFileName || undefined;
      const fallbackResult = generateBenchmarkDiagnostic(targetRole, skillsList, resumeName);
      
      await saveSkillGapAnalysis(currentUser.uid, fallbackResult);
      setAnalysis(fallbackResult);
    } catch (err: any) {
      console.error("Fallback error:", err);
      setError("Unable to generate diagnostic. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 5. Handle File Selected from Computer (PDF, DOC, DOCX)
  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    // Validate format and size
    const validation = validateResumeFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid resume format. Please upload a PDF or DOCX under 10MB.");
      return;
    }

    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth();
      }
      setUploadError("Please sign in or create an account to save your resume securely to the cloud.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    // Read base64 for instant API transmission
    let base64String: string | null = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64String = btoa(binary);
      setLocalResumeBase64(base64String);
    } catch (readErr) {
      console.warn("Could not read file buffer for base64:", readErr);
    }

    try {
      // Upload to Firebase Storage and update Firestore
      const previousStoragePath = localResumeMeta?.resumeStoragePath || firestoreUserData?.resumeStoragePath;
      let uploadResult;

      if (previousStoragePath) {
        uploadResult = await replaceResumeFile(
          currentUser.uid,
          file,
          previousStoragePath,
          (progress) => setUploadProgress(progress)
        );
      } else {
        uploadResult = await uploadResumeFile(
          currentUser.uid,
          file,
          (progress) => setUploadProgress(progress)
        );
      }

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || "Failed to upload resume to Firebase Storage.");
      }

      setUploadProgress(100);
      setLocalResumeMeta(uploadResult.data);
      if (onUpdateResume) {
        onUpdateResume(uploadResult.data);
      }

      setUploadSuccess(`✓ Resume "${file.name}" uploaded successfully! Analyzing your skills now...`);

      // Automatically trigger analysis with the new resume data
      await handleRunAnalysis(uploadResult.data, base64String);
    } catch (err: any) {
      console.error("Resume upload error in SkillGapView:", err);
      setUploadError(
        err.message || "Failed to upload resume. Please check your network connection and try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  };

  // Helper to format date
  const formatAnalyzedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Recently";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkillInput.trim()) {
      onAddSkill(newSkillInput.trim());
      setNewSkillInput("");
      setIsAddSkillOpen(false);
    }
  };

  // Priority color styling helper
  const getPriorityBadge = (priority: SkillPriority) => {
    switch (priority) {
      case "HIGH":
        return {
          bg: "bg-[#FDF2F2] text-[#9B1C1C] border-[#F8B4B4]",
          label: "HIGH PRIORITY",
          dot: "bg-[#E02424]",
        };
      case "MEDIUM":
        return {
          bg: "bg-[#FEFCE8] text-[#854D0E] border-[#FEF08A]",
          label: "MEDIUM PRIORITY",
          dot: "bg-[#CA8A04]",
        };
      case "LOW":
      default:
        return {
          bg: "bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]",
          label: "LOW PRIORITY",
          dot: "bg-[#6B7280]",
        };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: "text-[#2D6A4F]", bg: "bg-[#EAF5EE]", border: "border-[#C7E5D3]", label: "Strong Candidate" };
    if (score >= 60) return { text: "text-[#D97706]", bg: "bg-[#FEF9E7]", border: "border-[#FBE8B3]", label: "Competitive with Gaps" };
    return { text: "text-[#C85A32]", bg: "bg-[#FDF3EE]", border: "border-[#F7D8CB]", label: "Foundation Building" };
  };

  // Filter skills based on tab
  const getFilteredSkills = () => {
    if (!analysis) return [];
    switch (activeCategoryFilter) {
      case "strong":
        return analysis.strongSkills.map((s) => ({ ...s, group: "strong" as const }));
      case "improve":
        return analysis.improvementSkills.map((s) => ({ ...s, group: "improve" as const }));
      case "missing":
        return analysis.missingSkills.map((s) => ({ ...s, group: "missing" as const }));
      case "recommended":
        return analysis.recommendedSkills.map((s) => ({ ...s, group: "recommended" as const }));
      case "all":
      default:
        return [
          ...analysis.missingSkills.map((s) => ({ ...s, group: "missing" as const })),
          ...analysis.improvementSkills.map((s) => ({ ...s, group: "improve" as const })),
          ...analysis.strongSkills.map((s) => ({ ...s, group: "strong" as const })),
          ...analysis.recommendedSkills.map((s) => ({ ...s, group: "recommended" as const })),
        ];
    }
  };

  const filteredSkills = getFilteredSkills();

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="border-b border-[#E7E2DA] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C85A32] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
              Competency Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1.5 font-editorial tracking-tight">
            Skill Gap Analysis for {targetRole}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            AI-driven comparison between your profile skills, verified resume content,
            and entry-level industry hiring standards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddSkillOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-[#DED7CE] bg-[#FFFFFF] hover:bg-[#F9F7F4] text-stone-800 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-stone-600" />
            <span>Add Skill</span>
          </button>

          <button
            onClick={() => handleRunAnalysis()}
            disabled={isAnalyzing}
            className="px-4 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span>{isAnalyzing ? "Analyzing Gaps..." : analysis ? "Re-analyze Skills" : "Analyze My Skills"}</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input for Local Computer Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          e.target.value = "";
        }}
      />

      {/* Upload Error / Success Banners */}
      {uploadError && (
        <div className="rounded-2xl border border-[#F8B4B4] bg-[#FDF2F2] p-4 text-xs sm:text-sm text-[#9B1C1C] flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-[#E02424] mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Resume Upload Notice:</span> {uploadError}
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="rounded-2xl border border-[#C7E5D3] bg-[#EAF5EE] p-4 text-xs sm:text-sm text-[#2D6A4F] flex items-start gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-[#2D6A4F] mt-0.5" />
          <div className="flex-1 font-semibold">{uploadSuccess}</div>
          <button
            onClick={() => setUploadSuccess(null)}
            className="text-[#2D6A4F] hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Error & Service Busy Banner with Instant Diagnostic Fallback */}
      {error && (
        <div className="rounded-2xl border border-[#F8B4B4] bg-[#FDF2F2] p-5 text-xs sm:text-sm text-[#9B1C1C] shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#E02424] mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-[#9B1C1C]">Analysis Service Notice</h4>
              <p className="text-xs text-[#9B1C1C] mt-1 leading-relaxed">
                {error}
              </p>
              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => handleRunAnalysis()}
                  disabled={isAnalyzing}
                  className="px-3.5 py-1.5 rounded-xl bg-[#C85A32] text-white text-xs font-bold hover:bg-[#B24E2A] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={handleRunBenchmarkFallback}
                  disabled={isAnalyzing}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-[#F8B4B4] text-[#9B1C1C] text-xs font-bold hover:bg-[#FDE8E8] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>Run Instant Benchmark Diagnostic</span>
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                setIsServiceBusy(false);
              }}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Resume Connection & Local Computer Upload Section */}
      <div className="bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] p-5 sm:p-6 shadow-xs">
        {hasResume ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EAF5EE] text-[#2D6A4F] flex items-center justify-center shrink-0 border border-[#C7E5D3]">
                <ShieldCheck className="w-6 h-6 text-[#2D6A4F]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2D6A4F]">
                    Resume Uploaded & Connected
                  </span>
                  {activeResumeFileSize ? (
                    <span className="text-[11px] font-medium text-stone-500">
                      ({formatFileSize(activeResumeFileSize)})
                    </span>
                  ) : null}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900 mt-0.5">
                  {activeResumeFileName || "Uploaded Resume Document"}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Cross-referenced for {targetRole} skill detection.
                  {activeResumeUploadedAt ? ` Updated ${formatAnalyzedDate(activeResumeUploadedAt)}.` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
              {activeResumeURL && (
                <a
                  href={activeResumeURL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-[#DED7CE] bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                  <span>View Resume</span>
                </a>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isAnalyzing}
                className="px-3.5 py-1.5 rounded-xl border border-[#DED7CE] bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
              >
                <Upload className="w-3.5 h-3.5 text-stone-600" />
                <span>{isUploading ? "Uploading..." : "Replace Resume"}</span>
              </button>

              <button
                onClick={() => handleRunAnalysis()}
                disabled={isAnalyzing || isUploading}
                className="px-4 py-1.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F8DDD1]" />
                <span>{isAnalyzing ? "Analyzing..." : "Analyze My Skills"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
              isDragging
                ? "border-[#C85A32] bg-[#FDF3EE]"
                : "border-[#DED7CE] bg-white hover:border-stone-400"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FDF3EE] text-[#C85A32] flex items-center justify-center mx-auto mb-3 border border-[#F7D8CB]">
              <FileUp className="w-6 h-6 text-[#C85A32]" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              Upload Your Resume from Computer
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-lg mx-auto leading-relaxed">
              Upload your PDF or Word document (.pdf, .docx, .doc up to 10MB). JobPlanner will extract your
              projects, technical skills, and credentials to cross-examine against {targetRole} requirements.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? "Uploading Resume..." : "Choose File from Computer"}</span>
              </button>

              <button
                onClick={() => handleRunAnalysis()}
                disabled={isAnalyzing || isUploading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DED7CE] bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-[#C85A32]" />
                <span>Analyze Using Profile Skills Only</span>
              </button>
            </div>

            <p className="text-[11px] text-stone-400 mt-3">
              Supports PDF (.pdf), Microsoft Word (.docx, .doc) up to 10MB. Stored securely in Firebase Storage.
            </p>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mt-4 pt-3 border-t border-[#E7E2DA]">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C85A32]" />
                Uploading resume to Firebase Cloud Storage...
              </span>
              <span className="text-[#C85A32] font-bold">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full bg-[#C85A32] transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading Saved Skeleton */}
      {isLoadingSaved && !analysis && (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#EDE7DD] p-12 text-center shadow-xs">
          <div className="w-8 h-8 rounded-full border-2 border-[#C85A32] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-stone-600">
            Checking latest cloud skill gap analysis...
          </p>
        </div>
      )}

      {/* State A: Analyzing Animation */}
      {isAnalyzing && (
        <div className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-10 sm:p-14 text-center shadow-xs animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#FDF3EE] text-[#C85A32] flex items-center justify-center mx-auto mb-4 border border-[#F7D8CB]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#C85A32]" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 font-editorial">
            Analyzing Skills & Resume Against {targetRole} Requirements
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-lg mx-auto leading-relaxed">
            Gemini is comparing your demonstrated technical proficiencies, course background, and resume
            text against entry-level job market benchmarks to categorize gaps and map your learning stages.
          </p>
        </div>
      )}

      {/* State B: Empty State (No analysis yet) */}
      {!isLoadingSaved && !analysis && !isAnalyzing && (
        <div className="rounded-2xl border border-[#EDE7DD] bg-[#FFFFFF] p-8 sm:p-12 shadow-xs text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#FDF3EE] text-[#C85A32] flex items-center justify-center mx-auto mb-5 border border-[#F7D8CB] shadow-xs">
            <GitCompare className="w-7 h-7 text-[#C85A32]" />
          </div>

          <h3 className="text-2xl font-bold text-stone-900 font-editorial">
            Discover Your Precise Skill Gaps for {targetRole}
          </h3>

          <p className="text-xs sm:text-sm text-stone-600 mt-2.5 max-w-md mx-auto leading-relaxed">
            JobPlanner will analyze your verified profile skills
            {hasResume ? ` and uploaded resume (${activeResumeFileName || "Attached Document"})` : ""} to pinpoint exactly what skills you have,
            what needs improvement, and the highest-priority missing requirements recruiters expect.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => handleRunAnalysis()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#F8DDD1]" />
              <span>Analyze My Skills</span>
            </button>

            {!hasResume && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#DED7CE] text-stone-700 hover:bg-[#FAF8F5] text-xs sm:text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4 text-stone-600" />
                <span>Upload Resume First</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* State C: Active Analysis Dashboard */}
      {analysis && !isAnalyzing && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Top Score Banner & Executive Summary */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Score Dial & Tier */}
              <div className="lg:col-span-4 flex flex-col items-center sm:flex-row lg:flex-col sm:items-center justify-center gap-4 text-center sm:text-left lg:text-center border-b lg:border-b-0 lg:border-r border-[#E7E2DA] pb-6 lg:pb-0 lg:pr-8">
                <div className="relative">
                  <div
                    className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center ${
                      getScoreColor(analysis.readinessScore).border
                    } ${getScoreColor(analysis.readinessScore).bg}`}
                  >
                    <span className="text-3xl font-black font-editorial tracking-tight text-stone-900">
                      {analysis.readinessScore}
                    </span>
                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                      out of 100
                    </span>
                  </div>
                </div>

                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      getScoreColor(analysis.readinessScore).bg
                    } ${getScoreColor(analysis.readinessScore).text} border ${
                      getScoreColor(analysis.readinessScore).border
                    }`}
                  >
                    {getScoreColor(analysis.readinessScore).label}
                  </span>
                  <h3 className="text-sm font-bold text-stone-900 mt-1.5">
                    Overall Skill Readiness
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    For {analysis.targetRole || targetRole}
                  </p>
                </div>
              </div>

              {/* Summary & Explanation */}
              <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-xs uppercase font-bold text-stone-400 tracking-wider">
                    Executive Evaluation
                  </span>
                  <p className="text-sm sm:text-base text-stone-800 mt-1 leading-relaxed font-medium">
                    {analysis.summary}
                  </p>
                </div>

                {analysis.scoreExplanation && (
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-xs text-stone-700 leading-relaxed flex items-start gap-2.5">
                    <TrendingUp className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 font-semibold">Why this score: </strong>
                      {analysis.scoreExplanation}
                    </div>
                  </div>
                )}

                {/* 4 Summary Stat Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div
                    onClick={() => {
                      setActiveSection("skills");
                      setActiveCategoryFilter("strong");
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      activeCategoryFilter === "strong"
                        ? "bg-[#EAF5EE] border-[#2D6A4F]"
                        : "bg-[#FFFFFF] border-[#E7E2DA] hover:border-[#2D6A4F]"
                    }`}
                  >
                    <span className="text-2xl font-black text-[#2D6A4F] block">
                      {analysis.strongSkills?.length || 0}
                    </span>
                    <span className="text-[11px] font-bold text-stone-700 block mt-0.5">
                      Strong Skills
                    </span>
                    <span className="text-[10px] text-stone-500">Already demonstrated</span>
                  </div>

                  <div
                    onClick={() => {
                      setActiveSection("skills");
                      setActiveCategoryFilter("improve");
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      activeCategoryFilter === "improve"
                        ? "bg-[#FEF9E7] border-[#D97706]"
                        : "bg-[#FFFFFF] border-[#E7E2DA] hover:border-[#D97706]"
                    }`}
                  >
                    <span className="text-2xl font-black text-[#D97706] block">
                      {analysis.improvementSkills?.length || 0}
                    </span>
                    <span className="text-[11px] font-bold text-stone-700 block mt-0.5">
                      To Improve
                    </span>
                    <span className="text-[10px] text-stone-500">Needs depth & projects</span>
                  </div>

                  <div
                    onClick={() => {
                      setActiveSection("skills");
                      setActiveCategoryFilter("missing");
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      activeCategoryFilter === "missing"
                        ? "bg-[#FDF3EE] border-[#C85A32]"
                        : "bg-[#FFFFFF] border-[#E7E2DA] hover:border-[#C85A32]"
                    }`}
                  >
                    <span className="text-2xl font-black text-[#C85A32] block">
                      {analysis.missingSkills?.length || 0}
                    </span>
                    <span className="text-[11px] font-bold text-stone-700 block mt-0.5">
                      Missing Skills
                    </span>
                    <span className="text-[10px] text-stone-500">High hiring priority</span>
                  </div>

                  <div
                    onClick={() => {
                      setActiveSection("skills");
                      setActiveCategoryFilter("recommended");
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      activeCategoryFilter === "recommended"
                        ? "bg-[#F0F4F8] border-[#3B82F6]"
                        : "bg-[#FFFFFF] border-[#E7E2DA] hover:border-[#3B82F6]"
                    }`}
                  >
                    <span className="text-2xl font-black text-[#3B82F6] block">
                      {analysis.recommendedSkills?.length || 0}
                    </span>
                    <span className="text-[11px] font-bold text-stone-700 block mt-0.5">
                      Recommended
                    </span>
                    <span className="text-[10px] text-stone-500">Competitive bonus</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E7E2DA] pb-2 gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSection("skills")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSection === "skills"
                    ? "bg-stone-900 text-white shadow-xs"
                    : "text-stone-600 hover:bg-[#FAF8F5]"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  Skills Breakdown (
                  {(analysis.strongSkills?.length || 0) +
                    (analysis.improvementSkills?.length || 0) +
                    (analysis.missingSkills?.length || 0) +
                    (analysis.recommendedSkills?.length || 0)}
                  )
                </span>
              </button>

              <button
                onClick={() => setActiveSection("roadmap")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSection === "roadmap"
                    ? "bg-stone-900 text-white shadow-xs"
                    : "text-stone-600 hover:bg-[#FAF8F5]"
                }`}
              >
                <Milestone className="w-3.5 h-3.5" />
                <span>Personalized Roadmap ({analysis.learningRoadmap?.length || 4} Stages)</span>
              </button>

              <button
                onClick={() => setActiveSection("projects")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSection === "projects"
                    ? "bg-stone-900 text-white shadow-xs"
                    : "text-stone-600 hover:bg-[#FAF8F5]"
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Recommended Projects ({analysis.projectRecommendations?.length || 0})</span>
              </button>
            </div>

            {/* Category filters when on skills section */}
            {activeSection === "skills" && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(
                  [
                    { id: "all", label: "All Skills" },
                    { id: "missing", label: "Missing (Priority)" },
                    { id: "improve", label: "To Improve" },
                    { id: "strong", label: "Strong" },
                    { id: "recommended", label: "Recommended" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategoryFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      activeCategoryFilter === tab.id
                        ? "bg-[#C85A32] text-white"
                        : "bg-[#FFFFFF] border border-[#E7E2DA] text-stone-600 hover:bg-[#FAF8F5]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 1: Skills Breakdown Cards */}
          {activeSection === "skills" && (
            <div className="space-y-4">
              {filteredSkills.length === 0 ? (
                <div className="p-8 text-center bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] text-stone-500 text-xs">
                  No skills match this filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSkills.map((skill, index) => {
                    const pMeta = getPriorityBadge(skill.priority);
                    const isStrong = skill.group === "strong";
                    const isImprove = skill.group === "improve";
                    const isMissing = skill.group === "missing";

                    return (
                      <div
                        key={`${skill.name}-${index}`}
                        className={`rounded-2xl border p-5 shadow-xs transition-all bg-[#FFFFFF] ${
                          isMissing
                            ? "border-[#F4D9CE] hover:border-[#C85A32]"
                            : isImprove
                            ? "border-[#F6E6C5] hover:border-[#D97706]"
                            : isStrong
                            ? "border-[#D1E7DD] hover:border-[#2D6A4F]"
                            : "border-[#E7E2DA] hover:border-stone-400"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isStrong
                                    ? "bg-[#2D6A4F]"
                                    : isImprove
                                    ? "bg-[#D97706]"
                                    : isMissing
                                    ? "bg-[#C85A32]"
                                    : "bg-stone-400"
                                }`}
                              />
                              <h4 className="text-base font-bold text-stone-900 tracking-tight">
                                {skill.name}
                              </h4>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="text-[11px] font-semibold text-stone-500 px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E7E2DA]">
                                {skill.category || "General"}
                              </span>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${pMeta.bg}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${pMeta.dot}`} />
                                {pMeta.label}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                                isStrong
                                  ? "bg-[#EAF5EE] text-[#2D6A4F]"
                                  : isImprove
                                  ? "bg-[#FEF9E7] text-[#D97706]"
                                  : isMissing
                                  ? "bg-[#FDF3EE] text-[#C85A32]"
                                  : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {isStrong
                                ? "Have"
                                : isImprove
                                ? "To Improve"
                                : isMissing
                                ? "Missing"
                                : "Optional"}
                            </span>
                          </div>
                        </div>

                        {/* Level comparisons */}
                        {(skill.currentLevel || skill.requiredLevel) && (
                          <div className="mt-3.5 pt-3 border-t border-[#F0ECE4] grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                                Current
                              </span>
                              <span className="font-semibold text-stone-800">
                                {skill.currentLevel || (isStrong ? "Proficient" : "None")}
                              </span>
                            </div>
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                                Required
                              </span>
                              <span className="font-semibold text-stone-800">
                                {skill.requiredLevel || "Working Knowledge"}
                              </span>
                            </div>
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                                Gap Level
                              </span>
                              <span
                                className={`font-bold ${
                                  skill.gapLevel === "High"
                                    ? "text-[#C85A32]"
                                    : skill.gapLevel === "Moderate"
                                    ? "text-[#D97706]"
                                    : "text-[#2D6A4F]"
                                }`}
                              >
                                {skill.gapLevel || (isStrong ? "None" : "Moderate")}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Explanation Reason */}
                        <p className="text-xs text-stone-600 mt-3 leading-relaxed">
                          {skill.reason}
                        </p>

                        {/* Recommended Action / Practice tip */}
                        {skill.recommendedAction && (
                          <div className="mt-3 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-[11px] text-stone-700 flex items-start gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-stone-900 font-semibold">Next Step: </strong>
                              {skill.recommendedAction}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-4 pt-3 border-t border-[#F0ECE4] flex items-center justify-between text-xs">
                          {isMissing && (
                            <button
                              onClick={() => onAddSkill(skill.name)}
                              className="text-[11px] font-semibold text-[#C85A32] hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>I already know this (Add to Profile)</span>
                            </button>
                          )}
                          {!isMissing && (
                            <span className="text-[11px] text-stone-400 font-medium">
                              Part of verified skillset
                            </span>
                          )}

                          <button
                            onClick={() => onNavigate("interview")}
                            className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 cursor-pointer flex items-center gap-1"
                          >
                            <span>Practice Questions</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Personalized Learning Roadmap */}
          {activeSection === "roadmap" && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 font-editorial">
                      Sequential Skill Acquisition Roadmap for {targetRole}
                    </h3>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Tailored specifically to prioritize your critical missing skills first,
                      progressing from foundational gaps to job-ready portfolio projects.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate("roadmap")}
                    className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Open Interactive Roadmap</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#E6B89C]" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {analysis.learningRoadmap?.map((stage, idx) => (
                    <div
                      key={stage.stage || idx}
                      className="rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#C85A32] px-2 py-0.5 rounded-md bg-[#FDF3EE] border border-[#F7D8CB]">
                            Stage {stage.stage || idx + 1}
                          </span>
                          <span className="text-[10px] text-stone-400 font-bold">
                            Step {idx + 1} of 4
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-stone-900 mt-2">
                          {stage.title}
                        </h4>

                        {stage.description && (
                          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                            {stage.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#E7E2DA]">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1.5">
                          Target Skills:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {stage.skills?.map((sk, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#DED7CE] text-stone-800"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Recommended Projects */}
          {activeSection === "projects" && (
            <div className="space-y-4">
              <div className="bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs">
                <h3 className="text-base font-bold text-stone-900">
                  Targeted Capstone & Mini-Projects for Major Skill Gaps
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Building real projects is the most effective way to eliminate entry-level skill gaps
                  and convince technical recruiters during resume reviews and technical interviews.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {analysis.projectRecommendations?.map((project, pIdx) => (
                  <div
                    key={pIdx}
                    className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-6 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FDF3EE] text-[#C85A32] flex items-center justify-center border border-[#F7D8CB] shrink-0">
                          <Code2 className="w-5 h-5 text-[#C85A32]" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 px-2 py-0.5 rounded bg-stone-100">
                          Portfolio Project #{pIdx + 1}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-stone-900 mt-3 font-editorial">
                        {project.title}
                      </h4>

                      <div className="mt-3">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                          What to build:
                        </span>
                        <p className="text-xs text-stone-700 mt-0.5 leading-relaxed">
                          {project.whatToBuild}
                        </p>
                      </div>

                      <div className="mt-3">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                          Skills demonstrated:
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {project.skillsDemonstrated?.map((sk, skIdx) => (
                            <span
                              key={skIdx}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E7E2DA] text-[#C85A32]"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#F0ECE4]">
                      <span className="text-[10px] uppercase font-bold text-[#2D6A4F] tracking-wider block">
                        Why it helps for {targetRole}:
                      </span>
                      <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                        {project.whyItHelps}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Custom Skill Modal */}
      {isAddSkillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-[#E7E2DA] rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E2DA]">
              <h3 className="text-base font-bold text-stone-900 font-editorial">
                Add Skill to Your Profile
              </h3>
              <button
                onClick={() => setIsAddSkillOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomSkill} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="e.g. Docker, PyTorch, SQL, FastAPI"
                  autoFocus
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DED7CE] bg-[#FAF8F5] text-stone-900 focus:outline-none focus:border-[#C85A32] focus:bg-[#FFFFFF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSkillOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-[#FAF8F5] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSkillInput.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#C85A32] hover:bg-[#B24E2A] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
