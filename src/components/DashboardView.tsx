import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquareCode,
  Briefcase,
  ChevronRight,
  Clock,
  Target,
  Sparkles,
  Award,
  BookOpen,
  TrendingUp,
  Bookmark,
  Bot,
  Milestone,
  Flame,
  Layers,
  BarChart3,
  CheckSquare,
  FolderGit2,
  Github,
} from "lucide-react";
import { UserProfile, ReadinessAnalysis, RoadmapStep, JobListing, PracticeRecord, CareerRoadmap, CareerAnalyticsSnapshot, JobApplication } from "../types";
import { ROLE_BENCHMARKS } from "../lib/defaultData";
import { ResumeSection } from "./ResumeSection";
import { User as FirebaseUser } from "firebase/auth";
import { FirestoreUserData, ResumeMetadata } from "../lib/firebase";

interface DashboardViewProps {
  profile: UserProfile;
  readiness: ReadinessAnalysis;
  roadmap: RoadmapStep[];
  roadmapProgress?: number;
  careerRoadmap?: CareerRoadmap | null;
  careerAnalytics?: CareerAnalyticsSnapshot | null;
  jobs: JobListing[];
  jobApplications?: JobApplication[];
  practiceHistory?: PracticeRecord[];
  interviews?: PracticeRecord[];
  resumeAtsScore?: number;
  currentUser?: FirebaseUser | null;
  firestoreUserData?: Partial<FirestoreUserData> | null;
  onUpdateResume?: (data: ResumeMetadata | null) => void;
  onOpenAuth?: () => void;
  onNavigate: (tab: string) => void;
  onOpenOnboarding: () => void;
  onToggleTask?: (stepIndex: number, taskId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  readiness,
  roadmap,
  roadmapProgress = 0,
  careerRoadmap,
  careerAnalytics,
  jobs,
  jobApplications = [],
  practiceHistory,
  interviews,
  resumeAtsScore = 78,
  currentUser,
  firestoreUserData,
  onUpdateResume,
  onOpenAuth,
  onNavigate,
  onOpenOnboarding,
  onToggleTask,
}) => {
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (profile?.full_name || "there").split(" ")[0];

  const benchmark = ROLE_BENCHMARKS[profile?.target_role] || {
    requiredSkills: ["SQL", "Python", "Data Analysis", "Communication"],
    recommendedSkills: ["Power BI", "Excel", "Statistics"],
    description: "Target entry-level career path.",
    avgSalaryRange: "₹4.5 - ₹8 LPA",
  };

  const userSkillsList = profile?.skills || [];
  const userProjectsList = profile?.projects || [];
  const userInterestsList = profile?.interests || [];
  const requiredSkillsList = benchmark?.requiredSkills || [];

  // Skill analysis
  const userSkillsNormalized = userSkillsList.map((s) => s.toLowerCase().trim());
  const acquiredSkills = requiredSkillsList.filter((req) =>
    userSkillsNormalized.some((u) => u.includes(req.toLowerCase()) || req.toLowerCase().includes(u))
  );
  const missingSkills = requiredSkillsList.filter((req) => !acquiredSkills.includes(req));

  // Profile completion calculation
  const profileSteps = [
    Boolean(profile?.full_name),
    Boolean(profile?.education?.college_name),
    Boolean(profile?.education?.degree),
    userSkillsList.length >= 3,
    userInterestsList.length >= 1,
    Boolean(profile?.target_role),
    userProjectsList.length >= 1,
  ];
  const profileCompletion = Math.round(
    (profileSteps.filter(Boolean).length / profileSteps.length) * 100
  );

  // Roadmap calculations
  const allTasks = (roadmap || []).flatMap((r) => r?.tasks || []);
  const completedTasks = allTasks.filter((t) => t?.completed);
  const roadmapProgressPercent =
    allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
  const currentActiveStep =
    (roadmap || []).find((s) => (s?.tasks || []).some((t) => !t.completed)) || (roadmap || [])[0];
  const nextIncompleteTask = currentActiveStep?.tasks?.find((t) => !t.completed);

  // Next best action data
  const topMissingSkill = missingSkills[0] || "SQL Fundamentals";
  const nextActionTitle = nextIncompleteTask
    ? nextIncompleteTask.text
    : `Master ${topMissingSkill} Fundamentals`;
  const nextActionReason =
    topMissingSkill === "SQL" || topMissingSkill.toLowerCase().includes("sql")
      ? "SQL is requested in over 85% of fresher listings for querying product and business databases."
      : topMissingSkill.toLowerCase().includes("power bi") || topMissingSkill.toLowerCase().includes("excel")
      ? "Business intelligence tools turn raw data into executive charts and dashboards."
      : `High-demand competency for ${profile?.target_role || "your target role"} to stand out among candidates.`;

  // Practice records
  const practiceList = practiceHistory || interviews || [];
  const avgPracticeScore =
    practiceList.length > 0
      ? (practiceList.reduce((acc, curr) => acc + (curr?.score || 0), 0) / practiceList.length).toFixed(1)
      : null;

  const jobsList = jobs || [];

  return (
    <div className="space-y-7 pb-16">
      {/* Workspace Header Greeting */}
      <div className="border-b border-[#E7E2DA] pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C85A32]">
              Personal Career Workspace
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
              {greeting}, {firstName}.
            </h1>
            <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Target role:{" "}
              <strong className="text-stone-900 font-semibold">{profile?.target_role}</strong>. Here is
              what you have accomplished, and what we recommend doing next to become job-ready.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate("roadmap")}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-[#FAF8F5] text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Continue Roadmap</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#E6B89C]" />
            </button>
            <button
              onClick={onOpenOnboarding}
              className="px-3.5 py-2 rounded-xl bg-[#F0ECE4] hover:bg-[#E7E1D7] text-stone-800 text-xs font-medium border border-[#E0D9CE] transition-colors"
            >
              Update Profile
            </button>
          </div>
        </div>
      </div>

      {/* Hero Workspace Section: Readiness Summary & Next Best Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Readiness Overview Panel (5 cols) */}
        <div className="lg:col-span-5 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE8E0]">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Your Career Readiness
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F2EDE5] text-[#8C4A2F] border border-[#E4DDD2]">
                {readiness.score >= 80 ? "Placement Ready" : readiness.score >= 60 ? "Good Progress" : "Groundwork Stage"}
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-extrabold text-stone-900 tracking-tight">
                {readiness.score}
              </span>
              <span className="text-stone-400 text-xl font-medium">/ 100</span>
            </div>

            {/* Warm, encouraging human verdict */}
            <p className="text-xs sm:text-sm text-stone-700 mt-3 leading-relaxed">
              {readiness.score >= 70 ? (
                <>
                  You have a solid foundation for entry-level hiring. Your next focus should be completing{" "}
                  <strong className="text-stone-900 font-semibold">{missingSkills.slice(0, 2).join(" and ") || "mock interview drills"}</strong>.
                </>
              ) : (
                <>
                  You're making steady progress. Your next focus should be strengthening{" "}
                  <strong className="text-stone-900 font-semibold">{missingSkills.slice(0, 2).join(" and ") || "foundational tools"}</strong>{" "}
                  and building your project portfolio.
                </>
              )}
            </p>

            {/* Subtle Progress breakdown rings/bars */}
            <div className="mt-5 pt-4 border-t border-[#EDE8E0] grid grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#EBE5DB]">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Skills</span>
                <span className="text-sm font-bold text-stone-900 mt-0.5 block">
                  {readiness?.breakdown?.skillsScore ?? 65}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#EBE5DB]">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Projects</span>
                <span className="text-sm font-bold text-stone-900 mt-0.5 block">
                  {readiness?.breakdown?.projectsScore ?? 70}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#EBE5DB]">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Interview</span>
                <span className="text-sm font-bold text-stone-900 mt-0.5 block">
                  {readiness?.breakdown?.interviewScore ?? 55}%
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-5 border-t border-[#EDE8E0] flex items-center justify-between">
            <span className="text-xs text-stone-500 font-medium">
              Based on {requiredSkillsList.length} benchmark competencies
            </span>
            <button
              onClick={() => onNavigate("readiness")}
              className="text-xs font-semibold text-[#A64522] hover:text-[#883617] flex items-center gap-1"
            >
              <span>See full breakdown</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Prominent NEXT BEST ACTION (7 cols) */}
        <div className="lg:col-span-7 bg-[#FFFDF9] rounded-2xl border-2 border-[#C85A32]/40 p-6 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-[#C85A32]/5 pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF0EB] text-[#A64522] border border-[#F2D7CC] text-[11px] font-bold uppercase tracking-wider">
                <Target className="w-3.5 h-3.5" />
                <span>Next Best Action</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-stone-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Est. 2-3 hours</span>
              </div>
            </div>

            <div className="mt-4">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                {nextActionTitle}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                {nextActionReason}
              </p>
            </div>

            {/* Why it matters & Progress card */}
            <div className="mt-5 p-4 rounded-xl bg-[#FAF6F0] border border-[#E9E2D6] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">Why this matters now:</span>
                <span className="text-[11px] font-semibold text-[#8C4A2F] bg-[#F2EDE5] px-2 py-0.5 rounded">
                  Priority 1
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-normal">
                Recruiters test this in first-round technical screenings. Checking off this item increases
                your match rate across active fresher job openings.
              </p>

              {/* Progress bar */}
              <div className="pt-2">
                <div className="flex justify-between text-[11px] font-medium text-stone-500 mb-1">
                  <span>Roadmap step {currentActiveStep?.stepNumber || 1} of 5</span>
                  <span>{roadmapProgressPercent}% overall completed</span>
                </div>
                <div className="w-full h-2 bg-[#E5DFD5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C85A32] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(roadmapProgressPercent, 12)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("roadmap")}
              className="px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              <span>Start this action</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("skillgap")}
              className="px-4 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F3EFEA] text-stone-800 text-xs font-semibold border border-[#DED7CD] transition-colors"
            >
              View skill cheat sheet
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Row: Profile Completion & Workspace Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Completion Card (Human, motivating) */}
        <div className="bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Profile Readiness
              </span>
              <span className="text-xs font-bold text-stone-900">{profileCompletion}%</span>
            </div>

            <h3 className="text-base font-bold text-stone-900 mt-2 font-editorial">
              You're almost there.
            </h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Add your projects and certifications so JobPlanner can give you the most accurate job recommendations.
            </p>

            <div className="mt-3 w-full h-1.5 bg-[#E7E1D7] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#496552] rounded-full transition-all duration-300"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>

            <div className="mt-3 text-[11px] text-stone-500 space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#496552]" />
                <span>{userSkillsList.length} skills inventoried</span>
              </div>
              <div className="flex items-center gap-1.5">
                {userProjectsList.length > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#496552]" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>{userProjectsList.length} portfolio project(s) added</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenOnboarding}
            className="mt-4 pt-3 border-t border-[#EDE8E0] text-xs font-semibold text-[#A64522] hover:text-[#883617] flex items-center justify-between w-full"
          >
            <span>Complete profile details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Resume Upload & Management Section */}
        <ResumeSection
          currentUser={currentUser || null}
          resumeData={firestoreUserData || null}
          onUpdateResume={onUpdateResume}
          onOpenAuth={onOpenAuth}
          variant="card"
        />

        {/* Interview Practice Card */}
        <div className="bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Interview Drills
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF1E6] text-[#8F5518] border border-[#F2DECA]">
                {practiceList.length > 0 ? `${practiceList.length} Practiced` : "Ready to Start"}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0EAE1] flex items-center justify-center text-stone-800">
                <MessageSquareCode className="w-4 h-4 text-[#8C4A2F]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">
                  {avgPracticeScore ? `Average Score: ${avgPracticeScore}/10` : "No sessions yet"}
                </h4>
                <p className="text-[11px] text-stone-500">Role-specific behavioral & tech drills</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 mt-2.5 leading-relaxed">
              Practice real questions asked at campus interviews with constructive, human feedback.
            </p>
          </div>

          <button
            onClick={() => onNavigate("interview")}
            className="mt-4 pt-3 border-t border-[#EDE8E0] text-xs font-semibold text-[#A64522] hover:text-[#883617] flex items-center justify-between w-full"
          >
            <span>Practice a question</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* AI Resume Builder Dashboard Integration */}
      <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#C85A32]/30 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#C85A32]/5 to-transparent pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FBEFE9] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
                AI Powered
              </span>
              <span className="text-xs text-stone-500 font-medium">ATS Optimization & Export</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
              AI Resume Builder
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Create a professional, job-ready resume using your JobPlanner profile. Tailor keywords for target roles, choose ATS-friendly templates, and download in PDF or DOCX.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 z-10">
          <button
            onClick={() => onNavigate("resume")}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#FDEEE8]" />
            <span>Build My Resume</span>
          </button>
        </div>
      </div>

      {/* AI Interview Preparation Dashboard Integration */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#245285] text-white flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquareCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#245285] bg-[#EEF4FB] px-2.5 py-0.5 rounded-full border border-[#D6E3F4]">
                AI Interview Prep
              </span>
              <span className="text-xs text-stone-500 font-medium">Mock • Technical • HR • Job-Specific</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
              Practice Realistic AI Interviews
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Simulate high-stakes campus & industry interviews adapted to your authentic resume, diagnosed skill gaps, and target jobs. Receive structured feedback and scoring after each response.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 z-10">
          <button
            onClick={() => onNavigate("interview")}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#245285] hover:bg-[#1C416A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#D8E6F7]" />
            <span>Launch Interview Prep</span>
          </button>
        </div>
      </div>

      {/* AI Career Assistant Dashboard Integration */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C85A32] bg-[#FAF3EC] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
                AI Career Assistant
              </span>
              <span className="text-xs text-stone-500 font-medium">Personal Career Advisor • Real-time Guidance</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
              Get Personalized Guidance from JobPlanner AI
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Consult your personal advisor for prioritized learning roadmaps, ATS resume improvements, interview question drills, and target job matching—grounded directly in your authentic profile and diagnosed skill gaps.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 z-10">
          <button
            onClick={() => onNavigate("assistant")}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#FDEEE8]" />
            <span>Ask JobPlanner AI</span>
          </button>
        </div>
      </div>

      {/* AI Career Roadmap & Progress Tracker Card */}
      <div className="bg-[#FFFFFF] rounded-2xl border-2 border-[#C85A32]/25 p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Milestone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FBEFE9] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
                  AI Career Roadmap
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  {careerRoadmap?.duration || "3 Months"} Step-by-Step Journey
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
                Your Career Roadmap & Progress Tracker
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl leading-relaxed">
                Step-by-step career milestones curated for <strong className="text-stone-900 font-semibold">{profile?.target_role}</strong>. Track your progress across 7 stages from skill building to job placement.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <button
              onClick={() => onNavigate("roadmap")}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View Career Roadmap</span>
              <ArrowRight className="w-4 h-4 text-[#FDEEE8]" />
            </button>
          </div>
        </div>

        {/* Dynamic Key Progress Indicators */}
        <div className="mt-6 pt-5 border-t border-[#EDE8E0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Item 1: Career Readiness */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Career Readiness
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-stone-900 font-editorial">
                {readiness?.score || 70}
              </span>
              <span className="text-xs text-stone-400 font-medium">/ 100</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Target role readiness level
            </p>
          </div>

          {/* Item 2: Roadmap Progress */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Roadmap Progress
              </span>
              <span className="text-xs font-bold text-[#C85A32]">
                {careerRoadmap?.overallProgress ?? roadmapProgressPercent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#E5DFD5] mt-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C85A32] to-[#D97706] rounded-full transition-all duration-500"
                style={{ width: `${careerRoadmap?.overallProgress ?? roadmapProgressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-1.5">
              {careerRoadmap?.completedTasksCount !== undefined
                ? `${careerRoadmap.completedTasksCount} of ${careerRoadmap.totalTasksCount} tasks done`
                : `${completedTasks.length} of ${allTasks.length} tasks done`}
            </p>
          </div>

          {/* Item 3: Current Stage */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Active Focus Stage
            </span>
            <h4 className="text-xs font-bold text-stone-900 mt-1 line-clamp-1 leading-snug">
              {careerRoadmap?.currentStage || currentActiveStep?.title || "Skill Development"}
            </h4>
            <p className="text-[11px] text-[#395C3E] font-medium mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#395C3E]" />
              <span>In progress</span>
            </p>
          </div>

          {/* Item 4: Next Recommended Task */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Next Action
            </span>
            <h4 className="text-xs font-bold text-[#A64522] mt-1 line-clamp-1">
              {careerRoadmap?.nextRecommendedTask?.title || nextActionTitle}
            </h4>
            <button
              onClick={() => onNavigate("roadmap")}
              className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 mt-0.5 flex items-center gap-1 cursor-pointer"
            >
              <span>Execute step</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Career Analytics & Intelligent Insights Card */}
      <div className="bg-[#FFFFFF] rounded-2xl border-2 border-[#245285]/25 p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#245285] text-white flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#245285] bg-[#EEF4FB] px-2.5 py-0.5 rounded-full border border-[#D6E3F4]">
                  AI Career Analytics
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  Complete Journey Synthesis & Readiness Diagnostic
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
                Career Analytics & Intelligent Insights
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl leading-relaxed">
                Objective multi-factor analysis synthesizing your skills, ATS resume, job matches, mock interview drills, and roadmap velocity. Uncover what is improving and what is holding you back.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <button
              onClick={() => onNavigate("analytics")}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#245285] hover:bg-[#1B3E64] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Career Analytics</span>
              <ArrowRight className="w-4 h-4 text-[#D8E6F7]" />
            </button>
          </div>
        </div>

        {/* Dynamic Analytics Highlights */}
        <div className="mt-6 pt-5 border-t border-[#EDE8E0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Readiness Score
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-stone-900 font-editorial">
                {careerAnalytics?.readiness?.overallScore ?? readiness?.score ?? 70}
              </span>
              <span className="text-xs text-stone-400 font-medium">/ 100</span>
            </div>
            <p className="text-[11px] text-[#245285] font-semibold mt-0.5">
              {careerAnalytics?.readiness?.level || (readiness?.score >= 80 ? "Placement Ready" : "Good Progress")}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Primary Strength
            </span>
            <h4 className="text-xs font-bold text-stone-900 mt-1 line-clamp-1">
              {careerAnalytics?.insights?.biggestStrength || (profile.skills?.[0] ? `Solid foundation in ${profile.skills[0]}` : "Clear role direction")}
            </h4>
            <p className="text-[11px] text-[#2B6E4F] font-medium mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#2B6E4F]" />
              <span>Competitive asset</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Primary Bottleneck
            </span>
            <h4 className="text-xs font-bold text-[#A64522] mt-1 line-clamp-1">
              {careerAnalytics?.insights?.biggestWeakness || (readiness.missingSkills?.[0] ? `Gap in ${readiness.missingSkills[0]}` : "Complete interview drills")}
            </h4>
            <p className="text-[11px] text-stone-500 font-medium mt-0.5">
              Key area to strengthen
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Next Priority Action
            </span>
            <h4 className="text-xs font-bold text-stone-900 mt-1 line-clamp-1">
              {careerAnalytics?.insights?.nextBestAction?.action || "Review full diagnostic"}
            </h4>
            <button
              onClick={() => onNavigate("analytics")}
              className="text-[11px] font-semibold text-[#245285] hover:underline mt-0.5 flex items-center gap-1 cursor-pointer"
            >
              <span>View report</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Job Applications Pipeline Tracker Card */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE6DC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDF4EF] text-[#C85A32] flex items-center justify-center border border-[#F6DDD1]">
              <CheckSquare className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FBEFE9] px-2 py-0.5 rounded-full border border-[#F3DACF]">
                  Pipeline
                </span>
                <span className="text-xs text-stone-400 font-medium">Application Funnel</span>
              </div>
              <h3 className="text-base font-bold text-stone-900 mt-0.5">Job Applications</h3>
            </div>
          </div>

          <button
            onClick={() => onNavigate("applications")}
            className="px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE4] text-stone-800 text-xs font-bold border border-[#DED7CD] transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>View Applications</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#A64522]" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Total Applications
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-stone-900 font-editorial">
                {jobApplications.length}
              </span>
              <span className="text-xs text-stone-500 font-medium">tracked</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              {jobApplications.length > 0 ? "Pipeline maintained" : "Start logging jobs"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Active Pipelines
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#2563EB] font-editorial">
                {
                  jobApplications.filter(
                    (a) => !["Rejected", "Withdrawn", "Accepted"].includes(a.status)
                  ).length
                }
              </span>
              <span className="text-xs text-stone-500 font-medium">active</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              In screening or interview
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Interviews & Milestones
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#C85A32] font-editorial">
                {
                  jobApplications.filter((a) =>
                    ["Interview", "Final Interview", "Offer", "Accepted"].includes(a.status)
                  ).length
                }
              </span>
              <span className="text-xs text-stone-500 font-medium">secured</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1 truncate">
              {(() => {
                const upcoming = jobApplications.find((a) =>
                  ["Interview", "Final Interview"].includes(a.status)
                );
                return upcoming
                  ? `Interview: ${upcoming.company}`
                  : "No upcoming interviews scheduled";
              })()}
            </p>
          </div>
        </div>

        {/* Highlight latest tracked role or quick prompt */}
        {jobApplications.length > 0 ? (
          <div className="mt-4 p-3 rounded-xl bg-[#FFFDF9] border border-[#F2DECA] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
              <span className="font-semibold text-stone-800">
                Latest: {jobApplications[0].company} ({jobApplications[0].jobTitle})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F2EDE5] text-stone-700">
                {jobApplications[0].status}
              </span>
            </div>

            <button
              onClick={() => onNavigate("applications")}
              className="text-xs font-bold text-[#A64522] hover:underline flex items-center gap-1 cursor-pointer self-end sm:self-auto"
            >
              <span>Manage all {jobApplications.length} applications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-between gap-3 text-xs">
            <span className="text-stone-600">
              Apply to jobs from recommendations and track your progress in real-time.
            </span>
            <button
              onClick={() => onNavigate("applications")}
              className="px-3 py-1 rounded-lg bg-[#C85A32] text-white font-bold text-[11px] hover:bg-[#B24E2A] cursor-pointer shrink-0"
            >
              Track First Application
            </button>
          </div>
        )}
      </div>

      {/* AI Portfolio Builder & GitHub Analyzer Dashboard Integration */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FolderGit2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FAF3EC] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
                AI Portfolio & GitHub
              </span>
              <span className="text-xs text-stone-500 font-medium">Verified Codebases & Live Demos</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
              Build Your Recruiter-Ready Portfolio & Inspect GitHub
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Showcase authentic technical projects with problem statements, live demo links, and GitHub documentation scores. Sync bullets to your resume and share a public recruiter link.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 z-10">
          <button
            onClick={() => onNavigate("portfolio")}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#FDEEE8]" />
            <span>Open AI Portfolio</span>
          </button>
        </div>
      </div>

      {/* Two-Column Working Section: Skill Gaps on Left, Top Opportunities on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Skill Gaps Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#ECE6DC]">
            <div>
              <h3 className="text-base font-bold text-stone-900">Skills Worth Improving</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Comparison against typical requirements for {profile?.target_role}
              </p>
            </div>

            <button
              onClick={() => onNavigate("skillgap")}
              className="text-xs font-semibold text-[#A64522] hover:text-[#883617] flex items-center gap-1"
            >
              <span>Full matrix</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* Acquired skills */}
            <div>
              <span className="text-[11px] font-semibold text-[#3B5A41] uppercase tracking-wider block mb-2">
                You already have ({acquiredSkills.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {acquiredSkills.length > 0 ? (
                  acquiredSkills.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F0F5F1] text-[#2C4A32] border border-[#D7E4D9] flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#3B5A41]" />
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-stone-400 italic">No exact role skills matched yet.</span>
                )}
              </div>
            </div>

            {/* Missing skills with reasons */}
            <div className="pt-2 border-t border-[#F2ECE4]">
              <span className="text-[11px] font-semibold text-[#A64522] uppercase tracking-wider block mb-2">
                You need to learn or improve ({missingSkills.length})
              </span>
              <div className="space-y-2">
                {missingSkills.slice(0, 3).map((s) => (
                  <div
                    key={s}
                    className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE3D8] flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{s}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-[#FAF0EB] text-[#A64522]">
                          High Priority
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-1">
                        Frequently required by hiring teams to demonstrate hands-on capability in{" "}
                        {profile?.target_role}.
                      </p>
                    </div>

                    <button
                      onClick={() => onNavigate("skillgap")}
                      className="text-xs font-semibold text-[#A64522] hover:underline flex-shrink-0 mt-0.5"
                    >
                      Learn this
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Curated Matching Opportunities (5 cols) */}
        <div className="lg:col-span-5 bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#ECE6DC]">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#8C4A2F]" />
                  Matching Opportunities
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">Top matches based on your skills & role</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {jobsList.some((j) => j.saved) && (
                  <button
                    onClick={() => onNavigate("jobs")}
                    className="text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold"
                    title="View Saved Jobs"
                  >
                    <Bookmark className="w-3 h-3 text-[#A64522]" />
                    <span>{jobsList.filter((j) => j.saved).length}</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigate("jobs")}
                  className="font-semibold text-[#A64522] hover:underline"
                >
                  All jobs ({jobsList.length})
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {[...jobsList]
                .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
                .slice(0, 3)
                .map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onNavigate("jobs")}
                    className="p-3.5 rounded-xl border border-[#EAE3D8] bg-[#FAF8F5] hover:bg-[#F5EFE6] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">{job.title}</h4>
                        <p className="text-[11px] text-stone-600 mt-0.5">
                          {job.company} • {job.location}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          (job.matchScore || 0) >= 80
                            ? "bg-[#EDF5EE] text-[#2C4E33] border-[#D5E4D8]"
                            : "bg-[#FAF0EB] text-[#A64522] border-[#F3DACF]"
                        }`}
                      >
                        {job.matchScore}% fit
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#EDE7DD] flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-stone-700">{job.salary}</span>
                      <span className="font-bold text-[#A64522] hover:underline">
                        View opportunity →
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate("jobs")}
            className="w-full mt-4 py-2 text-center text-xs font-semibold rounded-xl bg-[#F0ECE4] hover:bg-[#E6DFD4] text-stone-800 transition-colors border border-[#DDD5C9]"
          >
            Explore all {jobsList.length} recommended openings
          </button>
        </div>
      </div>
    </div>
  );
};
