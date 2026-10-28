import React from "react";
import {
  Compass,
  LayoutDashboard,
  BarChart3,
  GitCompare,
  Milestone,
  FileText,
  MessageSquareCode,
  Briefcase,
  Database,
  UserCheck,
  ChevronDown,
  Sparkles,
  Cloud,
  LogIn,
  Bot,
  TrendingUp,
  CheckSquare,
  FolderGit2,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { UserProfile } from "../types";
import { ROLE_BENCHMARKS } from "../lib/defaultData";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: UserProfile;
  currentUser?: FirebaseUser | null;
  applicationsCount?: number;
  onOpenOnboarding: () => void;
  onOpenAuthModal: () => void;
  onOpenSupabaseModal?: () => void;
  isSupabaseActive?: boolean;
  isFirebaseSynced?: boolean;
  onRoleChange: (newRole: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  currentUser,
  applicationsCount = 0,
  onOpenOnboarding,
  onOpenAuthModal,
  onOpenSupabaseModal,
  isSupabaseActive,
  isFirebaseSynced,
  onRoleChange,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);

  const navItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "portfolio", label: "AI Portfolio", icon: FolderGit2 },
    { id: "analytics", label: "Career Analytics", icon: TrendingUp },
    { id: "applications", label: "Job Applications", icon: CheckSquare, badge: applicationsCount },
    { id: "assistant", label: "AI Career Assistant", icon: Bot },
    { id: "readiness", label: "Career Readiness", icon: BarChart3 },
    { id: "skillgap", label: "Skill Gap", icon: GitCompare },
    { id: "roadmap", label: "Career Roadmap", icon: Milestone },
    { id: "resume", label: "Resume Builder", icon: FileText },
    { id: "interview", label: "Interview Prep", icon: MessageSquareCode },
    { id: "jobs", label: "Job Opportunities", icon: Briefcase },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E7E2DA]">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Target Selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("dashboard")}
              className="flex items-center gap-3 text-left group"
            >
              <img
                src="/assets/jobplanner-logo.svg"
                alt="JobPlanner Logo"
                className="w-9 h-9 object-contain rounded-xl shadow-xs group-hover:scale-105 transition-transform"
              />
              <div>
                <span className="font-bold text-base text-stone-900 tracking-tight flex items-center gap-2">
                  JobPlanner
                  <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-[#F3ECE4] text-[#8C4A2F] border border-[#E9DFD3]">
                    For Students
                  </span>
                </span>
                <p className="text-[11px] text-stone-500 font-medium">Learn. Prepare. Get Hired.</p>
              </div>
            </button>

            {/* Target Role Selector Pill */}
            <div className="relative hidden md:block ml-3">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F2EDE5] hover:bg-[#EAE3D8] text-stone-800 border border-[#E2D9CC] transition-colors"
                title="Change Target Career Role"
              >
                <span className="text-stone-500 font-normal">Target:</span>
                <span className="text-[#A64522] font-semibold">{profile?.target_role || "Data Analyst"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-[#FFFFFF] border border-[#E2DDD5] rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    Target Career Path
                  </div>
                  {Object.keys(ROLE_BENCHMARKS).map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        onRoleChange(role);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#FAF6F1] transition-colors ${
                        profile?.target_role === role ? "font-semibold text-[#A64522] bg-[#FAF3EC]" : "text-stone-700"
                      }`}
                    >
                      <span>{role}</span>
                      {profile?.target_role === role && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32]"></span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Firebase Cloud Sync & Auth Button */}
            <button
              onClick={onOpenAuthModal}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${
                currentUser
                  ? "bg-[#EEF4EF] text-[#2F5236] border-[#D5E3D8] hover:bg-[#E3EEE5]"
                  : "bg-[#FBEFE9] text-[#A64522] border-[#F3DACF] hover:bg-[#F7E5DC]"
              }`}
              title={
                currentUser
                  ? `Signed in as ${currentUser.email} • Firestore Synced`
                  : "Sign in with Google or Email to sync to Firebase Cloud"
              }
            >
              {currentUser ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-[#345B3C]" />
                  <span className="font-semibold text-[11px] hidden xs:inline">
                    Firebase Synced
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3D7A4A] animate-pulse" />
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span className="font-semibold text-[11px]">Sign In</span>
                </>
              )}
            </button>

            {/* User Profile / Onboarding trigger */}
            <button
              onClick={onOpenOnboarding}
              className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-[#F3EFEA] hover:bg-[#EAE3D8] text-stone-800 border border-[#E2D9CC] transition-colors"
            >
              <img
                src={
                  currentUser?.photoURL ||
                  profile?.avatar_url ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                }
                alt={currentUser?.displayName || profile?.full_name || "User"}
                className="w-6 h-6 rounded-full object-cover border border-[#D5CCC0]"
              />
              <span className="text-xs font-semibold hidden md:inline truncate max-w-[120px]">
                {(currentUser?.displayName || profile?.full_name || "User").split(" ")[0]}
              </span>
              <UserCheck className="w-3.5 h-3.5 text-[#A64522]" />
            </button>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="flex items-center space-x-1.5 overflow-x-auto py-2 scrollbar-none text-xs border-t border-[#ECE6DC]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-stone-900 text-[#FAF8F5] shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-[#F0ECE4]/80"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#E6B89C]" : "text-stone-400"}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-[#C85A32] text-white"
                        : "bg-[#F3EFEA] text-[#A64522] border border-[#E9DFD3]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
