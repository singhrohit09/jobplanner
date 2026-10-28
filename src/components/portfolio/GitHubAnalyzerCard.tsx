import React, { useState } from "react";
import {
  Github,
  Search,
  Star,
  GitFork,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Sparkles,
  Plus,
  RefreshCw,
  Clock,
  BookOpen,
  Code2,
  X,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { GitHubAnalysis, GitHubRepoMetadata, PortfolioProject } from "../../types";

interface GitHubAnalyzerCardProps {
  initialAnalysis: GitHubAnalysis | null;
  onSaveAnalysis: (analysis: GitHubAnalysis) => Promise<void>;
  onImportRepoAsProject: (repo: GitHubRepoMetadata) => void;
  existingProjectNames: string[];
}

export const GitHubAnalyzerCard: React.FC<GitHubAnalyzerCardProps> = ({
  initialAnalysis,
  onSaveAnalysis,
  onImportRepoAsProject,
  existingProjectNames,
}) => {
  const [usernameInput, setUsernameInput] = useState(initialAnalysis?.username || "");
  const [analysis, setAnalysis] = useState<GitHubAnalysis | null>(initialAnalysis);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // README Modal state
  const [readmeModalRepo, setReadmeModalRepo] = useState<GitHubRepoMetadata | null>(null);
  const [readmeAnalysis, setReadmeAnalysis] = useState<any | null>(null);
  const [isLoadingReadme, setIsLoadingReadme] = useState(false);

  // Update if initialAnalysis changes
  React.useEffect(() => {
    if (initialAnalysis) {
      setAnalysis(initialAnalysis);
      if (!usernameInput) {
        setUsernameInput(initialAnalysis.username);
      }
    }
  }, [initialAnalysis]);

  const handleFetchProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUsername = usernameInput.trim();
    if (!cleanUsername) {
      setError("Please enter a GitHub username or profile URL.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const resp = await fetch(`/api/github/profile/${encodeURIComponent(cleanUsername)}`);
      const data = await resp.json();

      if (!resp.ok || data.error) {
        throw new Error(data.error || "Failed to analyze GitHub profile.");
      }

      setAnalysis(data);
      await onSaveAnalysis(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze GitHub profile. Check internet connection or username.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeReadme = async (repo: GitHubRepoMetadata) => {
    if (!analysis) return;
    setReadmeModalRepo(repo);
    setReadmeAnalysis(null);
    setIsLoadingReadme(true);

    try {
      const resp = await fetch("/api/github/readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: analysis.username,
          repo: repo.name,
          defaultBranch: repo.defaultBranch || "main",
        }),
      });

      const data = await resp.json();
      setReadmeAnalysis(data);
    } catch (err: any) {
      setReadmeAnalysis({
        hasReadme: false,
        message: "Could not evaluate README. Please check internet connection.",
      });
    } finally {
      setIsLoadingReadme(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Search & Connect Bar */}
      <div className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 font-editorial">
                GitHub Profile & Repository Analyzer
              </h3>
              <p className="text-xs text-stone-500">
                Inspect authentic public repositories, languages, stars, and README quality without fake metrics.
              </p>
            </div>
          </div>

          <form onSubmit={handleFetchProfile} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="github.com/username or username"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#D9D3C8] bg-[#FAF8F5] text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32]"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{isLoading ? "Analyzing..." : "Analyze GitHub"}</span>
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Analysis Results View */}
      {analysis && (
        <div className="space-y-6 animate-in fade-in">
          {/* Profile Overview Stats */}
          <div className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#ECE6DC]">
              <div className="flex items-center gap-3.5">
                {analysis.avatarUrl ? (
                  <img
                    src={analysis.avatarUrl}
                    alt={analysis.username}
                    className="w-12 h-12 rounded-xl border border-[#E7E2DA] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-stone-800 text-white flex items-center justify-center font-bold text-lg">
                    {analysis.username[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-stone-900">{analysis.name || analysis.username}</h4>
                    <span className="text-xs text-stone-500 font-mono">@{analysis.username}</span>
                  </div>
                  {analysis.bio && <p className="text-xs text-stone-600 mt-0.5 max-w-xl">{analysis.bio}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={analysis.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-[#D9D3C8] text-xs font-semibold text-stone-700 hover:bg-[#FAF8F5] transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                  <span>View on GitHub</span>
                </a>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Public Repositories
                </span>
                <div className="text-xl font-bold text-stone-900 font-editorial mt-0.5">
                  {analysis.publicReposCount}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Total Stars Earned
                </span>
                <div className="text-xl font-bold text-stone-900 font-editorial mt-0.5 flex items-center gap-1 text-amber-600">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>{analysis.analysisSummary?.totalStars ?? 0}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Total Community Forks
                </span>
                <div className="text-xl font-bold text-stone-900 font-editorial mt-0.5 flex items-center gap-1 text-stone-700">
                  <GitFork className="w-4 h-4" />
                  <span>{analysis.analysisSummary?.totalForks ?? 0}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Followers
                </span>
                <div className="text-xl font-bold text-stone-900 font-editorial mt-0.5">
                  {analysis.followers}
                </div>
              </div>
            </div>

            {/* Top Languages Tags */}
            {analysis.analysisSummary?.topLanguages && analysis.analysisSummary.topLanguages.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#ECE6DC] flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-stone-600 mr-1 flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Demonstrated Languages:</span>
                </span>
                {analysis.analysisSummary.topLanguages.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF3EC] border border-[#F3DACF] text-xs font-semibold text-[#8C4A2F]"
                  >
                    {item.language} <span className="text-stone-400 text-[10px]">({item.count})</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actionable Recommendations Bar */}
          {analysis.analysisSummary?.recommendedActions && (
            <div className="rounded-2xl border border-[#EDE7DD] bg-[#FAF8F5] p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-2">
                Recruiter Impact Actions for GitHub
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analysis.analysisSummary.recommendedActions.map((act, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white border border-[#E7E2DA] text-xs text-stone-700 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repositories List */}
          <div className="rounded-2xl border border-[#E7E2DA] bg-[#FFFFFF] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-stone-900 font-editorial">
                  Analyzed Repositories ({analysis.repositories?.length || 0})
                </h4>
                <p className="text-xs text-stone-500">
                  Import authentic codebases directly into your Portfolio or inspect documentation standards.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(analysis.repositories || []).map((repo) => {
                const isAlreadyImported = existingProjectNames.some(
                  (name) => name.toLowerCase() === repo.name.toLowerCase()
                );

                return (
                  <div
                    key={repo.name}
                    className="p-4 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] hover:bg-white hover:border-[#D9D3C8] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-stone-900 font-mono truncate">
                          {repo.name}
                        </span>
                        {repo.isFork && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                            Fork
                          </span>
                        )}
                        {repo.language && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF3EC] text-[#8C4A2F] border border-[#F3DACF]">
                            {repo.language}
                          </span>
                        )}
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{repo.stars}</span>
                        </span>
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <GitFork className="w-3 h-3" />
                          <span>{repo.forks}</span>
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 line-clamp-2">
                        {repo.description || (
                          <span className="italic text-stone-400">
                            No description provided. Adding a 1-sentence summary increases recruiter interest.
                          </span>
                        )}
                      </p>

                      {repo.topics && repo.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {repo.topics.slice(0, 5).map((topic) => (
                            <span key={topic} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-700">
                              #{topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      <button
                        onClick={() => handleAnalyzeReadme(repo)}
                        className="px-3 py-1.5 rounded-lg border border-[#D9D3C8] text-xs font-semibold text-stone-700 hover:bg-[#FAF8F5] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Evaluate README clarity and instructions"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                        <span>Inspect README</span>
                      </button>

                      <button
                        onClick={() => onImportRepoAsProject(repo)}
                        disabled={isAlreadyImported}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isAlreadyImported
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                            : "bg-[#C85A32] hover:bg-[#B24E2A] text-white shadow-xs"
                        }`}
                      >
                        {isAlreadyImported ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>In Portfolio</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Portfolio</span>
                          </>
                        )}
                      </button>

                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-transparent hover:border-stone-300 text-stone-400 hover:text-stone-700 transition-colors"
                        title="Open on GitHub"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty State before search */}
      {!analysis && !isLoading && (
        <div className="rounded-2xl border-2 border-dashed border-[#D9D3C8] p-10 text-center bg-[#FAF8F5]">
          <div className="w-12 h-12 rounded-2xl bg-stone-200 text-stone-600 flex items-center justify-center mx-auto mb-3">
            <Github className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-stone-800">Connect Your Public GitHub</h4>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto mt-1 leading-relaxed">
            Enter your username above to automatically extract your public repositories, languages, stars, and documentation scores.
          </p>
        </div>
      )}

      {/* README Analyzer Modal */}
      {readmeModalRepo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FFFFFF] border border-[#E7E2DA] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#E7E2DA] bg-[#FAF8F5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-[#C85A32]" />
                <div>
                  <h3 className="text-sm font-bold text-stone-900 font-editorial">
                    README Inspection: {readmeModalRepo.name}
                  </h3>
                  <span className="text-[11px] text-stone-500 font-mono">{readmeModalRepo.fullName}</span>
                </div>
              </div>
              <button
                onClick={() => setReadmeModalRepo(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isLoadingReadme ? (
                <div className="py-12 text-center text-xs text-stone-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C85A32]" />
                  <p>Fetching and reviewing repository README.md...</p>
                </div>
              ) : readmeAnalysis ? (
                <div className="space-y-4 text-xs text-stone-700">
                  {readmeAnalysis.hasReadme ? (
                    <>
                      <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EDE7DD] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Documentation Clarity Score
                          </span>
                          <div className="text-2xl font-bold text-stone-900 font-editorial mt-0.5">
                            {readmeAnalysis.clarityScore || 80} / 100
                          </div>
                        </div>
                        <span className="text-xs text-stone-500 font-mono">
                          Branch: {readmeAnalysis.branch || "main"}
                        </span>
                      </div>

                      {readmeAnalysis.overview && (
                        <p className="leading-relaxed bg-white p-3 rounded-xl border border-[#EDE7DD]">
                          {readmeAnalysis.overview}
                        </p>
                      )}

                      {readmeAnalysis.strengths && (
                        <div>
                          <span className="font-bold text-stone-900 block mb-1.5">What is Done Well:</span>
                          <ul className="space-y-1 list-disc pl-5 text-emerald-800">
                            {readmeAnalysis.strengths.map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {readmeAnalysis.improvements && (
                        <div>
                          <span className="font-bold text-stone-900 block mb-1.5">Recommended Enhancements:</span>
                          <ul className="space-y-1 list-disc pl-5 text-[#A64522]">
                            {readmeAnalysis.improvements.map((imp: string, i: number) => (
                              <li key={i}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {readmeAnalysis.missingSections && (
                        <div className="p-3 rounded-xl bg-[#FFF9F5] border border-[#F6DACF]">
                          <span className="font-bold text-[#A64522] block mb-1">Recommended Missing Sections:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {readmeAnalysis.missingSections.map((sec: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-white text-[11px] font-semibold text-stone-700 border border-[#F6DACF]">
                                + {sec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <span>{readmeAnalysis.message}</span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        Recruiters and hiring managers check repository READMEs to understand what you built, how to run it, and what technologies you mastered.
                      </p>
                      {readmeAnalysis.suggestions && (
                        <ul className="list-disc pl-5 text-xs space-y-1">
                          {readmeAnalysis.suggestions.map((s: string, idx: number) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="px-6 py-3 border-t border-[#E7E2DA] bg-[#FAF8F5] flex justify-end">
              <button
                onClick={() => setReadmeModalRepo(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold cursor-pointer"
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
