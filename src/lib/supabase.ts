import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { UserProfile, ResumeData, PracticeRecord, RoadmapStep } from "../types";
import { DEFAULT_SAMPLE_PROFILE } from "./defaultData";

// Retrieve keys from environment or localStorage overrides (for easy in-app testing)
const envUrl = import.meta.env.VITE_SUPABASE_URL || "";
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function getActiveSupabaseCredentials(): { url: string; key: string } {
  if (typeof window !== "undefined") {
    const localUrl = localStorage.getItem("jobplanner_supabase_url");
    const localKey = localStorage.getItem("jobplanner_supabase_key");
    if (localUrl && localKey) {
      return { url: localUrl, key: localKey };
    }
  }
  return { url: envUrl, key: envKey };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getActiveSupabaseCredentials();
  if (!url || !key || !url.startsWith("https://")) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.warn("Supabase init error:", e);
      return null;
    }
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

export function setCustomSupabaseCredentials(url: string, key: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("jobplanner_supabase_url", url);
    localStorage.setItem("jobplanner_supabase_key", key);
    supabaseInstance = null; // force reload
  }
}

export function clearCustomSupabaseCredentials() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("jobplanner_supabase_url");
    localStorage.removeItem("jobplanner_supabase_key");
    supabaseInstance = null;
  }
}

export async function signInUser(email: string, password: string): Promise<{ data: any; error: any }> {
  const client = getSupabaseClient();
  if (!client) {
    // Local mock sign in
    if (typeof window !== "undefined") {
      localStorage.setItem("jobplanner_mock_user_email", email);
    }
    return { data: { user: { email, id: "local-user-1" } }, error: null };
  }
  return await client.auth.signInWithPassword({ email, password });
}

export async function signUpUser(email: string, password: string): Promise<{ data: any; error: any }> {
  const client = getSupabaseClient();
  if (!client) {
    // Local mock sign up
    if (typeof window !== "undefined") {
      localStorage.setItem("jobplanner_mock_user_email", email);
    }
    return { data: { user: { email, id: "local-user-1" } }, error: null };
  }
  return await client.auth.signUp({ email, password });
}

export async function signOutUser(): Promise<{ error: any }> {
  const client = getSupabaseClient();
  if (!client) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("jobplanner_mock_user_email");
    }
    return { error: null };
  }
  return await client.auth.signOut();
}

// Local Storage Fallback Persistence Helpers
const PROFILE_STORAGE_KEY = "jobplanner_active_profile";
const ROADMAP_STORAGE_KEY = "jobplanner_active_roadmap";
const RESUME_STORAGE_KEY = "jobplanner_active_resume";
const INTERVIEWS_STORAGE_KEY = "jobplanner_active_interviews";

export async function loadUserProfile(): Promise<UserProfile> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        const { data, error } = await client
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data && !error) {
          return {
            id: data.id,
            email: data.email || user.email || "",
            full_name: data.full_name || "Job Seeker",
            avatar_url: data.avatar_url || "",
            education: data.education || DEFAULT_SAMPLE_PROFILE.education,
            skills: data.skills || DEFAULT_SAMPLE_PROFILE.skills,
            interests: data.interests || DEFAULT_SAMPLE_PROFILE.interests,
            target_role: data.target_role || DEFAULT_SAMPLE_PROFILE.target_role,
            experience_level: data.experience_level || DEFAULT_SAMPLE_PROFILE.experience_level,
            projects: data.projects || DEFAULT_SAMPLE_PROFILE.projects,
            plan: data.plan || "pro_39",
            created_at: data.created_at || new Date().toISOString(),
            onboarding_completed: data.onboarding_completed ?? true,
          };
        }
      }
    } catch (err) {
      console.warn("Error fetching Supabase profile, falling back to local storage:", err);
    }
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Notice: Failed to parse saved profile", e);
      }
    }
  }
  return DEFAULT_SAMPLE_PROFILE;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from("profiles").upsert({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        education: profile.education,
        skills: profile.skills,
        interests: profile.interests,
        target_role: profile.target_role,
        experience_level: profile.experience_level,
        projects: profile.projects,
        plan: profile.plan,
        onboarding_completed: profile.onboarding_completed,
        updated_at: new Date().toISOString(),
      });
      if (error) console.warn("Supabase upsert warning:", error.message);
    } catch (e) {
      console.warn("Supabase upsert error:", e);
    }
  }
}

export function loadSavedRoadmap(): RoadmapStep[] | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(ROADMAP_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

export function saveActiveRoadmap(steps: RoadmapStep[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(steps));
  }
}

export function loadSavedResume(): ResumeData | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(RESUME_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

export function saveActiveResume(resume: ResumeData) {
  if (typeof window !== "undefined") {
    localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resume));
  }
}

export function loadSavedInterviews(): PracticeRecord[] {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(INTERVIEWS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
  }
  return [];
}

export function saveInterviewRecord(record: PracticeRecord): PracticeRecord[] {
  const current = loadSavedInterviews();
  const updated = [record, ...current.filter(r => r.id !== record.id)].slice(0, 50);
  if (typeof window !== "undefined") {
    localStorage.setItem(INTERVIEWS_STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

// Full Supabase SQL Schema definition for the user's database
export const SUPABASE_SQL_SCHEMA = `-- JobPlanner Complete Supabase SQL Schema
-- Run this in your Supabase project's SQL Editor (supabase.com -> SQL Editor -> New Query)

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  education JSONB DEFAULT '{}'::jsonb,
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  target_role TEXT NOT NULL DEFAULT 'Data Analyst',
  experience_level TEXT DEFAULT 'Fresher / 0 Years',
  projects JSONB DEFAULT '[]'::jsonb,
  plan TEXT DEFAULT 'pro_39',
  onboarding_completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Create Resumes Table
CREATE TABLE IF NOT EXISTS public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_data JSONB NOT NULL,
  ats_score INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own resumes"
  ON public.resumes FOR ALL
  USING (auth.uid() = user_id);

-- 4. Create Interview Practice Sessions Table
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  score INTEGER NOT NULL,
  feedback JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own interviews"
  ON public.interview_sessions FOR ALL
  USING (auth.uid() = user_id);

-- 5. Storage Bucket Setup (For Profile Avatars & Resume Uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
`;

export const SUPABASE_SCHEMA_SQL = SUPABASE_SQL_SCHEMA;

