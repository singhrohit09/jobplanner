import React, { useState } from "react";
import {
  Sparkles,
  Check,
  Copy,
  ArrowRight,
  FileText,
  MessageSquareCode,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PortfolioProject, ProjectAIAnalysis } from "../../types";

interface ProjectAICardProps {
  project: PortfolioProject;
  analysis?: ProjectAIAnalysis;
  onApplyImprovedDescription?: (newDescription: string) => void;
  onExportBulletsToResume?: (bullets: string[]) => void;
  onNavigateToInterviewPrep?: (projectName: string) => void;
  onNavigateToRoadmap?: () => void;
}

export const ProjectAICard: React.FC<ProjectAICardProps> = ({
  project,
  analysis,
  onApplyImprovedDescription,
  onExportBulletsToResume,
  onNavigateToInterviewPrep,
  onNavigateToRoadmap,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "interview" | "narrative" | "improvements">("resume");
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

  if (!analysis) return null;

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="mt-4 rounded-2xl border border-[#F3DACF] bg-[#FFFDFC] p-5 shadow-xs animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F5E6DF]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FBEFE9] text-[#C85A32] flex items-center justify-center border border-[#F3DACF]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FAF3EC] px-2 py-0.5 rounded-full border border-[#F3DACF]">
                AI Project Insights
              </span>
              <span className="text-xs text-stone-400 font-medium">Grounded in authentic input</span>
            </div>
            <h4 className="text-sm font-bold text-stone-900 mt-0.5">
              Portfolio & Recruiter Strategy for {project.name}
            </h4>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-[#F5F1EB] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("resume")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "resume"
                ? "bg-white text-[#C85A32] shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Resume Bullets
          </button>
          <button
            onClick={() => setActiveTab("interview")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "interview"
                ? "bg-white text-[#C85A32] shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            STAR Interview
          </button>
          <button
            onClick={() => setActiveTab("narrative")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "narrative"
                ? "bg-white text-[#C85A32] shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Story Narrative
          </button>
          <button
            onClick={() => setActiveTab("improvements")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "improvements"
                ? "bg-white text-[#C85A32] shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Action Gaps
          </button>
        </div>
      </div>

      {/* Tab 1: Resume Bullets */}
      {activeTab === "resume" && (
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              ATS-Optimized Bullet Points
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  copyToClipboard(analysis.resumeBullets.map((b) => `• ${b}`).join("\n"), "bullets")
                }
                className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-medium cursor-pointer"
              >
                {copiedSection === "bullets" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === "bullets" ? "Copied" : "Copy All"}</span>
              </button>
              {onExportBulletsToResume && (
                <button
                  onClick={() => onExportBulletsToResume(analysis.resumeBullets)}
                  className="px-2.5 py-1 rounded-lg bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Sync with Resume Builder</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {analysis.resumeBullets.map((bullet, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white border border-[#EDE7DD] text-xs text-stone-800 leading-relaxed flex items-start gap-2.5 group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32] mt-1.5 shrink-0" />
                <span className="flex-1">{bullet}</span>
                <button
                  onClick={() => copyToClipboard(bullet, `b_${idx}`)}
                  className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-700 transition-opacity p-1"
                  title="Copy single bullet"
                >
                  {copiedSection === `b_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Interview STAR Q&A */}
      {activeTab === "interview" && (
        <div className="pt-4 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE7DD] text-xs text-stone-700 leading-relaxed">
            <span className="font-bold text-stone-900 block mb-1">Elevator Pitch for Interviewers:</span>
            {analysis.interviewExplanation.summary}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                STAR Practice Drills ({analysis.interviewExplanation.starQuestions?.length || 0})
              </span>
              {onNavigateToInterviewPrep && (
                <button
                  onClick={() => onNavigateToInterviewPrep(project.name)}
                  className="text-xs text-[#245285] hover:text-[#18395E] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquareCode className="w-3.5 h-3.5" />
                  <span>Practice in Interview Prep</span>
                </button>
              )}
            </div>

            {(analysis.interviewExplanation.starQuestions || []).map((q, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#EDE7DD] bg-white overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                  className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 text-xs font-bold text-stone-800 hover:bg-[#FAF8F5] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#EEF4FB] text-[#245285] flex items-center justify-center text-[10px] shrink-0 font-mono">
                      Q{idx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>
                  {expandedQuestion === idx ? (
                    <ChevronUp className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  )}
                </button>

                {expandedQuestion === idx && (
                  <div className="px-4 py-3 bg-[#FAF8F5] border-t border-[#EDE7DD] text-xs text-stone-700 leading-relaxed">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#245285] mb-1">
                      Recommended Model Answer (STAR Method):
                    </div>
                    <p className="whitespace-pre-line">{q.sampleAnswer}</p>
                    <div className="mt-2.5 pt-2 border-t border-stone-200 flex justify-end">
                      <button
                        onClick={() => copyToClipboard(q.sampleAnswer, `ans_${idx}`)}
                        className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        {copiedSection === `ans_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSection === `ans_${idx}` ? "Copied Answer" : "Copy Model Answer"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Story Narrative */}
      {activeTab === "narrative" && (
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Enhanced Portfolio Presentation
            </span>
            {onApplyImprovedDescription && (
              <button
                onClick={() => onApplyImprovedDescription(analysis.improvedDescription)}
                className="px-2.5 py-1 rounded-lg bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply to Project Description</span>
              </button>
            )}
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#EDE7DD] text-xs text-stone-800 leading-relaxed">
            <h5 className="font-bold text-stone-900 mb-1.5">Polished Recruiter Summary:</h5>
            <p>{analysis.improvedDescription}</p>

            <div className="mt-4 pt-3 border-t border-stone-100">
              <h5 className="font-bold text-stone-900 mb-1">Architectural Context & Problem:</h5>
              <p className="text-stone-600">{analysis.portfolioNarrative}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Action Gaps & Improvements */}
      {activeTab === "improvements" && (
        <div className="pt-4 space-y-4">
          {analysis.missingInformation && analysis.missingInformation.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#FFF9F5] border border-[#F6DACF] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#A64522]">
                <AlertTriangle className="w-4 h-4" />
                <span>Information Missing in Current Project Entry:</span>
              </div>
              <ul className="text-xs text-stone-700 space-y-1 pl-4 list-disc">
                {analysis.missingInformation.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-2">
              Engineering Improvements to Reach Recruiter Quality
            </span>
            <div className="space-y-2">
              {analysis.suggestedImprovements.map((imp, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white border border-[#EDE7DD] text-xs text-stone-800 flex items-start gap-2.5"
                >
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed flex-1">{imp}</span>
                </div>
              ))}
            </div>
          </div>

          {onNavigateToRoadmap && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={onNavigateToRoadmap}
                className="text-xs text-[#C85A32] hover:text-[#9A3E1E] font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Track these improvements in Career Roadmap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
