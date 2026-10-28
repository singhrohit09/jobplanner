import React from "react";
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  ArrowRight,
  Target,
  ChevronRight,
  BookOpen,
  Briefcase,
} from "lucide-react";
import { UserProfile, ReadinessAnalysis } from "../types";

interface ReadinessViewProps {
  profile: UserProfile;
  readiness: ReadinessAnalysis;
  onRefreshAnalysis: () => Promise<void>;
  isAnalyzing: boolean;
  onNavigate: (tab: string) => void;
  onOpenOnboarding: () => void;
}

export const ReadinessView: React.FC<ReadinessViewProps> = ({
  profile,
  readiness,
  onRefreshAnalysis,
  isAnalyzing,
  onNavigate,
  onOpenOnboarding,
}) => {
  const safeReadiness = readiness || {
    score: 68,
    breakdown: {
      skillsScore: 68,
      projectsScore: 70,
      educationScore: 82,
      interviewScore: 56,
      resumeScore: 64,
    },
    strengths: [],
    criticalSkillGaps: [],
    recommendedSkills: [],
    improvementAreas: [],
    summary: "",
  };

  const score = safeReadiness.score ?? 68;

  // Warm progress bars with terracotta, sage, warm amber, warm stone
  const breakdownItems = [
    {
      label: "Technical Skills Alignment",
      score: safeReadiness.breakdown?.skillsScore ?? 68,
      barClass: "bg-[#C85A32]",
      description: "Direct match against standard entry-level tool requirements",
    },
    {
      label: "Projects & Practical Portfolio",
      score: safeReadiness.breakdown?.projectsScore ?? 70,
      barClass: "bg-[#496552]",
      description: "Demonstrable codebase or analysis artifacts recruiters inspect",
    },
    {
      label: "Resume & Credentials",
      score: safeReadiness.breakdown?.resumeScore ?? 64,
      barClass: "bg-[#8C4A2F]",
      description: "Clear formatting, action-oriented bullet points, and degree verification",
    },
    {
      label: "Interview Preparation",
      score: safeReadiness.breakdown?.interviewScore ?? 56,
      barClass: "bg-[#D97706]",
      description: "Practice question drills, confidence, and structured answers",
    },
    {
      label: "Job Readiness & Market Fit",
      score: safeReadiness.breakdown?.educationScore ?? 75,
      barClass: "bg-stone-700",
      description: "Readiness to pass preliminary screening tests and online assessments",
    },
  ];

  const getVerdict = (s: number) => {
    if (s >= 85) {
      return {
        label: "Ready to Apply",
        badgeBg: "bg-[#EDF5EE] text-[#2C4E33] border-[#D1E5D5]",
        summary: "You have a competitive profile. Focus on finalizing your resume and sending direct job applications.",
      };
    }
    if (s >= 65) {
      return {
        label: "Good progress",
        badgeBg: "bg-[#FAF1E6] text-[#8F5518] border-[#F2DECA]",
        summary: "You have a strong foundation, but a few role-specific skills are still missing.",
      };
    }
    if (s >= 50) {
      return {
        label: "Developing foundation",
        badgeBg: "bg-[#FAF0EB] text-[#A64522] border-[#F2D7CC]",
        summary: "Core basics are in place. Completing 2 practical projects and 1 key tool will boost your readiness significantly.",
      };
    }
    return {
      label: "Groundwork stage",
      badgeBg: "bg-[#F3EFEA] text-stone-700 border-[#E4DFD7]",
      summary: "Start with Step 1 of your roadmap to master core prerequisites and build your first verified project.",
    };
  };

  const verdict = getVerdict(score);

  return (
    <div className="space-y-7 pb-16">
      {/* Header */}
      <div className="border-b border-[#E7E2DA] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[#C85A32]">
            Assessment & Benchmark
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
            Your Career Readiness Score
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Evaluated for <strong className="text-stone-900 font-semibold">{profile.target_role}</strong>.
            We look at your technical inventory, project depth, interview confidence, and recruiter ATS standards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefreshAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-[#FAF8F5] text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-60 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#E6B89C] ${isAnalyzing ? "animate-spin" : ""}`} />
            <span>{isAnalyzing ? "Updating assessment..." : "Recalculate Readiness"}</span>
          </button>
        </div>
      </div>

      {/* Main Score Display & Pillar Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Summary Box (5 cols) */}
        <div className="lg:col-span-5 bg-[#FAF8F5] rounded-2xl border border-[#E7E2DA] p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE8E0]">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Current Rating
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${verdict.badgeBg}`}>
                {verdict.label}
              </span>
            </div>

            {/* Score Numbers */}
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-6xl font-extrabold text-stone-900 tracking-tight">{score}</span>
              <span className="text-stone-400 text-2xl font-medium">/ 100</span>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-[#FFFFFF] border border-[#EBE5DB]">
              <h3 className="text-sm font-bold text-stone-900">{verdict.label}</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                {verdict.summary}
              </p>
            </div>

            {/* Target Role context */}
            <div className="mt-5 space-y-2 text-xs text-stone-600">
              <div className="flex justify-between py-1.5 border-b border-[#EDE7DD]">
                <span className="text-stone-500">Target Role:</span>
                <span className="font-bold text-stone-900">{profile?.target_role}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#EDE7DD]">
                <span className="text-stone-500">Benchmark Skills:</span>
                <span className="font-semibold text-stone-900">{profile?.skills?.length || 0} Listed</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-stone-500">Key Gaps Remaining:</span>
                <span className="font-semibold text-[#A64522]">
                  {safeReadiness?.criticalSkillGaps?.length || 2} to acquire
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#EDE7DD] flex items-center justify-between">
            <span className="text-[11px] text-stone-500">Want to raise your score?</span>
            <button
              onClick={() => onNavigate("roadmap")}
              className="text-xs font-semibold text-[#A64522] hover:text-[#883617] flex items-center gap-1"
            >
              <span>Work on Roadmap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 5 Supporting Pillars Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-xs">
          <div className="pb-4 border-b border-[#ECE6DC] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">Supporting Areas</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Breakdown across the 5 dimensions entry-level hiring managers screen for
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F2EDE5] text-[#8C4A2F]">
              5 Evaluated Pillars
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {breakdownItems.map((item) => (
              <div key={item.label} className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EAE3D8] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-900">{item.label}</span>
                  <span className="font-extrabold text-stone-900">{item.score}%</span>
                </div>
                <div className="w-full h-2 bg-[#E7E0D5] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.barClass} rounded-full transition-all duration-500`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-500">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Assessment Note */}
          <div className="mt-5 p-3.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD0] text-xs text-stone-700 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-[#C85A32] flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Recruiter Tip:</strong> Employers hiring freshers place 40% weight on technical skill
              fluency and 30% on practical projects. Even adding 1 well-documented GitHub repository will
              noticeably raise your standing.
            </p>
          </div>
        </div>
      </div>

      {/* Strengths & Missing Skills Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strengths */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-[#ECE6DC]">
            <div className="w-7 h-7 rounded-lg bg-[#EFF5F0] text-[#3B5A41] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">What You Excel At</h3>
              <p className="text-[11px] text-stone-500">Your competitive advantages</p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {(safeReadiness.strengths || []).length > 0 ? (
              safeReadiness.strengths.map((st, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-stone-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#496552] mt-1.5 flex-shrink-0" />
                  <span>{st}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-stone-500 italic">
                Add projects and coursework in your profile to highlight specific strengths.
              </li>
            )}
          </ul>
        </div>

        {/* Missing Skills */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-[#ECE6DC]">
            <div className="w-7 h-7 rounded-lg bg-[#FAF0EB] text-[#A64522] flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">Skills Worth Improving</h3>
              <p className="text-[11px] text-stone-500">Key competencies to unlock</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(safeReadiness.criticalSkillGaps || []).length > 0 ? (
                safeReadiness.criticalSkillGaps.map((gap, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FAF0EB] text-[#A64522] border border-[#F2D7CC]"
                  >
                    {gap}
                  </span>
                ))
              ) : (
                <span className="text-xs text-stone-500 italic">No critical skill gaps identified.</span>
              )}
            </div>

            <button
              onClick={() => onNavigate("skillgap")}
              className="w-full pt-3 mt-2 text-xs font-semibold text-[#A64522] hover:text-[#883617] flex items-center justify-between border-t border-[#F0EBE2]"
            >
              <span>Explore study guide</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Your Next Practical Step */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-[#ECE6DC]">
            <div className="w-7 h-7 rounded-lg bg-[#FAF6F0] text-[#C85A32] flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">Your Next Step</h3>
              <p className="text-[11px] text-stone-500">High-yield action for this week</p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {(safeReadiness.improvementAreas || []).length > 0 ? (
              safeReadiness.improvementAreas.map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-stone-700">
                  <span className="w-4 h-4 rounded-full bg-[#F3ECE4] text-[#A64522] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{area}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-stone-600">
                Continue following your personalized roadmap steps in order.
              </li>
            )}
          </ul>

          <button
            onClick={() => onNavigate("roadmap")}
            className="w-full pt-3 mt-2 text-xs font-semibold text-stone-900 hover:text-stone-700 flex items-center justify-between border-t border-[#F0EBE2]"
          >
            <span>Open Career Roadmap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
