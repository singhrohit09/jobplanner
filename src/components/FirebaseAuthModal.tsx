import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  User,
  AlertCircle,
  X,
  LogOut,
  Sparkles,
  Cloud,
  Check,
  RefreshCw,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import {
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  syncUserDataToFirestore,
} from "../lib/firebase";
import {
  UserProfile,
  ReadinessAnalysis,
  RoadmapStep,
  ResumeData,
  PracticeRecord,
  PlanTier,
} from "../types";

interface FirebaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  profile: UserProfile;
  readiness: ReadinessAnalysis;
  roadmap: RoadmapStep[];
  resume: ResumeData;
  practiceHistory: PracticeRecord[];
  subscriptionPlan: PlanTier;
  onAuthSuccess: (user: FirebaseUser) => void;
  onSignOut: () => void;
}

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  profile,
  readiness,
  roadmap,
  resume,
  practiceHistory,
  subscriptionPlan,
  onAuthSuccess,
  onSignOut,
}) => {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [emailInput, setEmailInput] = useState(currentUser?.email || profile.email || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState(profile.full_name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setAuthError(null);
    const { user, error } = await signInWithGoogle();
    setIsSubmitting(false);

    if (error) {
      setAuthError(error);
    } else if (user) {
      setSuccessMessage("Signed in with Google successfully!");
      onAuthSuccess(user);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setAuthError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);

    if (authMode === "signup") {
      const { user, error } = await registerWithEmail(
        emailInput.trim(),
        passwordInput,
        nameInput.trim() || profile.full_name
      );
      setIsSubmitting(false);

      if (error) {
        setAuthError(error);
      } else if (user) {
        setSuccessMessage("Account created and signed in!");
        onAuthSuccess(user);
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 1200);
      }
    } else {
      const { user, error } = await loginWithEmail(emailInput.trim(), passwordInput);
      setIsSubmitting(false);

      if (error) {
        setAuthError(error);
      } else if (user) {
        setSuccessMessage("Welcome back! Signed in successfully.");
        onAuthSuccess(user);
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 1200);
      }
    }
  };

  const handleSignOutClick = async () => {
    setIsSubmitting(true);
    await logoutUser();
    setIsSubmitting(false);
    onSignOut();
    setSuccessMessage("You have been signed out.");
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  const handleForceManualSync = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    setAuthError(null);

    const res = await syncUserDataToFirestore(currentUser.uid, {
      profile,
      readiness,
      roadmap,
      resume,
      practiceHistory,
      subscriptionPlan,
      overallScore: readiness.score,
    });

    setIsSyncing(false);
    if (res.success) {
      setSuccessMessage("All workspace data synced to Cloud Firestore!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setAuthError(res.error || "Failed to sync to Firestore.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-lg w-full shadow-2xl overflow-hidden my-8 animate-in fade-in">
        {/* Header */}
        <div className="bg-[#FFFDF9] border-b border-[#EDE7DD] p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-stone-400 hover:text-stone-700 text-sm font-bold p-1 rounded-lg hover:bg-[#F3EFEA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FBEFE9] text-[#C85A32] flex items-center justify-center border border-[#F3DACF]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-editorial">
                Firebase Cloud & Authentication
              </h2>
              <p className="text-xs text-stone-500">
                Securely sync your readiness, ATS resume, and interview history
              </p>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {successMessage && (
          <div className="bg-[#EDF5EE] text-[#2C4E33] border-b border-[#D5E4D8] p-3 text-center text-xs font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#345B3C]" />
            <span>{successMessage}</span>
          </div>
        )}

        {authError && (
          <div className="bg-[#FDF2F2] text-[#9E2A2B] border-b border-[#F5D5D5] p-3 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <div className="p-6">
          {currentUser ? (
            /* Signed In State */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EDE7DD]">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      currentUser.photoURL ||
                      profile.avatar_url ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    }
                    alt={currentUser.displayName || profile.full_name}
                    className="w-12 h-12 rounded-full object-cover border border-[#D5CCC0]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900 truncate">
                        {currentUser.displayName || profile.full_name}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF5EE] text-[#2C4E33]">
                        <Check className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 truncate">{currentUser.email}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5 font-mono truncate">
                      UID: {currentUser.uid}
                    </p>
                  </div>
                </div>
              </div>

              {/* Synchronized Items Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                  Cloud Firestore Synchronized Data:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EDE7DD] flex items-center justify-between">
                    <span className="text-stone-600">Career Readiness</span>
                    <span className="font-bold text-[#C85A32]">{readiness.score}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EDE7DD] flex items-center justify-between">
                    <span className="text-stone-600">Skills Tracked</span>
                    <span className="font-bold text-stone-900">{profile.skills?.length || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EDE7DD] flex items-center justify-between">
                    <span className="text-stone-600">Resume Status</span>
                    <span className="font-bold text-[#2C4E33]">Updated</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#EDE7DD] flex items-center justify-between">
                    <span className="text-stone-600">Mock Interviews</span>
                    <span className="font-bold text-stone-900">{practiceHistory.length}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleForceManualSync}
                  disabled={isSyncing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#E6B89C]" : ""}`} />
                  <span>{isSyncing ? "Syncing..." : "Sync Now to Cloud"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOutClick}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 rounded-xl border border-[#E0D7CC] bg-[#FFFFFF] hover:bg-[#F9F6F0] text-stone-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-stone-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Signed Out / Sign In & Register Form */
            <div className="space-y-5">
              {/* Google One-Click Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl border border-[#DCD5CB] bg-[#FFFFFF] hover:bg-[#FAF8F5] text-stone-800 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#EDE7DD]" />
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
                  or with email
                </span>
                <div className="flex-1 h-px bg-[#EDE7DD]" />
              </div>

              {/* Mode Toggle */}
              <div className="flex p-1 bg-[#F3EFEA] rounded-xl border border-[#E5DFD5] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signin");
                    setAuthError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    authMode === "signin"
                      ? "bg-[#FFFFFF] text-stone-900 shadow-2xs font-bold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    authMode === "signup"
                      ? "bg-[#FFFFFF] text-stone-900 shadow-2xs font-bold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                {authMode === "signup" && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="e.g. Krissh Singh"
                        className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-[#C85A32] focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="student@university.edu"
                      className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-[#C85A32] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-[#C85A32] focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F8DDD1]" />
                  <span>
                    {isSubmitting
                      ? "Processing..."
                      : authMode === "signup"
                      ? "Create Free Account"
                      : "Sign In to Workspace"}
                  </span>
                </button>
              </form>

              {/* Security guarantee note */}
              <div className="pt-2 text-center text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#345B3C]" />
                <span>Protected by Firebase Authentication & Firestore Security Rules</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
