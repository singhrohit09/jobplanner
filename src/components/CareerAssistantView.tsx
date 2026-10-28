import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Sparkles,
  Send,
  Plus,
  Trash2,
  ChevronRight,
  History,
  X,
  Compass,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  RotateCcw,
  BarChart3,
  GitCompare,
  Milestone,
  FileText,
  MessageSquareCode,
  Briefcase,
  User,
  ShieldAlert,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import {
  UserProfile,
  ReadinessAnalysis,
  ResumeData,
  JobListing,
  PracticeRecord,
  CareerAssistantSession,
  ChatMessage,
  ChatRelatedFeature,
  CareerAssistantContext,
  JobApplication,
} from "../types";
import { FirestoreUserData } from "../lib/firebase";
import {
  saveCareerAssistantSessionToFirestore,
  getCareerAssistantSessionsFromFirestore,
  deleteCareerAssistantSessionFromFirestore,
  getInterviewSessionsFromFirestore,
  getJobApplicationsFromFirestore,
} from "../lib/firebase";

interface CareerAssistantViewProps {
  profile: UserProfile;
  currentUser?: FirebaseUser | null;
  firestoreUserData?: Partial<FirestoreUserData> | null;
  resume?: ResumeData;
  jobs?: JobListing[];
  skillGapAnalysis?: ReadinessAnalysis | any;
  onNavigate: (tab: string) => void;
  practiceHistory?: PracticeRecord[];
  jobApplications?: JobApplication[];
}

export const CareerAssistantView: React.FC<CareerAssistantViewProps> = ({
  profile,
  currentUser,
  firestoreUserData,
  resume,
  jobs = [],
  skillGapAnalysis,
  onNavigate,
  practiceHistory = [],
  jobApplications = [],
}) => {
  const [sessions, setSessions] = useState<CareerAssistantSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interviewSessions, setInterviewSessions] = useState<any[]>([]);
  const [userApplications, setUserApplications] = useState<JobApplication[]>(jobApplications || []);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeUserId = currentUser?.uid || "local_user";

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load existing interview sessions for personalized context
  useEffect(() => {
    if (activeUserId) {
      getInterviewSessionsFromFirestore(activeUserId)
        .then((records) => setInterviewSessions(records || []))
        .catch(() => {});
    }
  }, [activeUserId]);

  // Load existing job applications for personalized context
  useEffect(() => {
    if (jobApplications && jobApplications.length > 0) {
      setUserApplications(jobApplications);
    } else if (activeUserId) {
      getJobApplicationsFromFirestore(activeUserId)
        .then((apps) => setUserApplications(apps || []))
        .catch(() => {});
    }
  }, [activeUserId, jobApplications]);

  // Load user's career assistant chat sessions from Firestore
  useEffect(() => {
    async function loadSessions() {
      if (!activeUserId) return;
      try {
        const saved = await getCareerAssistantSessionsFromFirestore(activeUserId);
        if (saved && saved.length > 0) {
          setSessions(saved);
          setCurrentSessionId(saved[0].sessionId);
          setMessages(saved[0].messages || []);
        } else {
          // Initialize fresh new session
          initNewSession();
        }
      } catch (err) {
        console.warn("Notice loading career assistant sessions:", err);
        initNewSession();
      }
    }
    loadSessions();
  }, [activeUserId]);

  const initNewSession = () => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSession: CareerAssistantSession = {
      sessionId: newId,
      userId: activeUserId,
      title: "New Conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setCurrentSessionId(newId);
    setMessages([]);
    setErrorMessage(null);
  };

  // Compile real authenticated user context without hallucination
  const compileUserContext = (): CareerAssistantContext => {
    const targetRole = profile?.target_role || "Software Engineer";
    const userSkills = profile?.skills || [];

    // Skill Gap Analysis summary
    const readinessScore = skillGapAnalysis?.score ?? skillGapAnalysis?.readinessScore ?? 70;
    const strongSkills = Array.isArray(skillGapAnalysis?.strongSkills)
      ? skillGapAnalysis.strongSkills.map((s: any) => (typeof s === "string" ? s : s?.name || "")).filter(Boolean)
      : (skillGapAnalysis?.strengths || []);
    const improvementSkills = Array.isArray(skillGapAnalysis?.improvementSkills)
      ? skillGapAnalysis.improvementSkills.map((s: any) => (typeof s === "string" ? s : s?.name || "")).filter(Boolean)
      : (skillGapAnalysis?.improvementAreas || []);
    const missingSkills = Array.isArray(skillGapAnalysis?.missingSkills)
      ? skillGapAnalysis.missingSkills.map((s: any) => (typeof s === "string" ? s : s?.name || "")).filter(Boolean)
      : (skillGapAnalysis?.criticalSkillGaps || []);

    // Resume info
    const uploadedResume = firestoreUserData?.resumeFileName
      ? {
          fileName: firestoreUserData.resumeFileName,
          fileType: firestoreUserData.resumeFileType,
          uploadedAt: firestoreUserData.resumeUploadedAt,
        }
      : null;

    // Jobs info
    const savedJobs = jobs.filter((j) => j.saved);
    const topMatches = jobs.slice(0, 4).map((j) => ({
      title: j.title,
      company: j.company,
      matchScore: j.matchScore || 0,
      matchedSkills: j.matchedSkills || [],
      missingSkills: j.missingSkills || [],
      location: j.location,
    }));

    // Interview performance
    const latestInterview = interviewSessions[0] || practiceHistory[0] || null;

    return {
      profile: {
        fullName: profile?.full_name || currentUser?.displayName || "",
        email: profile?.email || currentUser?.email || "",
        targetRole,
        industry: (profile as any)?.industry || "Technology",
        experienceLevel: profile?.experience_level || "Student / Fresher",
        skills: userSkills,
        location: (profile as any)?.location || "",
        college: profile?.education?.college,
        degree: profile?.education?.degree,
        branch: profile?.education?.branch,
        graduationYear: profile?.education?.graduation_year,
        linkedin: (profile as any)?.linkedin,
        github: (profile as any)?.github,
      },
      skillGap: {
        readinessScore,
        summary: skillGapAnalysis?.summary || "",
        strongSkills,
        improvementSkills,
        missingSkills,
        recommendedSkills: Array.isArray(skillGapAnalysis?.recommendedSkills)
          ? skillGapAnalysis.recommendedSkills.map((s: any) => (typeof s === "string" ? s : s?.name || "")).filter(Boolean)
          : [],
        topPriorityGaps: missingSkills.slice(0, 5),
      },
      resume: {
        uploadedFileName: uploadedResume?.fileName || null,
        uploadedFileType: uploadedResume?.fileType || null,
        uploadedAt: uploadedResume?.uploadedAt || null,
        hasParsedResume: !!uploadedResume || !!resume?.summary,
        skillsInResume: resume?.skills || [],
        projectCount: resume?.projects?.length || 0,
        summary: resume?.summary || "",
      },
      jobs: {
        recommendedCount: jobs.length,
        savedJobsCount: savedJobs.length,
        savedJobTitles: savedJobs.map((j) => `${j.title} at ${j.company}`),
        topMatches,
      },
      interviewHistory: {
        totalSessions: interviewSessions.length || practiceHistory.length,
        averageScore:
          interviewSessions.length > 0
            ? Math.round(
                interviewSessions.reduce((acc, s) => acc + (s.overallScore || 0), 0) /
                  interviewSessions.length
              )
            : undefined,
        latestSession: latestInterview
          ? {
              interviewType: latestInterview.interviewType || "mock",
              difficulty: latestInterview.difficulty || "intermediate",
              overallScore: latestInterview.overallScore ?? latestInterview.score,
              technicalScore: latestInterview.technicalScore,
              behavioralScore: latestInterview.behavioralScore,
              resumeScore: latestInterview.resumeScore,
              roleReadinessScore: latestInterview.roleReadinessScore,
              strengths: latestInterview.strengths || [],
              weaknesses: latestInterview.weaknesses || latestInterview.feedback?.improvements || [],
              recommendedTopics: latestInterview.recommendedTopics || [],
            }
          : undefined,
      },
      jobApplications: (userApplications || []).map((app) => ({
        company: app.company,
        jobTitle: app.jobTitle,
        status: app.status,
        applicationDate: app.applicationDate,
        interviewDate: app.interviewDate,
        deadline: app.deadline,
        matchScore: app.matchScore,
        priority: app.priority,
        nextAction: app.nextAction,
      })),
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawContent = textToSend ?? inputMessage;
    const content = rawContent.trim();
    if (!content || isLoading) return;

    setInputMessage("");
    setErrorMessage(null);

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const userContext = compileUserContext();

      const response = await fetch("/api/ai/career-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: newMessages.slice(-8),
          context: userContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: "assistant",
        content: data.answer || "I have analyzed your query and updated your career recommendations.",
        timestamp: new Date().toISOString(),
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        nextSteps: Array.isArray(data.nextSteps) ? data.nextSteps : [],
        relatedFeatures: Array.isArray(data.relatedFeatures) ? data.relatedFeatures : [],
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      // Auto-title the session from the first user prompt if still default
      let sessionTitle = "Career Advising";
      const existingSession = sessions.find((s) => s.sessionId === currentSessionId);
      if (existingSession && existingSession.title && existingSession.title !== "New Conversation") {
        sessionTitle = existingSession.title;
      } else {
        sessionTitle = content.length > 35 ? content.substring(0, 32) + "..." : content;
      }

      const updatedSession: CareerAssistantSession = {
        sessionId: currentSessionId,
        userId: activeUserId,
        title: sessionTitle,
        createdAt: existingSession?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: finalMessages,
      };

      // Save to state and persist to Firestore
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.sessionId !== currentSessionId);
        return [updatedSession, ...filtered];
      });

      await saveCareerAssistantSessionToFirestore(activeUserId, updatedSession);
    } catch (err: any) {
      console.error("Failed to send message to Career Assistant:", err);
      setErrorMessage("Something went wrong while connecting to JobPlanner AI. Please try again.");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handleSelectSession = (session: CareerAssistantSession) => {
    setCurrentSessionId(session.sessionId);
    setMessages(session.messages || []);
    setErrorMessage(null);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await deleteCareerAssistantSessionFromFirestore(activeUserId, sessionId);
      const updated = sessions.filter((s) => s.sessionId !== sessionId);
      setSessions(updated);

      if (sessionId === currentSessionId) {
        if (updated.length > 0) {
          setCurrentSessionId(updated[0].sessionId);
          setMessages(updated[0].messages || []);
        } else {
          initNewSession();
        }
      }
    } catch (err) {
      console.warn("Notice deleting session:", err);
    }
  };

  const handleClearCurrentConversation = async () => {
    if (messages.length === 0) return;
    if (!confirm("Clear this entire conversation?")) return;

    setMessages([]);
    setErrorMessage(null);

    const existing = sessions.find((s) => s.sessionId === currentSessionId);
    if (existing) {
      const cleared: CareerAssistantSession = {
        ...existing,
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      setSessions((prev) => prev.map((s) => (s.sessionId === currentSessionId ? cleared : s)));
      await saveCareerAssistantSessionToFirestore(activeUserId, cleared);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Quick Action Prompts
  const quickActions = [
    {
      label: "Analyze My Career",
      prompt: "Can you analyze my overall career readiness and highlight my biggest strengths and weaknesses for my target role?",
      icon: BarChart3,
    },
    {
      label: "What Should I Learn Next?",
      prompt: "What skills should I prioritize learning next based on my skill gap analysis and target job role?",
      icon: Milestone,
    },
    {
      label: "How Can I Improve My Skills?",
      prompt: "How can I systematically improve my skills? Suggest hands-on projects and milestones suited for my level.",
      icon: GitCompare,
    },
    {
      label: "Review My Resume",
      prompt: "How can I optimize my resume for ATS scanners and make my project descriptions stand out?",
      icon: FileText,
    },
    {
      label: "Prepare Me for Interviews",
      prompt: "What technical topics and behavioral questions should I prepare for my upcoming interviews?",
      icon: MessageSquareCode,
    },
    {
      label: "Find My Best Job Matches",
      prompt: "Which jobs among my recommendations best match my profile, and what missing skills should I acquire to boost my score?",
      icon: Briefcase,
    },
    {
      label: "Review Tracked Applications",
      prompt: "Which of my tracked job applications require immediate follow-up or interview preparation, and what should my action strategy be?",
      icon: Briefcase,
    },
    {
      label: "Create Learning Roadmap",
      prompt: "Create a 4-week step-by-step personalized learning roadmap targeting my diagnosed skill gaps.",
      icon: Compass,
    },
  ];

  // Helper function to render rich markdown formatting cleanly
  const renderFormattedMarkdown = (text: string) => {
    if (!text) return null;

    // Split text into lines to identify headings, code blocks, bullet points, and paragraphs
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = "";
    let codeBuffer: string[] = [];

    lines.forEach((line, index) => {
      // Code block start/end
      if (line.trim().startsWith("```")) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.trim().replace("```", "") || "plaintext";
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          const codeContent = codeBuffer.join("\n");
          const codeId = `code_${index}`;
          elements.push(
            <div
              key={`code_block_${index}`}
              className="my-3 rounded-xl bg-stone-900 text-stone-100 p-3.5 text-xs font-mono border border-stone-800 relative group overflow-x-auto shadow-xs"
            >
              <div className="flex items-center justify-between text-[11px] text-stone-400 pb-2 mb-2 border-b border-stone-800">
                <span className="font-semibold uppercase tracking-wider">{codeLanguage}</span>
                <button
                  onClick={() => copyToClipboard(codeContent, codeId)}
                  className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700"
                >
                  {copiedCodeId === codeId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre overflow-x-auto text-[12px] leading-relaxed">
                {codeContent}
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Headings
      if (line.startsWith("### ")) {
        elements.push(
          <h4
            key={`h3_${index}`}
            className="text-sm font-bold text-stone-900 mt-3.5 mb-1.5 font-editorial tracking-tight flex items-center gap-1.5"
          >
            {renderInlineMarkdown(line.replace("### ", ""))}
          </h4>
        );
        return;
      }
      if (line.startsWith("## ")) {
        elements.push(
          <h3
            key={`h2_${index}`}
            className="text-base font-bold text-stone-900 mt-4 mb-2 font-editorial tracking-tight"
          >
            {renderInlineMarkdown(line.replace("## ", ""))}
          </h3>
        );
        return;
      }
      if (line.startsWith("# ")) {
        elements.push(
          <h2
            key={`h1_${index}`}
            className="text-lg font-bold text-stone-900 mt-4 mb-2 font-editorial tracking-tight"
          >
            {renderInlineMarkdown(line.replace("# ", ""))}
          </h2>
        );
        return;
      }

      // Bullet points
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const bulletText = line.trim().substring(2);
        elements.push(
          <div key={`bullet_${index}`} className="flex items-start gap-2.5 my-1 text-xs text-stone-700">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32] mt-1.5 shrink-0" />
            <span className="leading-relaxed">{renderInlineMarkdown(bulletText)}</span>
          </div>
        );
        return;
      }

      // Numbered lists (1. , 2. )
      const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        const num = numberedMatch[1];
        const content = numberedMatch[2];
        elements.push(
          <div key={`num_${index}`} className="flex items-start gap-2.5 my-1 text-xs text-stone-700">
            <span className="w-5 h-5 rounded-full bg-[#FAF3EC] text-[#A64522] border border-[#F3DACF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {num}
            </span>
            <span className="leading-relaxed pt-0.5">{renderInlineMarkdown(content)}</span>
          </div>
        );
        return;
      }

      // Empty lines
      if (!line.trim()) {
        elements.push(<div key={`empty_${index}`} className="h-2" />);
        return;
      }

      // Standard paragraph
      elements.push(
        <p key={`p_${index}`} className="text-xs text-stone-700 leading-relaxed my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    });

    return <div className="space-y-0.5">{elements}</div>;
  };

  // Helper for inline **bold** and `code` formatting
  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Regex for bold **text** and inline `code`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-stone-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 text-[11px] font-mono border border-stone-200"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const getFeatureIcon = (tab: string) => {
    switch (tab) {
      case "skillgap":
        return <GitCompare className="w-3.5 h-3.5 text-[#C85A32]" />;
      case "roadmap":
        return <Milestone className="w-3.5 h-3.5 text-[#245285]" />;
      case "resume":
        return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      case "interview":
        return <MessageSquareCode className="w-3.5 h-3.5 text-purple-600" />;
      case "jobs":
        return <Briefcase className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <BarChart3 className="w-3.5 h-3.5 text-stone-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header Card */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 sm:p-6 shadow-xs mb-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C85A32] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C85A32] bg-[#FDF3E7] px-2.5 py-0.5 rounded-full border border-[#F6E1C6]">
                  AI Career Assistant
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  JobPlanner AI • Grounded in Your Authentic Profile
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
                Your Personal AI Career Advisor
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
                Ask targeted questions about skills to learn, resume ATS optimization, interview preparation, and job matching. JobPlanner AI leverages your diagnosed readiness scores, resume data, and mock interview transcripts.
              </p>
            </div>
          </div>

          {/* Quick Stats Badges on Header */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 z-10 pt-2 md:pt-0">
            <div className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-center gap-2">
              <span className="text-[11px] text-stone-500 font-medium">Target:</span>
              <span className="text-xs font-bold text-stone-800 truncate max-w-[140px]">
                {profile?.target_role || "Software Engineer"}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-center gap-2">
              <span className="text-[11px] text-stone-500 font-medium">Readiness:</span>
              <span className="text-xs font-bold text-[#A64522]">
                {skillGapAnalysis?.score ?? skillGapAnalysis?.readinessScore ?? 70}%
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden px-3 py-1.5 rounded-xl bg-[#F4EFEA] hover:bg-[#EAE3D8] text-stone-800 text-xs font-bold transition-all border border-[#E2D9CC] flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-stone-600" />
              <span>History ({sessions.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Chat Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Session History (Desktop: 3.5 cols, Mobile: Drawer) */}
        <div
          className={`${
            isSidebarOpen ? "fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex md:relative md:inset-auto md:bg-transparent" : "hidden lg:block"
          } lg:col-span-4`}
        >
          <div className="w-full max-w-sm lg:max-w-none bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 shadow-xs flex flex-col h-[680px] m-auto md:m-0">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE6DC]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#A64522]" />
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Conversation History
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FAF3EC] text-[#A64522]">
                  {sessions.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={initNewSession}
                  className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F3ECE4] text-stone-700 transition-colors border border-[#E7E2DA]"
                  title="Start New Chat"
                >
                  <Plus className="w-4 h-4 text-[#C85A32]" />
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-[#FAF8F5] text-stone-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* New Chat Primary Button */}
            <div className="pt-3">
              <button
                onClick={initNewSession}
                className="w-full py-2.5 px-3 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Career Chat</span>
              </button>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 pr-1 scrollbar-thin">
              {sessions.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Bot className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-500 font-medium">No previous conversations</p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Start a chat below to receive personalized guidance
                  </p>
                </div>
              ) : (
                sessions.map((s) => {
                  const isActive = s.sessionId === currentSessionId;
                  const dateStr = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
                  return (
                    <div
                      key={s.sessionId}
                      onClick={() => handleSelectSession(s)}
                      className={`group p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isActive
                          ? "bg-[#FAF3EC] border-[#F3DACF] text-stone-900 shadow-2xs font-semibold"
                          : "bg-transparent border-transparent hover:bg-[#FAF8F5] hover:border-[#ECE6DC] text-stone-600"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs">{s.title || "Career Session"}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-400">
                          <span>{dateStr}</span>
                          <span>•</span>
                          <span>{s.messages?.length || 0} messages</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(s.sessionId, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Context Grounding Summary at Bottom of Sidebar */}
            <div className="mt-auto pt-3 border-t border-[#ECE6DC]">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-[11px] space-y-1">
                <div className="font-bold text-stone-800 flex items-center justify-between">
                  <span>Grounding Context</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-stone-500 truncate">
                  Role: <span className="font-semibold text-stone-700">{profile?.target_role || "Software Engineer"}</span>
                </p>
                <p className="text-stone-500 truncate">
                  Skills: <span className="font-semibold text-stone-700">{profile?.skills?.slice(0, 3).join(", ") || "General"}</span>
                </p>
                <p className="text-stone-500 truncate">
                  Resume: <span className="font-semibold text-stone-700">{firestoreUserData?.resumeFileName ? "Uploaded" : "Template"}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Chat Area: Header, Conversation, Input (8 cols) */}
        <div className="lg:col-span-8 bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] shadow-xs flex flex-col h-[680px] overflow-hidden">
          {/* Chat Window Header */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-[#ECE6DC] bg-[#FAF8F5] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C85A32] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-stone-900 font-editorial">JobPlanner AI</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Online & Context Grounded" />
                </div>
                <p className="text-[11px] text-stone-500 font-medium">
                  Personal career advisor • Grounded in {profile?.target_role || "your target role"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={initNewSession}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F4EFEA] text-stone-700 border border-[#E2D9CC] transition-colors flex items-center gap-1"
                title="Start New Chat"
              >
                <Plus className="w-3.5 h-3.5 text-[#C85A32]" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
              <button
                onClick={handleClearCurrentConversation}
                disabled={messages.length === 0}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-[#FFFFFF] transition-colors disabled:opacity-30 cursor-pointer"
                title="Clear current conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
            {messages.length === 0 ? (
              // Empty State with Personal Snapshot & Quick Prompts
              <div className="py-4 space-y-6 max-w-2xl mx-auto">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF3EC] border border-[#F3DACF] text-[#C85A32] flex items-center justify-center mx-auto shadow-xs">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 font-editorial">
                    Hi {profile?.full_name?.split(" ")[0] || "there"}, I'm JobPlanner AI.
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
                    Your personal AI career advisor. I can help you understand your career path, improve your skills, optimize your resume for ATS scanners, prepare for interviews, and choose better job opportunities.
                  </p>
                </div>

                {/* Candidate Personal Grounding Snapshot Card */}
                <div className="bg-[#FAF8F5] rounded-xl border border-[#E7E2DA] p-4 text-xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E7E2DA]">
                    <span className="font-bold text-stone-800 uppercase tracking-wider text-[10px]">
                      Your Live JobPlanner Profile
                    </span>
                    <span className="text-[10px] text-[#C85A32] font-semibold">
                      Loaded from Firebase
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <span className="text-[10px] text-stone-500 block">Target Role</span>
                      <span className="font-bold text-stone-900 truncate block">
                        {profile?.target_role || "Software Engineer"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Readiness</span>
                      <span className="font-bold text-[#A64522] block">
                        {skillGapAnalysis?.score ?? skillGapAnalysis?.readinessScore ?? 70}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Resume on File</span>
                      <span className="font-bold text-stone-900 truncate block">
                        {firestoreUserData?.resumeFileName ? "Uploaded Resume" : "Sample Template"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Mock Interviews</span>
                      <span className="font-bold text-stone-900 block">
                        {interviewSessions.length || practiceHistory.length} Completed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Prompt Chips */}
                <div>
                  <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2.5 text-center">
                    Quick Suggestions to Get Started
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickActions.map((action, idx) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(action.prompt)}
                          className="p-3 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF6F1] border border-[#E2DDD5] hover:border-[#C85A32]/40 text-left transition-all shadow-2xs group flex items-start gap-2.5 cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#FAF3EC] text-[#A64522] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#C85A32] group-hover:text-white transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-stone-900 group-hover:text-[#A64522] transition-colors block">
                              {action.label}
                            </span>
                            <span className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                              {action.prompt}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Chat Messages Stream
              messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs text-xs font-bold ${
                        isUser
                          ? "bg-stone-900 text-[#FAF8F5]"
                          : "bg-[#C85A32] text-white"
                      }`}
                    >
                      {isUser ? (
                        currentUser?.photoURL ? (
                          <img
                            src={currentUser.photoURL}
                            alt="User"
                            className="w-full h-full rounded-xl object-cover"
                          />
                        ) : (
                          (profile?.full_name?.charAt(0) || "U").toUpperCase()
                        )
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs transition-all shadow-2xs ${
                        isUser
                          ? "bg-stone-900 text-[#FAF8F5] rounded-tr-xs"
                          : "bg-[#FFFFFF] text-stone-800 border border-[#E7E2DA] rounded-tl-xs"
                      }`}
                    >
                      {/* Header in bubble */}
                      <div
                        className={`flex items-center justify-between gap-3 text-[10px] mb-1.5 pb-1 border-b ${
                          isUser ? "border-stone-800 text-stone-400" : "border-stone-100 text-stone-400"
                        }`}
                      >
                        <span className="font-semibold">
                          {isUser ? "You" : "JobPlanner AI"}
                        </span>
                        <span>
                          {msg.timestamp
                            ? new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      {/* Message Content */}
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.content}</p>
                      ) : (
                        renderFormattedMarkdown(msg.content)
                      )}

                      {/* Structured Recommendations Pills */}
                      {!isUser && msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-[#ECE6DC] space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                            Key Recommendations:
                          </span>
                          <div className="space-y-1">
                            {msg.recommendations.map((rec, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1.5 text-[11px] text-stone-700 bg-[#FAF8F5] p-1.5 rounded-lg border border-[#EFE9DF]"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Structured Next Steps */}
                      {!isUser && msg.nextSteps && msg.nextSteps.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-[#ECE6DC] space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A64522] block">
                            Suggested Next Steps:
                          </span>
                          <div className="space-y-1">
                            {msg.nextSteps.map((step, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1.5 text-[11px] text-stone-700"
                              >
                                <ArrowRight className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Smart Feature Connection Buttons */}
                      {!isUser && msg.relatedFeatures && msg.relatedFeatures.length > 0 && (
                        <div className="mt-3.5 pt-2.5 border-t border-[#ECE6DC] flex flex-wrap gap-2">
                          {msg.relatedFeatures.map((feat, i) => (
                            <button
                              key={i}
                              onClick={() => onNavigate(feat.tab)}
                              className="px-3 py-1.5 rounded-xl bg-[#FAF3EC] hover:bg-[#F3E7DC] text-[#A64522] text-xs font-bold transition-all border border-[#F3DACF] flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              {getFeatureIcon(feat.tab)}
                              <span>{feat.actionLabel || feat.title}</span>
                              <ChevronRight className="w-3 h-3 text-[#A64522]" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing / Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#C85A32] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-[#FFFFFF] border border-[#E7E2DA] rounded-2xl rounded-tl-xs p-4 shadow-2xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#C85A32] animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-[#C85A32] animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-[#C85A32] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs text-stone-500 font-medium ml-1">
                    JobPlanner AI is reviewing your records...
                  </span>
                </div>
              </div>
            )}

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => handleSendMessage()}
                  className="text-xs font-bold text-red-700 underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips Bar */}
          <div className="px-4 py-2 border-t border-[#ECE6DC] bg-[#FAF8F5]/80 overflow-x-auto scrollbar-none flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 shrink-0">
              Suggestions:
            </span>
            <button
              onClick={() => handleSendMessage("What are my highest priority skill gaps?")}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#FFFFFF] hover:bg-[#F4EFEA] text-stone-700 border border-[#E2DDD5] whitespace-nowrap transition-colors"
            >
              Missing skills
            </button>
            <button
              onClick={() => handleSendMessage("Build me a 4-week learning roadmap for my target role")}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#FFFFFF] hover:bg-[#F4EFEA] text-stone-700 border border-[#E2DDD5] whitespace-nowrap transition-colors"
            >
              4-week roadmap
            </button>
            <button
              onClick={() => handleSendMessage("How can I optimize my resume for ATS parsers?")}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#FFFFFF] hover:bg-[#F4EFEA] text-stone-700 border border-[#E2DDD5] whitespace-nowrap transition-colors"
            >
              ATS resume tips
            </button>
            <button
              onClick={() => handleSendMessage("What technical topics should I practice for interviews?")}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#FFFFFF] hover:bg-[#F4EFEA] text-stone-700 border border-[#E2DDD5] whitespace-nowrap transition-colors"
            >
              Interview questions
            </button>
            <button
              onClick={() => handleSendMessage("Which job matches should I prioritize applying to?")}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#FFFFFF] hover:bg-[#F4EFEA] text-stone-700 border border-[#E2DDD5] whitespace-nowrap transition-colors"
            >
              Job matching
            </button>
          </div>

          {/* Input & Send Controls */}
          <div className="p-3 sm:p-4 border-t border-[#ECE6DC] bg-[#FFFFFF]">
            <div className="flex items-end gap-2 bg-[#FAF8F5] border border-[#E0D7CC] rounded-2xl p-2 focus-within:border-[#C85A32] focus-within:ring-1 focus-within:ring-[#C85A32]/20 transition-all">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask JobPlanner AI about skills, resume, interview prep, or career roadmaps..."
                rows={1}
                disabled={isLoading}
                className="flex-1 max-h-32 min-h-[40px] bg-transparent text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 border-none outline-none resize-none px-2 py-1.5 leading-relaxed"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:bg-[#C85A32] shrink-0 cursor-pointer shadow-xs"
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-stone-400 px-2 mt-1.5">
              <span>Enter to send • Shift + Enter for new line</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#C85A32]" />
                <span>JobPlanner AI grounded in your authentic records</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
