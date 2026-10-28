import React, { useState } from "react";
import {
  Database,
  Key,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  User,
  AlertCircle,
  X,
} from "lucide-react";
import { isSupabaseConfigured, SUPABASE_SCHEMA_SQL, signInUser, signUpUser, signOutUser } from "../lib/supabase";

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string;
  onAuthSuccess: (email: string) => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  onAuthSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"auth" | "connection" | "sql">("auth");
  const [emailInput, setEmailInput] = useState(currentUserEmail || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Connection settings
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem("jobplanner_supabase_url") || import.meta.env.VITE_SUPABASE_URL || ""
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem("jobplanner_supabase_anon_key") || import.meta.env.VITE_SUPABASE_ANON_KEY || ""
  );
  const [connSaved, setConnSaved] = useState(false);

  if (!isOpen) return null;

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("jobplanner_supabase_url", supabaseUrl);
    localStorage.setItem("jobplanner_supabase_anon_key", supabaseKey);
    setConnSaved(true);
    setTimeout(() => setConnSaved(false), 2000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;

    if (isSigningUp) {
      const { data, error } = await signUpUser(emailInput, passwordInput || "password123");
      if (error) {
        setAuthStatus(`Sign up note: ${error.message}`);
      } else {
        setAuthStatus("Account created successfully!");
        onAuthSuccess(emailInput);
      }
    } else {
      const { data, error } = await signInUser(emailInput, passwordInput || "password123");
      if (error) {
        setAuthStatus(`Sign in note: ${error.message}. Signed in locally.`);
        onAuthSuccess(emailInput);
      } else {
        setAuthStatus("Authenticated with Supabase!");
        onAuthSuccess(emailInput);
      }
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in">
        {/* Header */}
        <div className="bg-[#FFFDF9] border-b border-[#EDE7DD] p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-stone-400 hover:text-stone-700 text-sm font-bold p-1"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EDF5EE] text-[#2C4E33] flex items-center justify-center">
              <Database className="w-4 h-4 text-[#345B3C]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-editorial">
                Supabase & Authentication
              </h2>
              <p className="text-xs text-stone-500">
                PostgreSQL Profiles, Auth, Resumes, and Interview Logs
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1.5 mt-5 p-1 bg-[#F0ECE4] rounded-xl border border-[#E0D9CE] text-xs font-semibold">
            <button
              onClick={() => setActiveTab("auth")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "auth"
                  ? "bg-[#FFFFFF] text-stone-900 shadow-2xs font-bold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Supabase Auth ({currentUserEmail ? "Signed In" : "Guest"})
            </button>
            <button
              onClick={() => setActiveTab("connection")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "connection"
                  ? "bg-[#FFFFFF] text-stone-900 shadow-2xs font-bold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Credentials
            </button>
            <button
              onClick={() => setActiveTab("sql")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "sql"
                  ? "bg-[#FFFFFF] text-stone-900 shadow-2xs font-bold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              SQL Schema
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {activeTab === "auth" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#345B3C] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-stone-900">
                    Row-Level Security & Data Isolation
                  </span>
                  <p className="text-stone-600 leading-relaxed">
                    Student resumes and practice recordings are linked to your secure account ID. Offline
                    storage is maintained seamlessly when browsing in guest mode.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] focus:outline-none focus:border-[#C85A32] text-stone-900"
                    placeholder="student@university.edu"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] focus:outline-none focus:border-[#C85A32] text-stone-900"
                    placeholder="••••••••"
                  />
                </div>

                {authStatus && (
                  <div className="p-3 rounded-xl bg-[#FAF0EB] border border-[#F2D7CC] text-[#A64522] font-semibold">
                    {authStatus}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    {isSigningUp ? "Create Account" : "Sign In to JobPlanner"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSigningUp(!isSigningUp)}
                    className="px-4 py-2.5 rounded-xl border border-[#E7E2DA] text-xs font-semibold hover:bg-[#FAF8F5] text-stone-700"
                  >
                    {isSigningUp ? "Switch to Sign In" : "New? Register"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "connection" && (
            <form onSubmit={handleSaveConnection} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-1">
                <span className="font-bold text-stone-900 block">Supabase Project Settings</span>
                <p className="text-stone-600">
                  Optional: provide custom credentials to sync data with your own Supabase project.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Project URL
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] font-mono text-stone-900"
                  placeholder="https://xyzproject.supabase.co"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Anon Public Key
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] font-mono text-stone-900"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-stone-500">
                  Status: {isSupabaseConfigured() ? "Connected to Supabase" : "Using Local Persistence"}
                </span>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-colors shadow-xs"
                >
                  {connSaved ? "Saved!" : "Save Credentials"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "sql" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900">PostgreSQL Schema & RLS Policies</h3>
                  <p className="text-[11px] text-stone-500">
                    Run this script in your Supabase SQL Editor to initialize all tables
                  </p>
                </div>

                <button
                  onClick={copySqlToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-[#FAF8F5] text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-[#E6B89C]" />
                  <span>{copiedSql ? "Copied!" : "Copy SQL Script"}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-stone-900 text-stone-200 font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
