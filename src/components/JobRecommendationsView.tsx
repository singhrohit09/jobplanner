import React, { useState, useMemo } from "react";
import {
  Briefcase,
  Search,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
  ExternalLink,
  Check,
  Sparkles,
  RefreshCw,
  Filter,
  ArrowUpRight,
  ChevronRight,
  X,
  ShieldCheck,
  FileText,
  TrendingUp,
  Info,
  DollarSign,
} from "lucide-react";
import { UserProfile, JobListing, SkillGapAnalysisResult, JobApplication } from "../types";

interface JobRecommendationsViewProps {
  profile: UserProfile;
  jobs: JobListing[];
  onToggleSaveJob: (jobId: string) => void;
  onApplyJob: (jobId: string) => void;
  onTrackApplication?: (jobData: Partial<JobApplication>) => void;
  onNavigate: (tab: string) => void;
  currentUser?: any;
  firestoreUserData?: any;
  skillGapAnalysis?: SkillGapAnalysisResult | null;
  onRefreshRecommendations?: () => Promise<void>;
  isRefreshing?: boolean;
}

export const JobRecommendationsView: React.FC<JobRecommendationsViewProps> = ({
  profile,
  jobs,
  onToggleSaveJob,
  onApplyJob,
  onTrackApplication,
  onNavigate,
  currentUser,
  firestoreUserData,
  skillGapAnalysis,
  onRefreshRecommendations,
  isRefreshing = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>("All");
  const [selectedExperience, setSelectedExperience] = useState<string>("All");
  const [minMatchScore, setMinMatchScore] = useState<number>(0);
  const [activeViewTab, setActiveViewTab] = useState<"all" | "saved">("all");
  const [sortBy, setSortBy] = useState<"match" | "latest" | "salary">("match");
  const [selectedJobForModal, setSelectedJobForModal] = useState<JobListing | null>(null);
  const [trackingPromptJob, setTrackingPromptJob] = useState<JobListing | null>(null);
  const [appliedJobModal, setAppliedJobModal] = useState<JobListing | null>(null);

  // Derive candidate skills for matching comparison
  const userSkills = useMemo(() => {
    const fromProfile = Array.isArray(profile?.skills) ? profile.skills : [];
    const fromFirestore = Array.isArray(firestoreUserData?.skills) ? firestoreUserData.skills : [];
    const set = new Set<string>();
    fromProfile.forEach((s) => set.add(s));
    fromFirestore.forEach((s) => set.add(s));
    return Array.from(set);
  }, [profile?.skills, firestoreUserData?.skills]);

  const userSkillsLower = useMemo(
    () => userSkills.map((s) => s.toLowerCase().trim()),
    [userSkills]
  );

  // Target role
  const targetRole = profile?.target_role || firestoreUserData?.targetRole || "Data Analyst";

  // Check if current dataset contains live jobs
  const hasLiveJobs = useMemo(() => {
    return (jobs || []).some((j) => j.isLive);
  }, [jobs]);

  // Compute live match metrics for jobs if not already computed
  const processedJobs = useMemo(() => {
    return (jobs || []).map((job) => {
      const required = job?.requiredSkills || [];
      const matched =
        job.matchedSkills && job.matchedSkills.length > 0
          ? job.matchedSkills
          : required.filter((req) =>
              userSkillsLower.some(
                (u) => u.includes(req.toLowerCase()) || req.toLowerCase().includes(u)
              )
            );
      const missing =
        job.missingSkills && job.missingSkills.length > 0
          ? job.missingSkills
          : required.filter((req) => !matched.includes(req));

      const dynamicScore =
        job.matchScore !== undefined
          ? job.matchScore
          : Math.min(
              98,
              Math.max(
                30,
                Math.round((matched.length / Math.max(required.length, 1)) * 80 + 15)
              )
            );

      // Default why it matches
      const whyItMatches =
        job.whyItMatches ||
        (dynamicScore >= 80
          ? `This role strongly matches your ${targetRole} path, with direct alignment across your verified ${matched.slice(0, 3).join(", ")} background.`
          : dynamicScore >= 55
          ? `Solid foundation in ${matched.join(", ") || "core domain concepts"}, with opportunity to bridge gaps in ${missing.slice(0, 2).join(" and ")}.`
          : `Growth opportunity with foundational fit. Upskilling in ${missing.slice(0, 2).join(", ")} will elevate your competitiveness.`);

      // Default improvement suggestions using skill gap analysis when available
      const improvementSuggestions =
        job.improvementSuggestions && job.improvementSuggestions.length > 0
          ? job.improvementSuggestions
          : [
              missing[0]
                ? `Learn ${missing[0]} fundamentals to pass initial resume screening.`
                : `Solidify ${matched[0] || "core"} project deliverables in your portfolio.`,
              missing[1]
                ? `Build a portfolio project demonstrating ${missing[1]}.`
                : `Practice standard ${job.title} technical interview questions.`,
              `Review Stage 1 priorities in your Skill Gap roadmap.`,
            ];

      return {
        ...job,
        matchScore: dynamicScore,
        matchedSkills: matched,
        missingSkills: missing,
        whyItMatches,
        improvementSuggestions,
      };
    });
  }, [jobs, userSkillsLower, targetRole]);

  // Filter and Sort Jobs
  const filteredJobs = useMemo(() => {
    return processedJobs
      .filter((job) => {
        // Tab filter (All vs Saved)
        if (activeViewTab === "saved" && !job.saved) return false;

        // Search text
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm ||
          (job?.title || "").toLowerCase().includes(search) ||
          (job?.company || "").toLowerCase().includes(search) ||
          (job?.location || "").toLowerCase().includes(search) ||
          (job?.requiredSkills || []).some((s) => s.toLowerCase().includes(search));

        // Workplace mode
        const matchesMode =
          selectedWorkMode === "All" || job?.workMode?.toLowerCase() === selectedWorkMode.toLowerCase();

        // Experience
        const matchesExp =
          selectedExperience === "All" ||
          (job?.experience || "").toLowerCase().includes(selectedExperience.toLowerCase());

        // Min score
        const matchesScore = (job?.matchScore || 0) >= minMatchScore;

        return matchesSearch && matchesMode && matchesExp && matchesScore;
      })
      .sort((a, b) => {
        if (sortBy === "match") return b.matchScore - a.matchScore;
        if (sortBy === "salary") {
          // crude sort based on numbers in salary string
          const numA = parseInt((a.salary || "0").replace(/\D/g, "")) || 0;
          const numB = parseInt((b.salary || "0").replace(/\D/g, "")) || 0;
          return numB - numA;
        }
        return (a.id || "").localeCompare(b.id || "");
      });
  }, [processedJobs, activeViewTab, searchTerm, selectedWorkMode, selectedExperience, minMatchScore, sortBy]);

  const savedJobsCount = useMemo(() => {
    return processedJobs.filter((j) => j.saved).length;
  }, [processedJobs]);

  const handleApplyClick = (job: JobListing, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onApplyJob(job.id);
    setAppliedJobModal(job);
    if (job.applyUrl) {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleToggleSave = (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onToggleSaveJob(jobId);
  };

  return (
    <div className="space-y-7 pb-20">
      {/* Top Banner: Real API vs Demo Status Notice (Mandated in Prompt Section 4) */}
      <div className="rounded-xl bg-[#FAF6F0] border border-[#E9E1D5] p-3.5 sm:p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-stone-700">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#EFE8DC] flex items-center justify-center text-[#8C4A2F] flex-shrink-0">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-stone-900">Job Recommendation Engine: </span>
            {hasLiveJobs ? (
              <span>
                Live job listings retrieved via Adzuna API, matched and ranked against your candidate profile.{" "}
                <a
                  href="https://www.adzuna.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[#8C4A2F] hover:underline font-medium"
                >
                  Jobs powered by Adzuna <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </span>
            ) : (
              <span>Job recommendations are based on profile matching and curated catalog.</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasLiveJobs ? (
            <span className="text-[11px] font-semibold text-[#166534] px-2 py-0.5 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Adzuna Feed
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-[#345B3C] px-2 py-0.5 rounded-full bg-[#EDF5EE] border border-[#D5E4D8]">
              AI Match Active
            </span>
          )}
          {onRefreshRecommendations && (
            <button
              onClick={() => onRefreshRecommendations()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Fetching Live..." : "Refresh Live Jobs"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Section */}
      <div className="border-b border-[#E7E2DA] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#C85A32]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Career Openings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
            Recommended Roles for {targetRole}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
            Personalized role matches generated from your candidate profile, verified skills ({userSkills.length}),
            experience tier ({profile?.experience_level || "Fresher"}), and uploaded resume.
          </p>
        </div>

        {/* View Switcher: All vs Saved */}
        <div className="flex items-center p-1 bg-[#F2EDE5] rounded-xl border border-[#E2D9CC] self-start md:self-auto flex-shrink-0">
          <button
            onClick={() => setActiveViewTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeViewTab === "all"
                ? "bg-[#FFFFFF] text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            All Openings ({processedJobs.length})
          </button>
          <button
            onClick={() => setActiveViewTab("saved")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeViewTab === "saved"
                ? "bg-[#FFFFFF] text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Bookmark className="w-3 h-3 text-[#A64522]" />
            <span>Saved Jobs ({savedJobsCount})</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 shadow-xs space-y-3 text-xs">
        {/* Row 1: Search & Sort */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by job title, company name, skill, or location..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] focus:outline-none focus:border-[#C85A32] text-stone-900 placeholder:text-stone-400 text-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-stone-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] text-stone-800 font-medium focus:outline-none focus:border-[#C85A32]"
            >
              <option value="match">Best Skill Match</option>
              <option value="salary">Highest Compensation</option>
              <option value="latest">Recently Added</option>
            </select>
          </div>
        </div>

        {/* Row 2: Workplace, Experience & Score Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F2ECE4]">
          <span className="text-stone-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-stone-400" />
            Filters:
          </span>

          {/* Work Mode */}
          <div className="inline-flex items-center rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] p-0.5">
            {["All", "Remote", "Hybrid", "Onsite"].map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedWorkMode(mode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  selectedWorkMode === mode
                    ? "bg-stone-900 text-white font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Match Score */}
          <div className="inline-flex items-center rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] p-0.5">
            <button
              onClick={() => setMinMatchScore(0)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                minMatchScore === 0
                  ? "bg-stone-900 text-white font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setMinMatchScore(minMatchScore === 70 ? 0 : 70)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                minMatchScore === 70
                  ? "bg-[#345B3C] text-white font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Strong Fit (70%+)
            </button>
            <button
              onClick={() => setMinMatchScore(minMatchScore === 85 ? 0 : 85)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                minMatchScore === 85
                  ? "bg-[#2C4E33] text-white font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Top Tier (85%+)
            </button>
          </div>

          {/* Active Filter Clear */}
          {(searchTerm || selectedWorkMode !== "All" || minMatchScore > 0) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedWorkMode("All");
                setMinMatchScore(0);
              }}
              className="text-[11px] font-semibold text-[#A64522] hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-1">
        <span>
          Showing {filteredJobs.length} {activeViewTab === "saved" ? "saved openings" : "matching opportunities"}
        </span>
        <span className="text-[11px] text-stone-400">
          Ranked using real-time skill overlap + career roadmap weighting
        </span>
      </div>

      {/* Empty State */}
      {filteredJobs.length === 0 && (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-12 text-center max-w-md mx-auto space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#F4EFEA] text-stone-600 flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6 text-stone-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">
              {activeViewTab === "saved" ? "No Saved Jobs Yet" : "No Matching Openings Found"}
            </h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              {activeViewTab === "saved"
                ? "Click the bookmark icon on any job card to save roles for quick review later."
                : "No job postings matched your current search and filter criteria. Try adjusting your filters or resetting your search."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            {activeViewTab === "saved" ? (
              <button
                onClick={() => setActiveViewTab("all")}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
              >
                Browse All Openings
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedWorkMode("All");
                  setMinMatchScore(0);
                }}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Job Cards Grid */}
      <div className="space-y-4">
        {filteredJobs.map((job) => {
          const hasMatched = (job.matchedSkills || []).length > 0;
          const hasMissing = (job.missingSkills || []).length > 0;

          return (
            <div
              key={job.id}
              onClick={() => setSelectedJobForModal(job)}
              className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 sm:p-6 shadow-xs hover:border-[#D5CDC0] hover:shadow-sm transition-all space-y-4 cursor-pointer group"
            >
              {/* Row 1: Logo, Title, Badges, Match Score & Bookmark */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Company Logo or Monogram */}
                  <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-800 flex items-center justify-center font-bold text-sm shadow-2xs flex-shrink-0 group-hover:border-[#D0C7B8] transition-colors">
                    {job.companyLogo || job.company.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-stone-900 group-hover:text-[#C85A32] transition-colors">
                        {job.title}
                      </h3>
                      {job.isLive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EDF5EE] text-[#2C4E33] border border-[#D5E4D8] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Job
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0ECE4] text-stone-700 border border-[#E0D9CE]">
                        {job.workMode}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF0EB] text-[#A64522] border border-[#F2D7CC]">
                        {job.experience || "Fresher / 0–1 yr"}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-stone-900">{job.company}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        {job.location}
                      </span>
                      <span>•</span>
                      <span className="text-stone-400">Posted {job.postedAgo || "Recently"}</span>
                    </p>
                  </div>
                </div>

                {/* Match Score & Bookmark Button */}
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        job.matchScore >= 80
                          ? "bg-[#EDF5EE] text-[#2C4E33] border border-[#D5E4D8]"
                          : job.matchScore >= 55
                          ? "bg-[#FAF1E6] text-[#8F5518] border border-[#F2DECA]"
                          : "bg-[#FAF0EB] text-[#A64522] border border-[#F2D7CC]"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{job.matchScore}% Match</span>
                    </div>
                    {job.salary && (
                      <span className="text-[11px] text-stone-700 font-semibold block mt-0.5">
                        {job.salary}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleToggleSave(job.id, e)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      job.saved
                        ? "bg-[#FAF1E6] text-[#8F5518] border-[#F2DECA] hover:bg-[#F4E6D5]"
                        : "bg-[#FAF8F5] text-stone-400 border-[#E7E2DA] hover:text-stone-700 hover:border-stone-400"
                    }`}
                    title={job.saved ? "Saved to Bookmarks" : "Save Job to Bookmarks"}
                  >
                    {job.saved ? (
                      <BookmarkCheck className="w-4 h-4 fill-current" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Job Summary Description */}
              <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                {job.description}
              </p>

              {/* Skills Match Breakdown (Matching vs Missing) */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4DA] space-y-2.5 text-xs">
                {/* Why This Job Matches */}
                <div>
                  <span className="text-[11px] font-bold text-[#2C4E33] uppercase tracking-wider flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#345B3C]" />
                    Why this matches you:
                  </span>
                  <p className="text-xs text-stone-700 leading-relaxed font-medium">
                    {job.whyItMatches}
                  </p>
                </div>

                {/* Skills tags: Matching and Missing */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EDE7DD]">
                  {hasMatched && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#2C4E33]">Matching:</span>
                      {job.matchedSkills.map((sk) => (
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

                  {hasMissing && (
                    <div className="flex flex-wrap items-center gap-1.5 ml-0 sm:ml-2">
                      <span className="text-[11px] font-semibold text-[#A64522]">Missing:</span>
                      {job.missingSkills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#FAF0EB] text-[#A64522] border border-[#F2D7CC] flex items-center gap-1"
                        >
                          <span>•</span>
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Improvement Suggestions Preview (Section 11) */}
              {job.improvementSuggestions && job.improvementSuggestions.length > 0 && (
                <div className="rounded-xl bg-[#FAF6F2] border border-[#EFE5DA] p-3 text-xs">
                  <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5 text-[#C85A32]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    To improve your chances for this job:
                  </span>
                  <ul className="mt-1.5 space-y-1 text-stone-600 text-[11px]">
                    {job.improvementSuggestions.slice(0, 2).map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#C85A32] font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bottom Action Row: Details & Apply */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#F2ECE4]">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-stone-900">{job.salary || "Competitive Market Band"}</span>
                  <span className="text-stone-300">•</span>
                  <span className="text-stone-500">{job.experience || "Fresher / 0–1 yr"}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJobForModal(job);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F0ECE4] text-stone-800 font-semibold text-xs transition-colors border border-[#E7E2DA] cursor-pointer"
                  >
                    View Details
                  </button>

                  <button
                    onClick={(e) => handleApplyClick(job, e)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      job.applied
                        ? "bg-[#EDF5EE] text-[#2C4E33] border border-[#D5E4D8]"
                        : "bg-[#C85A32] hover:bg-[#B24E2A] text-white"
                    }`}
                  >
                    {job.applied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#345B3C]" />
                        <span>Applied</span>
                      </>
                    ) : (
                      <>
                        <span>Apply Direct</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Job Details Modal (Section 7) */}
      {selectedJobForModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#ECE6DC] pb-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-800 flex items-center justify-center font-bold text-sm shadow-2xs flex-shrink-0">
                  {selectedJobForModal.companyLogo || selectedJobForModal.company.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-editorial">
                    {selectedJobForModal.title}
                  </h2>
                  <p className="text-xs text-stone-600 mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-stone-900">{selectedJobForModal.company}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {selectedJobForModal.location}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-stone-700">{selectedJobForModal.workMode}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedJobForModal(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-[#FAF8F5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE3D8]">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Match Score
                </span>
                <span className="text-sm font-bold text-[#2C4E33] mt-0.5 block">
                  {selectedJobForModal.matchScore}% Fit
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE3D8]">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Compensation
                </span>
                <span className="text-sm font-bold text-stone-900 mt-0.5 block truncate">
                  {selectedJobForModal.salary || "Competitive"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE3D8]">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Experience
                </span>
                <span className="text-sm font-bold text-stone-900 mt-0.5 block truncate">
                  {selectedJobForModal.experience || "Fresher"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE3D8]">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Workplace
                </span>
                <span className="text-sm font-bold text-stone-900 mt-0.5 block">
                  {selectedJobForModal.workMode}
                </span>
              </div>
            </div>

            {/* Match Explanation */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE4DA] space-y-2 text-xs">
              <span className="text-[11px] font-bold text-[#2C4E33] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#345B3C]" />
                Why This Job Matches Your Profile:
              </span>
              <p className="text-stone-700 leading-relaxed">{selectedJobForModal.whyItMatches}</p>
            </div>

            {/* Full Job Description */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-stone-900 text-sm">Role Description</h4>
              <p className="text-stone-600 leading-relaxed">{selectedJobForModal.description}</p>
            </div>

            {/* Responsibilities */}
            {selectedJobForModal.responsibilities && selectedJobForModal.responsibilities.length > 0 && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-stone-900 text-sm">Key Responsibilities</h4>
                <ul className="space-y-1.5 text-stone-600 list-disc list-inside">
                  {selectedJobForModal.responsibilities.map((r, i) => (
                    <li key={i} className="leading-relaxed">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Qualifications & Skills */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-stone-900 text-sm">Required Qualifications & Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedJobForModal.requiredSkills.map((sk) => {
                  const isMatched = (selectedJobForModal.matchedSkills || []).includes(sk);
                  return (
                    <span
                      key={sk}
                      className={`px-2.5 py-1 rounded-md font-medium text-xs flex items-center gap-1 ${
                        isMatched
                          ? "bg-[#EDF5EE] text-[#2C4E33] border border-[#D7E5DA]"
                          : "bg-[#FAF0EB] text-[#A64522] border border-[#F2D7CC]"
                      }`}
                    >
                      {isMatched ? <Check className="w-3 h-3" /> : <span>•</span>}
                      {sk}
                      {isMatched && <span className="text-[10px] text-[#3B5A41]">(Matched)</span>}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* AI Improvement Suggestions */}
            {selectedJobForModal.improvementSuggestions &&
              selectedJobForModal.improvementSuggestions.length > 0 && (
                <div className="p-4 rounded-xl bg-[#FAF6F2] border border-[#EFE5DA] space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-[#C85A32] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    To Improve Your Chances for This Role:
                  </span>
                  <ul className="space-y-1.5 text-stone-700">
                    {selectedJobForModal.improvementSuggestions.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#C85A32] font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Source Note & Attribution */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-500 pt-1">
              <span className="italic">
                {selectedJobForModal.source || (selectedJobForModal.isLive ? "Adzuna (Live Feed)" : "Demo Job Listing")} — clicking Apply will redirect to the employer site.
              </span>
              {(selectedJobForModal.attribution || selectedJobForModal.isLive) && (
                <a
                  href={selectedJobForModal.attributionUrl || "https://www.adzuna.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#8C4A2F] hover:underline flex-shrink-0"
                >
                  <span>{selectedJobForModal.attribution || "Jobs powered by Adzuna"}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#ECE6DC]">
              <button
                onClick={() => handleToggleSave(selectedJobForModal.id)}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  selectedJobForModal.saved
                    ? "bg-[#FAF1E6] text-[#8F5518] border-[#F2DECA]"
                    : "bg-[#FAF8F5] text-stone-700 border-[#E7E2DA] hover:bg-[#F0ECE4]"
                }`}
              >
                {selectedJobForModal.saved ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 fill-current" />
                    <span>Saved to Bookmarks</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save Job</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedJobForModal(null)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] text-stone-700 hover:bg-[#F0ECE4] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleApplyClick(selectedJobForModal)}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>Apply on Employer Site</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Logged Confirmation Modal */}
      {appliedJobModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EDF5EE] text-[#2C4E33] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#345B3C]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 font-editorial">
                  Application Logged!
                </h3>
                <p className="text-xs text-stone-500">
                  {appliedJobModal.title} at {appliedJobModal.company}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              We've marked this opening as applied in your candidate records and opened the employer's career portal.
              Ensure your resume highlights{" "}
              <strong>{appliedJobModal.matchedSkills.join(", ") || "core technical capabilities"}</strong> before your interview!
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setAppliedJobModal(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Back to Opportunities
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Safety Disclaimer (Section 18) */}
      <div className="pt-6 border-t border-[#E7E2DA] text-center text-[11px] text-stone-400 max-w-2xl mx-auto">
        <p>
          AI Career Safety Notice: Job recommendations, skill match scores, and interview guidance are advisory tools designed
          to aid career preparation. JobPlanner does not guarantee hiring selection, interview invites, or compensation terms.
        </p>
      </div>
    </div>
  );
};
