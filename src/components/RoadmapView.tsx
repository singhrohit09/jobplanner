import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Award,
  BookOpen,
  Code2,
  FileText,
  MessageSquareCode,
  Briefcase,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  Lightbulb,
  Search,
  Filter,
  Calendar,
  Play,
  RotateCcw,
  History,
  Target,
  Bot,
  Zap,
  Star,
  ShieldCheck,
  Bookmark,
  Check,
  Layers,
  Flame,
  Info,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import confetti from "canvas-confetti";
import { User as FirebaseUser } from "firebase/auth";
import {
  UserProfile,
  CareerRoadmap,
  CareerRoadmapStage,
  CareerRoadmapTask,
  RoadmapDuration,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  WhatShouldIDoNextRecommendation,
  CareerRoadmapHistoryRecord,
  ReadinessAnalysis,
  JobListing,
  PracticeRecord,
  InterviewSession,
  ResumeData,
  GeneratedResume,
  SkillGapAnalysisResult,
} from "../types";
import {
  saveCareerRoadmapToFirestore,
  getCareerRoadmapFromFirestore,
  getCareerRoadmapHistoryFromFirestore,
  FirestoreUserData,
} from "../lib/firebase";

interface RoadmapViewProps {
  profile: UserProfile;
  currentUser?: FirebaseUser | null;
  firestoreUserData?: Partial<FirestoreUserData> | null;
  resume?: ResumeData | GeneratedResume | null;
  jobs?: JobListing[] | null;
  skillGapAnalysis?: ReadinessAnalysis | SkillGapAnalysisResult | null;
  practiceHistory?: PracticeRecord[] | InterviewSession[] | null;
  careerRoadmap?: CareerRoadmap | null;
  onSaveCareerRoadmap?: (roadmap: CareerRoadmap, archive?: boolean) => Promise<void>;
  onNavigate: (tab: string) => void;
  onOpenAuth?: () => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  profile,
  currentUser,
  firestoreUserData,
  resume,
  jobs = [],
  skillGapAnalysis,
  practiceHistory = [],
  careerRoadmap: externalRoadmap,
  onSaveCareerRoadmap,
  onNavigate,
  onOpenAuth,
}) => {
  // Active roadmap state
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(externalRoadmap || null);
  const [isLoading, setIsLoading] = useState<boolean>(!externalRoadmap);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all" | "Not Started" | "In Progress" | "Completed" | "high_priority"
  const [categoryFilter, setCategoryFilter] = useState<string>("all"); // "all" | "skills" | "projects" | "resume" | "interview" | "jobs"
  const [selectedDuration, setSelectedDuration] = useState<RoadmapDuration>(
    roadmap?.duration || "3 Months"
  );

  // Active expanded stage
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  // Tab section state: "timeline" | "skills" | "projects" | "achievements"
  const [activeSubTab, setActiveSubTab] = useState<
    "timeline" | "skills" | "projects" | "achievements"
  >("timeline");

  // AI "What Should I Do Next?" state
  const [whatNextModalOpen, setWhatNextModalOpen] = useState<boolean>(false);
  const [whatNextLoading, setWhatNextLoading] = useState<boolean>(false);
  const [whatNextData, setWhatNextData] = useState<WhatShouldIDoNextRecommendation | null>(null);

  // Regenerate modal state
  const [regenerateModalOpen, setRegenerateModalOpen] = useState<boolean>(false);
  const [preserveCompleted, setPreserveCompleted] = useState<boolean>(true);
  const [regenDuration, setRegenDuration] = useState<RoadmapDuration>(
    roadmap?.duration || "3 Months"
  );

  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyRecords, setHistoryRecords] = useState<CareerRoadmapHistoryRecord[]>([]);

  // Task being operated on
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  // Initial load from Firestore or local cache
  useEffect(() => {
    let isMounted = true;
    async function loadRoadmap() {
      const uid = currentUser?.uid || profile.id || "guest";
      setIsLoading(true);
      try {
        const stored = await getCareerRoadmapFromFirestore(uid);
        if (isMounted) {
          if (stored) {
            setRoadmap(stored);
            setSelectedDuration(stored.duration || "3 Months");
            setRegenDuration(stored.duration || "3 Months");
            // Auto expand first incomplete stage
            const firstIncomplete = stored.stages?.find((s) => s.progress < 100) || stored.stages?.[0];
            if (firstIncomplete) {
              setExpandedStages({ [firstIncomplete.stageId]: true });
            }
          } else {
            // Auto-generate on first visit if no roadmap exists
            await handleGenerateRoadmap("3 Months", false);
          }
        }
      } catch (err) {
        console.warn("Notice loading roadmap:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (!externalRoadmap) {
      loadRoadmap();
    } else {
      setRoadmap(externalRoadmap);
      const firstIncomplete = externalRoadmap.stages?.find((s) => s.progress < 100) || externalRoadmap.stages?.[0];
      if (firstIncomplete) {
        setExpandedStages({ [firstIncomplete.stageId]: true });
      }
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, profile.target_role, externalRoadmap]);

  // Generate / Regenerate Roadmap API caller
  const handleGenerateRoadmap = async (
    targetDuration: RoadmapDuration,
    preserveDone: boolean
  ) => {
    setIsGenerating(true);
    try {
      const payload = {
        profile: {
          fullName: profile.full_name || profile.name || "Candidate",
          targetRole: profile.target_role,
          industry: profile.interests?.[0] || "Technology",
          experienceLevel: profile.experience_level,
          skills: profile.skills,
          college: profile.education?.college || profile.education?.college_name,
          degree: profile.education?.degree,
          branch: profile.education?.branch,
          graduationYear: profile.education?.graduation_year,
          uid: currentUser?.uid || profile.id || "guest",
        },
        resume: resume || firestoreUserData?.resume || null,
        skillGap: skillGapAnalysis || null,
        jobs: {
          savedJobsCount: (firestoreUserData as any)?.savedJobs?.length || 0,
        },
        interviewHistory: {
          totalSessions: practiceHistory.length,
          averageScore:
            practiceHistory.length > 0
              ? Math.round(
                  practiceHistory.reduce((acc, c: any) => acc + (c.score || c.overallScore || 70), 0) /
                    practiceHistory.length
                )
              : null,
        },
        currentRoadmap: roadmap,
        duration: targetDuration,
        preserveCompleted: preserveDone,
      };

      const res = await fetch("/api/ai/career-roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Roadmap generation failed with status: ${res.status}`);
      }

      const generated: CareerRoadmap = await res.json();

      // Persist to state, Firestore, and localStorage
      setRoadmap(generated);
      setSelectedDuration(generated.duration || targetDuration);
      setRegenDuration(generated.duration || targetDuration);

      // Auto expand first incomplete stage
      const firstIncomplete = generated.stages?.find((s) => s.progress < 100) || generated.stages?.[0];
      if (firstIncomplete) {
        setExpandedStages({ [firstIncomplete.stageId]: true });
      }

      const uid = currentUser?.uid || profile.id || "guest";
      await saveCareerRoadmapToFirestore(uid, generated, preserveDone);
      if (onSaveCareerRoadmap) {
        await onSaveCareerRoadmap(generated, preserveDone);
      }

      setRegenerateModalOpen(false);
    } catch (err) {
      console.error("Error generating roadmap:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle stage expansion
  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  // Expand / collapse all
  const toggleAllStages = (expand: boolean) => {
    if (!roadmap?.stages) return;
    const next: Record<string, boolean> = {};
    for (const s of roadmap.stages) {
      next[s.stageId] = expand;
    }
    setExpandedStages(next);
  };

  // Toggle task status
  const handleToggleTaskStatus = async (
    stageId: string,
    taskId: string,
    currentStatus: TaskStatus
  ) => {
    if (!roadmap) return;
    setPendingTaskId(taskId);

    // Sequence: Not Started -> In Progress -> Completed -> Not Started
    let nextStatus: TaskStatus = "In Progress";
    if (currentStatus === "Not Started") {
      nextStatus = "In Progress";
    } else if (currentStatus === "In Progress") {
      nextStatus = "Completed";
      // Trigger confetti celebration on completion
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#C85A32", "#496552", "#D97706"],
        });
      } catch {}
    } else {
      nextStatus = "Not Started";
    }

    // Clone roadmap and update
    let totalCount = 0;
    let completedCount = 0;

    const updatedStages = roadmap.stages.map((stg) => {
      if (stg.stageId !== stageId) {
        // Count tasks
        for (const t of stg.tasks) {
          totalCount++;
          if (t.status === "Completed") completedCount++;
        }
        return stg;
      }

      let stgCompleted = 0;
      const updatedTasks = stg.tasks.map((t) => {
        totalCount++;
        if (t.taskId === taskId) {
          const isNowDone = nextStatus === "Completed";
          if (isNowDone) {
            completedCount++;
            stgCompleted++;
          }
          return {
            ...t,
            status: nextStatus,
            completedAt: isNowDone ? new Date().toISOString() : null,
          };
        }
        if (t.status === "Completed") {
          completedCount++;
          stgCompleted++;
        }
        return t;
      });

      const stageProgress =
        stg.tasks.length > 0 ? Math.round((stgCompleted / stg.tasks.length) * 100) : 0;
      const stageStatus =
        stageProgress === 100 ? "Completed" as const : stageProgress > 0 ? "Current" as const : "Upcoming" as const;

      return {
        ...stg,
        progress: stageProgress,
        status: stageStatus,
        tasks: updatedTasks,
      };
    });

    const overallProgress =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const firstIncomplete =
      updatedStages.find((s) => s.progress < 100) || updatedStages[updatedStages.length - 1];

    // Find next recommended task
    let nextRec: CareerRoadmapTask | null = null;
    for (const stg of updatedStages) {
      const high = stg.tasks.find((t) => t.status !== "Completed" && t.priority === "High");
      if (high) {
        nextRec = high;
        break;
      }
    }
    if (!nextRec) {
      for (const stg of updatedStages) {
        const anyTask = stg.tasks.find((t) => t.status !== "Completed");
        if (anyTask) {
          nextRec = anyTask;
          break;
        }
      }
    }

    // Dynamically update achievements
    const updatedAchievements = (roadmap.achievements || []).map((ach) => {
      if (ach.id === "ach_executor" && completedCount >= 3) {
        return { ...ach, unlocked: true, unlockedAt: ach.unlockedAt || new Date().toISOString() };
      }
      if (ach.id === "ach_master" && overallProgress >= 75) {
        return { ...ach, unlocked: true, unlockedAt: ach.unlockedAt || new Date().toISOString() };
      }
      return ach;
    });

    // Dynamically update milestones
    const updatedMilestones = (roadmap.milestones || []).map((ms) => {
      if (ms.id === "m_ready" && overallProgress >= 80) {
        return { ...ms, completed: true, completedAt: ms.completedAt || new Date().toISOString() };
      }
      if (ms.id === "m_project" && completedCount >= 3) {
        return { ...ms, completed: true, completedAt: ms.completedAt || new Date().toISOString() };
      }
      return ms;
    });

    const updatedRoadmap: CareerRoadmap = {
      ...roadmap,
      stages: updatedStages,
      overallProgress,
      currentStage: firstIncomplete.title,
      completedTasksCount: completedCount,
      totalTasksCount: totalCount,
      nextRecommendedTask: nextRec,
      achievements: updatedAchievements,
      milestones: updatedMilestones,
      updatedAt: new Date().toISOString(),
    };

    setRoadmap(updatedRoadmap);

    const uid = currentUser?.uid || profile.id || "guest";
    await saveCareerRoadmapToFirestore(uid, updatedRoadmap, false);
    if (onSaveCareerRoadmap) {
      await onSaveCareerRoadmap(updatedRoadmap, false);
    }

    setPendingTaskId(null);
  };

  // AI "What Should I Do Next?" Handler
  const handleOpenWhatNext = async () => {
    setWhatNextModalOpen(true);
    setWhatNextLoading(true);
    try {
      const payload = {
        roadmap,
        profile: {
          targetRole: profile.target_role,
          skills: profile.skills,
          fullName: profile.full_name,
        },
        skillGap: skillGapAnalysis || null,
        resume: resume || firestoreUserData?.resume || null,
        jobs: {
          savedJobsCount: (firestoreUserData as any)?.savedJobs?.length || 0,
        },
        interviewHistory: {
          totalSessions: practiceHistory.length,
        },
      };

      const res = await fetch("/api/ai/career-roadmap/what-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`What Next failed with status: ${res.status}`);
      }

      const data: WhatShouldIDoNextRecommendation = await res.json();
      setWhatNextData(data);
    } catch (err) {
      console.warn("Notice loading What Next:", err);
      // Fallback
      if (roadmap?.nextRecommendedTask) {
        setWhatNextData({
          primaryAction: roadmap.nextRecommendedTask.title,
          reason:
            roadmap.nextRecommendedTask.reason ||
            "Prioritize this high-impact milestone to advance toward your target role.",
          taskId: roadmap.nextRecommendedTask.taskId,
          taskTitle: roadmap.nextRecommendedTask.title,
          category: roadmap.nextRecommendedTask.category,
          suggestedTab: "roadmap",
          actionLabel: "Start Task",
          urgency: "High",
          tips: [
            `Estimated time: ${roadmap.nextRecommendedTask.estimatedDuration || "2-3 days"}`,
            "Mark as In Progress when you begin working.",
          ],
        });
      }
    } finally {
      setWhatNextLoading(false);
    }
  };

  // Open History modal and fetch archived snapshots
  const handleOpenHistory = async () => {
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const uid = currentUser?.uid || profile.id || "guest";
      const records = await getCareerRoadmapHistoryFromFirestore(uid);
      setHistoryRecords(records);
    } catch (err) {
      console.warn("Notice loading history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Restore archived roadmap
  const handleRestoreArchived = async (record: CareerRoadmapHistoryRecord) => {
    if (!record.roadmapSnapshot) return;
    const uid = currentUser?.uid || profile.id || "guest";
    setRoadmap(record.roadmapSnapshot);
    await saveCareerRoadmapToFirestore(uid, record.roadmapSnapshot, true);
    setHistoryModalOpen(false);
  };

  // Filter tasks
  const filteredStages = useMemo(() => {
    if (!roadmap?.stages) return [];

    return roadmap.stages
      .map((stg) => {
        const tasks = (stg.tasks || []).filter((task) => {
          // Search match
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchTitle = task.title.toLowerCase().includes(q);
            const matchDesc = task.description.toLowerCase().includes(q);
            const matchSkill = (task.skills || []).some((s) => s.toLowerCase().includes(q));
            if (!matchTitle && !matchDesc && !matchSkill) return false;
          }

          // Category filter
          if (categoryFilter !== "all" && task.category !== categoryFilter) {
            return false;
          }

          // Status filter
          if (statusFilter !== "all") {
            if (statusFilter === "high_priority") {
              if (task.priority !== "High") return false;
            } else if (task.status !== statusFilter) {
              return false;
            }
          }

          return true;
        });

        return {
          ...stg,
          tasks,
        };
      })
      .filter((stg) => stg.tasks.length > 0 || !searchQuery);
  }, [roadmap, searchQuery, categoryFilter, statusFilter]);

  // Overall counts and metrics
  const totalTasks = roadmap?.totalTasksCount || (roadmap?.stages || []).flatMap((s) => s.tasks).length || 0;
  const completedTasks =
    roadmap?.completedTasksCount ||
    (roadmap?.stages || []).flatMap((s) => s.tasks).filter((t) => t.status === "Completed").length ||
    0;
  const overallPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : roadmap?.overallProgress || 0;

  // High priority remaining count
  const highPriorityRemaining = (roadmap?.stages || [])
    .flatMap((s) => s.tasks)
    .filter((t) => t.priority === "High" && t.status !== "Completed").length;

  // Category visual styles
  const getCategoryBadge = (category: TaskCategory) => {
    switch (category) {
      case "skills":
        return {
          label: "Skills",
          icon: Code2,
          bg: "bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE]",
        };
      case "projects":
        return {
          label: "Project",
          icon: FolderGit2,
          bg: "bg-[#ECFDF5] text-[#047857] border-[#D1FAE5]",
        };
      case "resume":
        return {
          label: "Resume",
          icon: FileText,
          bg: "bg-[#FFFBEB] text-[#B45309] border-[#FEF3C7]",
        };
      case "interview":
        return {
          label: "Interview",
          icon: MessageSquareCode,
          bg: "bg-[#FAF5FF] text-[#7E22CE] border-[#F3E8FF]",
        };
      case "jobs":
        return {
          label: "Jobs",
          icon: Briefcase,
          bg: "bg-[#FDF2F8] text-[#BE185D] border-[#FCE7F3]",
        };
      default:
        return {
          label: "General",
          icon: BookOpen,
          bg: "bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]",
        };
    }
  };

  // Priority visual styles
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "High":
        return "bg-[#FBEFE9] text-[#A64522] border-[#F3DACF]";
      case "Medium":
        return "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]";
      case "Low":
        return "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]";
    }
  };

  // Navigate to contextual feature
  const handleTaskActionClick = (task: CareerRoadmapTask) => {
    if (task.category === "skills") {
      onNavigate("skillgap");
    } else if (task.category === "resume") {
      onNavigate("resume");
    } else if (task.category === "interview") {
      onNavigate("interview");
    } else if (task.category === "jobs") {
      onNavigate("jobs");
    } else {
      onNavigate("dashboard");
    }
  };

  return (
    <div className="space-y-7 pb-20">
      {/* 1. Header & Controls */}
      <div className="border-b border-[#E7E2DA] pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-[#C85A32]">
                AI Career Roadmap & Progress Tracker
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF4EE] text-[#395C3E] border border-[#D7E3D5]">
                {roadmap?.duration || selectedDuration} Timeline
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1.5 font-editorial tracking-tight">
              Personalized AI Career Roadmap
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Where am I now, what should I learn next, and how close am I to my target job as a{" "}
              <strong className="text-stone-900 font-semibold">{profile.target_role}</strong>?
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* AI "What Should I Do Next?" Feature */}
            <button
              onClick={handleOpenWhatNext}
              className="px-4 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              title="Get an AI diagnosis of your single highest-priority next step"
            >
              <Sparkles className="w-4 h-4 text-[#FDEEE8]" />
              <span>What Should I Do Next?</span>
            </button>

            {/* Regenerate Roadmap */}
            <button
              onClick={() => setRegenerateModalOpen(true)}
              disabled={isGenerating}
              className="px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF8F5] text-stone-700 text-xs font-semibold border border-[#E7E2DA] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${isGenerating ? "animate-spin" : ""}`} />
              <span>Regenerate</span>
            </button>

            {/* Version History */}
            <button
              onClick={handleOpenHistory}
              className="px-3 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF8F5] text-stone-700 text-xs font-medium border border-[#E7E2DA] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="View archived roadmap iterations"
            >
              <History className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. In-App Notification / Progress Alert Banner */}
      {highPriorityRemaining > 0 && (
        <div className="rounded-2xl border border-[#F3DACF] bg-[#FFFBF8] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FBEFE9] text-[#C85A32] flex items-center justify-center shrink-0 border border-[#F2D7CC]">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900">
                You have {highPriorityRemaining} high-priority {highPriorityRemaining === 1 ? "task" : "tasks"} remaining in your roadmap
              </h4>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Current focus:{" "}
                <span className="font-semibold text-stone-800">{roadmap?.currentStage || "Active Stage"}</span>.
                {roadmap?.nextRecommendedTask && (
                  <> Next recommended action: <span className="font-medium text-[#A64522]">"{roadmap.nextRecommendedTask.title}"</span></>
                )}
              </p>
            </div>
          </div>

          {roadmap?.nextRecommendedTask && (
            <button
              onClick={() => handleTaskActionClick(roadmap.nextRecommendedTask!)}
              className="px-3 py-1.5 rounded-lg bg-[#FAF0EB] text-[#A64522] hover:bg-[#F4DFD5] text-xs font-semibold shrink-0 transition-colors border border-[#F2D7CC] flex items-center gap-1.5 cursor-pointer"
            >
              <span>Start Next Task</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* 3. Executive Progress & Scorecard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Overall Progress */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Overall Progress
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF3EC] text-[#C85A32] border border-[#F3DACF]">
                {completedTasks} of {totalTasks} Done
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 font-editorial tracking-tight">
                {overallPct}%
              </span>
              <span className="text-xs text-stone-500 font-medium">Completed</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full h-2 rounded-full bg-[#F0ECE4] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C85A32] to-[#D97706] transition-all duration-500 rounded-full"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Current Stage */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Active Focus Stage
            </span>
            <h3 className="text-base font-bold text-stone-900 mt-2 line-clamp-2 leading-snug">
              {roadmap?.currentStage || "Stage 1: Current Profile Assessment"}
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F2ECE4] flex items-center justify-between text-xs text-stone-500">
            <span>7 Ordered Stages</span>
            <span className="font-semibold text-[#C85A32]">In Progress</span>
          </div>
        </div>

        {/* Metric 3: Target Role Readiness */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Career Readiness
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF1E6] text-[#8F5518] border border-[#F2DECA]">
                Live Diagnostic
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 font-editorial tracking-tight">
                {(skillGapAnalysis as any)?.readinessScore || 70}
              </span>
              <span className="text-xs text-stone-400 font-medium">/ 100</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-stone-600 line-clamp-1">
            Aligned for {profile.target_role} entry criteria
          </p>
        </div>

        {/* Metric 4: Timeline Duration */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Roadmap Timeline
              </span>
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mt-2 font-editorial">
              {roadmap?.duration || selectedDuration}
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Paced for realistic college & fresher schedules
            </p>
          </div>
          <button
            onClick={() => setRegenerateModalOpen(true)}
            className="mt-3 pt-2 border-t border-[#F2ECE4] text-xs font-semibold text-[#C85A32] hover:text-[#B24E2A] flex items-center justify-between cursor-pointer"
          >
            <span>Change Duration</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Sub-Tab Navigation: Timeline | Skills | Projects | Achievements */}
      <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-1 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveSubTab("timeline")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === "timeline"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-[#F2ECE4]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stages & Tasks ({roadmap?.stages?.length || 7})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("skills")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === "skills"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-[#F2ECE4]"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Skill Progress ({roadmap?.skillProgressList?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("projects")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === "projects"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-[#F2ECE4]"
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Recommended Projects ({roadmap?.projectRecommendations?.length || 2})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("achievements")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === "achievements"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-[#F2ECE4]"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Milestones & Badges</span>
          </button>
        </div>

        {activeSubTab === "timeline" && (
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => toggleAllStages(true)}
              className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-stone-300">•</span>
            <button
              onClick={() => toggleAllStages(false)}
              className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: TIMELINE / STAGES & TASKS */}
      {activeSubTab === "timeline" && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tasks by title, skill, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E0D9CE] bg-[#FAF8F5] text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#C85A32] focus:bg-white transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <span className="text-[11px] font-semibold text-stone-400 shrink-0 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                {[
                  { id: "all", label: "All" },
                  { id: "Not Started", label: "To Do" },
                  { id: "In Progress", label: "In Progress" },
                  { id: "Completed", label: "Done" },
                  { id: "high_priority", label: "🔥 High Priority" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      statusFilter === s.id
                        ? "bg-[#C85A32] text-white"
                        : "bg-[#F5F2EC] text-stone-600 hover:bg-[#EBE6DD]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-[#F2ECE4]">
              <span className="text-[11px] font-semibold text-stone-400 shrink-0 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> Category:
              </span>
              {[
                { id: "all", label: "All Categories" },
                { id: "skills", label: "Skills" },
                { id: "projects", label: "Projects" },
                { id: "resume", label: "Resume" },
                { id: "interview", label: "Interview" },
                { id: "jobs", label: "Jobs" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    categoryFilter === c.id
                      ? "bg-stone-900 text-white"
                      : "bg-[#FAF8F5] text-stone-600 border border-[#E7E2DA] hover:bg-[#EFEAE2]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-12 text-center bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA]">
              <RefreshCw className="w-8 h-8 text-[#C85A32] animate-spin mx-auto mb-3" />
              <h4 className="text-sm font-bold text-stone-800">Generating Your AI Career Journey...</h4>
              <p className="text-xs text-stone-500 mt-1">Analyzing profile, skills, ATS resume, and live market benchmarks.</p>
            </div>
          )}

          {/* Stages List */}
          {!isLoading && filteredStages.length === 0 && (
            <div className="p-12 text-center bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA]">
              <Search className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-stone-800">No tasks match your filters</h4>
              <p className="text-xs text-stone-500 mt-1">Try resetting your search query or status filter.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
                className="mt-4 px-4 py-1.5 rounded-xl bg-[#F0ECE4] text-xs font-semibold text-stone-800 hover:bg-[#E4DED4]"
              >
                Clear Filters
              </button>
            </div>
          )}

          {!isLoading && (
            <div className="space-y-4">
              {filteredStages.map((stage, stageIndex) => {
                const isExpanded = !!expandedStages[stage.stageId];
                const stageCompletedTasks = stage.tasks.filter((t) => t.status === "Completed").length;
                const stageTotalTasks = stage.tasks.length;
                const stagePercent =
                  stageTotalTasks > 0 ? Math.round((stageCompletedTasks / stageTotalTasks) * 100) : 0;
                const isStageComplete = stagePercent === 100 && stageTotalTasks > 0;

                return (
                  <div
                    key={stage.stageId}
                    className={`bg-[#FFFFFF] rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                      isStageComplete
                        ? "border-[#D7E3D5] bg-[#FAFDF9]"
                        : stage.progress > 0
                        ? "border-[#C85A32]/40 ring-1 ring-[#C85A32]/10"
                        : "border-[#E7E2DA]"
                    }`}
                  >
                    {/* Stage Header Accordion Toggle */}
                    <div
                      onClick={() => toggleStage(stage.stageId)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF8F5]/80 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs border ${
                            isStageComplete
                              ? "bg-[#EFF4EE] text-[#395C3E] border-[#D7E3D5]"
                              : stage.progress > 0
                              ? "bg-[#C85A32] text-white border-[#B24E2A]"
                              : "bg-[#F0ECE4] text-stone-700 border-[#E0D9CE]"
                          }`}
                        >
                          {isStageComplete ? (
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            stageIndex + 1
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-stone-900 font-editorial tracking-tight">
                              {stage.title}
                            </h3>
                            {isStageComplete && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF4EE] text-[#395C3E] border border-[#D7E3D5]">
                                Completed
                              </span>
                            )}
                            {!isStageComplete && stage.progress > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBEFE9] text-[#C85A32] border border-[#F3DACF]">
                                In Progress
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5 max-w-xl line-clamp-1">
                            {stage.description}
                          </p>
                        </div>
                      </div>

                      {/* Stage Progress & Chevron */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="text-xs font-bold text-stone-900">
                            {stageCompletedTasks} / {stageTotalTasks}
                          </span>
                          <span className="text-[11px] text-stone-400 ml-1.5 font-medium">
                            Tasks ({stagePercent}%)
                          </span>
                          <div className="w-24 h-1.5 rounded-full bg-[#F0ECE4] mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isStageComplete ? "bg-[#395C3E]" : "bg-[#C85A32]"
                              }`}
                              style={{ width: `${stagePercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-center text-stone-500">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stage Tasks Body */}
                    {isExpanded && (
                      <div className="border-t border-[#F2ECE4] p-4 sm:p-5 bg-[#FAF8F5]/50 space-y-3">
                        {stage.tasks.map((task) => {
                          const isDone = task.status === "Completed";
                          const isInProgress = task.status === "In Progress";
                          const catBadge = getCategoryBadge(task.category);
                          const priorityClass = getPriorityBadge(task.priority);

                          return (
                            <div
                              key={task.taskId}
                              className={`rounded-xl border p-4 transition-all duration-200 bg-[#FFFFFF] shadow-2xs ${
                                isDone
                                  ? "border-[#E4DFD7] bg-[#FAFAF8] opacity-85"
                                  : isInProgress
                                  ? "border-[#C85A32]/50 ring-1 ring-[#C85A32]/15"
                                  : "border-[#EDE8E0] hover:border-[#DED6CA]"
                              }`}
                            >
                              <div className="flex items-start gap-3.5">
                                {/* Interactive Status Checkbox Button */}
                                <button
                                  onClick={() =>
                                    handleToggleTaskStatus(stage.stageId, task.taskId, task.status)
                                  }
                                  disabled={pendingTaskId === task.taskId}
                                  className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                    isDone
                                      ? "bg-[#395C3E] text-white border border-[#395C3E]"
                                      : isInProgress
                                      ? "bg-[#FAF1E6] text-[#C85A32] border-2 border-[#C85A32]"
                                      : "border-2 border-[#D5CEC2] hover:border-stone-500 bg-white"
                                  }`}
                                  title={
                                    isDone
                                      ? "Mark as Not Started"
                                      : isInProgress
                                      ? "Mark as Completed"
                                      : "Start Task (In Progress)"
                                  }
                                >
                                  {isDone && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                  {isInProgress && <span className="w-2 h-2 rounded-full bg-[#C85A32]" />}
                                </button>

                                {/* Task Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4
                                        className={`text-xs sm:text-sm font-bold text-stone-900 ${
                                          isDone ? "line-through text-stone-500" : ""
                                        }`}
                                      >
                                        {task.title}
                                      </h4>

                                      {/* Category Pill */}
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${catBadge.bg}`}
                                      >
                                        <catBadge.icon className="w-3 h-3" />
                                        <span>{catBadge.label}</span>
                                      </span>

                                      {/* Priority Pill */}
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priorityClass}`}
                                      >
                                        {task.priority} Priority
                                      </span>
                                    </div>

                                    {/* Estimated Duration */}
                                    <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-stone-400" />
                                      <span>{task.estimatedDuration}</span>
                                    </span>
                                  </div>

                                  {/* Description */}
                                  <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                                    {task.description}
                                  </p>

                                  {/* Grounded Reason */}
                                  {task.reason && (
                                    <div className="mt-2 text-[11px] text-stone-600 bg-[#FAF8F5] p-2.5 rounded-lg border border-[#EDE8E0] flex items-start gap-2">
                                      <Lightbulb className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                                      <span>
                                        <strong className="text-stone-800 font-semibold">Why this matters: </strong>
                                        {task.reason}
                                      </span>
                                    </div>
                                  )}

                                  {/* Skills Tags & Context Action */}
                                  <div className="mt-3 pt-2.5 border-t border-[#F5F2EC] flex flex-wrap items-center justify-between gap-3">
                                    {/* Skill Tags */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[10px] font-semibold uppercase text-stone-400 mr-1">
                                        Skills:
                                      </span>
                                      {(task.skills || []).map((sk) => (
                                        <span
                                          key={sk}
                                          className="px-2 py-0.5 rounded-md bg-[#F0ECE4] text-stone-700 text-[10px] font-medium"
                                        >
                                          {sk}
                                        </span>
                                      ))}
                                    </div>

                                    {/* Context Actions */}
                                    <div className="flex items-center gap-2">
                                      {/* Status toggle text button */}
                                      <button
                                        onClick={() =>
                                          handleToggleTaskStatus(stage.stageId, task.taskId, task.status)
                                        }
                                        className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 underline underline-offset-2 cursor-pointer"
                                      >
                                        {isDone ? "Reopen" : isInProgress ? "Mark Done" : "Start Task"}
                                      </button>

                                      {/* Quick Deep Link into Relevant Tab */}
                                      <button
                                        onClick={() => handleTaskActionClick(task)}
                                        className="px-2.5 py-1 rounded-lg bg-[#FAF0EB] text-[#C85A32] hover:bg-[#F4DFD5] text-[11px] font-semibold border border-[#F2D7CC] flex items-center gap-1 cursor-pointer transition-colors"
                                      >
                                        <span>
                                          {task.category === "skills"
                                            ? "Practice Skill"
                                            : task.category === "resume"
                                            ? "Open Resume"
                                            : task.category === "interview"
                                            ? "Mock Interview"
                                            : task.category === "jobs"
                                            ? "View Jobs"
                                            : "Open Dashboard"}
                                        </span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>

                                      {/* Ask AI Advisor about this task */}
                                      <button
                                        onClick={() => onNavigate("assistant")}
                                        className="p-1 rounded-lg text-stone-400 hover:text-[#C85A32] hover:bg-[#FBEFE9] transition-colors"
                                        title="Ask JobPlanner AI how to tackle this task"
                                      >
                                        <Bot className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Optional Learning Resources */}
                                  {task.resources && task.resources.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-dashed border-[#EDE8E0] flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] font-semibold uppercase text-stone-400">
                                        Resource:
                                      </span>
                                      {task.resources.map((resItem, rIdx) => (
                                        <span
                                          key={rIdx}
                                          className="text-[11px] text-[#245285] font-medium flex items-center gap-1"
                                        >
                                          <BookOpen className="w-3 h-3 text-[#245285]" />
                                          <span>{resItem.title}</span>
                                          {resItem.provider && (
                                            <span className="text-stone-400 text-[10px]">
                                              ({resItem.provider})
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: SKILL PROGRESS TRACKER */}
      {activeSubTab === "skills" && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE6DC]">
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-editorial">
                  Skill Competency Matrix for {profile.target_role}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Track your mastery progress from foundation to production-ready readiness.
                </p>
              </div>
              <button
                onClick={() => onNavigate("skillgap")}
                className="px-3.5 py-1.5 rounded-xl bg-[#FAF0EB] text-[#C85A32] hover:bg-[#F4DFD5] text-xs font-semibold border border-[#F2D7CC] flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>Run Skill Gap Diagnostic</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {(roadmap?.skillProgressList || []).map((skItem, skIdx) => {
                const isMastered = skItem.status === "Mastered";
                const isInProgress = skItem.status === "In Progress";

                return (
                  <div
                    key={skIdx}
                    className="p-4 rounded-xl border border-[#EDE8E0] bg-[#FAF8F5] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900">{skItem.skill}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isMastered
                              ? "bg-[#EFF4EE] text-[#395C3E] border-[#D7E3D5]"
                              : isInProgress
                              ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                              : "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]"
                          }`}
                        >
                          {skItem.status}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                        <span>Target Level: {skItem.targetLevel || "Proficient"}</span>
                        <span>{skItem.progress}% Mastery</span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-[#E5DFD5] mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isMastered ? "bg-[#395C3E]" : "bg-[#C85A32]"
                          }`}
                          style={{ width: `${skItem.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#EDE8E0] flex items-center justify-between text-[11px]">
                      <span className="text-stone-400 font-medium">Priority: {skItem.priority}</span>
                      <button
                        onClick={() => onNavigate("skillgap")}
                        className="text-[#C85A32] font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Practice</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: RECOMMENDED PRACTICAL PROJECTS */}
      {activeSubTab === "projects" && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-2xs">
            <div className="pb-4 border-b border-[#ECE6DC]">
              <h3 className="text-lg font-bold text-stone-900 font-editorial">
                Practical Project Recommendations
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Build verifiable proof points tailored for {profile.target_role} campus & entry-level hiring.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {(roadmap?.projectRecommendations || []).map((proj, pIdx) => (
                <div
                  key={proj.id || pIdx}
                  className="rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] p-5 flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0EB] text-[#C85A32] border border-[#F2D7CC]">
                        {proj.difficulty} Level
                      </span>
                      <span className="text-xs text-stone-400 font-medium">Capstone</span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-stone-900 mt-2 font-editorial">
                      {proj.title}
                    </h4>
                    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                      {proj.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(proj.skills || []).map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#E0D9CE] text-stone-700 text-[10px] font-medium"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>

                    {proj.expectedOutcome && (
                      <div className="mt-3 p-3 rounded-xl bg-[#FFFFFF] border border-[#EDE8E0] text-[11px] text-stone-600">
                        <strong className="text-stone-800 font-semibold block mb-0.5">Expected Deliverable:</strong>
                        {proj.expectedOutcome}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#EDE8E0] flex items-center justify-between">
                    <span className="text-[11px] text-stone-500">Portfolio Proof</span>
                    <button
                      onClick={() => onNavigate("assistant")}
                      className="text-xs font-semibold text-[#C85A32] hover:text-[#B24E2A] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ask AI How to Build</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: MILESTONES & ACHIEVEMENTS */}
      {activeSubTab === "achievements" && (
        <div className="space-y-6">
          {/* Milestones Card */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-2xs">
            <h3 className="text-lg font-bold text-stone-900 font-editorial">
              Career Journey Milestones
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              High-level checkpoints determining your interview and placement qualification.
            </p>

            <div className="mt-5 space-y-3">
              {(roadmap?.milestones || []).map((ms) => (
                <div
                  key={ms.id}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                    ms.completed
                      ? "bg-[#FAFDF9] border-[#D7E3D5]"
                      : "bg-[#FAF8F5] border-[#EDE8E0]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        ms.completed
                          ? "bg-[#395C3E] text-white border-[#395C3E]"
                          : "bg-[#F0ECE4] text-stone-400 border-[#E0D9CE]"
                      }`}
                    >
                      {ms.completed ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <Target className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4
                        className={`text-xs sm:text-sm font-bold ${
                          ms.completed ? "text-stone-900" : "text-stone-700"
                        }`}
                      >
                        {ms.title}
                      </h4>
                      <p className="text-[11px] text-stone-500">{ms.description}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 border ${
                      ms.completed
                        ? "bg-[#EFF4EE] text-[#395C3E] border-[#D7E3D5]"
                        : "bg-[#F3F4F6] text-stone-500 border-[#E5E7EB]"
                    }`}
                  >
                    {ms.completed ? "Achieved" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lightweight Achievements Badges */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-2xs">
            <h3 className="text-lg font-bold text-stone-900 font-editorial">
              Earned Badges & Credentials
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Professional achievements unlocked by your verifiable actions inside JobPlanner.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(roadmap?.achievements || []).map((ach) => (
                <div
                  key={ach.id}
                  className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                    ach.unlocked
                      ? "bg-[#FFFDF9] border-[#C85A32]/30 shadow-2xs"
                      : "bg-[#FAF8F5] border-[#EDE8E0] opacity-60"
                  }`}
                >
                  <div className="text-2xl shrink-0 p-2 rounded-xl bg-white border border-[#E7E2DA] shadow-2xs">
                    {ach.badge}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-stone-900">{ach.title}</h4>
                      {ach.unlocked && (
                        <span className="w-2 h-2 rounded-full bg-[#395C3E]" title="Unlocked" />
                      )}
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                      {ach.description}
                    </p>
                    <span className="text-[10px] text-stone-400 font-medium block mt-1.5">
                      Criteria: {ach.criteria}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Career Assistant Recommendation Card (cross-link) */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C85A32] bg-[#FAF3EC] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
              AI Career Assistant
            </span>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 mt-1 font-editorial">
              Need Help Tackling Your Roadmap Tasks?
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Ask JobPlanner AI why any task is recommended, request a step-by-step tutorial, or simulate mock interview drills tailored to your next milestone.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate("assistant")}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#FDEEE8]" />
          <span>Consult AI Advisor</span>
        </button>
      </div>

      {/* MODAL 1: AI "WHAT SHOULD I DO NEXT?" */}
      {whatNextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#E7E2DA] max-w-lg w-full p-6 sm:p-7 shadow-xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE8E0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C85A32] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-stone-900 font-editorial">
                  AI Recommended Next Action
                </h3>
              </div>
              <button
                onClick={() => setWhatNextModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {whatNextLoading && (
              <div className="p-8 text-center space-y-2">
                <RefreshCw className="w-7 h-7 text-[#C85A32] animate-spin mx-auto" />
                <p className="text-xs font-bold text-stone-700">Evaluating your active roadmap momentum...</p>
              </div>
            )}

            {!whatNextLoading && whatNextData && (
              <div className="space-y-4">
                <div className="bg-[#FFFBF8] border border-[#F3DACF] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FBEFE9] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
                      Highest Leverage Step
                    </span>
                    <span className="text-[11px] font-bold text-[#C85A32]">
                      {whatNextData.urgency || "High"} Urgency
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold text-stone-900 font-editorial leading-tight">
                    {whatNextData.primaryAction}
                  </h4>

                  <p className="text-xs text-stone-700 leading-relaxed">
                    {whatNextData.reason}
                  </p>
                </div>

                {whatNextData.tips && whatNextData.tips.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] space-y-1.5">
                    <span className="text-[11px] font-bold text-stone-700 block">
                      Recommended Strategy:
                    </span>
                    {whatNextData.tips.map((tip, tIdx) => (
                      <div key={tIdx} className="flex items-start gap-2 text-xs text-stone-600">
                        <Check className="w-3.5 h-3.5 text-[#395C3E] shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setWhatNextModalOpen(false);
                      if (whatNextData.suggestedTab) {
                        onNavigate(whatNextData.suggestedTab);
                      }
                    }}
                    className="w-full sm:flex-1 px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{whatNextData.actionLabel || "Execute Action"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setWhatNextModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#E0D9CE] text-stone-700 text-xs font-medium hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: REGENERATE ROADMAP */}
      {regenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#E7E2DA] max-w-md w-full p-6 sm:p-7 shadow-xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE8E0]">
              <h3 className="text-base font-bold text-stone-900 font-editorial">
                Regenerate Career Roadmap
              </h3>
              <button
                onClick={() => setRegenerateModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              JobPlanner AI will recalibrate your 7 career stages against your latest verified skills, resume status, and mock interview performance.
            </p>

            {/* Duration Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-800 block">
                Target Roadmap Timeline
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["2 Weeks", "1 Month", "3 Months", "6 Months"] as RoadmapDuration[]).map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setRegenDuration(dur)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      regenDuration === dur
                        ? "bg-[#FAF0EB] text-[#C85A32] border-[#C85A32]"
                        : "bg-[#FAF8F5] text-stone-700 border-[#E7E2DA] hover:bg-[#EFEAE2]"
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* Preserve Completed Tasks Checkbox */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] flex items-start gap-3">
              <input
                type="checkbox"
                id="preserveCompletedCheckbox"
                checked={preserveCompleted}
                onChange={(e) => setPreserveCompleted(e.target.checked)}
                className="mt-0.5 rounded text-[#C85A32] focus:ring-[#C85A32] cursor-pointer"
              />
              <label
                htmlFor="preserveCompletedCheckbox"
                className="text-xs text-stone-700 leading-snug cursor-pointer select-none"
              >
                <strong className="text-stone-900 block font-semibold">Preserve Completed Tasks</strong>
                Carry over all {completedTasks} previously completed tasks so you do not lose progress.
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleGenerateRoadmap(regenDuration, preserveCompleted)}
                disabled={isGenerating}
                className="flex-1 px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{isGenerating ? "Regenerating..." : "Confirm & Regenerate"}</span>
              </button>
              <button
                onClick={() => setRegenerateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E0D9CE] text-stone-700 text-xs font-medium hover:bg-[#FAF8F5] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ROADMAP HISTORY */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#E7E2DA] max-w-lg w-full p-6 sm:p-7 shadow-xl space-y-5 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE8E0] shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#C85A32]" />
                <h3 className="text-base font-bold text-stone-900 font-editorial">
                  Roadmap Version History
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {historyLoading && (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 text-[#C85A32] animate-spin mx-auto mb-2" />
                  <p className="text-xs text-stone-500">Loading version snapshots...</p>
                </div>
              )}

              {!historyLoading && historyRecords.length === 0 && (
                <div className="p-8 text-center text-stone-500 text-xs">
                  No previous roadmap archives found. When you regenerate your roadmap, snapshots are automatically archived here.
                </div>
              )}

              {!historyLoading &&
                historyRecords.map((rec) => (
                  <div
                    key={rec.roadmapId}
                    className="p-4 rounded-xl border border-[#EDE8E0] bg-[#FAF8F5] flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        {rec.targetRole} • {rec.duration}
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {new Date(rec.updatedAt || rec.createdAt).toLocaleDateString()} •{" "}
                        {rec.completedTasksCount || 0} tasks completed ({rec.overallProgress || 0}%)
                      </p>
                    </div>

                    <button
                      onClick={() => handleRestoreArchived(rec)}
                      className="px-3 py-1 rounded-lg bg-[#FFFFFF] border border-[#E0D9CE] text-stone-700 hover:bg-[#FAF8F5] text-xs font-medium cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t border-[#EDE8E0] shrink-0">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="w-full py-2 rounded-xl border border-[#E0D9CE] text-xs font-semibold text-stone-700 hover:bg-[#FAF8F5]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
