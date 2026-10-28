import React, { useState, useEffect } from "react";
import {
  SAMPLE_PROFILE,
  SAMPLE_READINESS_ANALYSIS,
  SAMPLE_ROADMAP_STEPS,
  SAMPLE_RESUME_DATA,
  SAMPLE_JOB_LISTINGS,
  ROLE_BENCHMARKS,
} from "./lib/defaultData";
import {
  UserProfile,
  ReadinessAnalysis,
  RoadmapStep,
  ResumeData,
  JobListing,
  PracticeRecord,
  PlanTier,
  CareerRoadmap,
  CareerAnalyticsSnapshot,
} from "./types";
import { Navbar } from "./components/Navbar";
import { DashboardView } from "./components/DashboardView";
import { CareerAnalyticsView } from "./components/CareerAnalyticsView";
import { ReadinessView } from "./components/ReadinessView";
import { SkillGapView } from "./components/SkillGapView";
import { RoadmapView } from "./components/RoadmapView";
import { ResumeBuilderView } from "./components/ResumeBuilderView";
import { InterviewPrepView } from "./components/InterviewPrepView";
import { CareerAssistantView } from "./components/CareerAssistantView";
import { JobRecommendationsView } from "./components/JobRecommendationsView";
import { JobApplicationsView } from "./components/JobApplicationsView";
import { OnboardingModal } from "./components/OnboardingModal";
import { PortfolioView } from "./components/portfolio/PortfolioView";
import { PublicPortfolioPage } from "./components/portfolio/PublicPortfolioPage";
import { SupabaseConfigModal } from "./components/SupabaseConfigModal";
import { FirebaseAuthModal } from "./components/FirebaseAuthModal";
import { isSupabaseConfigured } from "./lib/supabase";
import {
  onAuthChange,
  ensureUserDocumentExists,
  syncUserDataToFirestore,
  fetchUserFromFirestore,
  isFirebaseConfigured,
  FirestoreUserData,
  UserOnboardingData,
  logoutUser,
  ResumeMetadata,
  saveJobToFirestore,
  removeSavedJobFromFirestore,
  getSavedJobsFromFirestore,
  saveJobRecommendations,
  getLatestJobRecommendations,
  getLatestSkillGapAnalysis,
  getCareerRoadmapFromFirestore,
  getCareerAnalyticsFromFirestore,
  saveCareerAnalyticsToFirestore,
} from "./lib/firebase";
import { User as FirebaseUser } from "firebase/auth";
import { Lock, Sparkles } from "lucide-react";
import { LoginPage } from "./components/LoginPage";
import { OnboardingPage } from "./components/OnboardingPage";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Core Data State with Local Storage initialization and defensive fallbacks
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem("jobplanner_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            ...SAMPLE_PROFILE,
            ...parsed,
            skills: Array.isArray(parsed.skills) ? parsed.skills : SAMPLE_PROFILE.skills,
            interests: Array.isArray(parsed.interests) ? parsed.interests : SAMPLE_PROFILE.interests,
            projects: Array.isArray(parsed.projects) ? parsed.projects : SAMPLE_PROFILE.projects,
            education: {
              ...SAMPLE_PROFILE.education,
              ...(parsed.education || {}),
            },
          };
        }
      }
    } catch (e) {
      console.warn("Notice loading saved profile:", e);
    }
    return SAMPLE_PROFILE;
  });

  const [readiness, setReadiness] = useState<ReadinessAnalysis>(() => {
    try {
      const saved = localStorage.getItem("jobplanner_readiness");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            ...SAMPLE_READINESS_ANALYSIS,
            ...parsed,
            breakdown: {
              ...SAMPLE_READINESS_ANALYSIS.breakdown,
              ...(parsed.breakdown || {}),
            },
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : SAMPLE_READINESS_ANALYSIS.strengths,
            criticalSkillGaps: Array.isArray(parsed.criticalSkillGaps)
              ? parsed.criticalSkillGaps
              : SAMPLE_READINESS_ANALYSIS.criticalSkillGaps,
            recommendedSkills: Array.isArray(parsed.recommendedSkills)
              ? parsed.recommendedSkills
              : SAMPLE_READINESS_ANALYSIS.recommendedSkills,
            improvementAreas: Array.isArray(parsed.improvementAreas)
              ? parsed.improvementAreas
              : SAMPLE_READINESS_ANALYSIS.improvementAreas,
          };
        }
      }
    } catch (e) {
      console.warn("Notice loading saved readiness:", e);
    }
    return SAMPLE_READINESS_ANALYSIS;
  });

  const [roadmap, setRoadmap] = useState<RoadmapStep[]>(() => {
    try {
      const saved = localStorage.getItem("jobplanner_roadmap");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((step) => ({
            ...step,
            tasks: Array.isArray(step?.tasks) ? step.tasks : [],
          }));
        }
      }
    } catch (e) {
      console.warn("Notice loading saved roadmap:", e);
    }
    return SAMPLE_ROADMAP_STEPS;
  });

  const [careerRoadmap, setCareerRoadmap] = useState<CareerRoadmap | null>(() => {
    try {
      const saved = localStorage.getItem("jobplanner_career_roadmap");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Notice loading saved career roadmap:", e);
    }
    return null;
  });

  const [careerAnalytics, setCareerAnalytics] = useState<CareerAnalyticsSnapshot | null>(() => {
    try {
      const saved = localStorage.getItem("jobplanner_career_analytics");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Notice loading saved career analytics:", e);
    }
    return null;
  });

  const [resume, setResume] = useState<ResumeData>(() => {
    try {
      const saved = localStorage.getItem("jobplanner_resume");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            ...SAMPLE_RESUME_DATA,
            ...parsed,
            personalInfo: {
              ...SAMPLE_RESUME_DATA.personalInfo,
              ...(parsed.personalInfo || {}),
            },
            education: Array.isArray(parsed.education) ? parsed.education : SAMPLE_RESUME_DATA.education,
            skills: Array.isArray(parsed.skills) ? parsed.skills : SAMPLE_RESUME_DATA.skills,
            projects: Array.isArray(parsed.projects) ? parsed.projects : SAMPLE_RESUME_DATA.projects,
            experience: Array.isArray(parsed.experience) ? parsed.experience : SAMPLE_RESUME_DATA.experience,
            certifications: Array.isArray(parsed.certifications)
              ? parsed.certifications
              : SAMPLE_RESUME_DATA.certifications,
          };
        }
      }
    } catch (e) {
      console.warn("Notice loading saved resume:", e);
    }
    return SAMPLE_RESUME_DATA;
  });

  const [jobs, setJobs] = useState<JobListing[]>(() => {
    try {
      const saved = localStorage.getItem("jobplanner_jobs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((job) => ({
            ...job,
            requiredSkills: Array.isArray(job?.requiredSkills) ? job.requiredSkills : [],
            preferredSkills: Array.isArray(job?.preferredSkills) ? job.preferredSkills : [],
            matchedSkills: Array.isArray(job?.matchedSkills) ? job.matchedSkills : [],
            missingSkills: Array.isArray(job?.missingSkills) ? job.missingSkills : [],
          }));
        }
      }
    } catch (e) {
      console.warn("Notice loading saved jobs:", e);
    }
    return SAMPLE_JOB_LISTINGS;
  });

  const [practiceHistory, setPracticeHistory] = useState<PracticeRecord[]>(() => {
    try {
      const saved = localStorage.getItem("jobplanner_practice_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Notice loading saved practice history:", e);
    }
    return [];
  });

  const [subscriptionPlan, setSubscriptionPlan] = useState<PlanTier>(() => {
    return (localStorage.getItem("jobplanner_plan") as PlanTier) || "Free";
  });

  // Modal Visibility States
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Firebase Auth State & Sync
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isFirebaseSynced, setIsFirebaseSynced] = useState<boolean>(false);
  const [isProfileCompleted, setIsProfileCompleted] = useState<boolean>(false);
  const [firestoreUserData, setFirestoreUserData] = useState<Partial<FirestoreUserData> | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [isEditingFullProfile, setIsEditingFullProfile] = useState<boolean>(false);

  // Direct access to public portfolio via URL parameter (?portfolio=<slug>)
  const [publicPortfolioSlug, setPublicPortfolioSlug] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("portfolio");
    }
    return null;
  });

  // Loading States for AI Tasks
  const [isAnalyzingReadiness, setIsAnalyzingReadiness] = useState<boolean>(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [isRefreshingJobRecs, setIsRefreshingJobRecs] = useState<boolean>(false);

  // Complete Logout & Account Switching handler (Requirement 6)
  const handleLogout = async () => {
    setIsAuthLoading(true);
    try {
      await logoutUser();
    } catch (e) {
      console.warn("Notice during logout:", e);
    }
    // 1. Clear user state from memory
    setCurrentUser(null);
    setIsProfileCompleted(false);
    setIsGuestMode(false);
    setIsEditingFullProfile(false);
    setIsFirebaseSynced(false);
    setFirestoreUserData(null);
    setProfile(SAMPLE_PROFILE);
    setReadiness(SAMPLE_READINESS_ANALYSIS);
    setRoadmap(SAMPLE_ROADMAP_STEPS);
    setResume(SAMPLE_RESUME_DATA);
    setJobs(SAMPLE_JOB_LISTINGS);
    setPracticeHistory([]);
    setCareerRoadmap(null);
    setCareerAnalytics(null);

    // 2. Reset local storage tied to user
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("jobplanner_profile");
        localStorage.removeItem("jobplanner_readiness");
        localStorage.removeItem("jobplanner_roadmap");
        localStorage.removeItem("jobplanner_resume");
        localStorage.removeItem("jobplanner_jobs");
        localStorage.removeItem("jobplanner_practice_history");
        localStorage.removeItem("jobplanner_career_roadmap");
        localStorage.removeItem("jobplanner_plan");
      } catch (e) {
        console.warn("Notice clearing local storage:", e);
      }
    }
    setIsAuthLoading(false);
  };

  // Listen to Firebase Auth state changes & restore cloud data
  useEffect(() => {
    let isMounted = true;

    // Safety fallback: if Firestore or Auth network takes > 10 seconds, release loading screen gracefully
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setIsAuthLoading(false);
      }
    }, 10000);

    const unsubscribe = onAuthChange(async (user) => {
      if (!isMounted) return;

      if (user) {
        setIsAuthLoading(true);
        setCurrentUser(user);

        try {
          // Hydrate from Firestore before releasing the loading screen
          const cloudData = await ensureUserDocumentExists(user, {
            profile,
            readiness,
            roadmap,
            resume,
            practiceHistory,
            subscriptionPlan,
          });

          if (!isMounted) return;

          if (cloudData) {
            setFirestoreUserData(cloudData);
            const isCompleted = Boolean(
              cloudData.profileCompleted === true ||
              cloudData.profile?.onboarding_completed === true
            );
            setIsProfileCompleted(isCompleted);

            if (cloudData.profile) setProfile(cloudData.profile);
            if (cloudData.readiness) setReadiness(cloudData.readiness);
            if (cloudData.roadmap && cloudData.roadmap.length > 0) setRoadmap(cloudData.roadmap);
            if (cloudData.resume) setResume(cloudData.resume);
            if (cloudData.practiceHistory) setPracticeHistory(cloudData.practiceHistory);
            if (cloudData.subscriptionPlan) setSubscriptionPlan(cloudData.subscriptionPlan);
            setIsFirebaseSynced(true);
          }

          // Hydrate saved jobs & previous job recommendations (non-blocking)
          getSavedJobsFromFirestore(user.uid)
            .then((savedList) => {
              if (!isMounted) return;
              if (savedList && savedList.length > 0) {
                const savedMap = new Set(savedList.map((s) => s.jobId));
                setJobs((prevJobs) =>
                  prevJobs.map((j) => ({ ...j, saved: savedMap.has(j.id) }))
                );
              }
            })
            .catch((e) => console.warn("Notice loading saved jobs:", e));

          getLatestJobRecommendations(user.uid)
            .then((recDoc) => {
              if (!isMounted) return;
              if (recDoc && Array.isArray(recDoc.jobs) && recDoc.jobs.length > 0) {
                setJobs((prev) => {
                  const savedIds = new Set(prev.filter((j) => j.saved).map((j) => j.id));
                  return recDoc.jobs.map((j) => ({
                    ...j,
                    saved: savedIds.has(j.id) || Boolean(j.saved),
                  }));
                });
              }
            })
            .catch((e) => console.warn("Notice loading cloud job recommendations:", e));

          // Hydrate AI Career Roadmap
          getCareerRoadmapFromFirestore(user.uid)
            .then((storedRoadmap) => {
              if (!isMounted) return;
              if (storedRoadmap) {
                setCareerRoadmap(storedRoadmap);
              }
            })
            .catch((e) => console.warn("Notice loading cloud career roadmap:", e));

          // Hydrate AI Career Analytics
          getCareerAnalyticsFromFirestore(user.uid)
            .then((storedAnalytics) => {
              if (!isMounted) return;
              if (storedAnalytics) {
                setCareerAnalytics(storedAnalytics);
              }
            })
            .catch((e) => console.warn("Notice loading cloud career analytics:", e));
        } catch (err) {
          console.warn("Background cloud hydration notice:", err);
        } finally {
          if (isMounted) {
            clearTimeout(fallbackTimer);
            setIsAuthLoading(false);
          }
        }
      } else {
        clearTimeout(fallbackTimer);
        setCurrentUser(null);
        setIsFirebaseSynced(false);
        setIsProfileCompleted(false);
        setFirestoreUserData(null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Background Firestore Auto-Sync whenever active data changes
  useEffect(() => {
    if (currentUser?.uid && isFirebaseSynced && isProfileCompleted) {
      syncUserDataToFirestore(currentUser.uid, {
        profile,
        readiness,
        roadmap,
        resume,
        practiceHistory,
        subscriptionPlan,
        overallScore: readiness.score,
      }).catch((err) => console.warn("Background Firestore sync failed:", err));
    }
  }, [
    profile,
    readiness,
    roadmap,
    resume,
    practiceHistory,
    subscriptionPlan,
    currentUser?.uid,
    isFirebaseSynced,
    isProfileCompleted,
  ]);

  // Persist states to local storage
  useEffect(() => {
    localStorage.setItem("jobplanner_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("jobplanner_readiness", JSON.stringify(readiness));
  }, [readiness]);

  useEffect(() => {
    localStorage.setItem("jobplanner_roadmap", JSON.stringify(roadmap));
  }, [roadmap]);

  useEffect(() => {
    if (careerRoadmap) {
      localStorage.setItem("jobplanner_career_roadmap", JSON.stringify(careerRoadmap));
    }
  }, [careerRoadmap]);

  useEffect(() => {
    localStorage.setItem("jobplanner_resume", JSON.stringify(resume));
  }, [resume]);

  useEffect(() => {
    localStorage.setItem("jobplanner_jobs", JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem("jobplanner_practice_history", JSON.stringify(practiceHistory));
  }, [practiceHistory]);

  useEffect(() => {
    localStorage.setItem("jobplanner_plan", subscriptionPlan);
  }, [subscriptionPlan]);

  // Recalculate quick readiness stats when skills change
  const recalculateQuickReadiness = (updatedSkills: string[] = [], targetRole: string) => {
    const benchmark = ROLE_BENCHMARKS[targetRole] || {
      requiredSkills: ["Core Technical Skills", "Database", "Problem Solving"],
    };

    const reqSkills = benchmark.requiredSkills || [];
    const skillsList = updatedSkills || [];

    const matchedReq = reqSkills.filter((r) =>
      skillsList.some((s) => s.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(s.toLowerCase()))
    );
    const missingReq = reqSkills.filter((r) => !matchedReq.includes(r));

    const skillScore = Math.round((matchedReq.length / Math.max(reqSkills.length, 1)) * 100);
    const projectsList = profile?.projects || [];
    const resumeProjects = resume?.projects || [];
    const histList = practiceHistory || [];

    const overallScore = Math.min(
      95,
      Math.max(
        35,
        Math.round(
          skillScore * 0.4 +
            (projectsList.length >= 2 ? 80 : 50) * 0.25 +
            80 * 0.15 +
            (resumeProjects.length > 0 ? 75 : 50) * 0.1 +
            (histList.length > 0 ? 70 : 45) * 0.1
        )
      )
    );

    setReadiness((prev) => ({
      ...prev,
      score: overallScore,
      criticalSkillGaps: missingReq,
      breakdown: {
        ...(prev?.breakdown || SAMPLE_READINESS_ANALYSIS.breakdown),
        skillsScore: skillScore,
      },
    }));
  };

  // Change Target Role
  const handleRoleChange = (newRole: string) => {
    const updated = { ...profile, target_role: newRole };
    setProfile(updated);
    recalculateQuickReadiness(updated.skills || [], newRole);
  };

  // Add Skill
  const handleAddSkill = (skillName: string) => {
    const currentSkills = profile?.skills || [];
    if (!currentSkills.includes(skillName)) {
      const updatedSkills = [...currentSkills, skillName];
      const updated = { ...profile, skills: updatedSkills };
      setProfile(updated);
      recalculateQuickReadiness(updatedSkills, profile?.target_role || "Data Analyst");
    }
  };

  // Remove Skill
  const handleRemoveSkill = (skillName: string) => {
    const currentSkills = profile?.skills || [];
    const updatedSkills = currentSkills.filter((s) => s !== skillName);
    const updated = { ...profile, skills: updatedSkills };
    setProfile(updated);
    recalculateQuickReadiness(updatedSkills, profile?.target_role || "Data Analyst");
  };

  // Toggle Roadmap Task
  const handleToggleRoadmapTask = (stepIndex: number, taskId: string) => {
    const updatedRoadmap = [...roadmap];
    const step = updatedRoadmap[stepIndex];
    if (step && Array.isArray(step.tasks)) {
      const task = step.tasks.find((t) => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        setRoadmap(updatedRoadmap);
      }
    }
  };

  // AI Career Readiness Analysis API call
  const handleRefreshReadiness = async () => {
    setIsAnalyzingReadiness(true);
    try {
      const res = await fetch("/api/ai/readiness-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, targetRole: profile.target_role }),
      });
      const data = await res.json();
      if (data && typeof data === "object" && typeof data.score === "number") {
        setReadiness({
          ...SAMPLE_READINESS_ANALYSIS,
          ...data,
          criticalSkillGaps: Array.isArray(data.criticalSkillGaps) ? data.criticalSkillGaps : [],
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          recommendedSkills: Array.isArray(data.recommendedSkills) ? data.recommendedSkills : [],
          improvementAreas: Array.isArray(data.improvementAreas) ? data.improvementAreas : [],
        });
      }
    } catch (err) {
      console.warn("Notice: AI readiness analysis skipped:", err);
    } finally {
      setIsAnalyzingReadiness(false);
    }
  };

  // AI Roadmap Regeneration API call
  const handleRegenerateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const res = await fetch("/api/ai/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          targetRole: profile.target_role,
          missingSkills: readiness.criticalSkillGaps,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const validated = data.map((step, idx) => ({
          stepNumber: step.stepNumber || idx + 1,
          title: step.title || `Step ${idx + 1}`,
          description: step.description || "",
          estimatedWeeks: step.estimatedWeeks || "1-2 Weeks",
          tasks: Array.isArray(step.tasks) ? step.tasks : [],
        }));
        setRoadmap(validated);
      }
    } catch (err) {
      console.warn("Notice: Roadmap generation skipped:", err);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // Save Resume
  const handleSaveResume = (updatedResume: ResumeData) => {
    setResume(updatedResume);
  };

  // Handle live resume storage update
  const handleResumeUpdate = (newResume: ResumeMetadata | null) => {
    setFirestoreUserData((prev) => {
      const updated = prev ? { ...prev } : {};
      if (!newResume) {
        delete updated.resumeURL;
        delete updated.resumeFileName;
        delete updated.resumeStoragePath;
        delete updated.resumeFileType;
        delete updated.resumeFileSize;
        delete updated.resumeUploadedAt;
        return updated;
      }
      return {
        ...updated,
        resumeURL: newResume.resumeURL,
        resumeFileName: newResume.resumeFileName,
        resumeStoragePath: newResume.resumeStoragePath,
        resumeFileType: newResume.resumeFileType,
        resumeFileSize: newResume.resumeFileSize,
        resumeUploadedAt: newResume.resumeUploadedAt,
      };
    });
  };

  // Practice Interview Record
  const handleSavePracticeRecord = (record: PracticeRecord) => {
    setPracticeHistory([record, ...practiceHistory]);
  };

  // Update Resume Projects from Portfolio
  const handleUpdateResumeProjects = (newProjects: any[]) => {
    setResume((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        projects: newProjects,
      };
    });
  };

  // Add Roadmap Milestone from Portfolio Recommendation
  const handleAddRoadmapMilestone = (milestone: any) => {
    setCareerRoadmap((prev) => {
      if (!prev) return prev;
      const newStep = {
        id: `step_${Date.now()}`,
        stepNumber: (prev.timeline?.length || 0) + 1,
        title: milestone.title,
        description: milestone.description,
        skillsToAcquire: milestone.skills || [],
        estimatedDuration: milestone.deadline || "3 weeks",
        learningResources: [],
        status: "pending" as const,
      };
      return {
        ...prev,
        timeline: [...(prev.timeline || []), newStep],
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Toggle Save Job with Firestore sync
  const handleToggleSaveJob = (jobId: string) => {
    setJobs((prevJobs) => {
      const updated = prevJobs.map((j) => {
        if (j.id === jobId) {
          const nextSaved = !j.saved;
          const updatedJob = { ...j, saved: nextSaved };
          if (currentUser?.uid) {
            if (nextSaved) {
              saveJobToFirestore(currentUser.uid, updatedJob).catch((e) =>
                console.warn("Notice saving job to Firestore:", e)
              );
            } else {
              removeSavedJobFromFirestore(currentUser.uid, jobId).catch((e) =>
                console.warn("Notice removing saved job from Firestore:", e)
              );
            }
          }
          return updatedJob;
        }
        return j;
      });
      return updated;
    });
  };

  // AI Job Recommendations Generation & Refresh
  const handleRefreshJobRecommendations = async () => {
    setIsRefreshingJobRecs(true);
    try {
      let latestGap = null;
      if (currentUser?.uid) {
        latestGap = await getLatestSkillGapAnalysis(currentUser.uid).catch(() => null);
      }

      const res = await fetch("/api/ai/recommend-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: profile?.target_role || "Data Analyst",
          skills: profile?.skills || [],
          industry: profile?.industry || "Technology",
          experienceLevel: profile?.experience_level || "Fresher",
          location: profile?.location || "Bengaluru",
          resumeInfo: firestoreUserData?.resumeURL ? {
            resumeFileName: firestoreUserData.resumeFileName,
            resumeFileType: firestoreUserData.resumeFileType,
          } : null,
          skillGapAnalysis: latestGap,
        }),
      });
      const data = await res.json();
      if (data && Array.isArray(data.jobs) && data.jobs.length > 0) {
        const currentlySavedIds = new Set(jobs.filter((j) => j.saved).map((j) => j.id));
        const mergedJobs: JobListing[] = data.jobs.map((j: JobListing) => ({
          ...j,
          saved: currentlySavedIds.has(j.id),
        }));
        setJobs(mergedJobs);

        if (currentUser?.uid) {
          await saveJobRecommendations(currentUser.uid, {
            userId: currentUser.uid,
            targetRole: data.targetRole || profile?.target_role || "Data Analyst",
            generatedAt: data.generatedAt || new Date().toISOString(),
            isLive: Boolean(data.isLive),
            isDemo: Boolean(data.isDemo),
            attribution: data.attribution,
            attributionUrl: data.attributionUrl,
            jobs: mergedJobs,
          });
        }
      }
    } catch (err) {
      console.warn("Notice: Refreshing job recommendations skipped:", err);
    } finally {
      setIsRefreshingJobRecs(false);
    }
  };

  // Apply to Job
  const handleApplyJob = (jobId: string) => {
    setJobs(
      jobs.map((j) => (j.id === jobId ? { ...j, applied: true } : j))
    );
  };

  // Save Profile from Onboarding
  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    recalculateQuickReadiness(updatedProfile.skills, updatedProfile.target_role);
  };

  // Complete Full Onboarding & Sync with Dashboard & Cloud
  const handleOnboardingComplete = (onboardingData: UserOnboardingData) => {
    setIsProfileCompleted(true);
    setIsEditingFullProfile(false);

    // Update comprehensive profile
    const updatedProfile: UserProfile = {
      ...profile,
      full_name: onboardingData.name,
      email: onboardingData.email,
      avatar_url: onboardingData.profilePhoto || profile.avatar_url,
      education: {
        college: onboardingData.college,
        degree: onboardingData.degree,
        branch: onboardingData.branch,
        graduation_year: onboardingData.graduationYear,
        cgpa: onboardingData.cgpa || profile.education?.cgpa || "8.2/10",
      },
      skills: onboardingData.skills,
      interests: onboardingData.programmingLanguages || profile.interests,
      target_role: onboardingData.preferredJobRole,
      experience_level: (onboardingData.experienceLevel || profile.experience_level) as any,
      onboarding_completed: true,
    };
    setProfile(updatedProfile);
    recalculateQuickReadiness(updatedProfile.skills, updatedProfile.target_role);

    // Update Resume info with user's verified onboarding profile data
    setResume((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        fullName: onboardingData.name,
        email: onboardingData.email,
        phone: onboardingData.phone || prev.personalInfo.phone,
        location: onboardingData.location || onboardingData.preferredLocation || prev.personalInfo.location,
        linkedin: onboardingData.linkedinUrl || prev.personalInfo.linkedin,
        github: onboardingData.githubUrl || prev.personalInfo.github,
        portfolio: onboardingData.portfolioUrl || prev.personalInfo.portfolio,
      },
      summary: onboardingData.bio || prev.summary,
      education: [
        {
          institution: onboardingData.college,
          degree: `${onboardingData.degree} in ${onboardingData.branch}`,
          year: onboardingData.graduationYear,
          score: onboardingData.cgpa ? `CGPA ${onboardingData.cgpa}` : "CGPA 8.0/10",
        },
      ],
      skills: onboardingData.skills,
    }));

    // Update cached Firestore state
    setFirestoreUserData((prev) => ({
      ...prev,
      ...onboardingData,
      profileCompleted: true,
    }));

    setActiveTab("dashboard");
  };

  // Calculate Roadmap Progress
  const allTasks = (roadmap || []).flatMap((s) => s?.tasks || []);
  const completedTasks = allTasks.filter((t) => t?.completed);
  const roadmapProgress = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

  // Public Portfolio direct link access
  if (publicPortfolioSlug) {
    return (
      <PublicPortfolioPage
        publicId={publicPortfolioSlug}
        onExitToApp={() => {
          setPublicPortfolioSlug(null);
          const newUrl = window.location.pathname;
          window.history.pushState({}, '', newUrl);
        }}
      />
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-stone-700 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-[#C85A32] border-t-transparent animate-spin" />
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
            <span>Connecting JobPlanner workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // 1. Not authenticated & not in guest mode -> Show modern, professional Login / Sign Up Page
  if (!currentUser && !isGuestMode) {
    return (
      <LoginPage
        onSuccess={(user) => {
          setIsAuthLoading(true);
          setCurrentUser(user);
        }}
        onExploreGuest={() => {
          setIsGuestMode(true);
          setIsProfileCompleted(true);
        }}
      />
    );
  }

  // 2. Authenticated but profile not completed (or user is editing full profile)
  if ((currentUser && !isProfileCompleted && !isGuestMode) || isEditingFullProfile) {
    return (
      <OnboardingPage
        key={currentUser?.uid || "onboarding"}
        currentUser={currentUser || ({} as any)}
        initialData={firestoreUserData}
        onComplete={handleOnboardingComplete}
        onCancel={isEditingFullProfile ? () => setIsEditingFullProfile(false) : undefined}
        isEditing={isEditingFullProfile}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans selection:bg-[#F2D7CC] selection:text-[#7A2C10]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        currentUser={currentUser}
        onOpenOnboarding={() => setIsEditingFullProfile(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseOpen(true)}
        isSupabaseActive={isSupabaseConfigured()}
        isFirebaseSynced={isFirebaseSynced}
        onRoleChange={handleRoleChange}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === "dashboard" && (
          <DashboardView
            profile={profile}
            readiness={readiness}
            roadmap={roadmap}
            roadmapProgress={roadmapProgress}
            careerRoadmap={careerRoadmap}
            careerAnalytics={careerAnalytics}
            jobs={jobs}
            practiceHistory={practiceHistory}
            currentUser={currentUser}
            firestoreUserData={firestoreUserData}
            onUpdateResume={handleResumeUpdate}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenOnboarding={() => setIsEditingFullProfile(true)}
          />
        )}

        {activeTab === "portfolio" && (
          <PortfolioView
            userProfile={profile}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            resumeData={resume}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onUpdateResumeProjects={handleUpdateResumeProjects}
            onAddRoadmapMilestone={handleAddRoadmapMilestone}
          />
        )}

        {activeTab === "analytics" && (
          <CareerAnalyticsView
            profile={profile}
            currentUser={currentUser}
            firestoreUserData={firestoreUserData}
            skillGapAnalysis={readiness}
            resume={resume}
            jobs={jobs}
            practiceHistory={practiceHistory}
            careerRoadmap={careerRoadmap}
            careerAnalytics={careerAnalytics}
            onSaveAnalytics={async (updated) => {
              setCareerAnalytics(updated);
            }}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === "readiness" && (
          <ReadinessView
            profile={profile}
            readiness={readiness}
            onRefreshAnalysis={handleRefreshReadiness}
            isAnalyzing={isAnalyzingReadiness}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
          />
        )}

        {activeTab === "skillgap" && (
          <SkillGapView
            profile={profile}
            currentUser={currentUser}
            firestoreUserData={firestoreUserData}
            onAddSkill={handleAddSkill}
            onRemoveSkill={handleRemoveSkill}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onUpdateResume={handleResumeUpdate}
          />
        )}

        {activeTab === "roadmap" && (
          <RoadmapView
            profile={profile}
            currentUser={currentUser}
            firestoreUserData={firestoreUserData}
            resume={resume}
            jobs={jobs}
            skillGapAnalysis={readiness}
            practiceHistory={practiceHistory}
            careerRoadmap={careerRoadmap}
            onSaveCareerRoadmap={async (updated) => {
              setCareerRoadmap(updated);
            }}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === "resume" && (
          !currentUser ? (
            <div className="rounded-2xl border border-[#EDE7DD] bg-[#FFFFFF] p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-xs animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-[#FBEFE9] text-[#C85A32] flex items-center justify-center mx-auto mb-4 border border-[#F3DACF]">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 font-editorial">
                Please log in or sign up to use the AI Resume Builder.
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                Your ATS-friendly resume versions, formatting, and tailored role keywords are protected and saved automatically to your personal Firebase Cloud account.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F8DDD1]" />
                  <span>Log In or Sign Up</span>
                </button>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E0D7CC] text-stone-700 hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <ResumeBuilderView
              profile={profile}
              initialResume={resume}
              onSaveResume={handleSaveResume}
              targetRole={profile.target_role}
              currentUser={currentUser}
              firestoreUserData={firestoreUserData}
              onUpdateResume={handleResumeUpdate}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              jobs={jobs}
            />
          )
        )}

        {activeTab === "interview" && (
          !currentUser ? (
            <div className="rounded-2xl border border-[#EDE7DD] bg-[#FFFFFF] p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-xs animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-[#FBEFE9] text-[#C85A32] flex items-center justify-center mx-auto mb-4 border border-[#F3DACF]">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 font-editorial">
                Sign In to Access AI Mock Interviews
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                Practice realistic technical and HR interview scenarios and keep your evaluations and question history synced to Firebase.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F8DDD1]" />
                  <span>Sign In with Google or Email</span>
                </button>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E0D7CC] text-stone-700 hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer"
                >
                  Back to Overview
                </button>
              </div>
            </div>
          ) : (
            <InterviewPrepView
              profile={profile}
              currentUser={currentUser}
              firestoreUserData={firestoreUserData}
              resume={resume}
              jobs={jobs}
              skillGapAnalysis={readiness}
              onNavigate={(tab) => setActiveTab(tab)}
              practiceHistory={practiceHistory}
              onSavePractice={handleSavePracticeRecord}
            />
          )
        )}

        {activeTab === "assistant" && (
          <CareerAssistantView
            profile={profile}
            currentUser={currentUser}
            firestoreUserData={firestoreUserData}
            resume={resume}
            jobs={jobs}
            skillGapAnalysis={readiness}
            onNavigate={(tab) => setActiveTab(tab)}
            practiceHistory={practiceHistory}
          />
        )}

        {activeTab === "jobs" && (
          <JobRecommendationsView
            profile={profile}
            jobs={jobs}
            onToggleSaveJob={handleToggleSaveJob}
            onApplyJob={handleApplyJob}
            onNavigate={(tab) => setActiveTab(tab)}
            currentUser={currentUser}
            firestoreUserData={firestoreUserData}
            onRefreshRecommendations={handleRefreshJobRecommendations}
            isRefreshing={isRefreshingJobRecs}
          />
        )}

        {activeTab === "applications" && (
          <JobApplicationsView
            profile={profile}
            currentUser={currentUser}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            jobs={jobs}
            resume={resume}
            careerReadinessScore={readiness?.overallScore}
          />
        )}
      </main>

      {/* Persistent Bottom / Footer */}
      <footer className="no-print mt-auto border-t border-[#E7E2DA] bg-[#FAF8F5] py-7 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/assets/jobplanner-logo.svg"
              alt="JobPlanner Logo"
              className="w-5 h-5 object-contain rounded-md"
            />
            <span className="font-bold text-stone-900 font-editorial text-sm">JobPlanner</span>
            <span>—</span>
            <span>Made with care for students, freshers, and young job seekers.</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-stone-700 hover:text-stone-900 flex items-center gap-1"
            >
              <span>Firebase Cloud</span>
              {currentUser && <span className="w-1.5 h-1.5 rounded-full bg-[#3D7A4A]" />}
            </button>
            <span>•</span>
            <button
              onClick={() => setIsEditingFullProfile(true)}
              className="text-stone-600 hover:text-stone-900"
            >
              Update Profile
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <FirebaseAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        profile={profile}
        readiness={readiness}
        roadmap={roadmap}
        resume={resume}
        practiceHistory={practiceHistory}
        subscriptionPlan={subscriptionPlan}
        onAuthSuccess={async (user) => {
          setCurrentUser(user);
          setIsFirebaseSynced(true);
          try {
            const cloudData = await ensureUserDocumentExists(user, {
              profile,
              readiness,
              roadmap,
              resume,
              practiceHistory,
              subscriptionPlan,
            });
            if (cloudData) {
              setFirestoreUserData(cloudData);
              const isCompleted = Boolean(
                cloudData.profileCompleted || cloudData.profile?.onboarding_completed
              );
              setIsProfileCompleted(isCompleted);

              if (cloudData.profile) setProfile(cloudData.profile);
              if (cloudData.readiness) setReadiness(cloudData.readiness);
              if (cloudData.roadmap && cloudData.roadmap.length > 0) setRoadmap(cloudData.roadmap);
              if (cloudData.resume) setResume(cloudData.resume);
              if (cloudData.practiceHistory) setPracticeHistory(cloudData.practiceHistory);
              if (cloudData.subscriptionPlan) setSubscriptionPlan(cloudData.subscriptionPlan);
            }
          } catch (e) {
            console.warn("Hydration error:", e);
          }
        }}
        onSignOut={async () => {
          setIsAuthModalOpen(false);
          await handleLogout();
        }}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        currentProfile={profile}
        onSaveProfile={handleSaveProfile}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
        currentUserEmail={profile.email}
        onAuthSuccess={(email) => setProfile((prev) => ({ ...prev, email }))}
      />
    </div>
  );
}
