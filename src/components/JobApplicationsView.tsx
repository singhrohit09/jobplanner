import React, { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  ExternalLink,
  MessageSquareCode,
  FileText,
  Trash2,
  Edit3,
  TrendingUp,
  Award,
  ChevronLeft,
  X,
  Send,
  Building2,
  MapPin,
  Flame,
  Check,
  RotateCcw,
  Zap,
  Target,
  FileCheck,
  FolderKanban,
  LayoutGrid,
  List as ListIcon,
  HelpCircle,
  Calculator,
  Scale,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { OfferCalculatorModal } from "./OfferCalculatorModal";
import {
  JobApplication,
  JobApplicationStatus,
  JobApplicationPriority,
  AIApplicationInsights,
  UserProfile,
  JobListing,
  ResumeData,
  StatusHistoryEntry,
} from "../types";
import {
  getJobApplicationsFromFirestore,
  saveJobApplicationToFirestore,
  updateJobApplicationStatusInFirestore,
  deleteJobApplicationFromFirestore,
} from "../lib/firebase";

export interface JobApplicationsViewProps {
  profile: UserProfile;
  currentUser?: FirebaseUser | null;
  onNavigate: (tab: string, context?: any) => void;
  onOpenAuth?: () => void;
  jobs?: JobListing[];
  resume?: ResumeData | null;
  careerReadinessScore?: number | null;
  initialApplicationToTrack?: Partial<JobApplication> | null;
  onClearInitialApplicationToTrack?: () => void;
}

const ALL_STATUSES: JobApplicationStatus[] = [
  "Saved",
  "Applied",
  "Screening",
  "Assessment",
  "Interview",
  "Final Interview",
  "Offer",
  "Accepted",
  "Rejected",
  "Withdrawn",
];

const KANBAN_COLUMNS: Array<{
  id: string;
  title: string;
  statuses: JobApplicationStatus[];
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}> = [
  {
    id: "saved",
    title: "Saved",
    statuses: ["Saved"],
    color: "#6B7280",
    badgeBg: "#F3F4F6",
    badgeText: "#374151",
    badgeBorder: "#E5E7EB",
  },
  {
    id: "applied",
    title: "Applied",
    statuses: ["Applied"],
    color: "#2563EB",
    badgeBg: "#EFF6FF",
    badgeText: "#1D4ED8",
    badgeBorder: "#DBEAFE",
  },
  {
    id: "screening_assessment",
    title: "Screening & Assessment",
    statuses: ["Screening", "Assessment"],
    color: "#7C3AED",
    badgeBg: "#F5F3FF",
    badgeText: "#6D28D9",
    badgeBorder: "#EDE9FE",
  },
  {
    id: "interview",
    title: "Interviewing",
    statuses: ["Interview", "Final Interview"],
    color: "#C85A32",
    badgeBg: "#FDF4EF",
    badgeText: "#A64522",
    badgeBorder: "#F6DDD1",
  },
  {
    id: "offer",
    title: "Offers & Placed",
    statuses: ["Offer", "Accepted"],
    color: "#059669",
    badgeBg: "#ECFDF5",
    badgeText: "#047857",
    badgeBorder: "#D1FAE5",
  },
  {
    id: "closed",
    title: "Closed",
    statuses: ["Rejected", "Withdrawn"],
    color: "#9CA3AF",
    badgeBg: "#F9FAFB",
    badgeText: "#6B7280",
    badgeBorder: "#E5E7EB",
  },
];

export const JobApplicationsView: React.FC<JobApplicationsViewProps> = ({
  profile,
  currentUser,
  onNavigate,
  onOpenAuth,
  jobs = [],
  resume,
  careerReadinessScore = null,
  initialApplicationToTrack,
  onClearInitialApplicationToTrack,
}) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "match" | "company" | "deadline">("recent");

  // Modals & Panels
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [strategyReport, setStrategyReport] = useState<any | null>(null);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false);

  // Offer Calculator
  const [isOfferCalculatorOpen, setIsOfferCalculatorOpen] = useState(false);
  const [offerCalculatorApp, setOfferCalculatorApp] = useState<JobApplication | null>(null);

  // Status note modal
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    app: JobApplication;
    nextStatus: JobApplicationStatus;
    note: string;
  } | null>(null);

  // AI Insights
  const [aiInsights, setAiInsights] = useState<AIApplicationInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Load applications from Firestore / Cache
  useEffect(() => {
    let isMounted = true;
    async function loadApps() {
      setLoading(true);
      try {
        const apps = await getJobApplicationsFromFirestore(currentUser?.uid || "");
        if (isMounted) {
          setApplications(apps);
        }
      } catch (err) {
        console.warn("Notice loading job applications:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadApps();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // Handle pre-fill from Job Recommendations if passed
  useEffect(() => {
    if (initialApplicationToTrack) {
      setEditingApplication({
        applicationId: `app_${Date.now()}`,
        userId: currentUser?.uid || "guest",
        company: initialApplicationToTrack.company || "",
        jobTitle: initialApplicationToTrack.jobTitle || "",
        jobUrl: initialApplicationToTrack.jobUrl || "",
        location: initialApplicationToTrack.location || "Remote",
        workMode: initialApplicationToTrack.workMode || "Remote",
        status: initialApplicationToTrack.status || "Applied",
        applicationDate: new Date().toISOString().split("T")[0],
        matchScore: initialApplicationToTrack.matchScore || 80,
        matchingSkills: initialApplicationToTrack.matchingSkills || [],
        missingSkills: initialApplicationToTrack.missingSkills || [],
        jobDescription: initialApplicationToTrack.jobDescription || "",
        salary: initialApplicationToTrack.salary || "",
        priority: initialApplicationToTrack.priority || "High",
        statusHistory: [
          {
            status: initialApplicationToTrack.status || "Applied",
            timestamp: new Date().toISOString(),
            note: "Tracked from Job Opportunities",
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsAddModalOpen(true);
      if (onClearInitialApplicationToTrack) {
        onClearInitialApplicationToTrack();
      }
    }
  }, [initialApplicationToTrack, currentUser?.uid, onClearInitialApplicationToTrack]);

  // Load AI Insights whenever applications change
  useEffect(() => {
    if (applications.length === 0) {
      setAiInsights(null);
      return;
    }

    let isMounted = true;
    async function fetchInsights() {
      setLoadingInsights(true);
      try {
        const res = await fetch("/api/ai/job-applications/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applications,
            profile: {
              targetRole: profile?.target_role || "Software Engineer",
              skills: profile?.skills || [],
            },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && typeof data === "object") {
            setAiInsights(data);
          }
        }
      } catch (e) {
        console.warn("Notice fetching application insights:", e);
      } finally {
        if (isMounted) setLoadingInsights(false);
      }
    }

    fetchInsights();
    return () => {
      isMounted = false;
    };
  }, [applications, profile?.target_role, profile?.skills]);

  // Calculate Metrics from Authentic Tracked Data
  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter(
      (a) => !["Rejected", "Withdrawn", "Accepted"].includes(a.status)
    ).length;
    const interviews = applications.filter(
      (a) => ["Interview", "Final Interview", "Offer", "Accepted"].includes(a.status)
    ).length;
    const offers = applications.filter(
      (a) => ["Offer", "Accepted"].includes(a.status)
    ).length;
    const rejected = applications.filter((a) => a.status === "Rejected").length;

    const scores = applications
      .map((a) => a.matchScore)
      .filter((s): s is number => typeof s === "number" && s > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    const interviewConversion = total > 0 ? Math.round((interviews / total) * 100) : 0;
    const offerConversion = interviews > 0 ? Math.round((offers / interviews) * 100) : 0;

    return {
      total,
      active,
      interviews,
      offers,
      rejected,
      avgScore,
      interviewConversion,
      offerConversion,
    };
  }, [applications]);

  // Filtered & Sorted applications
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        // Search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesComp = app.company.toLowerCase().includes(term);
          const matchesTitle = app.jobTitle.toLowerCase().includes(term);
          const matchesLoc = (app.location || "").toLowerCase().includes(term);
          const matchesSkills = (app.matchingSkills || []).some((s) =>
            s.toLowerCase().includes(term)
          );
          if (!matchesComp && !matchesTitle && !matchesLoc && !matchesSkills) return false;
        }

        // Status Filter
        if (statusFilter === "active") {
          if (["Rejected", "Withdrawn", "Accepted"].includes(app.status)) return false;
        } else if (statusFilter === "interviews") {
          if (!["Interview", "Final Interview"].includes(app.status)) return false;
        } else if (statusFilter === "needs_action") {
          const appDate = app.applicationDate ? new Date(app.applicationDate) : null;
          const daysOld = appDate
            ? Math.floor((Date.now() - appDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const isStale = app.status === "Applied" && daysOld > 12;
          const isPendingInterview = ["Interview", "Final Interview", "Assessment"].includes(
            app.status
          );
          if (!isStale && !isPendingInterview) return false;
        } else if (statusFilter !== "all") {
          if (app.status !== statusFilter) return false;
        }

        // Priority filter
        if (priorityFilter !== "all" && app.priority !== priorityFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "match") {
          return (b.matchScore || 0) - (a.matchScore || 0);
        }
        if (sortBy === "company") {
          return a.company.localeCompare(b.company);
        }
        if (sortBy === "deadline") {
          const dA = a.deadline || a.assessmentDeadline || a.interviewDate || "9999";
          const dB = b.deadline || b.assessmentDeadline || b.interviewDate || "9999";
          return dA.localeCompare(dB);
        }
        // Default: recent updated / created
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
  }, [applications, searchTerm, statusFilter, priorityFilter, sortBy]);

  // Handle Save (Create or Update)
  const handleSaveApplication = async (appData: Partial<JobApplication>) => {
    const isNew = !applications.some((a) => a.applicationId === appData.applicationId);
    const now = new Date().toISOString();

    const fullApp: JobApplication = {
      applicationId: appData.applicationId || `app_${Date.now()}`,
      userId: currentUser?.uid || "guest",
      company: appData.company?.trim() || "Company",
      jobTitle: appData.jobTitle?.trim() || profile?.target_role || "Role",
      jobUrl: appData.jobUrl?.trim() || "",
      location: appData.location?.trim() || "Remote",
      workMode: appData.workMode || "Remote",
      status: appData.status || "Applied",
      applicationDate: appData.applicationDate || now.split("T")[0],
      deadline: appData.deadline || undefined,
      assessmentDeadline: appData.assessmentDeadline || undefined,
      interviewDate: appData.interviewDate || undefined,
      followUpDate: appData.followUpDate || undefined,
      matchScore: appData.matchScore || 75,
      matchingSkills: appData.matchingSkills || [],
      missingSkills: appData.missingSkills || [],
      jobDescription: appData.jobDescription || "",
      salary: appData.salary || "",
      resumeTitle: appData.resumeTitle || (resume?.personalInfo?.fullName ? "Primary ATS Resume" : undefined),
      priority: appData.priority || "Medium",
      nextAction: appData.nextAction || undefined,
      statusHistory:
        appData.statusHistory && appData.statusHistory.length > 0
          ? appData.statusHistory
          : [
              {
                status: appData.status || "Applied",
                timestamp: now,
                note: isNew ? "Application created" : "Application updated",
              },
            ],
      notes: appData.notes || [],
      contact: appData.contact || undefined,
      createdAt: appData.createdAt || now,
      updatedAt: now,
    };

    // Save to Firestore & local state
    await saveJobApplicationToFirestore(currentUser?.uid || "", fullApp);

    setApplications((prev) => {
      const idx = prev.findIndex((a) => a.applicationId === fullApp.applicationId);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = fullApp;
        return next;
      }
      return [fullApp, ...prev];
    });

    if (selectedApplication?.applicationId === fullApp.applicationId) {
      setSelectedApplication(fullApp);
    }

    setIsAddModalOpen(false);
    setEditingApplication(null);
  };

  // Handle Quick Status Shift
  const handleQuickStatusUpdate = async (
    app: JobApplication,
    newStatus: JobApplicationStatus,
    note?: string
  ) => {
    if (app.status === newStatus) return;

    const updatedApp = await updateJobApplicationStatusInFirestore(
      currentUser?.uid || "",
      app.applicationId,
      newStatus,
      note
    );

    if (updatedApp) {
      setApplications((prev) =>
        prev.map((a) => (a.applicationId === app.applicationId ? updatedApp : a))
      );
      if (selectedApplication?.applicationId === app.applicationId) {
        setSelectedApplication(updatedApp);
      }
    }
  };

  // Handle Delete
  const handleDeleteApplication = async (applicationId: string) => {
    if (!window.confirm("Are you sure you want to delete this tracked application?")) return;

    await deleteJobApplicationFromFirestore(currentUser?.uid || "", applicationId);
    setApplications((prev) => prev.filter((a) => a.applicationId !== applicationId));
    if (selectedApplication?.applicationId === applicationId) {
      setSelectedApplication(null);
    }
  };

  // AI Strategy Evaluator
  const handleOpenStrategy = async () => {
    setIsStrategyModalOpen(true);
    setIsLoadingStrategy(true);
    try {
      const res = await fetch("/api/ai/job-applications/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applications,
          profile: {
            targetRole: profile?.target_role || "Software Engineer",
          },
          careerReadiness: careerReadinessScore,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStrategyReport(data);
      }
    } catch (e) {
      console.warn("Notice fetching application strategy:", e);
    } finally {
      setIsLoadingStrategy(false);
    }
  };

  return (
    <div className="space-y-7 pb-20">
      {/* Top Header & Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E2DA] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FBEFE9] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
              Application Tracker
            </span>
            <span className="text-xs text-stone-500 font-medium">Pipeline & Funnel Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
            Job Applications
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Manage your entire job search journey from saved openings to accepted offers. Monitor
            milestones, organize interview prep, and optimize your application conversion rate.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => {
              setOfferCalculatorApp(null);
              setIsOfferCalculatorOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F0ECE4] text-stone-800 text-xs font-semibold border border-[#DED7CD] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Calculator className="w-4 h-4 text-[#C85A32]" />
            <span>Offer & Salary Calculator</span>
            {stats.offers > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-bold border border-[#C8E6C9]">
                {stats.offers}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenStrategy}
            className="px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F0ECE4] text-stone-800 text-xs font-semibold border border-[#DED7CD] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-[#A64522]" />
            <span>Improve Strategy</span>
          </button>

          <button
            onClick={() => {
              setEditingApplication(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Metrics Funnel Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Total Applications
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-stone-900 font-editorial">
              {stats.total}
            </span>
            <span className="text-[11px] text-stone-500 font-medium">tracked</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Active Pipelines
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#2563EB] font-editorial">
              {stats.active}
            </span>
            <span className="text-[11px] text-stone-500 font-medium">in motion</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Interviews
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#C85A32] font-editorial">
              {stats.interviews}
            </span>
            <span className="text-[11px] text-stone-500 font-medium">secured</span>
          </div>
        </div>

        <div
          onClick={() => {
            setOfferCalculatorApp(null);
            setIsOfferCalculatorOpen(true);
          }}
          className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-2xs cursor-pointer hover:border-[#C85A32]/40 transition-colors group"
          title="Open Offer & Salary Calculator"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 group-hover:text-[#C85A32] transition-colors flex items-center justify-between">
            <span>Offers Made</span>
            <Calculator className="w-3 h-3 text-[#C85A32] opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#059669] font-editorial">
              {stats.offers}
            </span>
            <span className="text-[11px] text-stone-500 font-medium">received</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Interview Rate
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-stone-900 font-editorial">
              {stats.total > 0 ? `${stats.interviewConversion}%` : "—"}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Avg Match Score
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-stone-900 font-editorial">
              {stats.avgScore ? `${stats.avgScore}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* AI Insights & Attention Needed Alert Banner */}
      {aiInsights && (
        <div className="rounded-2xl bg-[#FFFDF9] border-2 border-[#C85A32]/25 p-5 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#C85A32] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  AI Application Health Check
                </h3>
                <p className="text-xs text-stone-700 mt-0.5 font-medium">
                  {aiInsights.overallHealthVerdict}
                </p>
              </div>
            </div>

            {loadingInsights && (
              <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3 animate-spin" />
                Analyzing pipeline...
              </span>
            )}
          </div>

          {/* Attention Items if present */}
          {aiInsights.attentionApplications && aiInsights.attentionApplications.length > 0 && (
            <div className="pt-2 border-t border-[#F0E6D8] space-y-2">
              <span className="text-[11px] font-bold text-[#A64522] uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Needs Immediate Attention ({aiInsights.attentionApplications.length}):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {aiInsights.attentionApplications.slice(0, 4).map((att, i) => {
                  const targetApp = applications.find((a) => a.applicationId === att.applicationId);
                  return (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#EDE4D6] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900 truncate">{att.company}</span>
                          <span className="text-stone-300">•</span>
                          <span className="text-stone-600 truncate">{att.jobTitle}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                          {att.reason} — <strong className="text-stone-700">{att.recommendedAction}</strong>
                        </p>
                      </div>

                      {targetApp && (
                        <button
                          onClick={() => setSelectedApplication(targetApp)}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F2ECE4] text-[11px] font-semibold text-[#A64522] border border-[#E0D7CC] shrink-0 cursor-pointer"
                        >
                          View
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Frequent skills badge list */}
          {aiInsights.frequentSkills && aiInsights.frequentSkills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F0E6D8] text-xs">
              <span className="text-[11px] font-semibold text-stone-500 mr-1">
                Top skills demanded in your applications:
              </span>
              {aiInsights.frequentSkills.map((sk) => (
                <span
                  key={sk.skill}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF1E8] text-[#8C4A2F] border border-[#F2DECA]"
                >
                  {sk.skill} ({sk.count} roles)
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Control Bar: Search, Filters & View Toggle */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company, job title, location, or required skill..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] focus:outline-none focus:border-[#C85A32] text-stone-900 placeholder:text-stone-400 text-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View mode toggle & Sort */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <span className="text-stone-400 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-800 font-medium focus:outline-none focus:border-[#C85A32]"
            >
              <option value="recent">Recently Updated</option>
              <option value="match">Highest Match Score</option>
              <option value="deadline">Upcoming Deadline</option>
              <option value="company">Company Name</option>
            </select>

            {/* Kanban vs List Switcher */}
            <div className="flex items-center p-1 bg-[#F2EDE5] rounded-xl border border-[#E2D9CC] ml-2">
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  viewMode === "kanban"
                    ? "bg-[#FFFFFF] text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
                title="Pipeline Board View"
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pipeline</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  viewMode === "list"
                    ? "bg-[#FFFFFF] text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
                title="List Table View"
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F2ECE4]">
          <span className="text-stone-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-stone-400" />
            Status:
          </span>

          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active Pipelines" },
            { id: "interviews", label: "Interviews" },
            { id: "needs_action", label: "Needs Action" },
            { id: "Saved", label: "Saved" },
            { id: "Applied", label: "Applied" },
            { id: "Screening", label: "Screening" },
            { id: "Assessment", label: "Assessment" },
            { id: "Offer", label: "Offer" },
            { id: "Rejected", label: "Rejected" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                statusFilter === pill.id
                  ? "bg-[#C85A32] text-white"
                  : "bg-[#FAF8F5] text-stone-600 hover:bg-[#F2ECE4] border border-[#E7E2DA]"
              }`}
            >
              {pill.label}
            </button>
          ))}

          {/* Priority filter */}
          <div className="ml-auto flex items-center gap-1.5 text-[11px]">
            <span className="text-stone-400 font-medium">Priority:</span>
            {["all", "High", "Medium", "Low"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  priorityFilter === p
                    ? "bg-stone-900 text-white"
                    : "bg-[#FAF8F5] text-stone-500 hover:text-stone-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Pipeline Kanban View OR List View */}
      {applications.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-[#EDE7DD] bg-[#FFFFFF] p-8 sm:p-14 text-center max-w-xl mx-auto my-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#FBEFE9] text-[#C85A32] flex items-center justify-center mx-auto mb-4 border border-[#F3DACF]">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 font-editorial">
            No job applications tracked yet.
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
            Take full control of your job search. Track your applied roles, log interview dates, and
            get AI suggestions for the next best action on each opportunity.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setEditingApplication(null);
                setIsAddModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Track Your First Application</span>
            </button>
            <button
              onClick={() => onNavigate("jobs")}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E0D7CC] text-stone-700 hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Explore Recommended Jobs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] shadow-xs">
          <p className="text-sm font-semibold text-stone-800">No applications match your filters.</p>
          <p className="text-xs text-stone-500 mt-1">
            Try adjusting your search query or reset status filters.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setPriorityFilter("all");
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-xs font-semibold text-stone-700 hover:bg-[#F2ECE4] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban Pipeline View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const colApps = filteredApplications.filter((a) => col.statuses.includes(a.status));
            return (
              <div
                key={col.id}
                className="bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] p-3 flex flex-col min-w-[260px] shadow-2xs"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E7E2DA]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <h4 className="text-xs font-bold text-stone-900">{col.title}</h4>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-bold border"
                    style={{
                      backgroundColor: col.badgeBg,
                      color: col.badgeText,
                      borderColor: col.badgeBorder,
                    }}
                  >
                    {colApps.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 min-h-[140px]">
                  {colApps.length === 0 ? (
                    <div className="h-24 rounded-xl border border-dashed border-[#DDD6CC] flex items-center justify-center text-[11px] text-stone-400 font-medium">
                      No applications
                    </div>
                  ) : (
                    colApps.map((app) => {
                      const daysOld = app.applicationDate
                        ? Math.floor(
                            (Date.now() - new Date(app.applicationDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        : 0;

                      return (
                        <div
                          key={app.applicationId}
                          onClick={() => setSelectedApplication(app)}
                          className="bg-[#FFFFFF] rounded-xl border border-[#E7E2DA] hover:border-[#C85A32]/40 hover:shadow-xs p-3 transition-all cursor-pointer space-y-2 group"
                        >
                          {/* Top Row: Company & Priority */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="text-xs font-bold text-stone-900 group-hover:text-[#C85A32] transition-colors line-clamp-1">
                                {app.company}
                              </h5>
                              <p className="text-[11px] text-stone-600 font-medium line-clamp-1">
                                {app.jobTitle}
                              </p>
                            </div>

                            {app.priority && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${
                                  app.priority === "High"
                                    ? "bg-[#FAF0EB] text-[#A64522] border border-[#F2D7CC]"
                                    : app.priority === "Medium"
                                    ? "bg-[#FEF9EE] text-[#975A16] border border-[#F9ECCF]"
                                    : "bg-[#F3F4F6] text-stone-600 border border-[#E5E7EB]"
                                }`}
                              >
                                {app.priority}
                              </span>
                            )}
                          </div>

                          {/* Mode, Location & Match */}
                          <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1">
                            <span className="truncate max-w-[130px]">
                              {app.workMode || "Remote"} • {app.location || "Bengaluru"}
                            </span>
                            {typeof app.matchScore === "number" && (
                              <span className="font-bold text-[#345B3C] bg-[#EDF5EE] px-1.5 py-0.5 rounded border border-[#D5E4D8]">
                                {app.matchScore}% Match
                              </span>
                            )}
                          </div>

                          {/* Specific Status Stage indicator if multiple in column */}
                          {col.statuses.length > 1 && (
                            <span className="inline-block text-[10px] font-semibold text-stone-600 bg-[#F2EDE5] px-1.5 py-0.5 rounded">
                              {app.status}
                            </span>
                          )}

                          {/* Upcoming Date or Stale Indicator */}
                          {(app.interviewDate || app.assessmentDeadline || app.deadline) ? (
                            <div className="p-1.5 rounded-lg bg-[#FAF6F0] border border-[#EFE4D6] text-[10px] font-semibold text-[#8C4A2F] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#A64522]" />
                              <span className="truncate">
                                {app.interviewDate
                                  ? `Interview: ${app.interviewDate}`
                                  : app.assessmentDeadline
                                  ? `Due: ${app.assessmentDeadline}`
                                  : `Deadline: ${app.deadline}`}
                              </span>
                            </div>
                          ) : app.status === "Applied" && daysOld > 12 ? (
                            <div className="p-1 rounded bg-[#FEF2F2] border border-[#FEE2E2] text-[10px] font-semibold text-red-700 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-red-600" />
                              <span>Applied {daysOld}d ago (Follow up)</span>
                            </div>
                          ) : null}

                          {/* Quick Shift Controls & Days Ago */}
                          <div
                            className="flex items-center justify-between pt-1.5 border-t border-[#F2ECE4] text-[10px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-stone-400">
                              {app.applicationDate ? `${daysOld}d ago` : "Recent"}
                            </span>

                            {/* Dropdown status shift */}
                            <select
                              value={app.status}
                              onChange={(e) => {
                                handleQuickStatusUpdate(
                                  app,
                                  e.target.value as JobApplicationStatus
                                );
                              }}
                              className="text-[10px] font-semibold bg-[#FAF8F5] border border-[#E7E2DA] rounded px-1 py-0.5 text-stone-700 focus:outline-none cursor-pointer"
                            >
                              {ALL_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#E7E2DA] text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Company & Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Match</th>
                  <th className="py-3 px-4">Workplace</th>
                  <th className="py-3 px-4">Key Dates</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE4]">
                {filteredApplications.map((app) => {
                  const daysOld = app.applicationDate
                    ? Math.floor(
                        (Date.now() - new Date(app.applicationDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0;

                  return (
                    <tr
                      key={app.applicationId}
                      onClick={() => setSelectedApplication(app)}
                      className="hover:bg-[#FAF8F5]/80 transition-colors cursor-pointer group"
                    >
                      {/* Company & Role */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900 group-hover:text-[#C85A32] transition-colors">
                          {app.company}
                        </div>
                        <div className="text-[11px] text-stone-500 font-medium">
                          {app.jobTitle}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF1E8] text-[#8C4A2F] border border-[#F2DECA]">
                          {app.status}
                        </span>
                      </td>

                      {/* Match Score */}
                      <td className="py-3.5 px-4">
                        {typeof app.matchScore === "number" ? (
                          <span className="font-bold text-[#345B3C] bg-[#EDF5EE] px-2 py-0.5 rounded-md border border-[#D5E4D8] text-[11px]">
                            {app.matchScore}%
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* Workplace */}
                      <td className="py-3.5 px-4 text-stone-600 text-[11px]">
                        {app.workMode || "Remote"} ({app.location || "India"})
                      </td>

                      {/* Key Dates */}
                      <td className="py-3.5 px-4 text-[11px]">
                        {app.interviewDate ? (
                          <span className="text-[#A64522] font-semibold">
                            Interview: {app.interviewDate}
                          </span>
                        ) : app.assessmentDeadline ? (
                          <span className="text-[#975A16] font-semibold">
                            Due: {app.assessmentDeadline}
                          </span>
                        ) : (
                          <span className="text-stone-500">
                            Applied {app.applicationDate || "Recently"}
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            app.priority === "High"
                              ? "bg-[#FAF0EB] text-[#A64522] border border-[#F2D7CC]"
                              : app.priority === "Medium"
                              ? "bg-[#FEF9EE] text-[#975A16] border border-[#F9ECCF]"
                              : "bg-[#F3F4F6] text-stone-600 border border-[#E5E7EB]"
                          }`}
                        >
                          {app.priority || "Medium"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedApplication(app)}
                            className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F2ECE4] text-stone-700 text-[11px] font-semibold border border-[#E7E2DA] cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleDeleteApplication(app.applicationId)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Application Detail Modal / Drawer */}
      {selectedApplication && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
          onClick={() => setSelectedApplication(null)}
        >
          <div
            className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title & Close */}
            <div className="flex items-start justify-between gap-3 border-b border-[#EDE8E0] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 bg-[#F2EDE5] px-2.5 py-0.5 rounded-full">
                    {selectedApplication.workMode || "Remote"} • {selectedApplication.location || "India"}
                  </span>
                  {typeof selectedApplication.matchScore === "number" && (
                    <span className="text-[11px] font-bold text-[#345B3C] bg-[#EDF5EE] px-2.5 py-0.5 rounded-full border border-[#D5E4D8]">
                      {selectedApplication.matchScore}% Match
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 font-editorial">
                  {selectedApplication.company}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-stone-600">
                  {selectedApplication.jobTitle}
                </p>
              </div>

              <button
                onClick={() => setSelectedApplication(null)}
                className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-[#F2ECE4] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Change Selector & Fast Action */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Current Status Pipeline:
                </span>
                <span className="text-xs font-bold text-[#C85A32]">
                  {selectedApplication.status}
                </span>
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {ALL_STATUSES.map((st) => {
                  const isActive = selectedApplication.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => {
                        handleQuickStatusUpdate(
                          selectedApplication,
                          st,
                          `Moved to ${st}`
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#C85A32] text-white shadow-2xs"
                          : "bg-[#FFFFFF] text-stone-700 hover:bg-[#F2ECE4] border border-[#E0D7CC]"
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Next Best Action Box */}
            <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#F2DECA] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#A64522] uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Recommended Next Action:
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedApplication.priority === "High"
                      ? "bg-[#FAF0EB] text-[#A64522] border border-[#F2D7CC]"
                      : "bg-[#F3F4F6] text-stone-600 border border-[#E5E7EB]"
                  }`}
                >
                  {selectedApplication.priority || "Medium"} Priority
                </span>
              </div>
              <p className="text-xs text-stone-800 font-semibold leading-relaxed">
                {selectedApplication.nextAction ||
                  (selectedApplication.status === "Interview" ||
                  selectedApplication.status === "Final Interview"
                    ? `Conduct an AI Mock Interview tailored to ${selectedApplication.jobTitle} at ${selectedApplication.company}.`
                    : selectedApplication.status === "Assessment"
                    ? "Practice timed technical drills and review core algorithms."
                    : selectedApplication.status === "Saved"
                    ? "Review requirements, tailor your resume, and submit your application."
                    : "Follow up with recruiter or hiring manager if no response after 10-14 days.")}
              </p>

              {/* Action Buttons connected to other JobPlanner tools */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F5E7D8]">
                {["Interview", "Final Interview"].includes(selectedApplication.status) && (
                  <button
                    onClick={() => {
                      setSelectedApplication(null);
                      onNavigate("interview");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquareCode className="w-3.5 h-3.5" />
                    <span>Practice AI Mock Interview</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedApplication(null);
                    onNavigate("resume");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F2ECE4] text-stone-800 text-xs font-semibold border border-[#E0D7CC] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#A64522]" />
                  <span>Tailor ATS Resume</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedApplication(null);
                    onNavigate("skillgap");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F2ECE4] text-stone-800 text-xs font-semibold border border-[#E0D7CC] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#245285]" />
                  <span>Check Skill Gaps</span>
                </button>

                <button
                  onClick={() => {
                    setOfferCalculatorApp(selectedApplication);
                    setIsOfferCalculatorOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#FAF0EB] hover:bg-[#F2DECA] text-[#A64522] text-xs font-bold border border-[#F2DECA] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>Evaluate & Negotiate Offer</span>
                </button>

                {selectedApplication.jobUrl && (
                  <a
                    href={selectedApplication.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F2ECE4] text-stone-800 text-xs font-semibold border border-[#E0D7CC] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Job Posting</span>
                  </a>
                )}
              </div>
            </div>

            {/* Skills & Match Breakdown */}
            {(selectedApplication.matchingSkills?.length || selectedApplication.missingSkills?.length) ? (
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2 text-xs">
                <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                  Skills Alignment:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedApplication.matchingSkills && selectedApplication.matchingSkills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#2C4E33]">Matching:</span>
                      {selectedApplication.matchingSkills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#EDF5EE] text-[#2C4E33] border border-[#D7E5DA] flex items-center gap-1"
                        >
                          <Check className="w-2.5 h-2.5" />
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedApplication.missingSkills && selectedApplication.missingSkills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 ml-0 sm:ml-2">
                      <span className="text-[11px] font-semibold text-[#A64522]">Missing:</span>
                      {selectedApplication.missingSkills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#FAF0EB] text-[#A64522] border border-[#F2D7CC]"
                        >
                          • {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Key Information Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                  Application Date
                </span>
                <p className="font-bold text-stone-900 mt-0.5">
                  {selectedApplication.applicationDate || "Not recorded"}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                  Interview Date
                </span>
                <p className="font-bold text-stone-900 mt-0.5">
                  {selectedApplication.interviewDate || "None scheduled"}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                  Assessment Due
                </span>
                <p className="font-bold text-stone-900 mt-0.5">
                  {selectedApplication.assessmentDeadline || "No deadline"}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                  Salary Band
                </span>
                <p className="font-bold text-stone-900 mt-0.5">
                  {selectedApplication.salary || "Competitive"}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                  Resume Used
                </span>
                <p className="font-bold text-stone-900 mt-0.5 truncate">
                  {selectedApplication.resumeTitle || "Primary ATS Resume"}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                  Contact Person
                </span>
                <p className="font-bold text-stone-900 mt-0.5 truncate">
                  {selectedApplication.contact?.name || "Direct recruiter"}
                </p>
              </div>
            </div>

            {/* Status History Timeline */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Status History & Timeline:
              </span>
              <div className="space-y-2">
                {(selectedApplication.statusHistory || []).map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
                      <span className="font-bold text-stone-900">{entry.status}</span>
                      {entry.note && (
                        <span className="text-stone-500 text-[11px]">— {entry.note}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions: Edit & Delete */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EDE8E0]">
              <button
                onClick={() => handleDeleteApplication(selectedApplication.applicationId)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Application</span>
              </button>

              <button
                onClick={() => {
                  setEditingApplication(selectedApplication);
                  setSelectedApplication(null);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE4] text-stone-800 text-xs font-bold border border-[#DED7CD] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#A64522]" />
                <span>Edit Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Application Modal */}
      {isAddModalOpen && (
        <ApplicationFormModal
          isOpen={isAddModalOpen}
          initialData={editingApplication}
          targetRole={profile?.target_role || "Software Engineer"}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingApplication(null);
          }}
          onSave={handleSaveApplication}
        />
      )}

      {/* AI Strategy Modal (Section 32) */}
      {isStrategyModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
          onClick={() => setIsStrategyModalOpen(false)}
        >
          <div
            className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-xl w-full p-6 shadow-xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#EDE8E0] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C85A32] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 font-editorial">
                    Application Strategy & Conversion
                  </h3>
                  <p className="text-xs text-stone-500">
                    Objective advice derived strictly from your tracked results
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsStrategyModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-center text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingStrategy ? (
              <div className="p-12 text-center text-xs text-stone-500 space-y-2">
                <RotateCcw className="w-5 h-5 animate-spin mx-auto text-[#C85A32]" />
                <p>Synthesizing application conversion rates and role matches...</p>
              </div>
            ) : strategyReport ? (
              <div className="space-y-4 text-xs">
                {/* Summary */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-1">
                  <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                    Pipeline Summary:
                  </span>
                  <p className="text-stone-800 leading-relaxed font-medium">
                    {strategyReport.summary}
                  </p>
                </div>

                {/* Recommendations */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[#A64522] uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    Key Strategic Recommendations:
                  </span>
                  <ul className="space-y-2">
                    {(strategyReport.recommendations || []).map((rec: string, i: number) => (
                      <li
                        key={i}
                        className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#EDE8E0] text-stone-700 flex items-start gap-2"
                      >
                        <span className="text-[#C85A32] font-bold text-sm leading-none">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Target */}
                {strategyReport.suggestedWeeklyTarget && (
                  <div className="p-3 rounded-xl bg-[#EDF5EE] border border-[#D5E4D8] text-[#2C4E33] flex items-center justify-between">
                    <span className="font-semibold">Recommended weekly applications:</span>
                    <span className="font-bold text-sm">
                      {strategyReport.suggestedWeeklyTarget} high-match roles / week
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-500">No strategy report available.</p>
            )}

            <div className="pt-3 border-t border-[#EDE8E0] flex justify-end">
              <button
                onClick={() => setIsStrategyModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer Comparison & Salary Negotiation Calculator Modal */}
      <OfferCalculatorModal
        isOpen={isOfferCalculatorOpen}
        onClose={() => {
          setIsOfferCalculatorOpen(false);
          setOfferCalculatorApp(null);
        }}
        applications={applications}
        profile={profile}
        careerReadinessScore={careerReadinessScore}
        initialSelectedApp={offerCalculatorApp}
      />
    </div>
  );
};

// =========================================================================
// ADD / EDIT APPLICATION MODAL COMPONENT
// =========================================================================

interface ApplicationFormModalProps {
  isOpen: boolean;
  initialData: JobApplication | null;
  targetRole: string;
  onClose: () => void;
  onSave: (data: Partial<JobApplication>) => void;
}

const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  isOpen,
  initialData,
  targetRole,
  onClose,
  onSave,
}) => {
  const [company, setCompany] = useState(initialData?.company || "");
  const [jobTitle, setJobTitle] = useState(initialData?.jobTitle || targetRole || "");
  const [jobUrl, setJobUrl] = useState(initialData?.jobUrl || "");
  const [location, setLocation] = useState(initialData?.location || "Bengaluru");
  const [workMode, setWorkMode] = useState<"Remote" | "Hybrid" | "Onsite">(
    initialData?.workMode || "Remote"
  );
  const [status, setStatus] = useState<JobApplicationStatus>(
    initialData?.status || "Applied"
  );
  const [applicationDate, setApplicationDate] = useState(
    initialData?.applicationDate || new Date().toISOString().split("T")[0]
  );
  const [deadline, setDeadline] = useState(initialData?.deadline || "");
  const [interviewDate, setInterviewDate] = useState(initialData?.interviewDate || "");
  const [salary, setSalary] = useState(initialData?.salary || "");
  const [matchScore, setMatchScore] = useState<number>(initialData?.matchScore || 80);
  const [priority, setPriority] = useState<JobApplicationPriority>(
    initialData?.priority || "Medium"
  );
  const [skillsInput, setSkillsInput] = useState(
    (initialData?.matchingSkills || []).join(", ")
  );
  const [notes, setNotes] = useState(
    initialData?.notes?.[0]?.content || ""
  );
  const [recruiterName, setRecruiterName] = useState(
    initialData?.contact?.name || ""
  );
  const [recruiterEmail, setRecruiterEmail] = useState(
    initialData?.contact?.email || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !jobTitle.trim()) {
      alert("Company and Job Title are required.");
      return;
    }

    const skillsArray = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      applicationId: initialData?.applicationId,
      company: company.trim(),
      jobTitle: jobTitle.trim(),
      jobUrl: jobUrl.trim(),
      location: location.trim(),
      workMode,
      status,
      applicationDate,
      deadline: deadline || undefined,
      interviewDate: interviewDate || undefined,
      salary: salary.trim(),
      matchScore: Number(matchScore) || 75,
      matchingSkills: skillsArray,
      priority,
      contact: recruiterName
        ? {
            name: recruiterName,
            email: recruiterEmail || undefined,
          }
        : undefined,
      notes: notes.trim()
        ? [
            {
              id: `note_${Date.now()}`,
              content: notes.trim(),
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EDE8E0] pb-3">
          <h3 className="text-lg font-bold text-stone-900 font-editorial">
            {initialData ? "Edit Tracked Application" : "Track New Job Application"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-center text-stone-500 hover:text-stone-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Company & Job Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Swiggy, Infosys, Google"
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Job Title *</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Graduate Engineer Trainee"
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
              />
            </div>
          </div>

          {/* Row 2: Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Application Stage</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 font-medium focus:outline-none focus:border-[#C85A32]"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 font-medium focus:outline-none focus:border-[#C85A32]"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Row 3: Workplace & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Workplace Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 font-medium focus:outline-none focus:border-[#C85A32]"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">On-site</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru / Hyderabad"
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
              />
            </div>
          </div>

          {/* Row 4: Dates (Applied & Interview/Deadline) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Date Applied</label>
              <input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Interview Date</label>
              <input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
              />
            </div>
          </div>

          {/* Row 5: Job URL & Salary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Job Link / Career Portal</label>
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://careers.company.com/job/..."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Salary / Compensation</label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. ₹5.5 - ₹8 LPA"
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
              />
            </div>
          </div>

          {/* Row 6: Skills */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">
              Required / Matching Skills (comma separated)
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. Python, SQL, React, AWS"
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
            />
          </div>

          {/* Row 7: Recruiter Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Recruiter / Contact Name</label>
              <input
                type="text"
                value={recruiterName}
                onChange={(e) => setRecruiterName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Recruiter Email</label>
              <input
                type="email"
                value={recruiterEmail}
                onChange={(e) => setRecruiterEmail(e.target.value)}
                placeholder="priya@company.com"
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Notes & Follow-up Reminders</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Referred by college alumnus. Recruiter mentioned 2 coding rounds."
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900 focus:outline-none focus:border-[#C85A32]"
            />
          </div>

          <div className="pt-3 border-t border-[#EDE8E0] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E0D7CC] text-stone-700 hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {initialData ? "Save Changes" : "Track Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
