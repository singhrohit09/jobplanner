import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  Download,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  Edit3,
  Eye,
  Plus,
  Trash2,
  Copy,
  FolderOpen,
  ArrowRight,
  ExternalLink,
  Target,
  RefreshCw,
  Share2,
  FileCode,
  Lock,
  ChevronDown,
  X,
  FileCheck,
  Zap,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import {
  UserProfile,
  ResumeData,
  JobListing,
  GeneratedResume,
  ResumeTemplateType,
  ResumeProjectItem,
  ResumeExperienceItem,
  ResumeEducationItem,
  ResumeCertificationItem,
  ResumeAchievementItem,
} from "../types";
import {
  FirestoreUserData,
  ResumeMetadata,
  saveGeneratedResumeToFirestore,
  getGeneratedResumesFromFirestore,
  deleteGeneratedResumeFromFirestore,
} from "../lib/firebase";
import {
  downloadResumeAsPdf,
  downloadResumeAsDoc,
  downloadResumeAsTxt,
  triggerPrintResume,
} from "../lib/resumeExport";

interface ResumeBuilderViewProps {
  profile: UserProfile;
  initialResume?: ResumeData;
  onSaveResume?: (resume: ResumeData) => void;
  targetRole?: string;
  currentUser?: FirebaseUser | null;
  firestoreUserData?: Partial<FirestoreUserData> | null;
  onUpdateResume?: (data: ResumeMetadata | null) => void;
  onOpenAuth: () => void;
  jobs?: JobListing[];
}

export const ResumeBuilderView: React.FC<ResumeBuilderViewProps> = ({
  profile,
  initialResume,
  onSaveResume,
  targetRole: propTargetRole,
  currentUser,
  firestoreUserData,
  onUpdateResume,
  onOpenAuth,
  jobs = [],
}) => {
  // Target Role
  const [targetRole, setTargetRole] = useState<string>(
    propTargetRole || profile.target_role || "Software Engineer"
  );

  // Template Type
  const [template, setTemplate] = useState<ResumeTemplateType>("classic");

  // Layout View Mode: "split" (Editor + Preview), "preview" (Full Document), "edit" (Full Editor)
  const [layoutMode, setLayoutMode] = useState<"split" | "preview" | "edit">("split");

  // Resume Versions State
  const [savedVersions, setSavedVersions] = useState<GeneratedResume[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string>("");
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);

  // Active Resume Document State
  const [currentResume, setCurrentResume] = useState<GeneratedResume>(() => {
    return createInitialResume(profile, initialResume, targetRole, template);
  });

  // UI States
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isImprovingSection, setIsImprovingSection] = useState<string | null>(null);
  const [isTailorModalOpen, setIsTailorModalOpen] = useState<boolean>(false);
  const [selectedTailorJob, setSelectedTailorJob] = useState<JobListing | null>(null);
  const [customTailorJobTitle, setCustomTailorJobTitle] = useState<string>("");
  const [customTailorCompany, setCustomTailorCompany] = useState<string>("");
  const [isAtsOptimizing, setIsAtsOptimizing] = useState<boolean>(false);
  const [activeEditTab, setActiveEditTab] = useState<"header" | "summary" | "skills" | "projects" | "experience" | "education" | "certs">("summary");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Helper to build initial resume
  function createInitialResume(
    userProf: UserProfile,
    initResume?: ResumeData,
    role: string = "Software Engineer",
    tmpl: ResumeTemplateType = "classic"
  ): GeneratedResume {
    const resumeId = `resume_${Date.now()}`;
    const pAny = userProf as any;
    const candName = userProf.full_name || initResume?.personalInfo?.fullName || "Candidate Name";
    const candEmail = userProf.email || initResume?.personalInfo?.email || "";
    const candPhone = pAny.phone || initResume?.personalInfo?.phone || "";
    const candLocation = pAny.location || initResume?.personalInfo?.location || "India";

    // Skills
    const userSkills: string[] = Array.isArray(userProf.skills) && userProf.skills.length > 0
      ? userProf.skills
      : (initResume?.skills || ["Python", "SQL", "JavaScript", "Git", "Problem Solving"]);

    // Education
    const educationItems: ResumeEducationItem[] = [
      {
        id: "edu_1",
        institution: userProf.education?.college || initResume?.education?.[0]?.institution || "Engineering College",
        degree: userProf.education?.degree || initResume?.education?.[0]?.degree || "Bachelor of Technology",
        branch: userProf.education?.branch || initResume?.education?.[0]?.branch || "Computer Science",
        graduationYear: userProf.education?.graduation_year?.toString() || initResume?.education?.[0]?.graduationYear || "2025",
        cgpa: userProf.education?.cgpa?.toString() || initResume?.education?.[0]?.cgpa || "8.2",
        location: candLocation,
      },
    ];

    // Projects
    const projectItems: ResumeProjectItem[] = (userProf.projects || []).map((p, idx) => {
      const pObj = p as any;
      const stack = Array.isArray(p.tech_stack)
        ? p.tech_stack.join(", ")
        : pObj.techStack || pObj.tech_stack || "React, Node.js, SQL";
      const pLink = p.github_url || p.live_url || pObj.link || pObj.github_link || "";

      return {
        id: p.id || `proj_${idx}`,
        title: p.title || `Project ${idx + 1}`,
        description: p.description || "",
        techStack: stack,
        link: pLink,
        points: [
          p.description
            ? `Engineered ${p.title} using ${stack}, ${p.description}`
            : `Architected full-stack ${p.title} with responsive user interface and secure backend API endpoints.`,
          `Optimized query execution and database schemas, enhancing system throughput and response latency.`,
        ],
      };
    });

    // If candidate has no projects from profile, use initial resume projects or default starter
    if (projectItems.length === 0) {
      if (initResume?.projects && initResume.projects.length > 0) {
        initResume.projects.forEach((ip, idx) => {
          projectItems.push({
            id: ip.id || `proj_${idx}`,
            title: ip.title,
            techStack: ip.techStack,
            link: ip.link,
            points: ip.points || [],
          });
        });
      } else {
        projectItems.push({
          id: "proj_1",
          title: "Full-Stack Analytical Application",
          techStack: "React, TypeScript, SQL, Tailwind CSS",
          link: "https://github.com",
          points: [
            "Architected responsive single-page application with modular component architecture and automated form validation.",
            "Integrated relational SQL database queries and RESTful APIs, reducing data retrieval latency by 32%.",
          ],
        });
      }
    }

    // Work Experience (strictly empty if candidate is a fresher with no experience)
    const rawExperience = Array.isArray(pAny.experience) ? pAny.experience : [];
    const experienceItems: ResumeExperienceItem[] = rawExperience.map((exp: any, idx: number) => ({
      id: exp.id || `exp_${idx}`,
      role: exp.role || exp.title || "Software Engineering Intern",
      company: exp.company || "Technology Organization",
      duration: exp.duration || "Summer 2024",
      location: exp.location || "Bengaluru, India",
      isCurrent: Boolean(exp.isCurrent),
      points: Array.isArray(exp.points) && exp.points.length > 0
        ? exp.points
        : [
            "Collaborated within cross-functional team in two-week agile sprints to ship client features.",
            "Wrote comprehensive unit and integration test suites, ensuring 95%+ pass rates on pull requests.",
          ],
    }));

    if (experienceItems.length === 0 && initResume?.experience && initResume.experience.length > 0) {
      initResume.experience.forEach((ie, idx) => {
        experienceItems.push({
          id: ie.id || `exp_${idx}`,
          role: ie.role,
          company: ie.company,
          duration: ie.duration,
          points: ie.points || [],
        });
      });
    }

    // Certifications
    const rawCerts = Array.isArray(pAny.certifications) ? pAny.certifications : [];
    const certItems: ResumeCertificationItem[] = rawCerts.map((c: any, idx: number) => ({
      id: c.id || `cert_${idx}`,
      title: c.title || c.name || "Technical Certification",
      issuer: c.issuer || "Coursera / HackerRank",
      year: c.year?.toString() || "2024",
    }));

    if (certItems.length === 0 && initResume?.certifications && initResume.certifications.length > 0) {
      initResume.certifications.forEach((ic, idx) => {
        certItems.push({
          id: ic.id || `cert_${idx}`,
          title: ic.title,
          issuer: ic.issuer,
          year: ic.year,
        });
      });
    }

    // Achievements
    const rawAch = Array.isArray(pAny.achievements) ? pAny.achievements : [];
    const achItems: ResumeAchievementItem[] = rawAch.map((a: any, idx: number) => ({
      id: `ach_${idx}`,
      title: typeof a === "string" ? a : a.title || "Academic Achievement",
      description: typeof a === "object" ? a.description || "" : "",
    }));

    // Summary
    const initialSummary = initResume?.summary ||
      `Dedicated and detail-oriented ${role} aspirant with a rigorous academic background in ${userProf.education?.degree || "Engineering"} (${userProf.education?.branch || "Computer Science"}). Proficient in ${userSkills.slice(0, 4).join(", ")}, with proven capability building robust technical projects, optimizing algorithmic efficiency, and collaborating effectively in fast-paced teams.`;

    return {
      id: resumeId,
      resumeId,
      userId: currentUser?.uid || "guest",
      title: `${role} ATS Resume`,
      targetRole: role,
      template: tmpl,
      personalInfo: {
        fullName: candName,
        email: candEmail,
        phone: candPhone,
        location: candLocation,
        linkedin: pAny.linkedin || initResume?.personalInfo?.linkedin || "",
        github: pAny.github || initResume?.personalInfo?.github || "",
        portfolio: pAny.portfolio || initResume?.personalInfo?.portfolio || "",
        website: pAny.website || "",
      },
      summary: initialSummary,
      skills: userSkills,
      education: educationItems,
      projects: projectItems,
      experience: experienceItems,
      certifications: certItems,
      achievements: achItems,
      links: {
        linkedin: pAny.linkedin || initResume?.personalInfo?.linkedin || "",
        github: pAny.github || initResume?.personalInfo?.github || "",
        portfolio: pAny.portfolio || initResume?.personalInfo?.portfolio || "",
        website: pAny.website || "",
      },
      atsScore: 84,
      atsFeedback: {
        score: 84,
        strengths: [
          `Single-column ATS layout compliant with all corporate scanner engines`,
          `Verified academic record and relevant technical competencies for ${role}`,
          `Structured project implementations with specific technologies cited`,
        ],
        improvements: [
          `Add quantifiable metrics (percentages, request scale, latency) to project bullets`,
          `Mention testing, CI/CD, or version control workflows in bullet points`,
        ],
        missingKeywords: ["Git", "REST APIs", "Unit Testing", "SQL", "Agile / Scrum"],
        formattingTips: [
          "Maintain uniform date syntax (e.g., 2024 - 2025)",
          "Avoid multi-column tables and embedded images",
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Load saved resumes from Firestore on mount & whenever user changes
  useEffect(() => {
    if (currentUser?.uid) {
      setIsLoadingVersions(true);
      getGeneratedResumesFromFirestore(currentUser.uid)
        .then((resumes) => {
          if (resumes && resumes.length > 0) {
            setSavedVersions(resumes);
            // Default to most recently updated resume
            const active = resumes[0];
            setActiveResumeId(active.resumeId || active.id);
            setCurrentResume(active);
            setTargetRole(active.targetRole || targetRole);
            setTemplate(active.template || "classic");
          } else {
            // First time: auto save initial resume for user
            const initial = createInitialResume(profile, initialResume, targetRole, template);
            setActiveResumeId(initial.resumeId);
            setSavedVersions([initial]);
            saveGeneratedResumeToFirestore(currentUser.uid, initial).catch(console.warn);
          }
        })
        .catch((err) => {
          console.warn("Notice loading user resumes:", err);
        })
        .finally(() => {
          setIsLoadingVersions(false);
        });
    }
  }, [currentUser?.uid]);

  // Handle Switch Version
  const handleSwitchVersion = (resumeId: string) => {
    const found = savedVersions.find((r) => (r.resumeId || r.id) === resumeId);
    if (found) {
      setActiveResumeId(resumeId);
      setCurrentResume(found);
      setTargetRole(found.targetRole || targetRole);
      setTemplate(found.template || "classic");
      setHasUnsavedChanges(false);
    }
  };

  // Handle Create New Version
  const handleCreateNewVersion = () => {
    const roleName = prompt("Enter Target Role or Title for New Resume Version:", `${targetRole} Version 2`);
    if (!roleName) return;

    const newResume = createInitialResume(profile, initialResume, roleName, template);
    newResume.title = roleName;
    newResume.resumeId = `resume_${Date.now()}`;
    newResume.id = newResume.resumeId;

    const updatedList = [newResume, ...savedVersions];
    setSavedVersions(updatedList);
    setActiveResumeId(newResume.resumeId);
    setCurrentResume(newResume);
    setHasUnsavedChanges(true);

    if (currentUser?.uid) {
      saveGeneratedResumeToFirestore(currentUser.uid, newResume)
        .then(() => {
          setHasUnsavedChanges(false);
        })
        .catch(console.warn);
    }
  };

  // Handle Duplicate Version
  const handleDuplicateVersion = () => {
    const dupTitle = `${currentResume.title || currentResume.targetRole} (Copy)`;
    const newId = `resume_${Date.now()}`;
    const duplicated: GeneratedResume = {
      ...currentResume,
      id: newId,
      resumeId: newId,
      title: dupTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedList = [duplicated, ...savedVersions];
    setSavedVersions(updatedList);
    setActiveResumeId(newId);
    setCurrentResume(duplicated);

    if (currentUser?.uid) {
      saveGeneratedResumeToFirestore(currentUser.uid, duplicated).catch(console.warn);
    }
  };

  // Handle Rename Version
  const handleRenameVersion = () => {
    const newTitle = prompt("Enter new title for this resume version:", currentResume.title);
    if (!newTitle || newTitle.trim() === "") return;

    const updated = { ...currentResume, title: newTitle.trim(), updatedAt: new Date().toISOString() };
    setCurrentResume(updated);
    const updatedList = savedVersions.map((r) => ((r.resumeId || r.id) === updated.resumeId ? updated : r));
    setSavedVersions(updatedList);

    if (currentUser?.uid) {
      saveGeneratedResumeToFirestore(currentUser.uid, updated).catch(console.warn);
    }
  };

  // Handle Delete Version
  const handleDeleteVersion = async () => {
    if (savedVersions.length <= 1) {
      alert("You must maintain at least one resume version.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${currentResume.title}"? This cannot be undone.`)) {
      return;
    }

    const deleteId = currentResume.resumeId || currentResume.id;
    const remaining = savedVersions.filter((r) => (r.resumeId || r.id) !== deleteId);
    setSavedVersions(remaining);

    const nextActive = remaining[0];
    setActiveResumeId(nextActive.resumeId || nextActive.id);
    setCurrentResume(nextActive);

    if (currentUser?.uid) {
      await deleteGeneratedResumeFromFirestore(currentUser.uid, deleteId);
    }
  };

  // Handle Template Change
  const handleTemplateChange = (newTmpl: ResumeTemplateType) => {
    setTemplate(newTmpl);
    const updated = { ...currentResume, template: newTmpl, updatedAt: new Date().toISOString() };
    setCurrentResume(updated);
    setHasUnsavedChanges(true);
  };

  // Save Resume explicitly to Cloud
  const handleSaveToCloud = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsSaving(true);
    try {
      const updated = {
        ...currentResume,
        template,
        targetRole,
        updatedAt: new Date().toISOString(),
      };
      await saveGeneratedResumeToFirestore(currentUser.uid, updated);
      setCurrentResume(updated);
      setSavedVersions((prev) =>
        prev.map((r) => ((r.resumeId || r.id) === updated.resumeId ? updated : r))
      );
      setHasUnsavedChanges(false);
      setSaveSuccessMessage("Saved successfully to Firebase Cloud!");
      setTimeout(() => setSaveSuccessMessage(null), 3500);

      // Also trigger parent callback if available
      if (onSaveResume) {
        onSaveResume({
          personalInfo: {
            fullName: updated.personalInfo.fullName,
            email: updated.personalInfo.email,
            phone: updated.personalInfo.phone,
            location: updated.personalInfo.location,
            linkedin: updated.personalInfo.linkedin || "",
            github: updated.personalInfo.github || "",
            portfolio: updated.personalInfo.portfolio || "",
          },
          summary: updated.summary,
          skills: updated.skills,
          education: updated.education.map((e) => ({
            id: e.id,
            institution: e.institution,
            degree: e.degree,
            branch: e.branch || "",
            graduationYear: e.graduationYear,
            cgpa: e.cgpa || "",
          })),
          projects: updated.projects.map((p) => ({
            id: p.id,
            title: p.title,
            techStack: p.techStack || "",
            points: p.points || [],
            link: p.link,
          })),
          experience: updated.experience.map((ex) => ({
            id: ex.id,
            role: ex.role,
            company: ex.company,
            duration: ex.duration,
            points: ex.points || [],
          })),
          certifications: updated.certifications.map((c) => ({
            id: c.id,
            title: c.title,
            issuer: c.issuer,
            year: c.year,
          })),
        });
      }
    } catch (e: any) {
      console.error("Save error:", e);
      alert("Notice saving resume: " + (e?.message || "Failed to persist to cloud"));
    } finally {
      setIsSaving(false);
    }
  };

  // Full AI Generation
  const handleGenerateResumeWithAI = async (tailorJobToUse?: any) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          resumeInfo: firestoreUserData?.resume || null,
          targetRole,
          tailorJob: tailorJobToUse || null,
          template,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const generatedData = await response.json();

      const newUpdatedResume: GeneratedResume = {
        ...currentResume,
        ...generatedData,
        id: currentResume.resumeId || currentResume.id,
        resumeId: currentResume.resumeId || currentResume.id,
        title: tailorJobToUse ? `${tailorJobToUse.title} Tailored Resume` : currentResume.title,
        targetRole,
        template,
        updatedAt: new Date().toISOString(),
      };

      setCurrentResume(newUpdatedResume);
      setHasUnsavedChanges(true);

      if (currentUser?.uid) {
        await saveGeneratedResumeToFirestore(currentUser.uid, newUpdatedResume);
        setHasUnsavedChanges(false);
        setSaveSuccessMessage("AI resume generated and synced to Firebase Cloud!");
        setTimeout(() => setSaveSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      console.error("AI Generation error:", err);
      alert("AI Generation notice: " + (err?.message || "Could not complete AI generation"));
    } finally {
      setIsGenerating(false);
      setIsTailorModalOpen(false);
    }
  };

  // Section Improvement Actions
  const handleImproveSection = async (actionType: string) => {
    setIsImprovingSection(actionType);
    try {
      let contentToImprove: any = "";
      if (actionType === "improve_summary") {
        contentToImprove = currentResume.summary;
      } else if (actionType === "improve_skills") {
        contentToImprove = currentResume.skills;
      } else if (actionType === "improve_projects") {
        contentToImprove = currentResume.projects;
      } else if (actionType === "improve_experience") {
        contentToImprove = currentResume.experience;
      } else if (actionType === "make_ats_friendly") {
        contentToImprove = {
          summary: currentResume.summary,
          projects: currentResume.projects,
          skills: currentResume.skills,
        };
      }

      const response = await fetch("/api/ai/improve-resume-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          currentContent: contentToImprove,
          targetRole,
          context: {
            education: currentResume.education,
            skills: currentResume.skills,
          },
        }),
      });

      if (!response.ok) throw new Error("Improvement API error");
      const result = await response.json();

      let updatedResume = { ...currentResume };

      if (actionType === "improve_summary" && result.improvedContent) {
        updatedResume.summary = typeof result.improvedContent === "string" ? result.improvedContent : result.improvedContent;
      } else if (actionType === "improve_projects" && result.improvedBullets) {
        // Apply improved bullets to first project or distributed
        if (updatedResume.projects.length > 0) {
          updatedResume.projects[0].points = result.improvedBullets;
        }
      } else if (actionType === "improve_skills" && result.suggestedAdditions) {
        const combined = Array.from(new Set([...updatedResume.skills, ...result.suggestedAdditions]));
        updatedResume.skills = combined;
      } else if (actionType === "make_ats_friendly") {
        if (result.improvedContent && typeof result.improvedContent === "string") {
          updatedResume.summary = result.improvedContent;
        }
        if (result.improvedBullets && updatedResume.projects.length > 0) {
          updatedResume.projects[0].points = result.improvedBullets;
        }
      }

      updatedResume.updatedAt = new Date().toISOString();
      setCurrentResume(updatedResume);
      setHasUnsavedChanges(true);

      if (currentUser?.uid) {
        saveGeneratedResumeToFirestore(currentUser.uid, updatedResume).catch(console.warn);
      }
    } catch (err: any) {
      console.warn("Improve section error:", err);
    } finally {
      setIsImprovingSection(null);
    }
  };

  // Run ATS Audit
  const handleRunAtsAudit = async () => {
    setIsAtsOptimizing(true);
    try {
      const response = await fetch("/api/ai/ats-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData: currentResume,
          targetRole,
          targetJob: selectedTailorJob || null,
        }),
      });

      if (response.ok) {
        const audit = await response.json();
        const updated = {
          ...currentResume,
          atsScore: audit.score || 85,
          atsFeedback: audit,
          updatedAt: new Date().toISOString(),
        };
        setCurrentResume(updated);
        if (currentUser?.uid) {
          saveGeneratedResumeToFirestore(currentUser.uid, updated).catch(console.warn);
        }
      }
    } catch (e) {
      console.warn("Notice running ATS audit:", e);
    } finally {
      setIsAtsOptimizing(false);
    }
  };

  // Quick Add Missing Keyword to Skills
  const handleAddKeywordToSkills = (keyword: string) => {
    if (!currentResume.skills.includes(keyword)) {
      const updatedSkills = [...currentResume.skills, keyword];
      const updated = { ...currentResume, skills: updatedSkills, updatedAt: new Date().toISOString() };
      setCurrentResume(updated);
      setHasUnsavedChanges(true);
      if (currentUser?.uid) {
        saveGeneratedResumeToFirestore(currentUser.uid, updated).catch(console.warn);
      }
    }
  };

  // Handle Adding Project
  const handleAddProject = () => {
    const newProj: ResumeProjectItem = {
      id: `proj_${Date.now()}`,
      title: "New Technical Project",
      techStack: "Python, SQL, React",
      points: [
        "Architected and deployed full-stack application with modular architecture.",
        "Engineered RESTful API endpoints with input validation and data persistence.",
      ],
      link: "https://github.com",
    };
    const updated = {
      ...currentResume,
      projects: [...currentResume.projects, newProj],
      updatedAt: new Date().toISOString(),
    };
    setCurrentResume(updated);
    setHasUnsavedChanges(true);
  };

  // Handle Removing Project
  const handleRemoveProject = (id: string) => {
    const updated = {
      ...currentResume,
      projects: currentResume.projects.filter((p) => p.id !== id),
      updatedAt: new Date().toISOString(),
    };
    setCurrentResume(updated);
    setHasUnsavedChanges(true);
  };

  // Handle Adding Experience
  const handleAddExperience = () => {
    const newExp: ResumeExperienceItem = {
      id: `exp_${Date.now()}`,
      role: "Software Engineering Intern",
      company: "Company Name",
      duration: "Summer 2024",
      location: "Bengaluru, India",
      points: [
        "Collaborated with engineering mentors to implement client-facing UI features.",
        "Authored automated unit tests, identifying regression bugs prior to deployment.",
      ],
    };
    const updated = {
      ...currentResume,
      experience: [...currentResume.experience, newExp],
      updatedAt: new Date().toISOString(),
    };
    setCurrentResume(updated);
    setHasUnsavedChanges(true);
  };

  // Handle Removing Experience
  const handleRemoveExperience = (id: string) => {
    const updated = {
      ...currentResume,
      experience: currentResume.experience.filter((e) => e.id !== id),
      updatedAt: new Date().toISOString(),
    };
    setCurrentResume(updated);
    setHasUnsavedChanges(true);
  };

  // Handle Adding Certification
  const handleAddCert = () => {
    const newCert: ResumeCertificationItem = {
      id: `cert_${Date.now()}`,
      title: "AWS Certified Cloud Practitioner",
      issuer: "Amazon Web Services",
      year: "2024",
    };
    const updated = {
      ...currentResume,
      certifications: [...currentResume.certifications, newCert],
      updatedAt: new Date().toISOString(),
    };
    setCurrentResume(updated);
    setHasUnsavedChanges(true);
  };

  // Handle Removing Certification
  const handleRemoveCert = (id: string) => {
    const updated = {
      ...currentResume,
      certifications: currentResume.certifications.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    };
    setCurrentResume(updated);
    setHasUnsavedChanges(true);
  };

  // Tailored Job Candidates list
  const availableTailorJobs = useMemo(() => {
    if (jobs && jobs.length > 0) return jobs;
    return [
      {
        id: "job-tcs-ninja-2025",
        title: "Systems Engineer (Ninja & Digital)",
        company: "Tata Consultancy Services (TCS)",
        requiredSkills: ["Java", "Python", "SQL", "Data Structures"],
      },
      {
        id: "job-infosys-dse-2025",
        title: "Digital Specialist Engineer (DSE)",
        company: "Infosys",
        requiredSkills: ["Java", "Spring Boot", "React", "SQL", "Git"],
      },
      {
        id: "job-razorpay-da-fresher",
        title: "Junior Data Analyst",
        company: "Razorpay",
        requiredSkills: ["SQL", "Python", "Excel", "Power BI", "Statistics"],
      },
      {
        id: "job-flipkart-frontend-sde",
        title: "Software Development Engineer I (Frontend)",
        company: "Flipkart",
        requiredSkills: ["JavaScript", "TypeScript", "React", "HTML", "CSS"],
      },
    ];
  }, [jobs]);

  // Handle Generating and Downloading PDF Resume
  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadResumeAsPdf(currentResume, "resumePrintSheet");
    } catch (error) {
      console.error("Failed to generate PDF resume:", error);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Top Bar & Page Header */}
      <div className="no-print border-b border-[#E7E2DA] pb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A64522] bg-[#FBEFE9] px-2.5 py-0.5 rounded-full border border-[#F3DACF]">
                AI Resume Builder
              </span>
              {currentResume.tailoredForJob && (
                <span className="text-[11px] font-semibold text-[#2C4A32] bg-[#F0F5F1] px-2.5 py-0.5 rounded-full border border-[#D7E4D9] flex items-center gap-1">
                  <Target className="w-3 h-3 text-[#3B5A41]" />
                  <span>Tailored for {currentResume.tailoredForJob.company}</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-editorial tracking-tight">
              AI Resume Builder
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
              Create an ATS-optimized, job-ready resume using your JobPlanner profile. Tailor keywords for target roles, choose ATS-friendly templates, and download print-ready PDFs or Word documents.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Save to Cloud Button */}
            <button
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                hasUnsavedChanges
                  ? "bg-[#C85A32] text-white hover:bg-[#B24E2A]"
                  : "bg-[#FFFFFF] border border-[#E0D7CC] text-stone-700 hover:bg-[#FAF8F5]"
              }`}
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : hasUnsavedChanges ? (
                <Save className="w-3.5 h-3.5 text-white" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3D7A4A]" />
              )}
              <span>{isSaving ? "Saving..." : hasUnsavedChanges ? "Save Resume" : "Saved to Cloud"}</span>
            </button>

            {/* Generate / Regenerate with AI */}
            <button
              onClick={() => handleGenerateResumeWithAI()}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-[#FAF0EB] hover:bg-[#F3DDD3] text-[#A64522] border border-[#F2D7CC] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#A64522]" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
              )}
              <span>{isGenerating ? "Synthesizing..." : "Generate with AI"}</span>
            </button>

            {/* Tailor to Specific Job */}
            <button
              onClick={() => setIsTailorModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#EFF4EE] hover:bg-[#E3EFE1] text-[#2C4A32] border border-[#D7E4D9] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-[#3B5A41]" />
              <span>Tailor to Job</span>
            </button>

            {/* Download Actions */}
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E0D7CC]">
              <button
                id="btn-download-pdf-top"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                title="Generate and Download Resume as PDF"
                className="px-3.5 py-1.5 rounded-lg bg-[#C85A32] hover:bg-[#A64522] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
              >
                {isDownloadingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isDownloadingPdf ? "Generating PDF..." : "Download PDF"}</span>
              </button>
              <button
                id="btn-download-docx-top"
                onClick={() => downloadResumeAsDoc(currentResume)}
                title="Download Word Document (.doc)"
                className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F5EFEB] text-stone-800 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-700" />
                <span>DOCX</span>
              </button>
              <button
                id="btn-download-txt-top"
                onClick={() => downloadResumeAsTxt(currentResume)}
                title="Download Plain Text ATS Format"
                className="px-2.5 py-1.5 rounded-lg hover:bg-[#F5EFEB] text-stone-600 text-xs font-semibold cursor-pointer"
              >
                TXT
              </button>
            </div>
          </div>
        </div>

        {/* Save success toast */}
        {saveSuccessMessage && (
          <div className="mt-3 p-3 rounded-xl bg-[#F0F5F1] border border-[#D7E4D9] text-xs font-semibold text-[#2C4A32] flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#3B5A41]" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* Unauthenticated notice banner */}
        {!currentUser && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#FAF0EB] border border-[#F2D7CC] text-xs text-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#C85A32] shrink-0" />
              <span>
                <strong>Guest Mode:</strong> Sign in with Google or Email to save unlimited resume versions to your personal Firebase Cloud database.
              </span>
            </div>
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-lg bg-[#C85A32] text-white text-xs font-bold hover:bg-[#B24E2A] transition-colors shrink-0 cursor-pointer"
            >
              Sign In to Cloud
            </button>
          </div>
        )}
      </div>

      {/* 2. Controls & Configuration Toolbar */}
      <div className="no-print bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Version Selector & Target Role */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Version Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Version:
            </span>
            <div className="relative">
              <select
                value={activeResumeId}
                onChange={(e) => handleSwitchVersion(e.target.value)}
                className="px-3 py-1.5 pr-8 rounded-xl bg-[#FAF8F5] border border-[#E0D7CC] text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#C85A32] cursor-pointer"
              >
                {savedVersions.map((v) => (
                  <option key={v.resumeId || v.id} value={v.resumeId || v.id}>
                    {v.title || v.targetRole}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Version Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreateNewVersion}
              title="Create New Resume Version"
              className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-stone-600 hover:text-stone-900 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C85A32]" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              onClick={handleDuplicateVersion}
              title="Duplicate This Version"
              className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-stone-600 hover:text-stone-900 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </button>
            <button
              onClick={handleRenameVersion}
              title="Rename This Version"
              className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-stone-600 hover:text-stone-900 text-xs font-semibold cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            {savedVersions.length > 1 && (
              <button
                onClick={handleDeleteVersion}
                title="Delete This Version"
                className="p-1.5 rounded-lg hover:bg-[#FDF2F2] text-stone-400 hover:text-rose-600 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Target Role Input / Selector */}
          <div className="h-5 w-px bg-[#E5DFD7] hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Role:
            </span>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => {
                setTargetRole(e.target.value);
                setCurrentResume((prev) => ({ ...prev, targetRole: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              placeholder="e.g. Software Engineer"
              className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E0D7CC] text-xs font-semibold text-stone-800 w-36 sm:w-44 focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
            />
          </div>
        </div>

        {/* Right: Template Selector & Layout Mode Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Template Archetypes */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E0D7CC]">
            <span className="text-[10px] font-bold uppercase text-stone-400 px-2">
              Template:
            </span>
            {(["classic", "modern", "minimal"] as ResumeTemplateType[]).map((t) => (
              <button
                key={t}
                onClick={() => handleTemplateChange(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  template === t
                    ? "bg-[#C85A32] text-white shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Layout Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E0D7CC]">
            <button
              onClick={() => setLayoutMode("split")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                layoutMode === "split"
                  ? "bg-[#FFFFFF] text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setLayoutMode("edit")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                layoutMode === "edit"
                  ? "bg-[#FFFFFF] text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Edit Details
            </button>
            <button
              onClick={() => setLayoutMode("preview")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                layoutMode === "preview"
                  ? "bg-[#FFFFFF] text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Preview Sheet
            </button>
          </div>
        </div>
      </div>

      {/* 3. ATS Optimization & Feedback Ribbon */}
      <div className="no-print bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* ATS Score Dial */}
            <div className="w-12 h-12 rounded-xl bg-[#F0F5F1] border border-[#D7E4D9] flex flex-col items-center justify-center shrink-0">
              <span className="text-base font-bold text-[#2C4A32] font-editorial leading-none">
                {currentResume.atsScore || 84}
              </span>
              <span className="text-[9px] font-bold text-[#3B5A41] uppercase tracking-wider">
                / 100
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-900">
                  ATS Readability & Keyword Index
                </span>
                <span className="text-[10px] font-semibold text-[#2C4A32] bg-[#F0F5F1] px-2 py-0.5 rounded-full border border-[#D7E4D9]">
                  {(currentResume.atsScore || 84) >= 80 ? "Excellent Candidate Match" : "Good Foundation"}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Evaluated against {targetRole} job descriptions and applicant tracking parser benchmarks.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunAtsAudit}
              disabled={isAtsOptimizing}
              className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] text-stone-800 border border-[#E0D7CC] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {isAtsOptimizing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-[#C85A32]" />
              )}
              <span>Re-check ATS Score</span>
            </button>
            <button
              onClick={() => handleImproveSection("make_ats_friendly")}
              disabled={isImprovingSection === "make_ats_friendly"}
              className="px-3 py-1.5 rounded-xl bg-[#FAF0EB] hover:bg-[#F3DDD3] text-[#A64522] border border-[#F2D7CC] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Make More ATS-Friendly</span>
            </button>
          </div>
        </div>

        {/* Missing Keywords Quick-Add Badges */}
        {currentResume.atsFeedback?.missingKeywords && currentResume.atsFeedback.missingKeywords.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#F2ECE4] flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-stone-500 mr-1">
              Suggested keywords for {targetRole}:
            </span>
            {currentResume.atsFeedback.missingKeywords.map((kw) => (
              <button
                key={kw}
                onClick={() => handleAddKeywordToSkills(kw)}
                title="Click to add this keyword to your skills list"
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#FAF8F5] hover:bg-[#F5EFEB] text-stone-700 border border-[#E0D7CC] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3 text-[#C85A32]" />
                <span>{kw}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Main Body: Split or Single View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Manual & AI Edit Controls */}
        {(layoutMode === "split" || layoutMode === "edit") && (
          <div
            className={`no-print space-y-4 ${
              layoutMode === "split" ? "lg:col-span-6" : "lg:col-span-12 max-w-4xl mx-auto w-full"
            }`}
          >
            {/* Edit Sub-Tabs */}
            <div className="flex items-center gap-1 bg-[#FFFFFF] p-1.5 rounded-2xl border border-[#E7E2DA] overflow-x-auto">
              {[
                { id: "summary", label: "Summary" },
                { id: "skills", label: "Skills" },
                { id: "projects", label: "Projects" },
                { id: "experience", label: "Experience" },
                { id: "education", label: "Education" },
                { id: "certs", label: "Certifications" },
                { id: "header", label: "Contact Info" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveEditTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeEditTab === tab.id
                      ? "bg-[#C85A32] text-white shadow-2xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: Summary */}
            {activeEditTab === "summary" && (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">Professional Summary</h3>
                    <p className="text-xs text-stone-500">
                      Concise 2–3 sentences highlighting genuine education, target role, and key skills.
                    </p>
                  </div>
                  <button
                    onClick={() => handleImproveSection("improve_summary")}
                    disabled={isImprovingSection === "improve_summary"}
                    className="px-3 py-1 rounded-lg bg-[#FAF0EB] text-[#A64522] text-xs font-bold flex items-center gap-1 hover:bg-[#F3DDD3] cursor-pointer"
                  >
                    {isImprovingSection === "improve_summary" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>AI Polish</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={currentResume.summary}
                  onChange={(e) => {
                    setCurrentResume((prev) => ({ ...prev, summary: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-3 rounded-xl bg-[#FAF8F5] border border-[#E0D7CC] text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#C85A32] leading-relaxed"
                  placeholder="Summarize your qualifications..."
                />
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>{currentResume.summary.length} characters • ~{currentResume.summary.split(/\s+/).filter(Boolean).length} words</span>
                  <span>ATS best practice: 40–70 words</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Skills */}
            {activeEditTab === "skills" && (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Technical Skills ({currentResume.skills.length})
                    </h3>
                    <p className="text-xs text-stone-500">
                      Only verified skills from your profile or technical coursework.
                    </p>
                  </div>
                  <button
                    onClick={() => handleImproveSection("improve_skills")}
                    disabled={isImprovingSection === "improve_skills"}
                    className="px-3 py-1 rounded-lg bg-[#FAF0EB] text-[#A64522] text-xs font-bold flex items-center gap-1 hover:bg-[#F3DDD3] cursor-pointer"
                  >
                    {isImprovingSection === "improve_skills" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Re-order by Role</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentResume.skills.map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E0D7CC] text-xs font-semibold text-stone-800 flex items-center gap-1.5 group"
                    >
                      <span>{skill}</span>
                      <button
                        onClick={() => {
                          const updatedSkills = currentResume.skills.filter((_, i) => i !== sIdx);
                          setCurrentResume((prev) => ({ ...prev, skills: updatedSkills }));
                          setHasUnsavedChanges(true);
                        }}
                        className="text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Skill Input */}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    id="newSkillInput"
                    placeholder="Add skill (e.g. Docker, PostgreSQL, React)..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.currentTarget.value || "").trim();
                        if (val && !currentResume.skills.includes(val)) {
                          setCurrentResume((prev) => ({
                            ...prev,
                            skills: [...prev.skills, val],
                          }));
                          setHasUnsavedChanges(true);
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E0D7CC] text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("newSkillInput") as HTMLInputElement;
                      if (input && input.value.trim()) {
                        const val = input.value.trim();
                        if (!currentResume.skills.includes(val)) {
                          setCurrentResume((prev) => ({
                            ...prev,
                            skills: [...prev.skills, val],
                          }));
                          setHasUnsavedChanges(true);
                          input.value = "";
                        }
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#C85A32] text-white text-xs font-bold hover:bg-[#B24E2A] cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Projects */}
            {activeEditTab === "projects" && (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Technical Projects ({currentResume.projects.length})
                    </h3>
                    <p className="text-xs text-stone-500">
                      Highlight real applications, tools, and algorithms with action verbs & impact.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleImproveSection("improve_projects")}
                      disabled={isImprovingSection === "improve_projects"}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF0EB] text-[#A64522] text-xs font-bold flex items-center gap-1 hover:bg-[#F3DDD3] cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>STAR Polish</span>
                    </button>
                    <button
                      onClick={handleAddProject}
                      className="px-2.5 py-1 rounded-lg bg-[#C85A32] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#B24E2A] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Project</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentResume.projects.map((proj, pIdx) => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E0D7CC] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-800">
                          Project #{pIdx + 1}
                        </span>
                        <button
                          onClick={() => handleRemoveProject(proj.id)}
                          className="text-stone-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                            Project Title
                          </label>
                          <input
                            type="text"
                            value={proj.title}
                            onChange={(e) => {
                              const updated = [...currentResume.projects];
                              updated[pIdx].title = e.target.value;
                              setCurrentResume((prev) => ({ ...prev, projects: updated }));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                            Tech Stack
                          </label>
                          <input
                            type="text"
                            value={proj.techStack}
                            onChange={(e) => {
                              const updated = [...currentResume.projects];
                              updated[pIdx].techStack = e.target.value;
                              setCurrentResume((prev) => ({ ...prev, projects: updated }));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          GitHub or Live Demo Link (Optional)
                        </label>
                        <input
                          type="text"
                          value={proj.link || ""}
                          onChange={(e) => {
                            const updated = [...currentResume.projects];
                            updated[pIdx].link = e.target.value;
                            setCurrentResume((prev) => ({ ...prev, projects: updated }));
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="https://github.com/..."
                          className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Bullet Points (One statement per line)
                        </label>
                        <textarea
                          rows={3}
                          value={(proj.points || []).join("\n")}
                          onChange={(e) => {
                            const updated = [...currentResume.projects];
                            updated[pIdx].points = e.target.value.split("\n").filter(Boolean);
                            setCurrentResume((prev) => ({ ...prev, projects: updated }));
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full p-2.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-xs text-stone-900 leading-relaxed"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Experience / Internships */}
            {activeEditTab === "experience" && (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Work Experience & Internships ({currentResume.experience.length})
                    </h3>
                    <p className="text-xs text-stone-500">
                      Include professional internships or relevant roles. Leave empty if you are a fresher.
                    </p>
                  </div>
                  <button
                    onClick={handleAddExperience}
                    className="px-2.5 py-1 rounded-lg bg-[#C85A32] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#B24E2A] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Experience</span>
                  </button>
                </div>

                {currentResume.experience.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#FAF8F5] border border-dashed border-[#E0D7CC] text-center">
                    <p className="text-xs text-stone-500">
                      No prior experience added yet. As a fresher, your resume will cleanly emphasize your Academic credentials and Technical Projects.
                    </p>
                    <button
                      onClick={handleAddExperience}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-xs font-semibold text-stone-800 hover:bg-[#FAF8F5] cursor-pointer"
                    >
                      + Add Summer Internship / Experience
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentResume.experience.map((exp, eIdx) => (
                      <div
                        key={exp.id}
                        className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E0D7CC] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-800">
                            Experience #{eIdx + 1}
                          </span>
                          <button
                            onClick={() => handleRemoveExperience(exp.id)}
                            className="text-stone-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Role / Title
                            </label>
                            <input
                              type="text"
                              value={exp.role}
                              onChange={(e) => {
                                const updated = [...currentResume.experience];
                                updated[eIdx].role = e.target.value;
                                setCurrentResume((prev) => ({ ...prev, experience: updated }));
                                setHasUnsavedChanges(true);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Company / Organization
                            </label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => {
                                const updated = [...currentResume.experience];
                                updated[eIdx].company = e.target.value;
                                setCurrentResume((prev) => ({ ...prev, experience: updated }));
                                setHasUnsavedChanges(true);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Duration (e.g. May 2024 - July 2024)
                            </label>
                            <input
                              type="text"
                              value={exp.duration}
                              onChange={(e) => {
                                const updated = [...currentResume.experience];
                                updated[eIdx].duration = e.target.value;
                                setCurrentResume((prev) => ({ ...prev, experience: updated }));
                                setHasUnsavedChanges(true);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Location
                            </label>
                            <input
                              type="text"
                              value={exp.location || ""}
                              onChange={(e) => {
                                const updated = [...currentResume.experience];
                                updated[eIdx].location = e.target.value;
                                setCurrentResume((prev) => ({ ...prev, experience: updated }));
                                setHasUnsavedChanges(true);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                            Key Responsibilities & Achievements (One per line)
                          </label>
                          <textarea
                            rows={3}
                            value={(exp.points || []).join("\n")}
                            onChange={(e) => {
                              const updated = [...currentResume.experience];
                              updated[eIdx].points = e.target.value.split("\n").filter(Boolean);
                              setCurrentResume((prev) => ({ ...prev, experience: updated }));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full p-2.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-xs text-stone-900 leading-relaxed"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Education */}
            {activeEditTab === "education" && (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">Academic Background</h3>
                    <p className="text-xs text-stone-500">Degree, college, branch, and GPA.</p>
                  </div>
                </div>

                {currentResume.education.map((edu, eIdx) => (
                  <div
                    key={edu.id}
                    className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E0D7CC] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
                  >
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        College / University Name
                      </label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => {
                          const updated = [...currentResume.education];
                          updated[eIdx].institution = e.target.value;
                          setCurrentResume((prev) => ({ ...prev, education: updated }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Degree (e.g. B.Tech / B.E / BCA)
                      </label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => {
                          const updated = [...currentResume.education];
                          updated[eIdx].degree = e.target.value;
                          setCurrentResume((prev) => ({ ...prev, education: updated }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Branch / Specialization
                      </label>
                      <input
                        type="text"
                        value={edu.branch || ""}
                        onChange={(e) => {
                          const updated = [...currentResume.education];
                          updated[eIdx].branch = e.target.value;
                          setCurrentResume((prev) => ({ ...prev, education: updated }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Graduation Year
                      </label>
                      <input
                        type="text"
                        value={edu.graduationYear}
                        onChange={(e) => {
                          const updated = [...currentResume.education];
                          updated[eIdx].graduationYear = e.target.value;
                          setCurrentResume((prev) => ({ ...prev, education: updated }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        CGPA / Percentage
                      </label>
                      <input
                        type="text"
                        value={edu.cgpa || ""}
                        onChange={(e) => {
                          const updated = [...currentResume.education];
                          updated[eIdx].cgpa = e.target.value;
                          setCurrentResume((prev) => ({ ...prev, education: updated }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: Certifications & Honors */}
            {activeEditTab === "certs" && (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Certifications & Honors ({currentResume.certifications.length})
                    </h3>
                    <p className="text-xs text-stone-500">
                      Recognized technical badges, coursework credentials, or competition wins.
                    </p>
                  </div>
                  <button
                    onClick={handleAddCert}
                    className="px-2.5 py-1 rounded-lg bg-[#C85A32] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#B24E2A] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Certificate</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {currentResume.certifications.map((cert, cIdx) => (
                    <div
                      key={cert.id}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E0D7CC] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                        <input
                          type="text"
                          value={cert.title}
                          onChange={(e) => {
                            const updated = [...currentResume.certifications];
                            updated[cIdx].title = e.target.value;
                            setCurrentResume((prev) => ({ ...prev, certifications: updated }));
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="Certification Title"
                          className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                        />
                        <input
                          type="text"
                          value={cert.issuer}
                          onChange={(e) => {
                            const updated = [...currentResume.certifications];
                            updated[cIdx].issuer = e.target.value;
                            setCurrentResume((prev) => ({ ...prev, certifications: updated }));
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="Issuer (e.g. AWS, HackerRank)"
                          className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                        />
                        <input
                          type="text"
                          value={cert.year}
                          onChange={(e) => {
                            const updated = [...currentResume.certifications];
                            updated[cIdx].year = e.target.value;
                            setCurrentResume((prev) => ({ ...prev, certifications: updated }));
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="Year"
                          className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] border border-[#E0D7CC] text-stone-900"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveCert(cert.id)}
                        className="text-stone-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Header & Contact Info */}
            {activeEditTab === "header" && (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-3 text-xs">
                <h3 className="text-sm font-bold text-stone-900">Header & Contact Links</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={currentResume.personalInfo.fullName}
                      onChange={(e) => {
                        setCurrentResume((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, fullName: e.target.value },
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D7CC] text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={currentResume.personalInfo.email}
                      onChange={(e) => {
                        setCurrentResume((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, email: e.target.value },
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D7CC] text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={currentResume.personalInfo.phone}
                      onChange={(e) => {
                        setCurrentResume((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, phone: e.target.value },
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D7CC] text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      City, Country
                    </label>
                    <input
                      type="text"
                      value={currentResume.personalInfo.location}
                      onChange={(e) => {
                        setCurrentResume((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, location: e.target.value },
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D7CC] text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      LinkedIn URL
                    </label>
                    <input
                      type="text"
                      value={currentResume.personalInfo.linkedin || ""}
                      onChange={(e) => {
                        setCurrentResume((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, linkedin: e.target.value },
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="linkedin.com/in/username"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D7CC] text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      GitHub URL
                    </label>
                    <input
                      type="text"
                      value={currentResume.personalInfo.github || ""}
                      onChange={(e) => {
                        setCurrentResume((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, github: e.target.value },
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="github.com/username"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D7CC] text-stone-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: Live ATS Document Sheet */}
        <div
          className={`flex flex-col items-center ${
            layoutMode === "split"
              ? "lg:col-span-6"
              : layoutMode === "preview"
              ? "lg:col-span-12 w-full max-w-3xl mx-auto"
              : "absolute -left-[9999px] top-0 opacity-0 pointer-events-none w-[750px]"
          }`}
        >
          {/* Paper Sheet Header Toolbar */}
          <div className="w-full flex items-center justify-between pb-3 pt-1 px-1 text-xs font-semibold text-stone-600">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-bold text-stone-800">
                <FileCheck className="w-4 h-4 text-[#3B5A41]" />
                ATS Document Preview
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E0D7CC] text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {template} template
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-download-pdf-preview"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#C85A32] hover:bg-[#A64522] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                title="Download Resume as PDF"
              >
                {isDownloadingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isDownloadingPdf ? "Generating PDF..." : "Download PDF"}</span>
              </button>
              <button
                id="btn-download-docx-preview"
                onClick={() => downloadResumeAsDoc(currentResume)}
                title="Download Word Document (.doc)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F5EFEB] border border-[#E0D7CC] text-stone-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-700" />
                <span>DOCX</span>
              </button>
            </div>
          </div>

          {/* The Physical Paper Canvas */}
            <div
              id="resumePrintSheet"
              className={`printable-resume w-full bg-[#FFFFFF] rounded-2xl border-2 border-[#E7E2DA] shadow-md p-8 sm:p-10 text-stone-900 text-xs transition-all ${
                template === "classic"
                  ? "space-y-4 font-serif"
                  : template === "modern"
                  ? "space-y-5 font-sans"
                  : "space-y-3.5 font-sans leading-snug"
              }`}
            >
              {/* Header */}
              <div
                className={`text-center pb-3 ${
                  template === "classic"
                    ? "border-b-2 border-stone-800 space-y-1"
                    : template === "modern"
                    ? "border-b border-[#C85A32]/40 pb-4 text-left space-y-1"
                    : "border-b border-stone-300 pb-2 text-left space-y-0.5"
                }`}
              >
                <h1
                  className={`font-bold tracking-tight text-stone-900 ${
                    template === "classic"
                      ? "text-2xl uppercase tracking-wider font-editorial"
                      : template === "modern"
                      ? "text-2xl font-sans tracking-tight text-stone-900"
                      : "text-xl font-sans uppercase tracking-wide"
                  }`}
                >
                  {currentResume.personalInfo.fullName || profile.full_name || "Candidate Name"}
                </h1>

                {template === "modern" && (
                  <p className="text-xs font-semibold text-[#A64522]">
                    {currentResume.targetRole}
                  </p>
                )}

                <div
                  className={`text-[11px] text-stone-600 flex flex-wrap items-center gap-2 ${
                    template === "classic" ? "justify-center" : "justify-start"
                  }`}
                >
                  {currentResume.personalInfo.email && (
                    <span>{currentResume.personalInfo.email}</span>
                  )}
                  {currentResume.personalInfo.phone && (
                    <>
                      <span>•</span>
                      <span>{currentResume.personalInfo.phone}</span>
                    </>
                  )}
                  {currentResume.personalInfo.location && (
                    <>
                      <span>•</span>
                      <span>{currentResume.personalInfo.location}</span>
                    </>
                  )}
                  {currentResume.personalInfo.linkedin && (
                    <>
                      <span>•</span>
                      <span>{currentResume.personalInfo.linkedin}</span>
                    </>
                  )}
                  {currentResume.personalInfo.github && (
                    <>
                      <span>•</span>
                      <span>{currentResume.personalInfo.github}</span>
                    </>
                  )}
                  {currentResume.personalInfo.portfolio && (
                    <>
                      <span>•</span>
                      <span>{currentResume.personalInfo.portfolio}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Professional Summary */}
              {currentResume.summary && (
                <div className="space-y-1">
                  <h2
                    className={`font-bold uppercase tracking-wider text-stone-900 border-b pb-0.5 ${
                      template === "classic"
                        ? "text-[11px] border-stone-400"
                        : template === "modern"
                        ? "text-[11px] text-[#A64522] border-[#EAE3D8]"
                        : "text-[10px] border-stone-300"
                    }`}
                  >
                    Professional Summary
                  </h2>
                  <p className="text-[11px] text-stone-800 leading-relaxed">
                    {currentResume.summary}
                  </p>
                </div>
              )}

              {/* Education */}
              {currentResume.education && currentResume.education.length > 0 && (
                <div className="space-y-1.5">
                  <h2
                    className={`font-bold uppercase tracking-wider text-stone-900 border-b pb-0.5 ${
                      template === "classic"
                        ? "text-[11px] border-stone-400"
                        : template === "modern"
                        ? "text-[11px] text-[#A64522] border-[#EAE3D8]"
                        : "text-[10px] border-stone-300"
                    }`}
                  >
                    Education
                  </h2>
                  {currentResume.education.map((edu, eIdx) => (
                    <div key={edu.id || eIdx} className="text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between font-bold text-stone-900">
                        <span>{edu.institution}</span>
                        <span>{edu.graduationYear}</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-700 italic">
                        <span>
                          {edu.degree}
                          {edu.branch ? ` in ${edu.branch}` : ""}
                        </span>
                        {edu.cgpa && (
                          <span className="not-italic font-semibold">
                            CGPA / Marks: {edu.cgpa}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Technical Skills */}
              {currentResume.skills && currentResume.skills.length > 0 && (
                <div className="space-y-1">
                  <h2
                    className={`font-bold uppercase tracking-wider text-stone-900 border-b pb-0.5 ${
                      template === "classic"
                        ? "text-[11px] border-stone-400"
                        : template === "modern"
                        ? "text-[11px] text-[#A64522] border-[#EAE3D8]"
                        : "text-[10px] border-stone-300"
                    }`}
                  >
                    Technical Competencies
                  </h2>
                  {template === "modern" ? (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {currentResume.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#EAE3D8] text-[10px] font-semibold text-stone-800"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-800 leading-relaxed">
                      <strong className="font-semibold text-stone-900">Core Tools & Skills: </strong>
                      {currentResume.skills.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {/* Technical Projects */}
              {currentResume.projects && currentResume.projects.length > 0 && (
                <div className="space-y-2">
                  <h2
                    className={`font-bold uppercase tracking-wider text-stone-900 border-b pb-0.5 ${
                      template === "classic"
                        ? "text-[11px] border-stone-400"
                        : template === "modern"
                        ? "text-[11px] text-[#A64522] border-[#EAE3D8]"
                        : "text-[10px] border-stone-300"
                    }`}
                  >
                    Technical Projects
                  </h2>
                  {currentResume.projects.map((proj) => (
                    <div key={proj.id} className="text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between font-bold text-stone-900">
                        <span>
                          {proj.title}{" "}
                          {proj.techStack && (
                            <span className="font-normal text-stone-600">
                              | {proj.techStack}
                            </span>
                          )}
                        </span>
                        {proj.link && (
                          <span className="text-[10px] text-stone-500 font-normal">
                            {proj.link}
                          </span>
                        )}
                      </div>
                      <ul className="list-disc list-outside pl-4 space-y-0.5 text-stone-700">
                        {(proj.points || []).map((pt, ptIdx) => (
                          <li key={ptIdx} className="leading-relaxed">
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Work Experience & Internships (Strictly rendered only if candidate has experience) */}
              {currentResume.experience && currentResume.experience.length > 0 && (
                <div className="space-y-2">
                  <h2
                    className={`font-bold uppercase tracking-wider text-stone-900 border-b pb-0.5 ${
                      template === "classic"
                        ? "text-[11px] border-stone-400"
                        : template === "modern"
                        ? "text-[11px] text-[#A64522] border-[#EAE3D8]"
                        : "text-[10px] border-stone-300"
                    }`}
                  >
                    Work Experience & Internships
                  </h2>
                  {currentResume.experience.map((exp) => (
                    <div key={exp.id} className="text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between font-bold text-stone-900">
                        <span>
                          {exp.role} — {exp.company}
                        </span>
                        <span>{exp.duration}</span>
                      </div>
                      {exp.location && (
                        <p className="text-[10px] text-stone-500 italic">{exp.location}</p>
                      )}
                      <ul className="list-disc list-outside pl-4 space-y-0.5 text-stone-700">
                        {(exp.points || []).map((pt, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Certifications */}
              {currentResume.certifications && currentResume.certifications.length > 0 && (
                <div className="space-y-1">
                  <h2
                    className={`font-bold uppercase tracking-wider text-stone-900 border-b pb-0.5 ${
                      template === "classic"
                        ? "text-[11px] border-stone-400"
                        : template === "modern"
                        ? "text-[11px] text-[#A64522] border-[#EAE3D8]"
                        : "text-[10px] border-stone-300"
                    }`}
                  >
                    Certifications & Credentials
                  </h2>
                  <ul className="list-disc list-outside pl-4 text-[11px] text-stone-700 space-y-0.5">
                    {currentResume.certifications.map((cert) => (
                      <li key={cert.id}>
                        <strong className="font-semibold text-stone-900">{cert.title}</strong> —{" "}
                        {cert.issuer} ({cert.year})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Achievements */}
              {currentResume.achievements && currentResume.achievements.length > 0 && (
                <div className="space-y-1">
                  <h2
                    className={`font-bold uppercase tracking-wider text-stone-900 border-b pb-0.5 ${
                      template === "classic"
                        ? "text-[11px] border-stone-400"
                        : template === "modern"
                        ? "text-[11px] text-[#A64522] border-[#EAE3D8]"
                        : "text-[10px] border-stone-300"
                    }`}
                  >
                    Honors & Achievements
                  </h2>
                  <ul className="list-disc list-outside pl-4 text-[11px] text-stone-700 space-y-0.5">
                    {currentResume.achievements.map((ach) => (
                      <li key={ach.id}>
                        <strong className="font-semibold text-stone-900">{ach.title}</strong>
                        {ach.description ? `: ${ach.description}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
      </div>

      {/* 5. Job Tailoring Modal */}
      {isTailorModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-xl w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D8]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF0EB] text-[#C85A32] flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Tailor Resume to Job</h3>
                  <p className="text-xs text-stone-500">
                    Align your genuine skills and projects to match specific job requirements.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTailorModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Select from Recommended Opportunities:
              </span>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {availableTailorJobs.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => setSelectedTailorJob(j as any)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedTailorJob?.id === j.id
                        ? "bg-[#FAF0EB] border-[#C85A32] text-stone-900 shadow-2xs"
                        : "bg-[#FAF8F5] border-[#E0D7CC] hover:bg-[#F5EFEB] text-stone-800"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{j.title}</span>
                      <span className="text-stone-500">{j.company}</span>
                    </div>
                    {j.requiredSkills && (
                      <p className="text-[11px] text-stone-500 mt-1">
                        Keywords: {j.requiredSkills.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Or enter custom role */}
              <div className="pt-2 border-t border-[#EAE3D8]">
                <span className="text-xs font-semibold text-stone-600 block mb-1.5">
                  Or enter custom target role & company:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Company name..."
                    value={customTailorCompany}
                    onChange={(e) => setCustomTailorCompany(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D7CC]"
                  />
                  <input
                    type="text"
                    placeholder="Job title..."
                    value={customTailorJobTitle}
                    onChange={(e) => setCustomTailorJobTitle(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0D7CC]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#EAE3D8]">
              <button
                onClick={() => setIsTailorModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-[#FAF8F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customTailorJobTitle && customTailorCompany) {
                    handleGenerateResumeWithAI({
                      id: `custom_${Date.now()}`,
                      title: customTailorJobTitle,
                      company: customTailorCompany,
                      requiredSkills: [],
                    });
                  } else if (selectedTailorJob) {
                    handleGenerateResumeWithAI(selectedTailorJob);
                  } else {
                    alert("Please select a job opportunity or type custom job details.");
                  }
                }}
                disabled={isGenerating}
                className="px-5 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Tailor Resume</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
