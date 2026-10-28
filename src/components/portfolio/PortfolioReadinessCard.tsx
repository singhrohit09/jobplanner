import React from "react";
import {
  BarChart3,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Lightbulb,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  Compass,
  Milestone,
  Check,
} from "lucide-react";
import {
  PortfolioReadinessBreakdown,
  PortfolioGapAnalysis,
  PortfolioProject,
} from "../../types";

interface PortfolioReadinessCardProps {
  readiness: PortfolioReadinessBreakdown;
  gapAnalysis: PortfolioGapAnalysis | null;
  targetRole?: string;
  onAddProjectToRoadmap?: (recommendation: any) => void;
  onDraftProjectFromIdea?: (recommendation: any) => void;
  onFeatureProject?: (projectId: string) => void;
  onNavigateToRoadmap?: () => void;
  onRefreshGapAnalysis?: () => void;
  isAnalyzingGaps?: boolean;
}

export const PortfolioReadinessCard: React.FC<PortfolioReadinessCardProps> = ({
  readiness,
  gapAnalysis,
  targetRole = "Software Engineer",
  onAddProjectToRoadmap,
  onDraftProjectFromIdea,
  onFeatureProject,
  onNavigateToRoadmap,
  onRefreshGapAnalysis,
  isAnalyzingGaps,
}) => {
  const score = readiness.overallScore ?? 0;

  // Visual meter color
  const scoreColor =
    score >= 75
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : score >= 45
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-[#A64522] bg-[#FAF3EC] border-[#F3DACF]";

  const barColor =
    score >= 75
      ? "bg-emerald-600"
      : score >= 45
      ? "bg-amber-600"
      : "bg-[#C85A32]";

  return (
    <div className="space-y-6">
      {/* Overview Score & Breakdown Banner */}
      <div className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#ECE6DC]">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center shrink-0 ${scoreColor}`}>
              <span className="text-2xl font-bold font-editorial leading-none">
                {score}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-80">
                / 100
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FAF3EC] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
                  Portfolio Readiness Diagnostic
                </span>
                <span className="text-xs text-stone-400 font-medium">Target Role: {targetRole}</span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 mt-1 font-editorial tracking-tight">
                {score >= 75
                  ? "Recruiter-Ready Technical Portfolio"
                  : score >= 45
                  ? "Good Foundation — Bridge Key Project Gaps"
                  : "Portfolio In Development — Expand Project Catalog"}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
                {readiness.summary}
              </p>
            </div>
          </div>

          {/* Quick Progress Bar */}
          <div className="w-full md:w-52 space-y-1.5 shrink-0">
            <div className="flex justify-between text-xs font-semibold text-stone-700">
              <span>Readiness Progress</span>
              <span>{score}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#FAF5F0] border border-[#ECE6DC] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.max(5, Math.min(100, score))}%` }}
              />
            </div>
          </div>
        </div>

        {/* 6 Category Dimension Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
          {Object.entries(readiness.categories).map(([key, cat]) => {
            const item = cat as { score: number; label: string; details: string };
            return (
              <div
                key={key}
                className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 capitalize block truncate">
                    {key}
                  </span>
                  <span className="text-sm font-bold text-stone-900 font-editorial mt-0.5 block">
                    {item.label}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-tight">
                  {item.details}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Diagnostic Checklist */}
      <div className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-bold text-stone-900 font-editorial">
              Portfolio Quality Checklist
            </h4>
            <p className="text-xs text-stone-500">
              Essential signals hiring managers and tech recruiters look for on engineering portfolios.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {readiness.completedChecklist.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                item.completed
                  ? "bg-[#FAFBF9] border-[#E0EBDC]"
                  : "bg-[#FFFDFC] border-[#F2E8DF]"
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-stone-300 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      item.completed ? "text-stone-800" : "text-stone-700"
                    }`}
                  >
                    {item.item}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide shrink-0 ${
                      item.impact === "Critical"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : item.impact === "High"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {item.impact}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Gap Analysis & Targeted Recommendations */}
      <div className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ECE6DC]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FAF3EC] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
                AI Gap Analysis
              </span>
              <span className="text-xs text-stone-400 font-medium">Cross-analyzed with Target Role</span>
            </div>
            <h4 className="text-base font-bold text-stone-900 mt-1 font-editorial">
              Portfolio Gaps & Strategic Recommendations
            </h4>
            <p className="text-xs text-stone-500">
              Identifies missing project architectures, absent tech stack proof, and builds that move the needle.
            </p>
          </div>

          {onRefreshGapAnalysis && (
            <button
              onClick={onRefreshGapAnalysis}
              disabled={isAnalyzingGaps}
              className="px-3.5 py-2 rounded-xl border border-[#D9D3C8] text-xs font-semibold text-stone-700 hover:bg-[#FAF8F5] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>{isAnalyzingGaps ? "Re-analyzing..." : "Refresh Gap Analysis"}</span>
            </button>
          )}
        </div>

        {gapAnalysis && (
          <>
            {/* Missing Types & Stack Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] space-y-2">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#C85A32]" />
                  <span>Missing Project Architecture Types:</span>
                </span>
                <ul className="text-xs text-stone-600 space-y-1 pl-4 list-disc">
                  {gapAnalysis.missingProjectTypes.map((type, idx) => (
                    <li key={idx}>{type}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] space-y-2">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Missing Tech Proof for {targetRole}:</span>
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {gapAnalysis.missingTechnologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-white border border-[#D9D3C8] text-[11px] font-semibold text-stone-700"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Strategic Recommended Builds */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-3">
                Recommended New Builds to Maximize Recruiter Callbacks
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gapAnalysis.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-[#EDE7DD] bg-[#FAF8F5] hover:border-[#D9D3C8] hover:bg-white transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FAF3EC] px-2 py-0.5 rounded-full border border-[#F3DACF]">
                          {rec.category}
                        </span>
                        {rec.estimatedHours && (
                          <span className="text-[10px] text-stone-400 font-medium">
                            Est: {rec.estimatedHours}
                          </span>
                        )}
                      </div>

                      <h5 className="text-sm font-bold text-stone-900">{rec.title}</h5>
                      <p className="text-xs text-stone-600 leading-relaxed">{rec.problemToSolve}</p>

                      <div className="pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                          Recommended Stack:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {rec.targetStack.map((stk: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-stone-200/70 text-[10px] font-mono text-stone-800"
                            >
                              {stk}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200/60 leading-relaxed">
                        <span className="font-semibold text-stone-800">Recruiter Value: </span>
                        {rec.whyItHelpsTargetRole}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-stone-200/70 flex items-center justify-between gap-2">
                      {onDraftProjectFromIdea && (
                        <button
                          onClick={() => onDraftProjectFromIdea(rec)}
                          className="px-3 py-1.5 rounded-lg bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Draft This Project</span>
                        </button>
                      )}

                      {onAddProjectToRoadmap && (
                        <button
                          onClick={() => onAddProjectToRoadmap(rec)}
                          className="px-3 py-1.5 rounded-lg border border-[#D9D3C8] text-stone-700 hover:bg-[#FAF8F5] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Add milestone to Career Roadmap"
                        >
                          <Milestone className="w-3.5 h-3.5 text-[#C85A32]" />
                          <span>Track in Roadmap</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
