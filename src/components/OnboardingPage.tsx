import React, { useState, useRef, useEffect } from "react";
import {
  User as UserIcon,
  GraduationCap,
  Briefcase,
  Camera,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  LogOut,
  MapPin,
  Phone,
  Mail,
  Linkedin,
  Github,
  Globe,
  FileText,
  Clock,
  Award,
  Plus,
  X,
  Compass,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import {
  uploadProfilePhoto,
  saveUserOnboardingProfile,
  logoutUser,
  UserOnboardingData,
  FirestoreUserData,
} from "../lib/firebase";
import { ROLE_BENCHMARKS } from "../lib/defaultData";

interface OnboardingPageProps {
  currentUser: FirebaseUser;
  initialData?: Partial<FirestoreUserData> | null;
  onComplete: (data: UserOnboardingData) => void;
  onLogout: () => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export const INDUSTRY_OPTIONS = [
  "Information Technology & Software Services",
  "Artificial Intelligence & Data Analytics",
  "FinTech & Banking / Financial Services",
  "E-Commerce & Internet Technologies",
  "Product & SaaS Companies",
  "Consulting & Business Advisory",
  "EdTech & Education Services",
  "HealthTech & Healthcare",
  "Core Engineering & Manufacturing",
];

const COMMON_PROGRAMMING_LANGS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
  "C",
  "SQL",
  "HTML/CSS",
  "Go",
  "Rust",
  "PHP",
  "Kotlin",
];

const POPULAR_SKILLS = [
  "React",
  "Node.js",
  "SQL",
  "Python",
  "Git & GitHub",
  "REST APIs",
  "Tailwind CSS",
  "Data Analysis",
  "Machine Learning",
  "Power BI",
  "Docker",
  "MongoDB",
  "PostgreSQL",
  "AWS",
  "Excel",
  "Problem Solving",
];

const DEGREE_OPTIONS = [
  "B.Tech / B.E. (Bachelor of Technology / Engineering)",
  "BCA (Bachelor of Computer Applications)",
  "MCA (Master of Computer Applications)",
  "B.Sc (Computer Science / IT / Stats / Math)",
  "M.Sc (Computer Science / Data Science)",
  "M.Tech (Master of Technology)",
  "BBA / MBA",
  "Diploma in Engineering",
  "Other Degree",
];

const BRANCH_OPTIONS = [
  "Computer Science & Engineering (CSE)",
  "Information Technology (IT)",
  "Artificial Intelligence & Machine Learning (AI/ML)",
  "Data Science & Analytics",
  "Electronics & Communication (ECE)",
  "Electrical Engineering (EE)",
  "Mechanical Engineering",
  "Civil Engineering",
  "Information Science",
  "Other Specialization",
];

const GRADUATION_YEARS = [
  "2029",
  "2028",
  "2027",
  "2026",
  "2025",
  "2024",
  "2023",
  "2022 or earlier",
];

const SEMESTER_OPTIONS = [
  "1st Year (Sem 1 / 2)",
  "2nd Year (Sem 3 / 4)",
  "3rd Year (Sem 5 / 6)",
  "4th Year / Final Year (Sem 7 / 8)",
  "Graduated / Passed Out",
];

const LOCATION_OPTIONS = [
  "Remote / Work From Home",
  "Bengaluru (Bangalore)",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Delhi NCR (Gurugram / Noida)",
  "Chennai",
  "Kolkata",
  "Any Location in India",
];

const EXPERIENCE_LEVELS = [
  "Student / In College",
  "Fresher / 0 Years",
  "Intern / Recent Grad",
  "Junior (1-2 Years)",
];

const AVAILABILITY_OPTIONS = [
  "Immediately (Ready to Join)",
  "Within 15 Days",
  "Within 30 Days (1 Month)",
  "Within 60 Days (2 Months)",
  "Available after Final Exams / Graduation",
  "Flexible / Open to Discussion",
];

// Robust URL validator functions
const isValidWebUrl = (urlStr: string): boolean => {
  const trimmed = urlStr.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeLinkedInUrl = (urlStr: string): string => {
  let trimmed = urlStr ? urlStr.trim() : "";
  if (
    trimmed.startsWith("https://linkedin.com/in/http") ||
    trimmed.startsWith("http://linkedin.com/in/http") ||
    trimmed.startsWith("https://www.linkedin.com/in/http") ||
    trimmed.startsWith("https://linkedin.com/in/www.") ||
    trimmed.startsWith("https://linkedin.com/in/linkedin.com")
  ) {
    trimmed = trimmed.replace(/^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*linkedin\.com\/in\//i, "");
  }
  return trimmed;
};

const isValidLinkedInUrl = (urlStr: string): boolean => {
  if (!urlStr) return false;
  const trimmed = normalizeLinkedInUrl(urlStr);
  if (!trimmed) return false;

  // Accept valid personal LinkedIn profile URLs in these formats:
  // - https://www.linkedin.com/in/username
  // - https://linkedin.com/in/username
  // - www.linkedin.com/in/username
  // - linkedin.com/in/username
  // (also handles http://, country subdomains like in.linkedin.com, trailing slash, and query params)
  const linkedInPattern =
    /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*linkedin\.com\/in\/([a-zA-Z0-9_\-\.%]+)\/?(?:[\?#].*)?$/i;

  return linkedInPattern.test(trimmed);
};

const isValidGitHubUrl = (urlStr: string): boolean => {
  const trimmed = urlStr.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isGitHubHost = host === "github.com" || host === "www.github.com";
    const userOrOrg = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    return isGitHubHost && Boolean(userOrOrg && userOrOrg.length > 0);
  } catch {
    return false;
  }
};

const isValidPhone = (phoneStr: string): boolean => {
  const cleaned = phoneStr.replace(/[\s\-()]/g, "");
  return cleaned.length >= 10 && /^\+?[0-9]{10,15}$/.test(cleaned);
};

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  currentUser,
  initialData,
  onComplete,
  onLogout,
  onCancel,
  isEditing = false,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // ----------------------------------------------------
  // Step 1: Personal Information State
  // ----------------------------------------------------
  const [fullName, setFullName] = useState(
    initialData?.name || initialData?.fullName || currentUser.displayName || ""
  );
  const [email] = useState(currentUser.email || initialData?.email || "");
  const [phone, setPhone] = useState(
    initialData?.phone || currentUser.phoneNumber || ""
  );
  const [location, setLocation] = useState(
    initialData?.location || initialData?.preferredLocation || "Bengaluru, Karnataka"
  );
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(
    initialData?.profilePhoto || currentUser.photoURL || ""
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(
    initialData?.profilePhoto || currentUser.photoURL || ""
  );
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // Step 2: Academic Background State
  // ----------------------------------------------------
  const [college, setCollege] = useState(
    initialData?.college || initialData?.profile?.education?.college || ""
  );
  const [degree, setDegree] = useState(
    initialData?.degree || initialData?.profile?.education?.degree || DEGREE_OPTIONS[0]
  );
  const [branch, setBranch] = useState(
    initialData?.branch || initialData?.profile?.education?.branch || BRANCH_OPTIONS[0]
  );
  const [graduationYear, setGraduationYear] = useState(
    initialData?.graduationYear || String(initialData?.profile?.education?.graduation_year || "2025")
  );
  const [cgpa, setCgpa] = useState(
    initialData?.cgpa || initialData?.profile?.education?.cgpa || "8.5 / 10"
  );
  const [currentSemester, setCurrentSemester] = useState(
    initialData?.currentSemester || SEMESTER_OPTIONS[3]
  );

  // ----------------------------------------------------
  // Step 3: Career Goals & Technical Skills State
  // ----------------------------------------------------
  const [preferredJobRole, setPreferredJobRole] = useState(
    initialData?.preferredJobRole || initialData?.targetRole || initialData?.profile?.target_role || "Data Analyst"
  );
  const [industry, setIndustry] = useState(
    initialData?.industry || INDUSTRY_OPTIONS[0]
  );
  const [skills, setSkills] = useState<string[]>(
    initialData?.skills && initialData.skills.length > 0
      ? initialData.skills
      : initialData?.profile?.skills && initialData.profile.skills.length > 0
      ? initialData.profile.skills
      : ["Python", "SQL", "Data Analysis", "Excel"]
  );
  const [customSkillInput, setCustomSkillInput] = useState("");

  const [programmingLanguages, setProgrammingLanguages] = useState<string[]>(
    initialData?.programmingLanguages && initialData.programmingLanguages.length > 0
      ? initialData.programmingLanguages
      : initialData?.profile?.interests && initialData.profile.interests.length > 0
      ? initialData.profile.interests
      : ["Python", "SQL"]
  );
  const [customLangInput, setCustomLangInput] = useState("");

  const [preferredLocation, setPreferredLocation] = useState(
    initialData?.preferredLocation || LOCATION_OPTIONS[0]
  );
  const [experienceLevel, setExperienceLevel] = useState(
    initialData?.experienceLevel || initialData?.profile?.experience_level || EXPERIENCE_LEVELS[1]
  );

  // ----------------------------------------------------
  // Step 4: Additional Information & Profiles State
  // ----------------------------------------------------
  const [linkedinUrl, setLinkedinUrl] = useState(
    initialData?.linkedinUrl ||
      (initialData?.resume?.personalInfo?.linkedin &&
      initialData.resume.personalInfo.linkedin !== "linkedin.com/in/profile"
        ? initialData.resume.personalInfo.linkedin
        : "")
  );
  const [githubUrl, setGithubUrl] = useState(
    initialData?.githubUrl || initialData?.resume?.personalInfo?.github || "https://github.com/"
  );
  const [portfolioUrl, setPortfolioUrl] = useState(
    initialData?.portfolioUrl || initialData?.resume?.personalInfo?.portfolio || "https://"
  );
  const [availability, setAvailability] = useState(
    initialData?.availability || AVAILABILITY_OPTIONS[0]
  );
  const [bio, setBio] = useState(
    initialData?.bio ||
      initialData?.resume?.summary ||
      "Motivated and detail-oriented aspiring tech professional eager to apply problem-solving and software development skills in real-world environments."
  );

  // Sync state if initialData is provided or updated asynchronously
  useEffect(() => {
    if (initialData) {
      if (initialData.name || initialData.fullName) {
        setFullName(initialData.name || initialData.fullName || "");
      }
      if (initialData.phone) setPhone(initialData.phone);
      if (initialData.college) setCollege(initialData.college);
      if (initialData.degree) setDegree(initialData.degree);
      if (initialData.branch) setBranch(initialData.branch);
      if (initialData.graduationYear) setGraduationYear(initialData.graduationYear);
      if (initialData.cgpa) setCgpa(initialData.cgpa);
      if (initialData.currentSemester || initialData.currentYear) {
        setCurrentSemester(initialData.currentSemester || initialData.currentYear || "");
      }
      if (initialData.targetRole || initialData.preferredJobRole) {
        setPreferredJobRole(initialData.targetRole || initialData.preferredJobRole || "");
      }
      if (initialData.industry) setIndustry(initialData.industry);
      if (initialData.skills && initialData.skills.length > 0) setSkills(initialData.skills);
      if (initialData.programmingLanguages && initialData.programmingLanguages.length > 0) {
        setProgrammingLanguages(initialData.programmingLanguages);
      }
      if (initialData.location || initialData.preferredLocation) {
        setLocation(initialData.location || initialData.preferredLocation || "");
        setPreferredLocation(initialData.preferredLocation || initialData.location || "");
      }
      if (initialData.linkedin || initialData.linkedinUrl) {
        setLinkedinUrl(initialData.linkedin || initialData.linkedinUrl || "");
      }
      if (initialData.github || initialData.githubUrl) {
        setGithubUrl(initialData.github || initialData.githubUrl || "");
      }
      if (initialData.portfolioUrl) setPortfolioUrl(initialData.portfolioUrl);
      if (initialData.bio) setBio(initialData.bio);
      if (initialData.availability) setAvailability(initialData.availability);
      if (initialData.photoURL || initialData.profilePhoto) {
        setProfilePhotoUrl(initialData.photoURL || initialData.profilePhoto || "");
        setPhotoPreview(initialData.photoURL || initialData.profilePhoto || "");
      }
    }
  }, [initialData]);

  // Validation Errors & Submission State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Photo Selection Handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        photo: "Please select an image file (PNG, JPG, or WEBP).",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        photo: "Image exceeds 5MB size limit. Please select a smaller photo.",
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.photo;
      return next;
    });

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    setProfilePhotoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Skill Management Handlers
  const toggleSkill = (skill: string) => {
    setSkills((prev) => {
      const exists = prev.includes(skill);
      const next = exists ? prev.filter((s) => s !== skill) : [...prev, skill];
      if (next.length > 0 && errors.skills) {
        setErrors((errs) => {
          const updated = { ...errs };
          delete updated.skills;
          return updated;
        });
      }
      return next;
    });
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSkillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setCustomSkillInput("");
      if (errors.skills) {
        setErrors((errs) => {
          const updated = { ...errs };
          delete updated.skills;
          return updated;
        });
      }
    }
  };

  const toggleLang = (lang: string) => {
    setProgrammingLanguages((prev) => {
      const exists = prev.includes(lang);
      const next = exists ? prev.filter((l) => l !== lang) : [...prev, lang];
      if (next.length > 0 && errors.programmingLanguages) {
        setErrors((errs) => {
          const updated = { ...errs };
          delete updated.programmingLanguages;
          return updated;
        });
      }
      return next;
    });
  };

  const handleAddCustomLang = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customLangInput.trim();
    if (trimmed && !programmingLanguages.includes(trimmed)) {
      setProgrammingLanguages((prev) => [...prev, trimmed]);
      setCustomLangInput("");
      if (errors.programmingLanguages) {
        setErrors((errs) => {
          const updated = { ...errs };
          delete updated.programmingLanguages;
          return updated;
        });
      }
    }
  };

  // ----------------------------------------------------
  // Step Validation Functions (ALL fields mandatory)
  // ----------------------------------------------------
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = "Full name is required (minimum 2 characters).";
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "A valid email address is required.";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!isValidPhone(phone.trim())) {
      newErrors.phone = "Please enter a valid phone number with at least 10 digits (e.g. +91 9876543210).";
    }

    if (!location.trim() || location.trim().length < 2) {
      newErrors.location = "Current city or location is required.";
    }

    if (!photoPreview && !profilePhotoUrl && !photoFile) {
      newErrors.photo = "Profile photo is required. Please upload a photo or avatar.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!college.trim() || college.trim().length < 2) {
      newErrors.college = "College or university name is required.";
    }

    if (!degree.trim()) {
      newErrors.degree = "Degree is required.";
    }

    if (!branch.trim()) {
      newErrors.branch = "Branch / Specialization is required.";
    }

    if (!graduationYear.trim()) {
      newErrors.graduationYear = "Graduation year is required.";
    }

    if (!cgpa.trim()) {
      newErrors.cgpa = "CGPA, Percentage, or current academic score is required.";
    }

    if (!currentSemester.trim()) {
      newErrors.currentSemester = "Current academic year or semester is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!preferredJobRole.trim()) {
      newErrors.preferredJobRole = "Preferred job role is required.";
    }

    if (skills.length === 0) {
      newErrors.skills = "Please select or add at least one technical skill.";
    }

    if (programmingLanguages.length === 0) {
      newErrors.programmingLanguages = "Please select or add at least one programming language.";
    }

    if (!preferredLocation.trim()) {
      newErrors.preferredLocation = "Preferred job location is required.";
    }

    if (!experienceLevel.trim()) {
      newErrors.experienceLevel = "Experience level is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!linkedinUrl.trim()) {
      newErrors.linkedinUrl = "LinkedIn profile URL is required.";
    } else if (!isValidLinkedInUrl(linkedinUrl.trim())) {
      newErrors.linkedinUrl = "Please provide a valid LinkedIn URL (e.g. https://linkedin.com/in/username).";
    }

    if (!githubUrl.trim()) {
      newErrors.githubUrl = "GitHub profile URL is required.";
    } else if (!isValidGitHubUrl(githubUrl.trim())) {
      newErrors.githubUrl = "Please provide a valid GitHub profile URL (e.g. https://github.com/username).";
    }

    if (!portfolioUrl.trim()) {
      newErrors.portfolioUrl = "Portfolio or personal website URL is required.";
    } else if (!isValidWebUrl(portfolioUrl.trim())) {
      newErrors.portfolioUrl = "Please provide a valid URL starting with https:// or http://";
    }

    if (!availability.trim()) {
      newErrors.availability = "Availability / notice period is required.";
    }

    if (!bio.trim() || bio.trim().length < 20) {
      newErrors.bio = "Professional bio / career summary is required (minimum 20 characters).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Stepper Tab Click Handler
  const handleTabClick = (targetStep: 1 | 2 | 3 | 4) => {
    if (targetStep === currentStep) return;

    if (targetStep > currentStep) {
      if (currentStep === 1 && !validateStep1()) return;
      if (currentStep === 2 && (!validateStep1() || !validateStep2())) return;
      if (currentStep === 3 && (!validateStep1() || !validateStep2() || !validateStep3())) return;
    }
    setCurrentStep(targetStep);
  };

  // Step Next Handler
  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    } else if (currentStep === 3) {
      if (validateStep3()) setCurrentStep(4);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  // Final Form Submission Handler
  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
      setSubmissionError("All fields in Steps 1 through 4 are mandatory. Please complete all highlighted fields.");
      return;
    }

    if (!currentUser?.uid) {
      setSubmissionError("Authentication UID missing. Please sign in again.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    // Strict 15-second safety timer to ensure the UI can NEVER remain in 'Processing...' indefinitely
    let timerCleared = false;
    const safetyTimer = setTimeout(() => {
      if (!timerCleared) {
        setIsSubmitting(false);
        setIsPhotoUploading(false);
        setSubmissionError("Profile save operation timed out. Please check your network connection and retry.");
      }
    }, 15000);

    try {
      let finalPhotoUrl = profilePhotoUrl;

      // 1. Upload photo to Firebase Storage if a new file was chosen
      if (photoFile) {
        setIsPhotoUploading(true);
        try {
          const { url, error: uploadErr } = await uploadProfilePhoto(
            currentUser.uid,
            photoFile
          );
          setIsPhotoUploading(false);

          if (uploadErr && !url) {
            timerCleared = true;
            clearTimeout(safetyTimer);
            setSubmissionError(`Photo upload error: ${uploadErr}. You can choose another photo or proceed.`);
            setIsSubmitting(false);
            return;
          }
          if (url) {
            finalPhotoUrl = url;
          }
        } catch (photoErr: any) {
          setIsPhotoUploading(false);
          timerCleared = true;
          clearTimeout(safetyTimer);
          setSubmissionError(`Photo upload failed: ${photoErr?.message || "Storage error"}.`);
          setIsSubmitting(false);
          return;
        }
      } else if (!finalPhotoUrl && photoPreview) {
        finalPhotoUrl = photoPreview;
      }

      // Default safe avatar fallback if still empty
      if (!finalPhotoUrl) {
        finalPhotoUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80";
      }

      const onboardingPayload: UserOnboardingData = {
        uid: currentUser.uid,
        name: fullName.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        photoURL: finalPhotoUrl,
        profilePhoto: finalPhotoUrl,
        college: college.trim(),
        degree: degree.trim(),
        branch: branch.trim(),
        currentYear: currentSemester.trim(),
        currentSemester: currentSemester.trim(),
        graduationYear: graduationYear.trim(),
        cgpa: cgpa.trim(),
        targetRole: preferredJobRole.trim(),
        preferredJobRole: preferredJobRole.trim(),
        industry: industry.trim(),
        experienceLevel: experienceLevel.trim(),
        skills,
        programmingLanguages,
        location: location.trim(),
        preferredLocation: preferredLocation.trim(),
        linkedin: normalizeLinkedInUrl(linkedinUrl),
        linkedinUrl: normalizeLinkedInUrl(linkedinUrl),
        github: githubUrl.trim(),
        githubUrl: githubUrl.trim(),
        portfolioUrl: portfolioUrl.trim(),
        bio: bio.trim(),
        availability: availability.trim(),
        profileCompleted: true,
      };

      // 2. Write to Firestore users/{uid}
      const { success, error: saveErr } = await saveUserOnboardingProfile(
        currentUser.uid,
        onboardingPayload
      );

      timerCleared = true;
      clearTimeout(safetyTimer);

      if (!success) {
        setSubmissionError(saveErr || "Failed to save profile to Cloud Firestore. Please retry.");
        setIsSubmitting(false);
        setIsPhotoUploading(false);
        return;
      }

      // 3. Stop loading state, show success, then redirect to Dashboard
      setIsSubmitting(false);
      setIsPhotoUploading(false);
      setIsSuccess(true);

      setTimeout(() => {
        onComplete(onboardingPayload);
      }, 800);
    } catch (err: any) {
      timerCleared = true;
      clearTimeout(safetyTimer);
      console.warn("Onboarding submission notice:", err);
      setSubmissionError(err?.message || "An unexpected error occurred while saving your profile.");
      setIsSubmitting(false);
      setIsPhotoUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col justify-between selection:bg-[#F2D7CC] selection:text-[#7A2C10] font-sans">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-[#EDE7DD] bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/jobplanner-logo.svg"
              alt="JobPlanner Logo"
              className="w-9 h-9 object-contain rounded-xl shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold text-stone-900">
                  JOBPLANNER
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF0EA] text-[#A64522] border border-[#F3DACF]">
                  Profile Setup
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">
                Learn. Prepare. Get Hired.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-900 font-medium px-3 py-1.5 rounded-lg border border-[#E0D8CC] hover:bg-[#F2ECE3] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>
            )}
            <span className="text-xs text-stone-600 hidden sm:inline truncate max-w-[200px]">
              {currentUser.email || currentUser.phoneNumber}
            </span>
            <button
              onClick={async () => {
                await logoutUser();
                onLogout();
              }}
              className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium px-2.5 py-1.5 rounded-lg border border-[#E0D8CC] hover:bg-[#F2ECE3] transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        {/* Step Indicator Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600 mb-2">
            <span>Step {currentStep} of 4</span>
            <span className="text-[#A64522] font-medium">
              {currentStep === 1
                ? "Personal Information & Photo"
                : currentStep === 2
                ? "Academic Background & Education"
                : currentStep === 3
                ? "Career Goals & Technical Skills"
                : "Additional Profiles & Summary"}
            </span>
          </div>
          <div className="w-full bg-[#EAE4DC] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#C85A32] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            <button
              type="button"
              onClick={() => handleTabClick(1)}
              className={`p-2 rounded-xl text-xs border transition-all cursor-pointer ${
                currentStep === 1
                  ? "bg-[#FFFFFF] border-[#C85A32] text-[#A64522] shadow-2xs font-bold"
                  : "bg-transparent border-transparent text-stone-500 hover:text-stone-800 font-medium"
              }`}
            >
              1. Personal
            </button>
            <button
              type="button"
              onClick={() => handleTabClick(2)}
              className={`p-2 rounded-xl text-xs border transition-all cursor-pointer ${
                currentStep === 2
                  ? "bg-[#FFFFFF] border-[#C85A32] text-[#A64522] shadow-2xs font-bold"
                  : "bg-transparent border-transparent text-stone-500 hover:text-stone-800 font-medium"
              }`}
            >
              2. Education
            </button>
            <button
              type="button"
              onClick={() => handleTabClick(3)}
              className={`p-2 rounded-xl text-xs border transition-all cursor-pointer ${
                currentStep === 3
                  ? "bg-[#FFFFFF] border-[#C85A32] text-[#A64522] shadow-2xs font-bold"
                  : "bg-transparent border-transparent text-stone-500 hover:text-stone-800 font-medium"
              }`}
            >
              3. Career
            </button>
            <button
              type="button"
              onClick={() => handleTabClick(4)}
              className={`p-2 rounded-xl text-xs border transition-all cursor-pointer ${
                currentStep === 4
                  ? "bg-[#FFFFFF] border-[#C85A32] text-[#A64522] shadow-2xs font-bold"
                  : "bg-transparent border-transparent text-stone-500 hover:text-stone-800 font-medium"
              }`}
            >
              4. Additional
            </button>
          </div>
        </div>

        {/* Global Submission Error Notice */}
        {submissionError && (
          <div className="mb-6 p-4 rounded-xl bg-[#FDF2F0] border border-[#F6C6BE] flex items-start gap-2.5 text-xs text-[#99281B] animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#C85A32]" />
            <div className="flex-1 leading-relaxed">{submissionError}</div>
          </div>
        )}

        {/* Success Transition View */}
        {isSuccess && (
          <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D5E3D8] text-center shadow-md animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-[#EFF6F0] text-[#2F5236] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif font-bold text-stone-900">
              Profile Completed Successfully!
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              Saving your cloud profile to Firestore and launching your personalized JobPlanner dashboard...
            </p>
            <div className="w-6 h-6 border-2 border-[#C85A32] border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </div>
        )}

        {!isSuccess && (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] shadow-xs p-6 sm:p-8">
            {/* ---------------------------------------------------- */}
            {/* STEP 1: PERSONAL INFORMATION & PROFILE PHOTO */}
            {/* ---------------------------------------------------- */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-[#C85A32]" />
                    Personal Information
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Please provide your contact information and upload your professional profile photo. All fields are required.
                  </p>
                </div>

                {/* Profile Photo Upload Section */}
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC]">
                  <label className="block text-xs font-semibold text-stone-800 mb-2">
                    Profile Photo <span className="text-[#C85A32]">*</span>
                  </label>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Avatar Preview */}
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 rounded-full border-2 border-[#D5CCC0] overflow-hidden bg-[#ECE6DC] flex items-center justify-center shadow-2xs">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Profile Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-9 h-9 text-stone-400" />
                        )}
                      </div>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute -top-1 -right-1 p-1 rounded-full bg-stone-800 text-white hover:bg-red-600 transition-colors shadow-xs cursor-pointer"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Photo Controls */}
                    <div className="flex-1 text-center sm:text-left">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoSelect}
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                      />

                      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-lg border border-[#D5CCC0] bg-[#FFFFFF] hover:bg-[#F2ECE3] text-stone-800 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#C85A32]" />
                          <span>
                            {photoPreview ? "Change Photo" : "Upload Photo"}
                          </span>
                        </button>

                        {photoPreview && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="px-3 py-1.5 rounded-lg border border-[#E8D0CC] text-[#A64522] hover:bg-[#FBF0EE] text-xs font-medium transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-stone-500 mt-1.5">
                        JPEG, PNG, or WEBP (Max 5MB). Saved to Firebase Storage.
                      </p>

                      {errors.photo && (
                        <p className="text-[11px] text-[#99281B] font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {errors.photo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Personal Information Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Full Name <span className="text-[#C85A32]">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errors.fullName) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.fullName;
                            return next;
                          });
                        }
                      }}
                      placeholder="e.g. John Doe"
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all ${
                        errors.fullName
                          ? "border-[#E8A59E] focus:border-[#C85A32]"
                          : "border-[#D9D3C7] focus:border-[#C85A32]"
                      }`}
                      required
                    />
                    {errors.fullName && (
                      <p className="text-[11px] text-[#99281B] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Email Address <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#E0D8CC] bg-[#F2EDE5] text-stone-700 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">
                      Verified via Firebase Authentication.
                    </p>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Phone Number <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (errors.phone) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.phone;
                              return next;
                            });
                          }
                        }}
                        placeholder="e.g. +91 98765 43210"
                        className={`w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all ${
                          errors.phone
                            ? "border-[#E8A59E] focus:border-[#C85A32]"
                            : "border-[#D9D3C7] focus:border-[#C85A32]"
                        }`}
                        required
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-[11px] text-[#99281B] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Current City / Location */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Current Location / City <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => {
                          setLocation(e.target.value);
                          if (errors.location) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.location;
                              return next;
                            });
                          }
                        }}
                        placeholder="e.g. Bengaluru, Karnataka, India"
                        className={`w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all ${
                          errors.location
                            ? "border-[#E8A59E] focus:border-[#C85A32]"
                            : "border-[#D9D3C7] focus:border-[#C85A32]"
                        }`}
                        required
                      />
                    </div>
                    {errors.location && (
                      <p className="text-[11px] text-[#99281B] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 1 Footer Nav */}
                <div className="pt-4 border-t border-[#EDE7DD] flex justify-end">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-[#FAF8F5] text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Continue to Education</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 2: ACADEMIC BACKGROUND & EDUCATION */}
            {/* ---------------------------------------------------- */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#C85A32]" />
                    Academic Background & Education
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Enter your college, degree, branch, and graduation timeline. All fields are required.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* College / University Name */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      College / University Name <span className="text-[#C85A32]">*</span>
                    </label>
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => {
                        setCollege(e.target.value);
                        if (errors.college) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.college;
                            return next;
                          });
                        }
                      }}
                      placeholder="e.g. National Institute of Technology (NIT) or Delhi University"
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all ${
                        errors.college
                          ? "border-[#E8A59E] focus:border-[#C85A32]"
                          : "border-[#D9D3C7] focus:border-[#C85A32]"
                      }`}
                      required
                    />
                    {errors.college && (
                      <p className="text-[11px] text-[#99281B] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.college}
                      </p>
                    )}
                  </div>

                  {/* Degree & Branch */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Degree */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-800 mb-1">
                        Degree <span className="text-[#C85A32]">*</span>
                      </label>
                      <select
                        value={degree}
                        onChange={(e) => setDegree(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all font-medium"
                      >
                        {DEGREE_OPTIONS.map((deg) => (
                          <option key={deg} value={deg}>
                            {deg}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Branch */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-800 mb-1">
                        Branch / Specialization <span className="text-[#C85A32]">*</span>
                      </label>
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all font-medium"
                      >
                        {BRANCH_OPTIONS.map((br) => (
                          <option key={br} value={br}>
                            {br}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Graduation Year, CGPA, and Current Semester */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Graduation Year */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-800 mb-1">
                        Graduation Year <span className="text-[#C85A32]">*</span>
                      </label>
                      <select
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all"
                      >
                        {GRADUATION_YEARS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CGPA / Percentage */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-800 mb-1">
                        CGPA / Percentage <span className="text-[#C85A32]">*</span>
                      </label>
                      <input
                        type="text"
                        value={cgpa}
                        onChange={(e) => {
                          setCgpa(e.target.value);
                          if (errors.cgpa) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.cgpa;
                              return next;
                            });
                          }
                        }}
                        placeholder="e.g. 8.5 / 10 or 85%"
                        className={`w-full px-3 py-2 text-xs rounded-xl border bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all ${
                          errors.cgpa
                            ? "border-[#E8A59E] focus:border-[#C85A32]"
                            : "border-[#D9D3C7] focus:border-[#C85A32]"
                        }`}
                        required
                      />
                      {errors.cgpa && (
                        <p className="text-[11px] text-[#99281B] font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.cgpa}
                        </p>
                      )}
                    </div>

                    {/* Current Semester / Year */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-800 mb-1">
                        Current Year / Semester <span className="text-[#C85A32]">*</span>
                      </label>
                      <select
                        value={currentSemester}
                        onChange={(e) => setCurrentSemester(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all"
                      >
                        {SEMESTER_OPTIONS.map((sem) => (
                          <option key={sem} value={sem}>
                            {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Step 2 Footer Nav */}
                <div className="pt-4 border-t border-[#EDE7DD] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-4 py-2 rounded-xl border border-[#D5CCC0] text-stone-700 hover:bg-[#F2ECE3] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-[#FAF8F5] text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Continue to Career & Skills</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 3: CAREER GOALS & TECHNICAL SKILLS */}
            {/* ---------------------------------------------------- */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[#C85A32]" />
                    Career Goals & Technical Skills
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Choose your target career path, programming languages, and technical competencies. All fields are required.
                  </p>
                </div>

                {/* Target Role & Target Industry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Target Role <span className="text-[#C85A32]">*</span>
                    </label>
                    <select
                      value={preferredJobRole}
                      onChange={(e) => setPreferredJobRole(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all font-medium"
                    >
                      {Object.keys(ROLE_BENCHMARKS).map((role) => (
                        <option key={role} value={role}>
                          {role} (Benchmarked in JobPlanner)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Target Industry <span className="text-[#C85A32]">*</span>
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all font-medium"
                    >
                      {INDUSTRY_OPTIONS.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Technical Skills Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-stone-800">
                      Technical Skills <span className="text-[#C85A32]">*</span>
                    </label>
                    <span className="text-[11px] text-stone-500">
                      {skills.length} skills selected
                    </span>
                  </div>

                  {/* Selected Skill Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5 min-h-[38px] p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4DC]">
                    {skills.length === 0 ? (
                      <span className="text-xs text-stone-400 italic">
                        No skills selected yet. Select from recommendations below or type custom skills.
                      </span>
                    ) : (
                      skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FAF0EA] text-[#8C4A2F] border border-[#F3DACF]"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className="hover:text-red-600 transition-colors ml-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Custom Skill Input */}
                  <form onSubmit={handleAddCustomSkill} className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={customSkillInput}
                      onChange={(e) => setCustomSkillInput(e.target.value)}
                      placeholder="Add custom skill (e.g. Next.js, PyTorch, Figma)..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-stone-800 text-[#FAF8F5] hover:bg-stone-900 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>

                  {/* Recommended Pill Cloud */}
                  <div>
                    <div className="text-[11px] font-semibold text-stone-500 mb-1.5">
                      Recommended for {preferredJobRole}:
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {Array.from(
                        new Set([
                          ...(ROLE_BENCHMARKS[preferredJobRole]?.requiredSkills || []),
                          ...(ROLE_BENCHMARKS[preferredJobRole]?.recommendedSkills || []),
                          ...POPULAR_SKILLS,
                        ])
                      ).map((skill) => {
                        const isSelected = skills.includes(skill);
                        return (
                          <button
                            type="button"
                            key={skill}
                            onClick={() => toggleSkill(skill)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#C85A32] text-white border-[#B24E2A]"
                                : "bg-[#FFFFFF] hover:bg-[#F2ECE3] text-stone-700 border-[#D9D3C7]"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {errors.skills && (
                    <p className="text-[11px] text-[#99281B] font-medium mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.skills}
                    </p>
                  )}
                </div>

                {/* Programming Languages */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-stone-800">
                      Programming Languages <span className="text-[#C85A32]">*</span>
                    </label>
                    <span className="text-[11px] text-stone-500">
                      {programmingLanguages.length} selected
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {COMMON_PROGRAMMING_LANGS.map((lang) => {
                      const isSelected = programmingLanguages.includes(lang);
                      return (
                        <button
                          type="button"
                          key={lang}
                          onClick={() => toggleLang(lang)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#2D4F3A] text-white border-[#223E2E]"
                              : "bg-[#FFFFFF] hover:bg-[#F2ECE3] text-stone-700 border-[#D9D3C7]"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {lang}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Language Input */}
                  <form onSubmit={handleAddCustomLang} className="flex gap-2">
                    <input
                      type="text"
                      value={customLangInput}
                      onChange={(e) => setCustomLangInput(e.target.value)}
                      placeholder="Add another language (e.g. Swift, Dart, Ruby)..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-stone-800 text-[#FAF8F5] hover:bg-stone-900 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>

                  {errors.programmingLanguages && (
                    <p className="text-[11px] text-[#99281B] font-medium mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.programmingLanguages}
                    </p>
                  )}
                </div>

                {/* Location & Experience Level */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preferred Location */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Preferred Job Location / Mode <span className="text-[#C85A32]">*</span>
                    </label>
                    <select
                      value={preferredLocation}
                      onChange={(e) => setPreferredLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] outline-none"
                    >
                      {LOCATION_OPTIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Experience Level */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Experience Level <span className="text-[#C85A32]">*</span>
                    </label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] outline-none"
                    >
                      {EXPERIENCE_LEVELS.map((exp) => (
                        <option key={exp} value={exp}>
                          {exp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 3 Footer Nav */}
                <div className="pt-4 border-t border-[#EDE7DD] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-4 py-2 rounded-xl border border-[#D5CCC0] text-stone-700 hover:bg-[#F2ECE3] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-[#FAF8F5] text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Continue to Additional Info</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 4: ADDITIONAL INFORMATION & PROFILES */}
            {/* ---------------------------------------------------- */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#C85A32]" />
                    Additional Information & Profiles
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Connect your professional links, state your availability, and provide a short career summary. All fields are required.
                  </p>
                </div>

                {/* Professional Links Grid */}
                <div className="space-y-4">
                  {/* LinkedIn Profile */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      LinkedIn Profile URL <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <Linkedin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => {
                          setLinkedinUrl(e.target.value);
                          if (errors.linkedinUrl) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.linkedinUrl;
                              return next;
                            });
                          }
                        }}
                        placeholder="https://linkedin.com/in/your-profile"
                        className={`w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all ${
                          errors.linkedinUrl
                            ? "border-[#E8A59E] focus:border-[#C85A32]"
                            : "border-[#D9D3C7] focus:border-[#C85A32]"
                        }`}
                        required
                      />
                    </div>
                    {errors.linkedinUrl && (
                      <p className="text-[11px] text-[#99281B] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.linkedinUrl}
                      </p>
                    )}
                  </div>

                  {/* GitHub Profile */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      GitHub Profile URL <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <Github className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => {
                          setGithubUrl(e.target.value);
                          if (errors.githubUrl) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.githubUrl;
                              return next;
                            });
                          }
                        }}
                        placeholder="https://github.com/your-username"
                        className={`w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all ${
                          errors.githubUrl
                            ? "border-[#E8A59E] focus:border-[#C85A32]"
                            : "border-[#D9D3C7] focus:border-[#C85A32]"
                        }`}
                        required
                      />
                    </div>
                    {errors.githubUrl && (
                      <p className="text-[11px] text-[#99281B] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.githubUrl}
                      </p>
                    )}
                  </div>

                  {/* Portfolio URL & Notice Period */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Portfolio Website */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-800 mb-1">
                        Portfolio / Project URL <span className="text-[#C85A32]">*</span>
                      </label>
                      <div className="relative">
                        <Globe className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                        <input
                          type="url"
                          value={portfolioUrl}
                          onChange={(e) => {
                            setPortfolioUrl(e.target.value);
                            if (errors.portfolioUrl) {
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.portfolioUrl;
                                return next;
                              });
                            }
                          }}
                          placeholder="https://yourportfolio.dev"
                          className={`w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all ${
                            errors.portfolioUrl
                              ? "border-[#E8A59E] focus:border-[#C85A32]"
                              : "border-[#D9D3C7] focus:border-[#C85A32]"
                          }`}
                          required
                        />
                      </div>
                      {errors.portfolioUrl && (
                        <p className="text-[11px] text-[#99281B] font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.portfolioUrl}
                        </p>
                      )}
                    </div>

                    {/* Notice Period / Availability */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-800 mb-1">
                        Availability / Notice Period <span className="text-[#C85A32]">*</span>
                      </label>
                      <div className="relative">
                        <Clock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                        <select
                          value={availability}
                          onChange={(e) => setAvailability(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] outline-none"
                        >
                          {AVAILABILITY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Career Summary / Professional Bio */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-stone-800">
                        Professional Bio / Career Summary <span className="text-[#C85A32]">*</span>
                      </label>
                      <span className="text-[11px] text-stone-500">
                        {bio.length} characters (min 20)
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => {
                        setBio(e.target.value);
                        if (errors.bio) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.bio;
                            return next;
                          });
                        }
                      }}
                      placeholder="Briefly describe your career goals, strengths, and what drives you..."
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all ${
                        errors.bio
                          ? "border-[#E8A59E] focus:border-[#C85A32]"
                          : "border-[#D9D3C7] focus:border-[#C85A32]"
                      }`}
                      required
                    />
                    {errors.bio && (
                      <p className="text-[11px] text-[#99281B] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 4 Footer Nav & Submit */}
                {submissionError && (
                  <div className="p-3.5 rounded-xl bg-[#FDF2F0] border border-[#F6C6BE] flex items-start gap-2.5 text-xs text-[#99281B] animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#C85A32]" />
                    <div className="flex-1 leading-relaxed">{submissionError}</div>
                  </div>
                )}

                <div className="pt-4 border-t border-[#EDE7DD] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-[#D5CCC0] text-stone-700 hover:bg-[#F2ECE3] text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-[#FAF8F5] text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>
                          {isPhotoUploading
                            ? "Uploading photo to Firebase Storage..."
                            : "Saving profile to Cloud Firestore..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Complete Profile & Launch Dashboard</span>
                        <Sparkles className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-stone-500 border-t border-[#EDE7DD]">
        <div className="max-w-4xl mx-auto px-4">
          JOBPLANNER – Learn. Prepare. Get Hired. • Profile stored in Firestore users/{currentUser.uid}
        </div>
      </footer>
    </div>
  );
};
