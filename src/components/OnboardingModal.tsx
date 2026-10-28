import React, { useState } from "react";
import {
  User,
  GraduationCap,
  Wrench,
  Target,
  FolderGit2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { UserProfile, ProjectItem, ExperienceLevel } from "../types";
import { ROLE_BENCHMARKS, COMMON_SKILLS_LIST, INTEREST_OPTIONS } from "../lib/defaultData";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
}) => {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<UserProfile>(() => ({
    ...currentProfile,
    skills: Array.isArray(currentProfile?.skills) ? currentProfile.skills : [],
    interests: Array.isArray(currentProfile?.interests) ? currentProfile.interests : [],
    projects: Array.isArray(currentProfile?.projects) ? currentProfile.projects : [],
    education: currentProfile?.education || {
      degree: "B.Tech Computer Science",
      field_of_study: "Information Technology",
      college_name: "Institute of Technology",
      graduation_year: 2025,
      cgpa: "8.4",
    },
  }));
  const [customSkill, setCustomSkill] = useState("");

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else {
      onSaveProfile({ ...formData, onboarding_completed: true });
      onClose();
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleSkill = (skill: string) => {
    const currentSkills = formData.skills || [];
    if (currentSkills.includes(skill)) {
      setFormData({
        ...formData,
        skills: currentSkills.filter((s) => s !== skill),
      });
    } else {
      setFormData({
        ...formData,
        skills: [...currentSkills, skill],
      });
    }
  };

  const addCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const currentSkills = formData.skills || [];
    if (customSkill.trim() && !currentSkills.includes(customSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...currentSkills, customSkill.trim()],
      });
      setCustomSkill("");
    }
  };

  const toggleInterest = (interest: string) => {
    const currentInterests = formData.interests || [];
    if (currentInterests.includes(interest)) {
      setFormData({
        ...formData,
        interests: currentInterests.filter((i) => i !== interest),
      });
    } else {
      setFormData({
        ...formData,
        interests: [...currentInterests, interest],
      });
    }
  };

  const addProject = () => {
    const currentProjects = formData.projects || [];
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: "New Practical Project",
      description: "Brief summary of what you built, datasets analyzed, or problem resolved.",
      tech_stack: ["Python", "SQL"],
      github_url: "https://github.com/username/project",
    };
    setFormData({
      ...formData,
      projects: [...currentProjects, newProj],
    });
  };

  const removeProject = (id: string) => {
    const currentProjects = formData.projects || [];
    setFormData({
      ...formData,
      projects: currentProjects.filter((p) => p.id !== id),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in">
        {/* Step Indicator Header */}
        <div className="bg-[#FFFDF9] border-b border-[#EDE7DD] p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-stone-400 hover:text-stone-700 text-xs font-semibold p-1"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-[#C85A32]">
              Step {step} of 4 • Welcome & Profile Setup
            </span>
            <h2 className="text-xl font-bold text-stone-900 mt-1 font-editorial">
              {step === 1 && "Personal & Education Background"}
              {step === 2 && "Skills & Career Interests"}
              {step === 3 && "Target Career Role & Level"}
              {step === 4 && "Projects & Practical Experience"}
            </h2>
          </div>

          <div className="mt-4 flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-[#C85A32]" : "bg-[#EAE4DA]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* STEP 1: Personal & Education */}
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] focus:outline-none focus:border-[#C85A32] text-stone-900"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] focus:outline-none focus:border-[#C85A32] text-stone-900"
                    placeholder="name@college.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  College / University
                </label>
                <input
                  type="text"
                  value={formData.education?.college || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      education: { ...formData.education, college: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] focus:outline-none focus:border-[#C85A32] text-stone-900"
                  placeholder="e.g. Delhi Technological University / State University"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Degree</label>
                  <input
                    type="text"
                    value={formData.education?.degree || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        education: { ...formData.education, degree: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900"
                    placeholder="B.Tech, BCA, B.Sc"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Branch / Major</label>
                  <input
                    type="text"
                    value={formData.education?.branch || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        education: { ...formData.education, branch: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900"
                    placeholder="CSE, Data, IT"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Graduation Year</label>
                  <input
                    type="text"
                    value={formData.education?.graduation_year || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        education: { ...formData.education, graduation_year: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900"
                    placeholder="2025"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">CGPA / Percentage</label>
                <input
                  type="text"
                  value={formData.education?.cgpa || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      education: { ...formData.education, cgpa: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900"
                  placeholder="8.4 / 10.0"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Skills & Interests */}
          {step === 2 && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Select Your Current Technical Skills:
                </label>
                <p className="text-[11px] text-stone-500 mb-2.5">
                  Pick tools you have practiced with in class, personal projects, or internships.
                </p>

                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E7E2DA]">
                  {COMMON_SKILLS_LIST.map((skill) => {
                    const isSelected = formData.skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-[#FAF0EB] text-[#A64522] border-[#C85A32] font-semibold"
                            : "bg-[#FFFFFF] text-stone-700 border-[#E7E2DA] hover:border-[#D0C8BB]"
                        }`}
                      >
                        {skill} {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Skill */}
              <form onSubmit={addCustomSkill} className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Add another skill..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-900"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold"
                >
                  Add
                </button>
              </form>

              {/* Interests */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1.5">
                  Career Interests:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {INTEREST_OPTIONS.map((interest) => {
                    const isSelected = formData.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-[#EDF5EE] text-[#2C4E33] border-[#345B3C] font-semibold"
                            : "bg-[#FFFFFF] text-stone-700 border-[#E7E2DA]"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Target Role & Level */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Choose Your Target Career Role:
                </label>
                <p className="text-[11px] text-stone-500 mb-2.5">
                  JobPlanner will evaluate your readiness, skill gaps, and interview prep specifically for this path.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.keys(ROLE_BENCHMARKS).map((role) => {
                    const isSelected = formData.target_role === role;
                    return (
                      <div
                        key={role}
                        onClick={() => setFormData({ ...formData, target_role: role })}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#C85A32] bg-[#FFFDF9] font-bold text-stone-900 shadow-2xs"
                            : "border-[#EAE4DA] hover:border-[#D5CDC0] bg-[#FAF8F5] text-stone-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{role}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#C85A32]" />}
                        </div>
                        <span className="text-[10px] text-stone-500 font-normal block mt-1">
                          Benchmark: {ROLE_BENCHMARKS[role]?.requiredSkills.slice(0, 3).join(", ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1.5">
                  Current Experience Level:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Student / In College",
                    "Fresher / 0 Years",
                    "Intern / Recent Grad",
                    "Junior (1-2 Years)",
                  ].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFormData({ ...formData, experience_level: lvl as ExperienceLevel })}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        formData.experience_level === lvl
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-[#FAF8F5] text-stone-700 border-[#E7E2DA] hover:border-[#D0C8BB]"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Projects */}
          {step === 4 && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-stone-800">
                    Academic or Personal Projects ({(formData.projects || []).length})
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Having concrete projects is the #1 proof point for young job seekers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addProject}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF0EB] text-[#A64522] text-xs font-semibold hover:bg-[#F3DDD3] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Project</span>
                </button>
              </div>

              <div className="space-y-3">
                {(formData.projects || []).map((proj, idx) => (
                  <div key={proj.id} className="p-3.5 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">Project #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeProject(proj.id)}
                        className="text-stone-400 hover:text-[#C85A32] text-xs font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                          Project Title
                        </label>
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) => {
                            const updated = [...formData.projects];
                            updated[idx].title = e.target.value;
                            setFormData({ ...formData, projects: updated });
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E7E2DA] bg-[#FFFFFF] text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                          GitHub / Demo URL
                        </label>
                        <input
                          type="text"
                          value={proj.github_url || ""}
                          onChange={(e) => {
                            const updated = [...formData.projects];
                            updated[idx].github_url = e.target.value;
                            setFormData({ ...formData, projects: updated });
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E7E2DA] bg-[#FFFFFF] text-stone-900"
                          placeholder="https://github.com/..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                        Brief Summary
                      </label>
                      <textarea
                        rows={2}
                        value={proj.description}
                        onChange={(e) => {
                          const updated = [...formData.projects];
                          updated[idx].description = e.target.value;
                          setFormData({ ...formData, projects: updated });
                        }}
                        className="w-full p-2 text-xs rounded-lg border border-[#E7E2DA] bg-[#FFFFFF] text-stone-900 leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-5 bg-[#FAF8F5] border-t border-[#EDE7DD] flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-30 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
          >
            <span>{step === 4 ? "Complete Profile & Start" : "Continue"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
