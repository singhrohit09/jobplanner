export type ExperienceLevel =
  | "Student / In College"
  | "Fresher / 0 Years"
  | "Intern / Recent Grad"
  | "Junior (1-2 Years)";

export interface EducationDetail {
  degree: string;
  college: string;
  branch: string;
  graduation_year: string;
  cgpa: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  github_url?: string;
  live_url?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  name?: string;
  avatar_url: string;
  profile_image_url?: string;
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  college?: string;
  degree?: string;
  branch?: string;
  graduation_year?: string;
  education: EducationDetail;
  skills: string[];
  interests: string[];
  target_role: string;
  experience_level: ExperienceLevel;
  projects: ProjectItem[];
  plan: "starter_19" | "pro_39" | "accelerator_79";
  created_at: string;
  onboarding_completed: boolean;
}

export interface ReadinessAnalysis {
  score: number;
  breakdown: {
    skillsScore: number;
    projectsScore: number;
    educationScore: number;
    interviewScore: number;
    resumeScore: number;
  };
  strengths: string[];
  criticalSkillGaps: string[];
  recommendedSkills: string[];
  improvementAreas: string[];
  summary: string;
}

// ==========================================
// AI Skill Gap Analysis Types
// ==========================================
export type SkillPriority = "HIGH" | "MEDIUM" | "LOW";

export interface SkillGapItem {
  name: string;
  category: string;
  currentLevel?: string;
  requiredLevel?: string;
  gapLevel?: string;
  priority: SkillPriority;
  reason: string;
  recommendedAction?: string;
}

export interface RoadmapStage {
  stage: number;
  title: string;
  description?: string;
  skills: string[];
}

export interface ProjectRecommendation {
  title: string;
  whatToBuild: string;
  skillsDemonstrated: string[];
  whyItHelps: string;
}

export interface SkillGapAnalysisResult {
  id?: string;
  userId?: string;
  targetRole: string;
  readinessScore: number;
  summary: string;
  scoreExplanation?: string;
  strongSkills: SkillGapItem[];
  improvementSkills: SkillGapItem[];
  missingSkills: SkillGapItem[];
  recommendedSkills: SkillGapItem[];
  learningRoadmap: RoadmapStage[];
  projectRecommendations: ProjectRecommendation[];
  analyzedAt: string | any;
  resumeUsed?: {
    fileName?: string | null;
    fileType?: string | null;
    fileSize?: number | null;
    parsed?: boolean;
    extractedSkillCount?: number;
  } | null;
}

export interface RoadmapTask {
  id: string;
  text: string;
  completed: boolean;
  tag: string;
}

export interface RoadmapStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedWeeks: string;
  tasks: RoadmapTask[];
}

export interface ResumeData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    portfolio?: string;
  };
  summary: string;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    branch: string;
    graduationYear: string;
    cgpa: string;
  }>;
  skills: string[];
  projects: Array<{
    id: string;
    title: string;
    techStack: string;
    points: string[];
    link?: string;
  }>;
  experience: Array<{
    id: string;
    role: string;
    company: string;
    duration: string;
    points: string[];
  }>;
  certifications: Array<{
    id: string;
    title: string;
    issuer: string;
    year: string;
  }>;
}

// ==========================================
// AI Resume Builder Types
// ==========================================
export type ResumeTemplateType = "classic" | "modern" | "minimal";

export interface ResumeContactLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
}

export interface ResumeEducationItem {
  id: string;
  institution: string;
  degree: string;
  branch?: string;
  graduationYear: string;
  cgpa?: string;
  location?: string;
}

export interface ResumeProjectItem {
  id: string;
  title: string;
  description?: string;
  techStack?: string;
  points: string[];
  link?: string;
}

export interface ResumeExperienceItem {
  id: string;
  role: string;
  company: string;
  duration: string;
  location?: string;
  isCurrent?: boolean;
  points: string[];
}

export interface ResumeCertificationItem {
  id: string;
  title: string;
  issuer: string;
  year: string;
  link?: string;
}

export interface ResumeAchievementItem {
  id: string;
  title: string;
  description: string;
}

export interface GeneratedResume {
  id: string;
  resumeId: string;
  userId: string;
  title: string;
  targetRole: string;
  template: ResumeTemplateType;
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    website?: string;
  };
  summary: string;
  skills: string[];
  education: ResumeEducationItem[];
  projects: ResumeProjectItem[];
  experience: ResumeExperienceItem[];
  internships?: ResumeExperienceItem[];
  certifications: ResumeCertificationItem[];
  achievements: ResumeAchievementItem[];
  links: ResumeContactLinks;
  atsScore: number;
  atsFeedback?: {
    score: number;
    strengths: string[];
    improvements: string[];
    missingKeywords: string[];
    formattingTips?: string[];
  };
  tailoredForJob?: {
    jobId?: string;
    jobTitle?: string;
    company?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeAIFeedback {
  atsScore: number;
  strengths: string[];
  missingKeywords: string[];
  bulletImprovements: Array<{
    original: string;
    improved: string;
    reason: string;
  }>;
  formattingTips: string[];
  executiveSummarySuggestion: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: "Technical" | "HR" | "Behavioral" | "Scenario";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  role: string;
  expectedKeyPoints: string[];
  sampleApproach?: string;
}

export interface InterviewAnswerFeedback {
  score: number; // 1-10
  confidenceRating: "High" | "Medium" | "Needs Work";
  strengths: string[];
  areasToImprove: string[];
  idealSampleAnswer: string;
  keyPointsMissed: string[];
}

export interface PracticeRecord {
  id: string;
  questionId: string;
  question: string;
  category: string;
  userAnswer: string;
  score: number;
  feedback: InterviewAnswerFeedback;
  timestamp: string;
}

// ==========================================
// AI Interview Preparation Types
// ==========================================
export type InterviewType =
  | "mock"
  | "technical"
  | "behavioral"
  | "resume"
  | "job_specific"
  | "skill_gap";

export type InterviewDifficulty = "beginner" | "intermediate" | "advanced";

export interface InterviewQuestionItem {
  id: string;
  questionNumber: number;
  question: string;
  category: string; // e.g. "Programming", "System Design", "Behavioral", "Resume Project", "SQL Gap"
  difficulty: InterviewDifficulty;
  focusArea: string;
  contextHint?: string; // Follow-up rationale based on user's past response
}

export interface AnswerEvaluation {
  score: number; // 1-10
  strengths: string[];
  improvements: string[];
  missingPoints: string[];
  suggestedApproach: string;
  technicalAccuracy?: string;
  communicationClarity?: string;
}

export interface SessionQuestionRecord {
  questionId: string;
  questionNumber: number;
  question: string;
  category: string;
  difficulty: string;
  userAnswer: string;
  score: number; // 0-10 (0 if skipped)
  skipped: boolean;
  strengths: string[];
  improvements: string[];
  missingPoints: string[];
  suggestedApproach?: string;
  evaluatedAt: string;
}

export interface FinalInterviewReport {
  overallScore: number; // 0-100
  technicalScore: number; // 0-100
  behavioralScore: number; // 0-100
  resumeScore: number; // 0-100
  roleReadinessScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
  recommendedPractice: string[];
  readinessSummary: string;
}

export interface InterviewSession {
  sessionId: string;
  userId: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  targetRole: string;
  totalQuestions: number;
  completedQuestions: number;
  jobId?: string;
  jobTitle?: string;
  company?: string;
  overallScore: number; // 0-100
  technicalScore: number;
  behavioralScore: number;
  resumeScore: number;
  roleReadinessScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  recommendedPractice?: string[];
  readinessSummary?: string;
  questions: SessionQuestionRecord[];
  startedAt: string;
  completedAt: string;
  status: "completed" | "abandoned" | "in_progress";
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  workMode: "Remote" | "Hybrid" | "Onsite";
  salary?: string;
  experience?: string;
  industry?: string;
  requiredSkills: string[];
  description: string;
  responsibilities?: string[];
  qualifications?: string[];
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  whyItMatches?: string;
  improvementSuggestions?: string[];
  applied?: boolean;
  saved?: boolean;
  savedAt?: string;
  postedAgo?: string;
  applyUrl?: string;
  isDemo?: boolean;
  isLive?: boolean;
  source?: string;
  attribution?: string;
  attributionUrl?: string;
}

export interface SavedJobRecord {
  jobId: string;
  userId: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  workMode?: "Remote" | "Hybrid" | "Onsite";
  experience?: string;
  matchScore?: number;
  applyUrl?: string;
  isDemo?: boolean;
  isLive?: boolean;
  savedAt: string;
  jobData?: JobListing;
}

export interface JobRecommendationsResult {
  userId?: string;
  targetRole: string;
  generatedAt: string;
  isDemo?: boolean;
  isLive?: boolean;
  attribution?: string;
  attributionUrl?: string;
  jobs: JobListing[];
}

export type PlanTier = "Free" | "Basic" | "Pro" | "Full" | "Starter" | "Accelerator";

export interface SubscriptionPlan {
  id: "basic_99" | "pro_149" | "full_199" | "starter_19" | "pro_39" | "accelerator_79" | string;
  tier: PlanTier;
  name: string;
  tagline: string;
  description?: string;
  priceINR: number;
  price: string;
  period: string;
  popular?: boolean;
  badge?: string;
  features: string[];
  cta: string;
}

// ==========================================
// AI Career Assistant Types
// ==========================================

export interface ChatRelatedFeature {
  title: string;
  tab: string; // e.g., "skillgap", "roadmap", "builder", "resume", "jobs", "interview", "readiness", "profile"
  actionLabel: string;
  icon?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  recommendations?: string[];
  nextSteps?: string[];
  relatedFeatures?: ChatRelatedFeature[];
}

export interface CareerAssistantSession {
  sessionId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface CareerAssistantContext {
  profile?: {
    fullName?: string;
    email?: string;
    targetRole?: string;
    industry?: string;
    experienceLevel?: string;
    skills?: string[];
    location?: string;
    college?: string;
    degree?: string;
    branch?: string;
    currentYear?: string;
    graduationYear?: string;
    linkedin?: string;
    github?: string;
  };
  skillGap?: {
    readinessScore?: number;
    summary?: string;
    strongSkills?: string[];
    improvementSkills?: string[];
    missingSkills?: string[];
    recommendedSkills?: string[];
    topPriorityGaps?: string[];
  };
  resume?: {
    uploadedFileName?: string | null;
    uploadedFileType?: string | null;
    uploadedAt?: string | null;
    hasParsedResume?: boolean;
    skillsInResume?: string[];
    projectCount?: number;
    summary?: string;
  };
  jobs?: {
    recommendedCount?: number;
    topMatches?: Array<{
      title: string;
      company: string;
      matchScore: number;
      matchedSkills: string[];
      missingSkills: string[];
      location?: string;
    }>;
    savedJobsCount?: number;
    savedJobTitles?: string[];
  };
  interviewHistory?: {
    totalSessions?: number;
    averageScore?: number;
    latestSession?: {
      interviewType?: string;
      difficulty?: string;
      overallScore?: number;
      technicalScore?: number;
      behavioralScore?: number;
      resumeScore?: number;
      roleReadinessScore?: number;
      strengths?: string[];
      weaknesses?: string[];
      recommendedTopics?: string[];
    };
  };
  currentJob?: {
    title?: string;
    company?: string;
    matchScore?: number;
    requirements?: string[];
    missingSkills?: string[];
  };
  careerRoadmap?: {
    roadmapId?: string;
    overallProgress?: number;
    currentStage?: string;
    duration?: string;
    completedTasksCount?: number;
    totalTasksCount?: number;
    nextRecommendedTask?: {
      title: string;
      reason: string;
      category?: string;
    };
    stagesSummary?: Array<{
      stageId: string;
      title: string;
      progress: number;
      completedCount: number;
      totalCount: number;
    }>;
  };
  jobApplications?: Array<{
    company: string;
    jobTitle: string;
    status: string;
    applicationDate: string;
    interviewDate?: string;
    deadline?: string;
    matchScore?: number;
    priority?: string;
    nextAction?: string;
  }>;
}

// ==========================================
// AI Career Roadmap & Progress Tracker Types
// ==========================================
export type RoadmapDuration =
  | "2 Weeks"
  | "1 Month"
  | "3 Months"
  | "6 Months"
  | "Custom";

export type TaskStatus = "Not Started" | "In Progress" | "Completed";
export type TaskPriority = "High" | "Medium" | "Low";
export type TaskCategory =
  | "skills"
  | "projects"
  | "resume"
  | "interview"
  | "jobs";

export interface TaskResource {
  title: string;
  type?: string;
  url?: string;
  provider?: string;
}

export interface CareerRoadmapTask {
  taskId: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedDuration: string;
  status: TaskStatus;
  prerequisites?: string[];
  skills: string[];
  reason: string;
  completedAt?: string | null;
  resources?: TaskResource[];
}

export interface CareerRoadmapStage {
  stageId: string;
  title: string;
  description: string;
  order: number;
  progress: number; // 0-100
  status: "Completed" | "Current" | "Upcoming";
  tasks: CareerRoadmapTask[];
}

export interface CareerMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string | null;
  icon?: string;
}

export interface CareerAchievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string | null;
  badge: string;
  criteria: string;
}

export interface SkillProgressItem {
  skill: string;
  category?: string;
  status: "Mastered" | "In Progress" | "To Learn";
  priority: TaskPriority;
  progress: number; // 0-100
  targetLevel: string; // e.g. "Proficient", "Intermediate", "Advanced"
}

export interface CareerProjectRecommendation {
  id: string;
  title: string;
  description: string;
  skills: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  expectedOutcome: string;
  whyItHelps: string;
}

export interface CareerRoadmap {
  roadmapId: string;
  userId: string;
  targetRole: string;
  industry: string;
  duration: RoadmapDuration;
  createdAt: string;
  updatedAt: string;
  overallProgress: number; // 0-100
  currentStage: string;
  completedTasksCount: number;
  totalTasksCount: number;
  nextRecommendedTask?: CareerRoadmapTask | null;
  stages: CareerRoadmapStage[];
  milestones: CareerMilestone[];
  achievements: CareerAchievement[];
  skillProgressList: SkillProgressItem[];
  projectRecommendations: CareerProjectRecommendation[];
  summary?: string;
}

export interface CareerRoadmapHistoryRecord {
  roadmapId: string;
  userId: string;
  targetRole: string;
  duration: RoadmapDuration;
  createdAt: string;
  updatedAt: string;
  overallProgress: number;
  completedTasksCount: number;
  totalTasksCount: number;
  stagesSummary: Array<{
    title: string;
    progress: number;
  }>;
  roadmapSnapshot: CareerRoadmap;
}

export interface WhatShouldIDoNextRecommendation {
  primaryAction: string;
  reason: string;
  taskId?: string;
  taskTitle?: string;
  category?: TaskCategory;
  suggestedTab: string;
  actionLabel: string;
  urgency: "High" | "Medium" | "Normal";
  tips?: string[];
}

// ==========================================
// PHASE 9: AI CAREER ANALYTICS & INSIGHTS
// ==========================================

export type AnalyticsTimeFilter = "7d" | "30d" | "3m" | "6m" | "all";
export type TimeFilterPeriod = AnalyticsTimeFilter;

export interface CareerReadinessComponent {
  name: string;
  score: number | null; // 0-100, or null if insufficient data
  weight: number; // e.g. 0.25
  description: string;
  status: "available" | "insufficient_data";
  details: string;
}

export interface CareerReadinessScoreData {
  overallScore: number | null;
  previousScore: number | null;
  changeDelta: number | null;
  hasSufficientData: boolean;
  level?: string;
  components: {
    skills: CareerReadinessComponent;
    resume: CareerReadinessComponent;
    jobs: CareerReadinessComponent;
    interview: CareerReadinessComponent;
    roadmap: CareerReadinessComponent;
    profile: CareerReadinessComponent;
  };
  explanation: string;
  formulaExplanation: string;
}

export interface ProgressHistoryPoint {
  date: string;
  timestamp: number;
  overallReadiness: number;
  skillReadiness?: number;
  resumeReadiness?: number;
  interviewReadiness?: number;
  jobMatchReadiness?: number;
  roadmapProgress?: number;
  eventLabel?: string;
}

export interface SkillAnalyticsData {
  strongSkills: string[];
  improvingSkills: string[];
  highPriorityGaps: string[];
  roleCriticalMissing: string[];
  skillTrends: Array<{
    skill: string;
    status: "Strong" | "Improving" | "Needs Improvement" | "Critical Gap";
    source: string;
    level?: string;
  }>;
  gapComparison?: {
    improved: string[];
    stillNeedsWork: string[];
    newPriority: string[];
  };
}

export interface JobMatchAnalyticsData {
  averageMatchScore: number | null;
  bestMatchScore: number | null;
  relevantJobsCount: number;
  savedJobsCount: number;
  topMissingSkills: Array<{ skill: string; frequency: number }>;
  trend: "improving" | "stable" | "declining" | "insufficient_data";
  trendExplanation: string;
}

export interface ResumeAnalyticsData {
  hasResume: boolean;
  atsScore: number | null;
  bestAtsScore: number | null;
  versionsCount: number;
  latestUpdate: string | null;
  status: string;
  strengths: string[];
  weaknesses: string[];
  improvementInsights: string[];
}

export interface InterviewAnalyticsData {
  sessionsCompleted: number;
  averageScore: number | null;
  bestScore: number | null;
  technicalScore: number | null;
  behavioralScore: number | null;
  resumeScore: number | null;
  roleReadiness: number | null;
  scoreHistory: Array<{ date: string; score: number }>;
  trend: "improving" | "stable" | "needs_practice" | "insufficient_data";
  trendConclusion: string;
}

export interface RoadmapAnalyticsData {
  overallCompletion: number;
  completedTasks: number;
  totalTasks: number;
  remainingTasks: number;
  currentStage: string;
  highPriorityRemaining: number;
  velocityTasksPerWeek: number | null;
  estimatedWeeksRemaining: number | null;
  velocityEstimateDisclaimer: string;
}

export interface AICareerInsights {
  biggestStrength: string;
  biggestWeakness: string;
  biggestOpportunity: string;
  biggestRisk: string;
  mostImportantNextAction: string;
  careerReadinessExplanation: string;
  weeklySummary: string;
  careerSnapshot: {
    whereAmINow: string;
    whatAmIDoingWell: string;
    whatIsHoldingMeBack: string;
    whatShouldIPrioritize: string;
    howCloseAmIToTargetRole: string;
  };
  thingsHoldingYouBack: string[];
  userStrengths: string[];
  nextBestAction: {
    action: string;
    reason: string;
    buttonLabel: string;
    targetTab: string;
    secondaryAction?: string;
    secondaryTab?: string;
  };
  generatedAt: string;
}

export interface CareerActivityItem {
  id: string;
  type: "profile" | "resume" | "skill_gap" | "job_saved" | "interview" | "roadmap" | "assistant" | "job_application" | "portfolio_project";
  title: string;
  description: string;
  timestamp: string;
  metric?: string;
}

export interface CareerAnalyticsSnapshot {
  id: string;
  userId: string;
  targetRole: string;
  createdAt: string;
  updatedAt: string;
  readiness: CareerReadinessScoreData;
  skills: SkillAnalyticsData;
  jobs: JobMatchAnalyticsData;
  resume: ResumeAnalyticsData;
  interview: InterviewAnalyticsData;
  roadmap: RoadmapAnalyticsData;
  insights: AICareerInsights;
  activities: CareerActivityItem[];
  timeFilter?: AnalyticsTimeFilter;
  applications?: {
    totalTracked: number;
    activeApplications: number;
    interviewsCount: number;
    offersCount: number;
    rejectedCount: number;
    averageMatchScore?: number | null;
  };
}

export interface CareerAnalyticsHistoryRecord {
  snapshotId: string;
  userId: string;
  createdAt: string;
  overallReadiness: number;
  targetRole: string;
  snapshot: Partial<CareerAnalyticsSnapshot>;
}

// ==========================================
// AI Job Application Tracker Types
// ==========================================

export type JobApplicationStatus =
  | "Saved"
  | "Applied"
  | "Screening"
  | "Assessment"
  | "Interview"
  | "Final Interview"
  | "Offer"
  | "Accepted"
  | "Rejected"
  | "Withdrawn";

export type ApplicationPriority = "High" | "Medium" | "Low";
export type JobApplicationPriority = ApplicationPriority;

export interface StatusHistoryEntry {
  status: JobApplicationStatus;
  timestamp: string;
  note?: string;
}

export interface ApplicationNote {
  id: string;
  text?: string;
  content?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ApplicationContact {
  name?: string;
  email?: string;
  role?: string;
  notes?: string;
}

export interface JobApplication {
  applicationId: string;
  userId: string;
  company: string;
  jobTitle: string;
  jobUrl?: string;
  location?: string;
  workMode?: "Remote" | "Hybrid" | "Onsite";
  industry?: string;
  status: JobApplicationStatus;
  applicationDate: string; // YYYY-MM-DD or ISO
  deadline?: string;
  assessmentDeadline?: string;
  interviewDate?: string;
  followUpDate?: string;
  matchScore?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
  jobDescription?: string;
  salary?: string;
  resumeId?: string;
  resumeFileName?: string;
  resumeTitle?: string;
  notes?: ApplicationNote[];
  contact?: ApplicationContact;
  priority?: ApplicationPriority;
  priorityReason?: string;
  nextAction?: string;
  aiRecommendation?: string;
  statusHistory: StatusHistoryEntry[];
  jobId?: string; // Reference to JobListing if added from recommendations
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationSummaryStats {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  rejected: number;
  accepted: number;
  withdrawn: number;
  saved: number;
  applied: number;
  screening: number;
  assessment: number;
  finalInterview: number;
  averageMatchScore?: number | null;
}

export interface AIApplicationInsights {
  attentionApplications: Array<{
    applicationId: string;
    company: string;
    jobTitle: string;
    reason: string;
    recommendedAction: string;
  }>;
  activeInterviewsSummary: string;
  waitingTooLongSummary: string;
  bestMatchingJobTypes: string[];
  frequentSkills: Array<{ skill: string; count: number }>;
  priorityRecommendations: string[];
  weeklySummary?: string;
  strategySuggestions: string[];
  overallHealthVerdict: string;
  generatedAt: string;
}

// ==========================================
// AI Portfolio Builder & GitHub Analyzer Types
// ==========================================

export type PortfolioTemplateType = "modern" | "minimal" | "developer" | "professional";

export interface ProjectAIAnalysis {
  improvedDescription: string;
  resumeBullets: string[];
  portfolioNarrative: string;
  interviewExplanation: {
    summary: string;
    whyBuilt: string;
    keyChallenges: string;
    outcomeAndLearnings: string;
    starQuestions: Array<{
      question: string;
      sampleAnswer: string;
    }>;
  };
  keyTechnologies: string[];
  keyContributions: string[];
  suggestedImprovements: string[];
  missingInformation: string[];
  analyzedAt: string;
}

export interface PortfolioProject {
  projectId: string;
  userId: string;
  name: string;
  description: string;
  problem?: string;
  technologies: string[];
  role?: string;
  features?: string[];
  challenges?: string;
  outcome?: string;
  githubUrl?: string;
  demoUrl?: string;
  imageUrls?: string[];
  startDate?: string;
  endDate?: string;
  featured: boolean;
  displayOrder: number;
  skills: string[];
  targetRoles?: string[];
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: ProjectAIAnalysis;
}

export interface PortfolioSettings {
  template: PortfolioTemplateType;
  headline?: string;
  about?: string;
  isPublic?: boolean;
  publicId?: string;
  featuredProjectIds?: string[];
  customSectionsOrder?: string[];
  themeAccent?: string;
  updatedAt: string;
}

export interface GitHubRepoMetadata {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  updatedAt: string;
  pushedAt: string;
  hasReadme: boolean;
  htmlUrl: string;
  homepage?: string | null;
  isFork: boolean;
  defaultBranch?: string;
  relevanceScore?: number;
  relevanceReason?: string;
}

export interface GitHubAnalysisSummary {
  topLanguages: Array<{ language: string; count: number }>;
  totalStars: number;
  totalForks: number;
  reposWithReadme: number;
  portfolioHighlights: string[];
  strengths: string[];
  recommendedActions: string[];
}

export interface GitHubAnalysis {
  username: string;
  profileUrl: string;
  avatarUrl?: string;
  name?: string;
  bio?: string;
  publicReposCount: number;
  followers: number;
  repositories: GitHubRepoMetadata[];
  analyzedAt: string;
  analysisSummary?: GitHubAnalysisSummary;
}

export interface PortfolioReadinessBreakdown {
  overallScore: number | null;
  isCalculable: boolean;
  insufficientDataReason?: string;
  categories: {
    profile: { score: number; label: string; details: string };
    skills: { score: number; label: string; details: string };
    projects: { score: number; label: string; details: string };
    github: { score: number; label: string; details: string };
    resume: { score: number; label: string; details: string };
    presentation: { score: number; label: string; details: string };
  };
  completedChecklist: Array<{ item: string; completed: boolean; impact: string }>;
  summary: string;
}

export interface PortfolioGapAnalysis {
  missingProjectTypes: string[];
  missingTechnologies: string[];
  weakProjectDescriptions: Array<{
    projectId?: string;
    projectName: string;
    issue: string;
    recommendation: string;
  }>;
  missingDocumentation: string[];
  missingDemos: string[];
  missingSkills: string[];
  recommendations: Array<{
    title: string;
    category: string;
    problemToSolve: string;
    targetStack: string[];
    whyItHelpsTargetRole: string;
    estimatedHours?: string;
    roadmapTaskSuggestion?: string;
  }>;
  analyzedAt: string;
}

export interface PublicPortfolioData {
  publicId: string;
  userId: string;
  profile: {
    fullName: string;
    headline?: string;
    about?: string;
    targetRole?: string;
    avatarUrl?: string;
    education?: {
      college?: string;
      degree?: string;
      branch?: string;
      graduationYear?: string;
    };
    contact: {
      email?: string;
      linkedin?: string;
      github?: string;
      website?: string;
    };
  };
  settings: PortfolioSettings;
  projects: PortfolioProject[];
  skills: string[];
  githubHighlights?: GitHubRepoMetadata[];
  publishedAt: string;
}

// ==========================================
// Offer Comparison & Salary Negotiation Types
// ==========================================

export type VestingScheduleType =
  | "Standard 4-Year (25%/yr, 1-yr cliff)"
  | "Backloaded (5/15/40/40)"
  | "Equal 3-Year"
  | "Immediate / None";

export type CostOfLivingTier =
  | "Metro Tier 1 (High CoL)"
  | "Urban Tier 2 (Moderate CoL)"
  | "Tier 3 / Remote (Low CoL)";

export interface JobOffer {
  id: string;
  applicationId?: string;
  company: string;
  roleTitle: string;
  location: string;
  workMode: "Remote" | "Hybrid" | "Onsite";
  currency: string;
  baseSalary: number;
  signingBonus: number;
  annualBonusPercent: number;
  equityTotalValue: number;
  vestingSchedule: VestingScheduleType;
  benefitsAnnualValue: number;
  costOfLivingTier: CostOfLivingTier;
  offerDeadline?: string;
  notes?: string;
  createdAt: string;
}

export interface OfferBreakdownCalculation {
  offer: JobOffer;
  year1Cash: number;
  year1Equity: number;
  year1TotalComp: number;
  annualizedTotalComp: number;
  fourYearTotalValue: number;
  monthlyEstimatedCash: number;
  colAdjustedAnnualComp: number;
  benchmarkComparison: {
    status: "Below Market" | "Competitive Median" | "Top Tier";
    percentileEstimate: number;
    message: string;
  };
}

export type NegotiationGoalType =
  | "competing_offer"
  | "skills_and_merit"
  | "higher_base"
  | "higher_bonus_or_equity"
  | "remote_flexibility";

export type NegotiationToneType =
  | "diplomatic_enthusiastic"
  | "confident_value"
  | "direct_corporate";

export interface OfferNegotiationRequest {
  offer: JobOffer;
  competingOffers?: JobOffer[];
  userTargetRole?: string;
  userSkills?: string[];
  readinessScore?: number;
  negotiationGoal: NegotiationGoalType;
  tone: NegotiationToneType;
  targetBaseSalary?: number;
  additionalRequests?: string;
}

export interface OfferNegotiationResult {
  emailSubject: string;
  emailBody: string;
  keyTalkingPoints: string[];
  counterOfferBreakdown: {
    suggestedBaseRange: string;
    suggestedSigningBonusRange?: string;
    suggestedEquityRange?: string;
  };
  fallbacksIfDenied: string[];
  negotiationTips: string[];
}
