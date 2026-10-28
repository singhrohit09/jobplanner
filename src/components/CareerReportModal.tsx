import React from "react";
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Award,
  ArrowRight,
  TrendingUp,
  FileText,
  Briefcase,
  GitCompare,
  MessageSquareCode,
  Milestone,
} from "lucide-react";
import { CareerAnalyticsSnapshot, UserProfile } from "../types";

interface CareerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: CareerAnalyticsSnapshot | null;
  profile: UserProfile;
}

export const CareerReportModal: React.FC<CareerReportModalProps> = ({
  isOpen,
  onClose,
  analytics,
  profile,
}) => {
  if (!isOpen || !analytics) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analytics, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `jobplanner_career_report_${profile.full_name?.replace(/\s+/g, "_") || "student"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const readiness = analytics.readiness;
  const insights = analytics.insights;
  const skills = analytics.skills;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Action Header (hidden on print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-[#EDE8E0] bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Official JobPlanner Career Diagnostic Report
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-xl border border-[#D9D2C7] bg-white hover:bg-[#F3EFEA] text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 print:p-0 print:space-y-6">
          {/* Header */}
          <div className="border-b-2 border-stone-900 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#A64522]">
                  JobPlanner Comprehensive Career Analytics
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-editorial tracking-tight">
                  {profile.full_name || "Student"}
                </h1>
                <p className="text-sm font-semibold text-stone-700 mt-0.5">
                  Target Role: <span className="text-[#A64522]">{analytics.targetRole}</span>
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  {profile.education?.degree || "Undergraduate"} • {profile.education?.college || "University"} • Class of {profile.education?.graduation_year || "2025"}
                </p>
              </div>

              <div className="sm:text-right">
                <div className="inline-flex flex-col sm:items-end">
                  <span className="text-xs text-stone-500">Report Generated</span>
                  <span className="text-xs font-bold text-stone-800">
                    {new Date(analytics.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="mt-2 inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF3EC] text-[#8C4A2F] border border-[#F3DACF]">
                    {readiness?.level || "Good Progress"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Readiness Gauge & High-level Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#FAF8F5] rounded-2xl p-6 border border-[#E7E2DA]">
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 text-center border-b md:border-b-0 md:border-r border-[#E0D9CE]">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Overall Career Readiness
              </span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-black text-stone-900 tracking-tight">
                  {readiness?.overallScore ?? 0}
                </span>
                <span className="text-stone-400 text-lg font-bold">/ 100</span>
              </div>
              <span className="mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-stone-900 text-white">
                {readiness?.level}
              </span>
            </div>

            <div className="md:col-span-8 flex flex-col justify-center space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Transparent Component Weighting
              </h4>
              <div className="space-y-2">
                {readiness?.components && (
                  <>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
                        <span>Technical & Core Skills ({readiness.components.skills.weight}%)</span>
                        <span className="font-bold">{readiness.components.skills.score}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E5DFD5] overflow-hidden">
                        <div
                          className="h-full bg-[#C85A32] rounded-full"
                          style={{ width: `${readiness.components.skills.score}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
                        <span>Resume Completeness & ATS ({readiness.components.resume.weight}%)</span>
                        <span className="font-bold">{readiness.components.resume.score}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E5DFD5] overflow-hidden">
                        <div
                          className="h-full bg-[#245285] rounded-full"
                          style={{ width: `${readiness.components.resume.score}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
                        <span>Interview Performance & Drills ({readiness.components.interview.weight}%)</span>
                        <span className="font-bold">{readiness.components.interview.score}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E5DFD5] overflow-hidden">
                        <div
                          className="h-full bg-[#2B6E4F] rounded-full"
                          style={{ width: `${readiness.components.interview.score}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
                        <span>Market Alignment & Roadmap Velocity ({readiness.components.jobs.weight + readiness.components.roadmap.weight}%)</span>
                        <span className="font-bold">
                          {Math.round((readiness.components.jobs.score + readiness.components.roadmap.score) / 2)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E5DFD5] overflow-hidden">
                        <div
                          className="h-full bg-amber-600 rounded-full"
                          style={{
                            width: `${Math.round((readiness.components.jobs.score + readiness.components.roadmap.score) / 2)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AI Career Snapshot */}
          {insights && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 border-b border-[#EDE8E0] pb-2 font-editorial">
                <TrendingUp className="w-4 h-4 text-[#A64522]" />
                <span>Executive Career Snapshot</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F4F9F4] border border-[#D5E8D4]">
                  <span className="text-xs font-bold text-[#2B6E4F] uppercase tracking-wider block">
                    What You Are Doing Well
                  </span>
                  <p className="text-xs sm:text-sm text-stone-800 mt-1 leading-relaxed font-medium">
                    {insights.careerSnapshot?.whatAmIDoingWell || insights.biggestStrength}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FFF6F4] border border-[#FADCD5]">
                  <span className="text-xs font-bold text-[#A64522] uppercase tracking-wider block">
                    What Is Holding You Back
                  </span>
                  <p className="text-xs sm:text-sm text-stone-800 mt-1 leading-relaxed font-medium">
                    {insights.careerSnapshot?.whatIsHoldingMeBack || insights.biggestWeakness}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                  How Close Are You To Your Target Career?
                </span>
                <p className="text-xs sm:text-sm text-stone-800 mt-1 leading-relaxed">
                  {insights.careerSnapshot?.howCloseAmIToTargetRole || insights.careerReadinessExplanation}
                </p>
              </div>
            </div>
          )}

          {/* Skills Breakdown */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 border-b border-[#EDE8E0] pb-2 font-editorial">
              <GitCompare className="w-4 h-4 text-[#C85A32]" />
              <span>Skill Profile & Identified Bottlenecks</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-stone-600 block mb-2">
                  Verified Skills on File ({skills?.verifiedSkillsCount || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(skills?.strongSkills || []).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FAF8F5] border border-[#E0D9CE] text-stone-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-[#A64522] block mb-2">
                  Priority Gaps to Close ({skills?.missingSkillsCount || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(skills?.topPriorityGaps || []).map((gap, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FFF4EE] border border-[#FADCD5] text-[#A64522]"
                    >
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Next Recommended Priority Action */}
          {insights?.nextBestAction && (
            <div className="p-5 rounded-xl border-2 border-stone-900 bg-stone-900 text-white">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#F2D7CC] block">
                Recommended Priority Action
              </span>
              <h4 className="text-base font-bold mt-1 font-editorial">
                {insights.nextBestAction.action}
              </h4>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                {insights.nextBestAction.reason}
              </p>
            </div>
          )}

          {/* Report Footer Notice */}
          <div className="border-t border-[#EDE8E0] pt-4 text-center">
            <p className="text-[11px] text-stone-400 font-medium">
              JobPlanner Diagnostic Report • Evaluated against real industry standards and candidate records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
