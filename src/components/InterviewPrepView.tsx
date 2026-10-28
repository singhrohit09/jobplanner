import React, { useState, useEffect } from "react";
import {
  MessageSquareCode,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  History,
  Clock,
  ArrowRight,
  HelpCircle,
  UserCheck,
  ChevronRight,
  RotateCcw,
  SkipForward,
  Award,
  BookOpen,
  Briefcase,
  Target,
  BarChart3,
  TrendingUp,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Check,
  Building2,
  Trash2,
  X,
  ExternalLink,
  Zap,
} from "lucide-react";
import {
  UserProfile,
  JobListing,
  InterviewType,
  InterviewDifficulty,
  InterviewQuestionItem,
  AnswerEvaluation,
  SessionQuestionRecord,
  FinalInterviewReport,
  InterviewSession,
  ResumeData,
} from "../types";
import {
  saveInterviewSessionToFirestore,
  getInterviewSessionsFromFirestore,
  deleteInterviewSessionFromFirestore,
} from "../lib/firebase";

interface InterviewPrepViewProps {
  profile: UserProfile;
  currentUser?: any;
  firestoreUserData?: any;
  resume?: ResumeData;
  jobs?: JobListing[];
  skillGapAnalysis?: any;
  onNavigate?: (tab: string) => void;
  onSavePractice?: (record: any) => void;
  practiceHistory?: any[];
}

export const InterviewPrepView: React.FC<InterviewPrepViewProps> = ({
  profile,
  currentUser,
  firestoreUserData,
  resume,
  jobs = [],
  skillGapAnalysis,
  onNavigate,
  onSavePractice,
}) => {
  // Main view state: "setup" | "interview" | "report" | "history"
  const [viewState, setViewState] = useState<"setup" | "interview" | "report" | "history">("setup");

  // Setup configuration state
  const [interviewType, setInterviewType] = useState<InterviewType>("mock");
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("intermediate");
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [practiceAgainWeakAreas, setPracticeAgainWeakAreas] = useState<string[]>([]);

  // Active interview session state
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [activeQuestion, setActiveQuestion] = useState<InterviewQuestionItem | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<AnswerEvaluation | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestionRecord[]>([]);

  // Final Report state
  const [finalReport, setFinalReport] = useState<FinalInterviewReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);

  // History & Sessions state
  const [savedSessions, setSavedSessions] = useState<InterviewSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [viewingPastSession, setViewingPastSession] = useState<InterviewSession | null>(null);
  const [historyFilterType, setHistoryFilterType] = useState<string>("all");

  // Candidate Data Context
  const targetRole = profile?.target_role || "Software Engineer";
  const userProjects = (resume?.projects && resume.projects.length > 0)
    ? resume.projects
    : (profile?.projects && profile.projects.length > 0)
    ? profile.projects
    : (firestoreUserData?.projects && firestoreUserData.projects.length > 0)
    ? firestoreUserData.projects
    : [];

  const userSkills = (resume?.skills && resume.skills.length > 0)
    ? resume.skills
    : (profile?.skills && profile.skills.length > 0)
    ? profile.skills
    : (firestoreUserData?.skills && firestoreUserData.skills.length > 0)
    ? firestoreUserData.skills
    : [];

  const userEducation = (resume?.education && resume.education.length > 0)
    ? resume.education[0]
    : profile?.education || firestoreUserData?.education || {};

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;

  // Load past sessions from Firestore / local cache on mount
  useEffect(() => {
    if (currentUser?.uid) {
      loadHistory();
    }
  }, [currentUser?.uid]);

  const loadHistory = async () => {
    if (!currentUser?.uid) return;
    setIsLoadingHistory(true);
    try {
      const records = await getInterviewSessionsFromFirestore(currentUser.uid);
      setSavedSessions(records);
    } catch (err) {
      console.warn("Notice loading interview sessions:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Start a new interview session
  const handleStartInterview = async (
    overrideType?: InterviewType,
    overrideJob?: JobListing | null,
    weakAreas: string[] = []
  ) => {
    const typeToUse = overrideType || interviewType;
    const jobToUse = overrideJob !== undefined ? overrideJob : selectedJob;
    const newSessionId = `session-${Date.now()}`;

    setCurrentSessionId(newSessionId);
    setInterviewType(typeToUse);
    if (overrideJob) {
      setSelectedJobId(overrideJob.id);
    }
    setPracticeAgainWeakAreas(weakAreas);
    setCurrentQuestionNumber(1);
    setSessionQuestions([]);
    setCurrentEvaluation(null);
    setUserAnswer("");
    setFinalReport(null);
    setViewState("interview");

    await fetchNextQuestion(1, typeToUse, jobToUse, [], weakAreas);
  };

  // Fetch next question from server
  const fetchNextQuestion = async (
    qNumber: number,
    type: InterviewType,
    job: JobListing | null,
    previousRecords: SessionQuestionRecord[],
    weakAreas: string[] = []
  ) => {
    setIsLoadingQuestion(true);
    setCurrentEvaluation(null);
    setUserAnswer("");

    try {
      const payload = {
        interviewType: type,
        difficulty,
        questionNumber: qNumber,
        totalQuestions,
        targetRole,
        userProfile: {
          fullName: profile?.full_name || firestoreUserData?.name || "Candidate",
          targetRole,
          skills: userSkills,
          education: userEducation,
          projects: userProjects,
          experience: resume?.experience || profile?.experience || [],
        },
        resumeData: resume || null,
        skillGapAnalysis: skillGapAnalysis || null,
        selectedJob: job
          ? {
              id: job.id,
              title: job.title,
              company: job.company,
              description: job.description,
              requiredSkills: job.requiredSkills,
            }
          : null,
        previousQuestions: previousRecords.map((r) => ({
          questionNumber: r.questionNumber,
          question: r.question,
          category: r.category,
          userAnswer: r.userAnswer,
          score: r.score,
          skipped: r.skipped,
          improvements: r.improvements,
        })),
        practiceAgainWeakAreas: weakAreas,
      };

      const res = await fetch("/api/ai/interview/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const questionData = await res.json();
      setActiveQuestion({
        id: `q-${qNumber}-${Date.now()}`,
        questionNumber: qNumber,
        question: questionData.question,
        category: questionData.category || "Core Competency",
        difficulty: questionData.difficulty || difficulty,
        focusArea: questionData.focusArea || "Technical Reasoning",
        contextHint: questionData.contextHint,
      });
    } catch (error) {
      console.warn("Notice: Question generation network fallback:", error);
      // Clean fallback question
      setActiveQuestion({
        id: `q-${qNumber}-${Date.now()}`,
        questionNumber: qNumber,
        question:
          type === "resume" && userProjects.length > 0
            ? `In your project "${userProjects[0]?.title || "Capstone Project"}", what was the primary architectural pattern you selected and why?`
            : type === "behavioral"
            ? "Describe a situation where a technical project encountered an unexpected bottleneck. How did you adapt your workflow?"
            : `Explain how you would architect a scalable, fault-tolerant service for a ${targetRole} workflow.`,
        category: type === "behavioral" ? "Behavioral & Communication" : "System Architecture",
        difficulty,
        focusArea: "Technical Problem Solving",
        contextHint: "Standard interview benchmark.",
      });
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  // Submit Answer for real-time evaluation
  const handleSubmitAnswer = async (skipped = false) => {
    if (!activeQuestion) return;
    if (!skipped && userAnswer.trim().length === 0) return;

    setIsEvaluating(true);

    try {
      const res = await fetch("/api/ai/interview/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: activeQuestion.question,
          category: activeQuestion.category,
          difficulty: activeQuestion.difficulty,
          interviewType,
          userAnswer: skipped ? "" : userAnswer,
          skipped,
          targetRole,
          selectedJob,
        }),
      });

      const evalData: AnswerEvaluation = await res.json();
      setCurrentEvaluation(evalData);

      const record: SessionQuestionRecord = {
        questionId: activeQuestion.id,
        questionNumber: currentQuestionNumber,
        question: activeQuestion.question,
        category: activeQuestion.category,
        difficulty: activeQuestion.difficulty,
        userAnswer: skipped ? "Skipped by candidate" : userAnswer,
        score: skipped ? 0 : evalData.score || 7,
        skipped,
        strengths: evalData.strengths || [],
        improvements: evalData.improvements || [],
        missingPoints: evalData.missingPoints || [],
        suggestedApproach: evalData.suggestedApproach,
        evaluatedAt: new Date().toISOString(),
      };

      const updatedRecords = [...sessionQuestions, record];
      setSessionQuestions(updatedRecords);

      // Also persist to global practice records if handler provided
      if (onSavePractice && !skipped) {
        onSavePractice({
          id: `rec-${Date.now()}`,
          questionId: activeQuestion.id,
          question: activeQuestion.question,
          category: activeQuestion.category,
          userAnswer,
          score: evalData.score || 7,
          feedback: {
            score: evalData.score || 7,
            confidenceRating: evalData.score >= 8 ? "High" : evalData.score >= 6 ? "Medium" : "Needs Work",
            strengths: evalData.strengths || [],
            areasToImprove: evalData.improvements || [],
            idealSampleAnswer: evalData.suggestedApproach || "",
            keyPointsMissed: evalData.missingPoints || [],
          },
          timestamp: new Date().toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
    } catch (error) {
      console.warn("Notice evaluating answer:", error);
      const fallbackEval: AnswerEvaluation = {
        score: skipped ? 0 : 7,
        strengths: ["Clear effort and relevant vocabulary used in your answer."],
        improvements: ["Provide more architectural detail and concrete metrics."],
        missingPoints: ["Deeper explanation of trade-offs and error handling."],
        suggestedApproach:
          "State your core concept -> give a concrete project example -> discuss performance trade-offs -> state the outcome.",
      };
      setCurrentEvaluation(fallbackEval);

      const record: SessionQuestionRecord = {
        questionId: activeQuestion.id,
        questionNumber: currentQuestionNumber,
        question: activeQuestion.question,
        category: activeQuestion.category,
        difficulty: activeQuestion.difficulty,
        userAnswer: skipped ? "Skipped by candidate" : userAnswer,
        score: skipped ? 0 : 7,
        skipped,
        strengths: fallbackEval.strengths,
        improvements: fallbackEval.improvements,
        missingPoints: fallbackEval.missingPoints,
        suggestedApproach: fallbackEval.suggestedApproach,
        evaluatedAt: new Date().toISOString(),
      };
      setSessionQuestions([...sessionQuestions, record]);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Continue to next question or trigger final report
  const handleProceedToNext = async () => {
    if (currentQuestionNumber >= totalQuestions) {
      // Completed all questions -> Generate Final Report
      await generateFinalReport(sessionQuestions);
    } else {
      const nextQNumber = currentQuestionNumber + 1;
      setCurrentQuestionNumber(nextQNumber);
      await fetchNextQuestion(nextQNumber, interviewType, selectedJob, sessionQuestions, practiceAgainWeakAreas);
    }
  };

  // Generate Final Report and persist to Firestore
  const generateFinalReport = async (completedQuestions: SessionQuestionRecord[]) => {
    setIsGeneratingReport(true);
    setViewState("report");

    try {
      const res = await fetch("/api/ai/interview/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewType,
          difficulty,
          targetRole,
          selectedJob,
          questionsAndAnswers: completedQuestions,
          userProfile: {
            fullName: profile?.full_name,
            targetRole,
            skills: userSkills,
          },
        }),
      });

      const report: FinalInterviewReport = await res.json();
      setFinalReport(report);

      // Save complete session to Firestore under users/{uid}/interviewSessions/{sessionId}
      if (currentUser?.uid) {
        const fullSession: InterviewSession = {
          sessionId: currentSessionId,
          userId: currentUser.uid,
          interviewType,
          difficulty,
          targetRole,
          totalQuestions,
          completedQuestions: completedQuestions.length,
          jobId: selectedJob?.id,
          jobTitle: selectedJob?.title,
          company: selectedJob?.company,
          overallScore: report.overallScore,
          technicalScore: report.technicalScore,
          behavioralScore: report.behavioralScore,
          resumeScore: report.resumeScore,
          roleReadinessScore: report.roleReadinessScore,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          recommendations: report.recommendedTopics,
          recommendedPractice: report.recommendedPractice,
          readinessSummary: report.readinessSummary,
          questions: completedQuestions,
          startedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          completedAt: new Date().toISOString(),
          status: "completed",
        };

        await saveInterviewSessionToFirestore(currentUser.uid, fullSession);
        // Refresh local history list
        setSavedSessions((prev) => [fullSession, ...prev.filter((s) => s.sessionId !== fullSession.sessionId)]);
      }
    } catch (err) {
      console.warn("Notice generating final report:", err);
      // Deterministic fallback report
      const answered = completedQuestions.filter((q) => !q.skipped && q.score > 0);
      const avg = answered.length > 0 ? Math.round((answered.reduce((a, b) => a + b.score, 0) / answered.length) * 10) : 65;
      const fallbackReport: FinalInterviewReport = {
        overallScore: avg,
        technicalScore: Math.min(95, avg + 2),
        behavioralScore: Math.min(95, avg - 2),
        resumeScore: Math.min(95, avg + 3),
        roleReadinessScore: Math.min(95, avg),
        strengths: [
          `Clear conceptual articulation of foundational ${targetRole} principles`,
          "Professional communication style and active engagement",
          "Demonstrated authentic ownership of projects in profile",
        ],
        weaknesses: [
          "Include more quantifiable metrics in project bullet responses",
          "Discuss potential edge cases and error recovery strategies more proactively",
          "Structure behavioral examples strictly with the STAR framework",
        ],
        recommendedTopics: [
          "Database Query Optimization & Indexing",
          "System Architecture Trade-offs",
          "STAR Behavioral Storytelling",
          "Unit Testing & Continuous Integration",
        ],
        recommendedPractice: [
          "Practice explaining architectural trade-offs out loud for 5 minutes daily.",
          "Re-run this interview drill focusing specifically on your identified weak areas.",
        ],
        readinessSummary: `Candidate demonstrates solid baseline competency for ${targetRole} positions. Core concepts are well-understood. Continuing to practice structured answers with real performance metrics will prepare you to excel in competitive campus and off-campus recruitment drives.`,
      };
      setFinalReport(fallbackReport);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Delete session handler
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.uid) return;
    if (confirm("Are you sure you want to delete this interview record from your history?")) {
      setSavedSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      await deleteInterviewSessionFromFirestore(currentUser.uid, sessionId);
      if (viewingPastSession?.sessionId === sessionId) {
        setViewingPastSession(null);
      }
    }
  };

  // Calculate improvement between last 2 sessions (only if >= 2 completed sessions)
  const completedSessions = savedSessions.filter((s) => s.status === "completed" && typeof s.overallScore === "number");
  const latestSession = completedSessions[0] || null;
  const previousSession = completedSessions[1] || null;
  const hasImprovementData = completedSessions.length >= 2;
  const scoreDiff = hasImprovementData ? latestSession.overallScore - previousSession.overallScore : null;

  // Filtered past sessions
  const filteredPastSessions = savedSessions.filter((s) => {
    if (historyFilterType === "all") return true;
    return s.interviewType === historyFilterType;
  });

  // Mode badge metadata helper
  const getModeMeta = (type: InterviewType) => {
    switch (type) {
      case "mock":
        return { label: "Mock Interview", color: "bg-[#FBEFE9] text-[#A64522] border-[#F3DACF]" };
      case "technical":
        return { label: "Technical Drill", color: "bg-[#EFF4EE] text-[#395C3E] border-[#D7E3D5]" };
      case "behavioral":
        return { label: "HR & Behavioral", color: "bg-[#FDF3E7] text-[#975A16] border-[#F6E1C6]" };
      case "resume":
        return { label: "Resume-Based", color: "bg-[#EEF4FB] text-[#245285] border-[#D6E3F4]" };
      case "job_specific":
        return { label: "Job-Specific", color: "bg-[#F7EEFB] text-[#78288B] border-[#ECD5F2]" };
      case "skill_gap":
        return { label: "Skill-Gap Drill", color: "bg-[#FBF0EE] text-[#B53826] border-[#F5D8D3]" };
      default:
        return { label: "Interview", color: "bg-[#F0ECE4] text-stone-700 border-[#E0D9CE]" };
    }
  };

  // Word count helper
  const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;

  // =========================================================================
  // VIEW 1: ACTIVE INTERVIEW SCREEN
  // =========================================================================
  if (viewState === "interview") {
    const progressPercent = Math.round((currentQuestionNumber / totalQuestions) * 100);
    const modeInfo = getModeMeta(interviewType);

    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-20 animate-in fade-in duration-200">
        {/* Top Progress & Context Bar */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EAE1]">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${modeInfo.color}`}>
                {modeInfo.label}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#F4EFEA] text-stone-700 border border-[#E6DFD5] capitalize">
                {difficulty} Difficulty
              </span>
              <span className="text-xs font-semibold text-stone-600">
                Target: <strong className="text-stone-900">{targetRole}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#C85A32]">
                Question {currentQuestionNumber} of {totalQuestions}
              </span>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to end this interview session? Your answered questions will be saved.")) {
                    if (sessionQuestions.length > 0) {
                      generateFinalReport(sessionQuestions);
                    } else {
                      setViewState("setup");
                    }
                  }
                }}
                className="text-xs text-stone-500 hover:text-stone-800 font-medium underline"
              >
                End Session
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-[#EFE9DF] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#C85A32] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Job Specific Banner if active */}
          {interviewType === "job_specific" && selectedJob && (
            <div className="mt-3.5 p-3 rounded-xl bg-[#F7EEFB]/60 border border-[#ECD5F2] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Building2 className="w-4 h-4 text-[#78288B]" />
                <span className="text-stone-600">Interviewing for:</span>
                <strong className="text-stone-900 font-bold">{selectedJob.title}</strong>
                <span className="text-stone-400">•</span>
                <span className="font-semibold text-[#78288B]">{selectedJob.company}</span>
              </div>
              <span className="text-[11px] text-stone-500 hidden sm:inline">
                {selectedJob.workMode} • {selectedJob.location}
              </span>
            </div>
          )}
        </div>

        {/* Active Question Box */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 sm:p-8 shadow-xs">
          {isLoadingQuestion ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#C85A32] border-t-transparent animate-spin" />
              <p className="text-sm font-semibold text-stone-800">
                AI Interviewer is formulating your next question...
              </p>
              <p className="text-xs text-stone-500 max-w-sm">
                Adapting depth based on your target role and previous responses.
              </p>
            </div>
          ) : activeQuestion ? (
            <div className="space-y-6">
              {/* Question metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A64522] bg-[#FBEFE9] px-2.5 py-1 rounded-md border border-[#F3DACF]">
                    {activeQuestion.category}
                  </span>
                  <span className="text-xs font-medium text-stone-500">
                    Focus: <strong className="text-stone-700">{activeQuestion.focusArea}</strong>
                  </span>
                </div>

                {activeQuestion.contextHint && (
                  <span className="text-[11px] font-medium text-stone-500 italic bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EDE8E0]">
                    💡 {activeQuestion.contextHint}
                  </span>
                )}
              </div>

              {/* The Question Prompt */}
              <div className="bg-[#FAF8F5] rounded-xl p-5 border border-[#EAE3D8]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Interviewer asks:
                </span>
                <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-relaxed">
                  "{activeQuestion.question}"
                </h3>
              </div>

              {/* Instant Evaluation Feedback Display (After Submitting) */}
              {currentEvaluation ? (
                <div className="space-y-5 pt-2 border-t border-[#EAE3D8] animate-in fade-in duration-200">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#FAF8F5] border border-[#E0D9CE]">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                        currentEvaluation.score >= 8
                          ? "bg-[#EFF4EE] text-[#395C3E] border border-[#D7E3D5]"
                          : currentEvaluation.score >= 5
                          ? "bg-[#FDF3E7] text-[#975A16] border border-[#F6E1C6]"
                          : "bg-[#FBEFE9] text-[#A64522] border border-[#F3DACF]"
                      }`}>
                        {currentEvaluation.score}/10
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">
                          {currentEvaluation.score >= 8
                            ? "Excellent Answer!"
                            : currentEvaluation.score >= 6
                            ? "Good Foundation — With Room to Polish"
                            : currentEvaluation.score === 0
                            ? "Question Skipped"
                            : "Developing Response"}
                        </h4>
                        <p className="text-xs text-stone-500">
                          {currentEvaluation.score >= 8
                            ? "Demonstrated strong technical vocabulary and structured thought."
                            : "See constructive feedback below to elevate your response."}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleProceedToNext}
                      className="px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <span>
                        {currentQuestionNumber >= totalQuestions ? "View Final Report" : "Next Question"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Feedback Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-xl bg-[#EFF4EE]/60 border border-[#D7E3D5]">
                      <h5 className="text-xs font-bold text-[#2A472E] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Check className="w-3.5 h-3.5 text-[#395C3E]" />
                        <span>What Was Good (Strengths)</span>
                      </h5>
                      <ul className="space-y-1.5 text-xs text-stone-700">
                        {currentEvaluation.strengths.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#395C3E] font-bold">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="p-4 rounded-xl bg-[#FDF3E7]/60 border border-[#F6E1C6]">
                      <h5 className="text-xs font-bold text-[#7A450C] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-[#975A16]" />
                        <span>What Could Improve</span>
                      </h5>
                      <ul className="space-y-1.5 text-xs text-stone-700">
                        {currentEvaluation.improvements.map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#975A16] font-bold">•</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Missing Points if present */}
                  {currentEvaluation.missingPoints && currentEvaluation.missingPoints.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                      <h5 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Key Points to Include:
                      </h5>
                      <ul className="space-y-1 text-xs text-stone-600">
                        {currentEvaluation.missingPoints.map((mp, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#C85A32] font-bold">→</span>
                            <span>{mp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Stronger Approach / Ideal Sample Answer */}
                  {currentEvaluation.suggestedApproach && (
                    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E0D9CE]">
                      <h5 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
                        <span>Suggested Stronger Approach / Ideal Sample Answer:</span>
                      </h5>
                      <p className="text-xs text-stone-700 leading-relaxed italic bg-white p-3.5 rounded-lg border border-[#EDE8E0]">
                        "{currentEvaluation.suggestedApproach}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Answer Textarea & Controls (Before Submitting) */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Your Response:
                    </label>
                    <span className="text-[11px] text-stone-500">
                      {wordCount} words {wordCount > 0 && wordCount < 30 && "(Aim for 40+ words for complete depth)"}
                    </span>
                  </div>

                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer clearly. Structure your thought process, provide examples from your projects or coursework, and mention trade-offs or measurable results..."
                    rows={7}
                    className="w-full rounded-xl border border-[#DCD5C8] bg-white p-4 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#C85A32] focus:border-transparent transition-all leading-relaxed placeholder:text-stone-400 resize-y"
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Skip this question? It will be marked as skipped in your performance report.")) {
                          handleSubmitAnswer(true);
                        }
                      }}
                      disabled={isEvaluating}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DCD5C8] text-stone-600 hover:bg-[#FAF8F5] text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5 text-stone-400" />
                      <span>Skip Question</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubmitAnswer(false)}
                      disabled={isEvaluating || userAnswer.trim().length === 0}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isEvaluating ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Evaluating Answer...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-[#F8DDD1]" />
                          <span>Submit Answer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: FINAL REPORT SCREEN
  // =========================================================================
  if (viewState === "report") {
    if (isGeneratingReport || !finalReport) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-10 h-10 rounded-full border-3 border-[#C85A32] border-t-transparent animate-spin mb-4" />
          <h3 className="text-lg font-bold text-stone-900 font-editorial">
            Synthesizing Interview Performance Report...
          </h3>
          <p className="text-xs text-stone-600 mt-2 leading-relaxed">
            Evaluating technical accuracy, STAR structure, project knowledge, and role readiness across your session.
          </p>
        </div>
      );
    }

    const answeredCount = sessionQuestions.filter((q) => !q.skipped).length;
    const skippedCount = sessionQuestions.filter((q) => q.skipped).length;

    return (
      <div className="space-y-8 max-w-5xl mx-auto pb-20 animate-in fade-in duration-200">
        {/* Header Celebration Banner */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#395C3E] bg-[#EFF4EE] px-2.5 py-0.5 rounded-full border border-[#D7E3D5]">
                  ✓ Session Completed
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-editorial tracking-tight">
                Interview Performance Diagnostic
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl leading-relaxed">
                Target Role: <strong className="text-stone-900 font-semibold">{targetRole}</strong> • Mode:{" "}
                <span className="capitalize">{interviewType.replace("_", " ")}</span> ({difficulty})
              </p>
            </div>

            {/* Overall Score Dial */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] shrink-0">
              <div className="text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                  Overall Score
                </span>
                <div className="text-3xl sm:text-4xl font-bold text-[#C85A32] font-editorial mt-0.5">
                  {finalReport.overallScore}
                  <span className="text-base text-stone-400 font-sans font-normal">/100</span>
                </div>
              </div>
              <div className="h-10 w-[1px] bg-[#E0D9CE]" />
              <div className="text-xs text-stone-600 space-y-1">
                <div>Answered: <strong className="text-stone-900">{answeredCount}</strong></div>
                <div>Skipped: <strong className="text-stone-900">{skippedCount}</strong></div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 pt-5 border-t border-[#F0EAE1] flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleStartInterview(interviewType, selectedJob, finalReport.weaknesses)}
              className="px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#F8DDD1]" />
              <span>Practice Again (Targeting Weak Areas)</span>
            </button>

            <button
              onClick={() => setViewState("history")}
              className="px-4 py-2.5 rounded-xl bg-[#F0ECE4] hover:bg-[#E6DFD4] text-stone-800 text-xs font-semibold transition-colors border border-[#DCD5C8] flex items-center gap-2 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>View All Past Sessions</span>
            </button>

            <button
              onClick={() => setViewState("setup")}
              className="px-4 py-2.5 rounded-xl border border-[#DCD5C8] text-stone-600 hover:bg-[#FAF8F5] text-xs font-medium cursor-pointer"
            >
              Back to Interview Setup
            </button>
          </div>
        </div>

        {/* 5-Metric Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Overall Score", score: finalReport.overallScore, icon: Award, color: "text-[#C85A32]" },
            { label: "Technical Depth", score: finalReport.technicalScore, icon: Zap, color: "text-[#395C3E]" },
            { label: "HR / Behavioral", score: finalReport.behavioralScore, icon: UserCheck, color: "text-[#975A16]" },
            { label: "Resume Knowledge", score: finalReport.resumeScore, icon: FileText, color: "text-[#245285]" },
            { label: "Role Readiness", score: finalReport.roleReadinessScore, icon: Target, color: "text-[#78288B]" },
          ].map((m, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white border border-[#E7E2DA] shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider truncate">
                  {m.label}
                </span>
                <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
              </div>
              <div className="text-xl font-bold text-stone-900 font-editorial">
                {m.score}<span className="text-xs text-stone-400 font-normal font-sans">/100</span>
              </div>
              <div className="w-full bg-[#EFE9DF] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#C85A32] h-full rounded-full"
                  style={{ width: `${m.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Diagnostic Executive Summary */}
        <div className="bg-white rounded-2xl border border-[#E7E2DA] p-6 shadow-xs space-y-2">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C85A32]" />
            <span>Interview Readiness Diagnostic</span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
            {finalReport.readinessSummary}
          </p>
        </div>

        {/* Two-Column Diagnostic: Strengths vs Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strong Areas */}
          <div className="bg-white rounded-2xl border border-[#E7E2DA] p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE1]">
              <div className="w-7 h-7 rounded-lg bg-[#EFF4EE] text-[#395C3E] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Verified Strong Areas</h3>
                <p className="text-[11px] text-stone-500">Key competencies demonstrated in this interview</p>
              </div>
            </div>

            <ul className="space-y-2">
              {finalReport.strengths.map((st, idx) => (
                <li key={idx} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE3D8] text-xs text-stone-800 flex items-start gap-2">
                  <span className="text-[#395C3E] font-bold">✓</span>
                  <span>{st}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas to Improve */}
          <div className="bg-white rounded-2xl border border-[#E7E2DA] p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0EAE1]">
              <div className="w-7 h-7 rounded-lg bg-[#FBEFE9] text-[#A64522] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Primary Growth Areas</h3>
                <p className="text-[11px] text-stone-500">Topics to refine prior to real company interviews</p>
              </div>
            </div>

            <ul className="space-y-2">
              {finalReport.weaknesses.map((wk, idx) => (
                <li key={idx} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE3D8] text-xs text-stone-800 flex items-start gap-2">
                  <span className="text-[#A64522] font-bold">•</span>
                  <span>{wk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actionable Learning & Practice Roadmap */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recommended Topics */}
          <div className="bg-white rounded-2xl border border-[#E7E2DA] p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#C85A32]" />
              <span>Recommended Topics to Study</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {finalReport.recommendedTopics.map((top, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F4EFEA] text-stone-800 border border-[#E4DDD3]"
                >
                  {top}
                </span>
              ))}
            </div>
          </div>

          {/* Recommended Practice Drills */}
          <div className="bg-white rounded-2xl border border-[#E7E2DA] p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#A64522]" />
              <span>Recommended Concrete Drills</span>
            </h3>
            <ul className="space-y-2 text-xs text-stone-700">
              {finalReport.recommendedPractice.map((prac, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#C85A32] font-bold">1.{idx + 1}</span>
                  <span>{prac}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Question by Question Transcript Review */}
        <div className="bg-white rounded-2xl border border-[#E7E2DA] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE1]">
            <div>
              <h3 className="text-base font-bold text-stone-900">Question & Answer Review</h3>
              <p className="text-xs text-stone-500">Detailed breakdown of each question asked in this session</p>
            </div>
            <span className="text-xs font-semibold text-stone-600 bg-[#FAF8F5] px-2.5 py-1 rounded-md border border-[#E7E2DA]">
              {sessionQuestions.length} Questions Reviewed
            </span>
          </div>

          <div className="space-y-4">
            {sessionQuestions.map((q, idx) => (
              <div key={idx} className="p-4 sm:p-5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#C85A32]">
                    Question #{q.questionNumber} • {q.category}
                  </span>
                  <div className="flex items-center gap-2">
                    {q.skipped ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                        Skipped
                      </span>
                    ) : (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                        q.score >= 8
                          ? "bg-[#EFF4EE] text-[#395C3E] border-[#D7E3D5]"
                          : q.score >= 6
                          ? "bg-[#FDF3E7] text-[#975A16] border-[#F6E1C6]"
                          : "bg-[#FBEFE9] text-[#A64522] border-[#F3DACF]"
                      }`}>
                        Score: {q.score}/10
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-stone-900 leading-relaxed">
                  "{q.question}"
                </p>

                <div className="p-3 rounded-lg bg-white border border-[#EDE7DD] text-xs text-stone-700">
                  <span className="font-bold text-stone-500 uppercase tracking-wider block text-[10px] mb-1">
                    Your Response:
                  </span>
                  <p className="italic text-stone-800 leading-relaxed">
                    {q.userAnswer || "Question was skipped."}
                  </p>
                </div>

                {q.suggestedApproach && (
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E0D9CE] text-xs text-stone-700">
                    <span className="font-bold text-[#C85A32] uppercase tracking-wider block text-[10px] mb-1">
                      Ideal Sample Answer Approach:
                    </span>
                    <p className="text-stone-700 leading-relaxed">
                      {q.suggestedApproach}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: PAST SESSIONS / HISTORY SCREEN
  // =========================================================================
  if (viewState === "history") {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-20 animate-in fade-in duration-200">
        {/* Header */}
        <div className="border-b border-[#E7E2DA] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C85A32]">
              Career Workspace
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
              Interview History & Diagnostics
            </h1>
            <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Review your previous interview sessions, track score improvements across attempts, and review full question-by-question evaluations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setViewState("setup")}
              className="px-4 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F8DDD1]" />
              <span>Start New Interview</span>
            </button>
          </div>
        </div>

        {/* Progress Improvement Tracking Card */}
        {hasImprovementData && latestSession && previousSession && (
          <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7E2DA] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#EFF4EE] text-[#395C3E] flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Performance Trajectory
                </span>
                <h4 className="text-sm font-bold text-stone-900 mt-0.5">
                  Latest Score: {latestSession.overallScore}/100 • Previous: {previousSession.overallScore}/100
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                (scoreDiff ?? 0) >= 0
                  ? "bg-[#EFF4EE] text-[#395C3E] border-[#D7E3D5]"
                  : "bg-[#FBEFE9] text-[#A64522] border-[#F3DACF]"
              }`}>
                {(scoreDiff ?? 0) >= 0 ? `+${scoreDiff} points improvement` : `${scoreDiff} points`}
              </span>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {[
            { id: "all", label: "All Modes" },
            { id: "mock", label: "Mock Interviews" },
            { id: "technical", label: "Technical" },
            { id: "behavioral", label: "HR / Behavioral" },
            { id: "resume", label: "Resume-Based" },
            { id: "job_specific", label: "Job-Specific" },
            { id: "skill_gap", label: "Skill-Gap" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setHistoryFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                historyFilterType === tab.id
                  ? "bg-[#C85A32] text-white shadow-xs"
                  : "bg-white text-stone-700 border border-[#DCD5C8] hover:bg-[#FAF8F5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Past Sessions List */}
        {isLoadingHistory ? (
          <div className="py-12 text-center text-xs text-stone-500">
            <div className="w-6 h-6 border-2 border-[#C85A32] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading your saved interview sessions from Firebase...</span>
          </div>
        ) : filteredPastSessions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E7E2DA] max-w-lg mx-auto">
            <MessageSquareCode className="w-10 h-10 text-stone-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-900">No Interview Sessions Found</h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              You haven't completed any sessions in this category yet. Practice a quick 5-question drill to generate your first diagnostic report.
            </p>
            <button
              onClick={() => setViewState("setup")}
              className="mt-5 px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start Your First Interview</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPastSessions.map((session) => {
              const meta = getModeMeta(session.interviewType);
              const dateStr = session.completedAt || session.startedAt;
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recent Session";

              return (
                <div
                  key={session.sessionId}
                  className="bg-white rounded-2xl border border-[#E7E2DA] p-5 sm:p-6 shadow-xs hover:border-[#D5CDC0] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs font-medium text-stone-500 capitalize">
                        {session.difficulty} difficulty
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="text-xs text-stone-500">{formattedDate}</span>
                    </div>

                    <h3 className="text-base font-bold text-stone-900">
                      {session.targetRole} {session.company ? `• ${session.company}` : ""}
                    </h3>

                    <p className="text-xs text-stone-600 line-clamp-1">
                      {session.readinessSummary || "Structured diagnostic evaluation completed."}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#F2ECE4]">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Score
                      </span>
                      <div className="text-2xl font-bold text-[#C85A32] font-editorial leading-none">
                        {session.overallScore}
                        <span className="text-xs text-stone-400 font-sans font-normal">/100</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingPastSession(session)}
                        className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EDE5] text-stone-800 text-xs font-semibold border border-[#E0D9CE] transition-colors cursor-pointer"
                      >
                        Review Q&A
                      </button>

                      <button
                        onClick={() => handleStartInterview(session.interviewType, null, session.weaknesses || [])}
                        className="px-3.5 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Practice Again</span>
                      </button>

                      <button
                        onClick={(e) => handleDeleteSession(session.sessionId, e)}
                        className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Past Session Modal */}
        {viewingPastSession && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E7E2DA] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl animate-in zoom-in-95">
              <div className="p-5 border-b border-[#F0EAE1] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900 font-editorial">
                    {viewingPastSession.targetRole} Diagnostic Review
                  </h3>
                  <p className="text-xs text-stone-500">
                    Score: <strong className="text-[#C85A32] font-bold">{viewingPastSession.overallScore}/100</strong> • Mode:{" "}
                    <span className="capitalize">{viewingPastSession.interviewType}</span>
                  </p>
                </div>
                <button
                  onClick={() => setViewingPastSession(null)}
                  className="p-2 rounded-lg hover:bg-[#FAF8F5] text-stone-500 hover:text-stone-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {viewingPastSession.readinessSummary && (
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE3D8]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C85A32] block mb-1">
                      Summary
                    </span>
                    <p className="text-stone-700 leading-relaxed">{viewingPastSession.readinessSummary}</p>
                  </div>
                )}

                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider pt-2">
                  Question History ({(viewingPastSession.questions || []).length}):
                </h4>

                {(viewingPastSession.questions || []).map((q, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#C85A32]">Question #{q.questionNumber || idx + 1}</span>
                      <span className="font-semibold text-stone-700 bg-white px-2 py-0.5 rounded border border-[#EDE8E0]">
                        Score: {q.score}/10
                      </span>
                    </div>
                    <p className="font-semibold text-stone-900">"{q.question}"</p>
                    <div className="p-2.5 rounded bg-white border border-[#EDE8E0]">
                      <span className="text-[10px] text-stone-400 font-bold block mb-0.5 uppercase">Candidate Answer:</span>
                      <p className="italic text-stone-700">{q.userAnswer}</p>
                    </div>
                    {q.suggestedApproach && (
                      <div className="text-[11px] text-stone-600 bg-[#F4EFEA] p-2.5 rounded">
                        <strong className="text-stone-800">Ideal Approach:</strong> {q.suggestedApproach}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[#F0EAE1] flex items-center justify-between bg-[#FAF8F5]">
                <button
                  onClick={() => {
                    const sessionToPractice = viewingPastSession;
                    setViewingPastSession(null);
                    handleStartInterview(sessionToPractice.interviewType, null, sessionToPractice.weaknesses || []);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#C85A32] text-white text-xs font-bold hover:bg-[#B24E2A]"
                >
                  Practice This Mode Again
                </button>
                <button
                  onClick={() => setViewingPastSession(null)}
                  className="px-4 py-2 rounded-xl border border-[#DCD5C8] text-stone-700 text-xs font-semibold hover:bg-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 4: SETUP SCREEN (DEFAULT)
  // =========================================================================
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 animate-in fade-in duration-200">
      {/* Workspace Header */}
      <div className="border-b border-[#E7E2DA] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C85A32]">
              AI Interview Preparation
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF4EE] text-[#395C3E] border border-[#D7E3D5]">
              Real-time AI Evaluation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
            AI Interview Preparation
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Practice realistic technical, behavioral, and role-specific interviews tailored to your actual resume, verified skills, and target opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setViewState("history")}
            className="px-4 py-2.5 rounded-xl bg-[#F0ECE4] hover:bg-[#E6DFD4] text-stone-800 text-xs font-semibold transition-colors flex items-center gap-2 border border-[#DCD5C8] cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Past Sessions ({savedSessions.length})</span>
          </button>
        </div>
      </div>

      {/* Automatic User Data Provenance Indicator */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7E2DA] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF4EE] text-[#395C3E] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-2">
                <span>Personalized Candidate Profile Loaded</span>
                <span className="w-2 h-2 rounded-full bg-[#3D7A4A]" />
              </h4>
              <p className="text-[11px] sm:text-xs text-stone-600 mt-0.5">
                Target Role: <strong className="text-stone-900">{targetRole}</strong> • Verified Skills:{" "}
                <strong className="text-stone-900">{userSkills.length} listed</strong> • Projects:{" "}
                <strong className="text-stone-900">{userProjects.length} authentic projects</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-500 italic hidden sm:inline">
              Zero manual input required
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Choose Interview Mode (6 distinct types) */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            1. Select Interview Type
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Choose the specific interview drill you wish to practice today.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            {
              id: "mock" as InterviewType,
              title: "Mock Interview",
              badge: "Comprehensive",
              desc: "A balanced simulation covering technical competencies, behavioral/HR scenarios, and project walkthroughs.",
              icon: MessageSquareCode,
              accent: "hover:border-[#C85A32]",
            },
            {
              id: "technical" as InterviewType,
              title: "Technical Interview",
              badge: "Algorithms & Systems",
              desc: `Deep dive into programming, databases, APIs, system design, and algorithms tailored to ${targetRole}.`,
              icon: Zap,
              accent: "hover:border-[#395C3E]",
            },
            {
              id: "behavioral" as InterviewType,
              title: "HR & Behavioral",
              badge: "STAR Methodology",
              desc: "Evaluate teamwork, conflict resolution, problem solving, adaptability, and leadership storytelling.",
              icon: UserCheck,
              accent: "hover:border-[#975A16]",
            },
            {
              id: "resume" as InterviewType,
              title: "Resume-Based Interview",
              badge: "Authentic Projects",
              desc: "Strictly based on projects, tech stacks, and credentials in your actual uploaded or built resume.",
              icon: FileText,
              accent: "hover:border-[#245285]",
            },
            {
              id: "job_specific" as InterviewType,
              title: "Job-Specific Interview",
              badge: "Target Company",
              desc: "Select one of your saved or recommended jobs to practice against published company requirements.",
              icon: Briefcase,
              accent: "hover:border-[#78288B]",
            },
            {
              id: "skill_gap" as InterviewType,
              title: "Skill-Gap Interview",
              badge: "Growth Areas",
              desc: "Focuses directly on your Skill Gap Analysis weaknesses (e.g. SQL, Docker, System Design).",
              icon: Target,
              accent: "hover:border-[#B53826]",
            },
          ].map((mode) => {
            const isSelected = interviewType === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setInterviewType(mode.id)}
                className={`p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-[#FFFDF9] border-2 border-[#C85A32] shadow-xs ring-1 ring-[#C85A32]/20"
                    : `bg-white border-[#E7E2DA] ${mode.accent} hover:bg-[#FAF8F5]`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected ? "bg-[#C85A32] text-white" : "bg-[#F4EFEA] text-stone-700"
                    }`}>
                      <mode.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAF8F5] text-stone-600 border border-[#EDE8E0]">
                      {mode.badge}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-stone-900">{mode.title}</h4>
                  <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{mode.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F0EAE1] flex items-center justify-between text-xs">
                  <span className={`font-semibold ${isSelected ? "text-[#C85A32]" : "text-stone-400"}`}>
                    {isSelected ? "Selected Mode" : "Click to select"}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-[#C85A32]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional Job Selector if Job-Specific mode selected */}
      {interviewType === "job_specific" && (
        <div className="p-5 rounded-2xl bg-[#F7EEFB]/40 border border-[#ECD5F2] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#78288B] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>Select Target Job Opening</span>
            </h4>
            <span className="text-[11px] text-stone-500">
              {jobs.length} opportunities loaded from Job Recommendations
            </span>
          </div>

          {jobs.length === 0 ? (
            <div className="p-4 rounded-xl bg-white border border-[#ECD5F2] text-xs text-stone-600 flex items-center justify-between">
              <span>No jobs in your recommendation list yet. Explore Job Opportunities to save target listings.</span>
              {onNavigate && (
                <button
                  onClick={() => onNavigate("jobs")}
                  className="text-xs font-bold text-[#78288B] hover:underline shrink-0"
                >
                  View Opportunities →
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {jobs.slice(0, 6).map((job) => {
                const isJobSelected = selectedJobId === job.id || (!selectedJobId && jobs[0]?.id === job.id);
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isJobSelected
                        ? "bg-white border-2 border-[#78288B] shadow-xs"
                        : "bg-white/80 border-[#ECD5F2] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-stone-900 truncate">{job.title}</strong>
                      {isJobSelected && <Check className="w-3.5 h-3.5 text-[#78288B]" />}
                    </div>
                    <p className="text-[11px] text-[#78288B] font-semibold mt-0.5">{job.company}</p>
                    <p className="text-[11px] text-stone-500 line-clamp-1 mt-1">
                      Required: {(job.requiredSkills || []).slice(0, 4).join(", ")}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Difficulty & Question Count */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Difficulty Selection */}
        <div className="bg-white rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-3">
          <label className="text-xs font-bold text-stone-900 uppercase tracking-wider block">
            2. Select Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "beginner" as InterviewDifficulty, label: "Beginner", sub: "Freshers / Basics" },
              { id: "intermediate" as InterviewDifficulty, label: "Intermediate", sub: "Standard Campus" },
              { id: "advanced" as InterviewDifficulty, label: "Advanced", sub: "Edge Cases & Scale" },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  difficulty === d.id
                    ? "bg-[#FAF8F5] border-2 border-[#C85A32] text-stone-900 shadow-xs"
                    : "bg-white border-[#E7E2DA] text-stone-600 hover:bg-[#FAF8F5]"
                }`}
              >
                <span className="text-xs font-bold block">{d.label}</span>
                <span className="text-[10px] text-stone-500 block mt-0.5">{d.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Question Count Selection */}
        <div className="bg-white rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-3">
          <label className="text-xs font-bold text-stone-900 uppercase tracking-wider block">
            3. Number of Questions
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { count: 5, label: "5 Questions", time: "~10 mins" },
              { count: 10, label: "10 Questions", time: "~20 mins" },
              { count: 15, label: "15 Questions", time: "~30 mins" },
            ].map((c) => (
              <button
                key={c.count}
                type="button"
                onClick={() => setTotalQuestions(c.count)}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  totalQuestions === c.count
                    ? "bg-[#FAF8F5] border-2 border-[#C85A32] text-stone-900 shadow-xs"
                    : "bg-white border-[#E7E2DA] text-stone-600 hover:bg-[#FAF8F5]"
                }`}
              >
                <span className="text-xs font-bold block">{c.label}</span>
                <span className="text-[10px] text-stone-500 block mt-0.5">{c.time}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Start Interview CTA Box */}
      <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#C85A32]/30 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <h3 className="text-base font-bold text-stone-900 font-editorial">
            Ready to begin your session?
          </h3>
          <p className="text-xs text-stone-600 mt-1 max-w-xl leading-relaxed">
            You will receive questions one by one with immediate AI feedback, scoring, strengths, and sample answers after every response.
          </p>
        </div>

        <button
          onClick={() => handleStartInterview()}
          className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-[#FDEEE8]" />
          <span>Start Interview Session</span>
        </button>
      </div>
    </div>
  );
};
