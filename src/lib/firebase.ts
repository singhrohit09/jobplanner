import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  deleteField,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  FirebaseStorage,
} from "firebase/storage";
import appletConfig from "../../firebase-applet-config.json";
import {
  UserProfile,
  ReadinessAnalysis,
  RoadmapStep,
  ResumeData,
  PracticeRecord,
  PlanTier,
  SkillGapAnalysisResult,
  JobListing,
  SavedJobRecord,
  JobRecommendationsResult,
  GeneratedResume,
  InterviewSession,
  CareerAssistantSession,
  ChatMessage,
  CareerRoadmap,
  CareerRoadmapHistoryRecord,
  CareerAnalyticsSnapshot,
  CareerAnalyticsHistoryRecord,
  CareerActivityItem,
  JobApplication,
  JobApplicationStatus,
  StatusHistoryEntry,
  PortfolioProject,
  PortfolioSettings,
  GitHubAnalysis,
  PublicPortfolioData,
} from "../types";
import {
  SAMPLE_PROFILE,
  SAMPLE_READINESS_ANALYSIS,
  SAMPLE_ROADMAP_STEPS,
  SAMPLE_RESUME_DATA,
} from "./defaultData";

// Resolve Firebase configuration with seamless fallback to provisioned applet credentials
const safeAppletConfig = (appletConfig || {}) as Record<string, any>;

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    safeAppletConfig.apiKey ||
    "",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    safeAppletConfig.authDomain ||
    "jobplanner-82fef.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    safeAppletConfig.projectId ||
    "jobplanner-82fef",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    safeAppletConfig.storageBucket ||
    "jobplanner-82fef.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    safeAppletConfig.messagingSenderId ||
    "829279120489",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    safeAppletConfig.appId ||
    "",
};

const firestoreDbId =
  import.meta.env.VITE_FIREBASE_DATABASE_ID ||
  import.meta.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID ||
  safeAppletConfig.firestoreDatabaseId ||
  "(default)";

// Initialize Firebase safely to prevent duplicate initialization during development and hot reload
let appInstance: FirebaseApp;
try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn("Firebase app initialization notice:", e);
  appInstance = (getApps()[0] || {}) as FirebaseApp;
}
export const app: FirebaseApp = appInstance;

// Initialize Authentication
let authInstance: Auth;
try {
  authInstance = getAuth(app);
} catch (e) {
  console.warn("Firebase auth initialization notice:", e);
  authInstance = {} as Auth;
}
export const auth: Auth = authInstance;

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
try {
  googleProvider.setCustomParameters({ prompt: "select_account" });
} catch (e) {
  console.warn("GoogleAuthProvider configuration notice:", e);
}

// CRITICAL: Connect to the active Firestore database instance with forced long polling & persistent local cache.
// Using experimentalForceLongPolling completely prevents hanging WebSocket handshakes across firewalls, proxies, and preview iframes.
// persistentLocalCache ensures writes succeed instantly locally and stream to the cloud without blocking UI.
let dbInstance: Firestore;
try {
  const firestoreSettings = {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  };

  dbInstance =
    firestoreDbId && firestoreDbId !== "(default)"
      ? initializeFirestore(app, firestoreSettings, firestoreDbId)
      : initializeFirestore(app, firestoreSettings);
} catch (e) {
  try {
    dbInstance =
      firestoreDbId && firestoreDbId !== "(default)"
        ? initializeFirestore(app, { experimentalForceLongPolling: true }, firestoreDbId)
        : initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch (err2) {
    try {
      dbInstance =
        firestoreDbId && firestoreDbId !== "(default)"
          ? getFirestore(app, firestoreDbId)
          : getFirestore(app);
    } catch (err3) {
      console.warn("Firestore initialization notice:", err3);
      dbInstance = {} as Firestore;
    }
  }
}
export const db: Firestore = dbInstance;

/**
 * Safe Firestore async execution helper.
 * Races the operation against a timeout (default 4500ms) to guarantee the UI never hangs.
 * Always resolves gracefully, allowing the persistent local cache to synchronize in the background.
 */
export async function safeFirestoreOp<T>(
  promise: Promise<T>,
  timeoutMs: number = 4500
): Promise<T | null> {
  try {
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T | null;
  } catch (err: any) {
    console.warn("Notice in Firestore operation (queued for background/offline sync):", err?.message || err);
    return null;
  }
}

// Initialize Firebase Storage
let storageInstance: FirebaseStorage;
try {
  storageInstance = getStorage(app);
} catch (e) {
  console.warn("Firebase storage initialization notice:", e);
  storageInstance = {} as FirebaseStorage;
}
export const storage: FirebaseStorage = storageInstance;

// Check if Firebase has active configuration
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// User onboarding data structure as required in Firestore users/{userId}
export interface UserOnboardingData {
  uid?: string;
  name: string;
  fullName?: string;
  email: string;
  phone: string;
  photoURL?: string;
  profilePhoto: string;
  college: string;
  degree: string;
  branch: string;
  currentYear?: string;
  currentSemester: string;
  graduationYear: string;
  cgpa: string;
  targetRole?: string;
  preferredJobRole: string;
  industry?: string;
  experienceLevel: string;
  skills: string[];
  programmingLanguages: string[];
  location: string;
  preferredLocation: string;
  linkedin?: string;
  linkedinUrl: string;
  github?: string;
  githubUrl: string;
  portfolioUrl: string;
  bio: string;
  availability: string;
  profileCompleted: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Data shape for the complete user sync document in Firestore users/{FirebaseAuthUID}
export interface FirestoreUserData {
  uid?: string;
  userId: string;
  name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  photoURL?: string;
  profilePhoto?: string;
  college?: string;
  degree?: string;
  branch?: string;
  currentYear?: string;
  currentSemester?: string;
  graduationYear?: string;
  cgpa?: string;
  targetRole?: string;
  preferredJobRole?: string;
  industry?: string;
  experienceLevel?: string;
  skills: string[];
  programmingLanguages?: string[];
  location?: string;
  preferredLocation?: string;
  linkedin?: string;
  linkedinUrl?: string;
  github?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  availability?: string;
  profileCompleted?: boolean;

  // Resume Upload & Firebase Storage Fields
  resumeURL?: string | null;
  resumeFileName?: string | null;
  resumeStoragePath?: string | null;
  resumeFileType?: string | null;
  resumeFileSize?: number | null;
  resumeUploadedAt?: any;

  // Additional application sync fields
  overallScore?: number;
  profile?: UserProfile;
  readiness?: ReadinessAnalysis;
  roadmap?: RoadmapStep[];
  resume?: ResumeData;
  practiceHistory?: PracticeRecord[];
  subscriptionPlan?: PlanTier;

  createdAt?: any;
  updatedAt?: any;
}

// ---------------------------------------------------------------------------
// Authentication Helpers
// ---------------------------------------------------------------------------

export interface GoogleAuthResult {
  user: User | null;
  error: string | null;
  code?: string;
  domain?: string;
  projectId?: string;
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.warn("Google sign-in notice:", error?.code || error?.message || error);
    let msg = error?.message || "Google sign-in failed.";
    const currentDomain = typeof window !== "undefined" ? window.location.hostname : "";
    if (error?.code === "auth/unauthorized-domain") {
      const activeDomain = currentDomain || (typeof window !== "undefined" ? window.location.hostname : "");
      msg = `Domain authorization required: Please add "${activeDomain}" to your Firebase Console (Authentication > Settings > Authorized domains). You can also sign in or register with Email & Password below.`;
      return {
        user: null,
        error: msg,
        code: "auth/unauthorized-domain",
        domain: activeDomain,
        projectId: firebaseConfig.projectId,
      };
    } else if (error?.code === "auth/popup-closed-by-user") {
      msg = "Sign-in popup was closed before completing.";
    } else if (error?.code === "auth/cancelled-popup-request") {
      msg = "Sign-in request was superseded or cancelled.";
    }
    return { user: null, error: msg, code: error?.code };
  }
}

export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    return { user: result.user, error: null };
  } catch (error: any) {
    console.warn("Email registration notice:", error?.code || error?.message || error);
    let msg = error?.message || "Registration failed.";
    if (error?.code === "auth/email-already-in-use") {
      msg = "An account with this email already exists. Please sign in instead.";
    } else if (error?.code === "auth/weak-password") {
      msg = "Password should be at least 6 characters.";
    } else if (error?.code === "auth/invalid-email") {
      msg = "Please enter a valid email address.";
    }
    return { user: null, error: msg };
  }
}

export async function loginWithEmail(email: string, pass: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.warn("Email login notice:", error?.code || error?.message || error);
    let msg = error?.message || "Sign in failed.";
    if (
      error?.code === "auth/user-not-found" ||
      error?.code === "auth/wrong-password" ||
      error?.code === "auth/invalid-credential"
    ) {
      msg = "Invalid email or password. Please verify and try again.";
    } else if (error?.code === "auth/invalid-email") {
      msg = "Please enter a valid email address.";
    }
    return { user: null, error: msg };
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    console.warn("Logout notice:", error?.message || error);
    return { error: error?.message || "Logout failed." };
  }
}

/**
 * Send password reset email
 */
export async function sendResetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error: any) {
    console.warn("Reset password notice:", error?.message || error);
    let msg = error?.message || "Failed to send password reset email.";
    if (error?.code === "auth/user-not-found") {
      msg = "No account found with this email address.";
    } else if (error?.code === "auth/invalid-email") {
      msg = "Please enter a valid email address.";
    }
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Phone + OTP Authentication Helpers
// ---------------------------------------------------------------------------

export type { ConfirmationResult };

let globalRecaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Reset or destroy any existing RecaptchaVerifier instance
 */
export function clearRecaptchaVerifier(): void {
  if (globalRecaptchaVerifier) {
    try {
      globalRecaptchaVerifier.clear();
    } catch (e) {
      console.warn("Notice clearing RecaptchaVerifier:", e);
    }
    globalRecaptchaVerifier = null;
  }
}

/**
 * Initialize or get invisible RecaptchaVerifier for Phone Authentication
 */
export function initRecaptchaVerifier(
  containerId: string = "recaptcha-phone-container"
): RecaptchaVerifier | null {
  if (!auth) return null;
  const container = typeof document !== "undefined" ? document.getElementById(containerId) : null;
  if (!container) {
    console.warn(`reCAPTCHA container #${containerId} not found in DOM.`);
    return null;
  }

  // Clear previous verifier instance to prevent re-render collisions
  clearRecaptchaVerifier();

  try {
    globalRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved automatically by invisible verifier
      },
      "expired-callback": () => {
        console.warn("reCAPTCHA token expired. Re-verification required.");
      },
    });
    return globalRecaptchaVerifier;
  } catch (error: any) {
    console.warn("Failed to initialize RecaptchaVerifier:", error?.message || error);
    return null;
  }
}

/**
 * Request 6-digit OTP SMS via Firebase Phone Authentication
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  containerId: string = "recaptcha-phone-container"
): Promise<{
  confirmationResult: ConfirmationResult | null;
  error: string | null;
  code?: string;
}> {
  if (!phoneNumber || phoneNumber.trim().length < 7) {
    return {
      confirmationResult: null,
      error: "Please enter a valid phone number with country code.",
    };
  }

  try {
    const verifier = initRecaptchaVerifier(containerId);
    if (!verifier) {
      return {
        confirmationResult: null,
        error: "reCAPTCHA verification container could not be found. Please refresh and try again.",
      };
    }

    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return { confirmationResult, error: null };
  } catch (error: any) {
    console.warn("Phone OTP sending notice:", error?.code || error?.message || error);
    clearRecaptchaVerifier();

    let msg = error?.message || "Failed to send verification code.";
    if (error?.code === "auth/invalid-phone-number") {
      msg = "Invalid phone number format. Please check the digits and country code.";
    } else if (error?.code === "auth/missing-phone-number") {
      msg = "Please enter your phone number.";
    } else if (error?.code === "auth/quota-exceeded") {
      msg = "SMS quota reached for today. Please use Email or Google sign-in.";
    } else if (error?.code === "auth/too-many-requests") {
      msg = "Too many OTP requests. Please wait a moment before trying again.";
    } else if (error?.code === "auth/captcha-check-failed") {
      msg = "Security verification failed. Please try sending OTP again.";
    } else if (error?.code === "auth/operation-not-allowed") {
      msg = "Phone Authentication is not enabled in Firebase Console. Please enable 'Phone' under Firebase Console > Authentication > Sign-in method.";
    } else if (error?.code === "auth/network-request-failed") {
      msg = "Network connection failed. Please check your internet connection.";
    } else if (error?.code === "auth/app-not-authorized") {
      msg = "This domain is not authorized in Firebase Console for Phone Authentication.";
    }
    return { confirmationResult: null, error: msg, code: error?.code };
  }
}

/**
 * Verify OTP entered by user against the Firebase ConfirmationResult
 */
export async function verifyPhoneOtp(
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<{
  user: User | null;
  error: string | null;
  code?: string;
}> {
  const trimmed = otpCode.trim();
  if (!trimmed) {
    return { user: null, error: "Please enter the 6-digit verification code." };
  }
  if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
    return { user: null, error: "Please enter a valid 6-digit numeric OTP." };
  }

  try {
    const userCredential = await confirmationResult.confirm(trimmed);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.warn("Phone OTP verification notice:", error?.code || error?.message || error);
    let msg = error?.message || "Failed to verify code.";
    if (error?.code === "auth/invalid-verification-code") {
      msg = "Incorrect verification code. Please check the 6-digit OTP and try again.";
    } else if (error?.code === "auth/code-expired") {
      msg = "Verification code has expired. Please click 'Resend OTP' to get a new code.";
    } else if (error?.code === "auth/session-expired") {
      msg = "Verification session has expired. Please request a new OTP.";
    } else if (error?.code === "auth/user-disabled") {
      msg = "This account has been disabled. Please contact support.";
    }
    return { user: null, error: msg, code: error?.code };
  }
}

/**
 * Compress an image file to a lightweight JPEG Data URL (max 256x256, ~25KB)
 * Guarantees that client fallback images never exceed Firestore 1MB document limit.
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 256,
  maxHeight = 256,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image for compression."));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload profile photo to Firebase Storage
 * Uses path: profilePhotos/{userId}/profile.jpg (or original extension)
 * Returns the download URL. Gracefully falls back to optimized Data URL if Storage bucket times out or is offline.
 */
export async function uploadProfilePhoto(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null; storagePath?: string }> {
  if (!file) return { url: null, error: "No image file selected." };

  if (!file.type.startsWith("image/")) {
    return { url: null, error: "Please upload an image file (JPEG, PNG, WEBP)." };
  }

  // 5MB size limit
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: "Image file exceeds 5MB size limit. Please choose a smaller photo." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const storagePath = `profilePhotos/${userId}/profile.${ext}`;

  // Ensure Firebase Auth is ready before upload
  if (auth && typeof auth.authStateReady === "function") {
    try {
      await auth.authStateReady();
    } catch (e) {
      console.warn("Notice waiting for auth in uploadProfilePhoto:", e);
    }
  }

  try {
    const storageRef = ref(storage, storagePath);

    // Enforce 6-second timeout so storage upload NEVER hangs on "Processing..."
    const uploadTask = async () => {
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
      });
      return await getDownloadURL(snapshot.ref);
    };

    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error("Firebase Storage upload timed out after 6 seconds.")), 6000);
    });

    const downloadUrl = await Promise.race([uploadTask(), timeoutPromise]);
    return { url: downloadUrl, error: null, storagePath };
  } catch (storageError: any) {
    console.warn(
      "Firebase Storage direct upload notice, falling back to optimized avatar:",
      storageError?.message || storageError
    );
    // Graceful fallback to compressed DataURL (max 256x256, ~25KB) so onboarding flow is never blocked
    // and Firestore 1MB document limit is never exceeded
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 256, 256, 0.85);
      return { url: compressedDataUrl, error: null, storagePath };
    } catch (compressErr: any) {
      console.warn("Failed to compress avatar fallback:", compressErr);
      return {
        url: null,
        error: storageError?.message || "Failed to process profile photo upload.",
        storagePath,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Resume Storage & Firestore Integration Helpers
// ---------------------------------------------------------------------------

export interface ResumeMetadata {
  resumeURL: string;
  resumeFileName: string;
  resumeStoragePath: string;
  resumeFileType: string;
  resumeFileSize: number;
  resumeUploadedAt: any;
}

/**
 * Validate resume file type (.pdf, .docx) and file size (max 10MB)
 */
export function validateResumeFile(file: File): { valid: boolean; error: string | null } {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  // 10 MB maximum file size limit
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10,485,760 bytes
  if (file.size > MAX_FILE_SIZE) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds 10 MB limit (${sizeInMb} MB selected). Please choose a file under 10 MB.`,
    };
  }

  // Allowed file extensions
  const allowedExtensions = [".pdf", ".docx"];
  const fileNameLower = (file.name || "").toLowerCase();
  const hasValidExtension = allowedExtensions.some((ext) => fileNameLower.endsWith(ext));

  // Allowed MIME types
  const allowedMimes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/x-pdf",
    "application/msword",
    "application/octet-stream",
  ];

  const hasValidMime =
    allowedMimes.includes(file.type) ||
    (hasValidExtension && (!file.type || file.type === "application/octet-stream"));

  if (!hasValidExtension || !hasValidMime) {
    return {
      valid: false,
      error: "Invalid file type. Only PDF (.pdf) and Microsoft Word (.docx) files are supported.",
    };
  }

  return { valid: true, error: null };
}

/**
 * Upload resume file to Firebase Storage (resumes/{userId}/{timestamp}_{safeName})
 * and persist metadata to users/{userId} in Firestore.
 */
export async function uploadResumeFile(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; data: ResumeMetadata | null; error: string | null }> {
  if (!userId) {
    return { success: false, data: null, error: "Authentication required. Please sign in to upload your resume." };
  }

  const validation = validateResumeFile(file);
  if (!validation.valid) {
    return { success: false, data: null, error: validation.error };
  }

  try {
    // Generate safe, unique file path: resumes/{uid}/{timestamp}_{safeName}
    const safeName = (file.name || "resume").replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${Date.now()}_${safeName}`;
    const storagePath = `resumes/${userId}/${uniqueFileName}`;
    const storageRef = ref(storage, storagePath);

    const detectedMimeType =
      file.type ||
      (safeName.toLowerCase().endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf");

    // Perform resumable upload with live progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: detectedMimeType,
      customMetadata: {
        originalName: file.name,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const downloadURL = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.totalBytes > 0 && typeof onProgress === "function") {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(percent);
          }
        },
        (uploadErr) => {
          console.warn("Firebase Storage upload task error:", uploadErr);
          reject(uploadErr);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });

    const resumeMetadata: ResumeMetadata = {
      resumeURL: downloadURL,
      resumeFileName: file.name,
      resumeStoragePath: storagePath,
      resumeFileType: detectedMimeType,
      resumeFileSize: file.size,
      resumeUploadedAt: new Date().toISOString(),
    };

    // Save resume metadata in Firestore users/{userId}
    if (db) {
      const userDocRef = doc(db, "users", userId);
      await Promise.race([
        setDoc(
          userDocRef,
          {
            resumeURL: downloadURL,
            resumeFileName: file.name,
            resumeStoragePath: storagePath,
            resumeFileType: detectedMimeType,
            resumeFileSize: file.size,
            resumeUploadedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
        new Promise((resolve) => setTimeout(resolve, 3500)),
      ]);
    }

    return { success: true, data: resumeMetadata, error: null };
  } catch (error: any) {
    console.warn("Error uploading resume to Firebase Storage:", error);
    let message = error?.message || "Failed to upload resume. Please check your connection and try again.";
    if (error?.code === "storage/unauthorized") {
      message = "Permission denied. You can only manage resumes for your authenticated account.";
    } else if (error?.code === "storage/canceled") {
      message = "Upload was cancelled.";
    } else if (error?.code === "storage/retry-limit-exceeded") {
      message = "Network timeout while uploading. Please check your internet connection and try again.";
    }
    return { success: false, data: null, error: message };
  }
}

/**
 * Replace existing resume: uploads the new file to Firebase Storage & updates Firestore,
 * and deletes the previous Storage file ONLY after the new upload succeeds.
 */
export async function replaceResumeFile(
  userId: string,
  newFile: File,
  oldStoragePath?: string | null,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; data: ResumeMetadata | null; error: string | null }> {
  // 1. Upload new resume first
  const uploadResult = await uploadResumeFile(userId, newFile, onProgress);
  if (!uploadResult.success || !uploadResult.data) {
    return uploadResult;
  }

  // 2. Only AFTER new upload succeeds, delete the previous storage file
  if (oldStoragePath && oldStoragePath !== uploadResult.data.resumeStoragePath) {
    try {
      const oldRef = ref(storage, oldStoragePath);
      await deleteObject(oldRef);
    } catch (delErr: any) {
      console.warn("Notice: Old resume file cleanup skipped or already removed:", delErr?.message);
    }
  }

  return uploadResult;
}

/**
 * Delete resume from Firebase Storage and remove resume fields from users/{userId} in Firestore.
 * Does NOT delete the user's entire profile.
 */
export async function deleteResumeFile(
  userId: string,
  storagePath?: string | null
): Promise<{ success: boolean; error: string | null }> {
  if (!userId) {
    return { success: false, error: "Authentication required to delete resume." };
  }

  try {
    // 1. Delete from Firebase Storage if path provided
    if (storagePath) {
      try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      } catch (storageErr: any) {
        console.warn("Notice: Resume file deletion from Storage skipped or not found:", storageErr?.code || storageErr?.message);
      }
    }

    // 2. Remove resume fields from users/{userId} in Firestore
    if (db) {
      const userDocRef = doc(db, "users", userId);
      try {
        await Promise.race([
          updateDoc(userDocRef, {
            resumeURL: deleteField(),
            resumeFileName: deleteField(),
            resumeStoragePath: deleteField(),
            resumeFileType: deleteField(),
            resumeFileSize: deleteField(),
            resumeUploadedAt: deleteField(),
            updatedAt: serverTimestamp(),
          }),
          new Promise((resolve) => setTimeout(resolve, 3500)),
        ]);
      } catch (upErr) {
        // Fallback merge with nulls if updateDoc fails
        await setDoc(
          userDocRef,
          {
            resumeURL: null,
            resumeFileName: null,
            resumeStoragePath: null,
            resumeFileType: null,
            resumeFileSize: null,
            resumeUploadedAt: null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.warn("Error deleting resume:", err);
    return {
      success: false,
      error: err?.message || "Failed to delete resume. Please try again.",
    };
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  try {
    if (!auth || typeof auth.onAuthStateChanged !== "function") {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(
      auth,
      (user) => {
        try {
          callback(user);
        } catch (cbErr) {
          console.warn("Error inside auth change callback:", cbErr);
          callback(null);
        }
      },
      (error) => {
        console.warn("Firebase onAuthStateChanged notice:", error?.message || error);
        callback(null);
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe to auth state changes:", err);
    callback(null);
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// Firestore Sync & Persistence Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a user has completed their onboarding profile in Firestore
 */
export async function checkUserProfileCompletion(
  userId: string
): Promise<{ isCompleted: boolean; data: Partial<FirestoreUserData> | null }> {
  if (!userId || !db) return { isCompleted: false, data: null };
  try {
    const userDocRef = doc(db, "users", userId);
    const snap = await getDoc(userDocRef);

    if (snap && snap.exists()) {
      const data = snap.data() as Partial<FirestoreUserData>;
      const isCompleted = Boolean(
        data.profileCompleted === true || data.profile?.onboarding_completed === true
      );
      return { isCompleted, data };
    }
    return { isCompleted: false, data: null };
  } catch (err) {
    console.warn("Could not check profile completion from Firestore:", err);
    return { isCompleted: false, data: null };
  }
}

/**
 * Save user onboarding profile to Firestore (/users/{userId})
 * Permanently saves all user profile fields under users/{FirebaseAuthUID}:
 * uid, fullName, email, phone, photoURL, college, degree, branch, currentYear,
 * graduationYear, targetRole, industry, experienceLevel, skills, location,
 * linkedin, github, profileCompleted, createdAt, updatedAt.
 */
export async function saveUserOnboardingProfile(
  userId: string,
  data: UserOnboardingData
): Promise<{ success: boolean; error?: string }> {
  // 1. Validate Firebase Auth initialization and user existence
  if (auth && typeof auth.authStateReady === "function") {
    try {
      await auth.authStateReady();
    } catch (e) {
      console.warn("Notice waiting for authStateReady in saveUserOnboardingProfile:", e);
    }
  }

  const activeAuthUser = auth?.currentUser;
  const effectiveUserId = activeAuthUser?.uid || userId;

  if (!effectiveUserId) {
    return {
      success: false,
      error: "Authentication UID is missing. Please sign in to save your profile.",
    };
  }

  if (!db) {
    return {
      success: false,
      error: "Cloud Firestore database is not initialized.",
    };
  }

  try {
    const userDocRef = doc(db, "users", effectiveUserId);

    // Fast non-blocking check for existing createdAt with 2.5s timeout
    let existingCreatedAt: any = null;
    try {
      const getDocPromise = getDoc(userDocRef);
      const getDocTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
      const existingSnap = await Promise.race([getDocPromise, getDocTimeout]);
      if (existingSnap && existingSnap.exists()) {
        existingCreatedAt = existingSnap.data()?.createdAt || null;
      }
    } catch (e) {
      console.warn("Notice fetching existing user document in saveUserOnboardingProfile:", e);
    }

    const docPayload: Record<string, any> = {
      // 1. Firebase Authentication UID
      uid: effectiveUserId,
      userId: effectiveUserId,

      // 2. Personal Information
      fullName: (data.fullName || data.name || "").trim(),
      name: (data.fullName || data.name || "").trim(),
      email: (data.email || "").trim(),
      phone: (data.phone || "").trim(),
      photoURL: data.photoURL || data.profilePhoto || "",
      profilePhoto: data.photoURL || data.profilePhoto || "",

      // 3. Academic Background
      college: (data.college || "").trim(),
      degree: (data.degree || "").trim(),
      branch: (data.branch || "").trim(),
      currentYear: (data.currentYear || data.currentSemester || "").trim(),
      currentSemester: (data.currentSemester || data.currentYear || "").trim(),
      graduationYear: String(data.graduationYear || "").trim(),
      cgpa: (data.cgpa || "").trim(),

      // 4. Career Goals, Industry, & Technical Skills
      targetRole: (data.targetRole || data.preferredJobRole || "Data Analyst").trim(),
      preferredJobRole: (data.targetRole || data.preferredJobRole || "Data Analyst").trim(),
      industry: (data.industry || "Information Technology & Software Services").trim(),
      experienceLevel: (data.experienceLevel || "Fresher / 0 Years").trim(),
      skills: Array.isArray(data.skills) ? data.skills : [],
      programmingLanguages: Array.isArray(data.programmingLanguages) ? data.programmingLanguages : [],
      location: (data.location || data.preferredLocation || "").trim(),
      preferredLocation: (data.preferredLocation || data.location || "").trim(),

      // 5. Social & Portfolio Profiles
      linkedin: (data.linkedin || data.linkedinUrl || "").trim(),
      linkedinUrl: (data.linkedin || data.linkedinUrl || "").trim(),
      github: (data.github || data.githubUrl || "").trim(),
      githubUrl: (data.github || data.githubUrl || "").trim(),
      portfolioUrl: (data.portfolioUrl || "").trim(),
      bio: (data.bio || "").trim(),
      availability: (data.availability || "").trim(),

      // 6. Persistence & Metadata Flags
      profileCompleted: true,
      updatedAt: serverTimestamp(),
      ...(existingCreatedAt ? { createdAt: existingCreatedAt } : { createdAt: serverTimestamp() }),

      // 7. Sync seamlessly to internal UserProfile shape
      profile: {
        id: effectiveUserId,
        email: (data.email || "").trim(),
        full_name: (data.fullName || data.name || "").trim(),
        avatar_url:
          data.photoURL ||
          data.profilePhoto ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        education: {
          degree: (data.degree || "").trim(),
          college: (data.college || "").trim(),
          branch: (data.branch || "").trim(),
          graduation_year: String(data.graduationYear || "2025").trim(),
          cgpa: (data.cgpa || "8.0").trim(),
        },
        skills: Array.isArray(data.skills) ? data.skills : [],
        interests: Array.isArray(data.programmingLanguages) ? data.programmingLanguages : [],
        target_role: (data.targetRole || data.preferredJobRole || "Data Analyst").trim(),
        experience_level: (data.experienceLevel || "Fresher / 0 Years") as any,
        projects: [],
        plan: "starter_19",
        created_at: new Date().toISOString(),
        onboarding_completed: true,
      },
    };

    // 1. Immediately cache to local storage to guarantee zero data loss
    try {
      if (docPayload.profile) {
        localStorage.setItem("jobplanner_profile", JSON.stringify(docPayload.profile));
        localStorage.setItem(`jobplanner_profile_${effectiveUserId}`, JSON.stringify(docPayload.profile));
      }
      localStorage.setItem("jobplanner_profile_completed", "true");
    } catch (cacheErr) {
      console.warn("Notice saving profile to localStorage:", cacheErr);
    }

    // 2. Perform Firestore write with background tolerance so network latency never blocks onboarding
    const writePromise = setDoc(userDocRef, docPayload, { merge: true });
    try {
      await Promise.race([
        writePromise,
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    } catch (writeErr: any) {
      if (writeErr?.code === "permission-denied") {
        throw writeErr;
      }
      console.warn("Notice during Firestore onboarding sync (continuing with local cache):", writeErr?.message || writeErr);
    }

    return { success: true };
  } catch (error: any) {
    console.warn("Error saving onboarding profile to Firestore:", error?.message || error);
    let errorMessage = error?.message || "Failed to save profile to Firestore.";
    if (error?.code === "permission-denied") {
      errorMessage = `Firestore permission denied: User ${effectiveUserId} is not authorized or security rules blocked the write.`;
    } else if (error?.code === "unavailable") {
      errorMessage = "Firestore service is temporarily unavailable. Please retry.";
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Fetch a user's cloud-stored data from Firestore (/users/{userId})
 */
export async function fetchUserFromFirestore(
  userId: string
): Promise<Partial<FirestoreUserData> | null> {
  if (!userId || !db) return null;
  try {
    const userDocRef = doc(db, "users", userId);
    const getPromise = getDoc(userDocRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
    const snap = await Promise.race([getPromise, timeoutPromise]);

    if (snap && snap.exists()) {
      return snap.data() as Partial<FirestoreUserData>;
    }
    return null;
  } catch (error: any) {
    console.warn("Could not fetch user document from Firestore:", error?.message || error);
    return null;
  }
}

/**
 * Save or update user workspace data to Firestore (/users/{userId})
 */
export async function syncUserDataToFirestore(
  userId: string,
  payload: {
    profile?: UserProfile;
    readiness?: ReadinessAnalysis;
    roadmap?: RoadmapStep[];
    resume?: ResumeData;
    practiceHistory?: PracticeRecord[];
    subscriptionPlan?: PlanTier;
    overallScore?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !db) {
    return { success: false, error: "No user ID or db provided" };
  }

  try {
    const userDocRef = doc(db, "users", userId);

    const dataToSave: Record<string, any> = {
      uid: userId,
      userId,
      profileCompleted: true,
      updatedAt: serverTimestamp(),
    };

    if (payload.profile) {
      dataToSave.profile = payload.profile;
      dataToSave.fullName = payload.profile.full_name;
      dataToSave.name = payload.profile.full_name;
      dataToSave.email = payload.profile.email;
      dataToSave.targetRole = payload.profile.target_role;
      dataToSave.experienceLevel = payload.profile.experience_level;
      dataToSave.skills = payload.profile.skills || [];
    }

    if (payload.overallScore !== undefined) {
      dataToSave.overallScore = payload.overallScore;
    } else if (payload.readiness?.score !== undefined) {
      dataToSave.overallScore = payload.readiness.score;
    }

    if (payload.readiness) {
      dataToSave.readiness = payload.readiness;
    }

    if (payload.roadmap) {
      dataToSave.roadmap = payload.roadmap;
    }

    if (payload.resume) {
      dataToSave.resume = payload.resume;
    }

    if (payload.practiceHistory) {
      dataToSave.practiceHistory = payload.practiceHistory;
    }

    if (payload.subscriptionPlan) {
      dataToSave.subscriptionPlan = payload.subscriptionPlan;
    }

    const setPromise = setDoc(userDocRef, dataToSave, { merge: true });
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 4000));
    await Promise.race([setPromise, timeoutPromise]);
    return { success: true };
  } catch (error: any) {
    console.warn("Could not sync user data to Firestore (notice):", error?.message || error);
    return { success: false, error: error?.message || "Sync skipped" };
  }
}

/**
 * Ensure user document is created or retrieved upon login.
 * 1. Look up users/{uid} in Firestore.
 * 2. If document exists:
 *    - If profileCompleted is true: return existing data with profileCompleted = true (do NOT overwrite).
 *    - If profileCompleted is false: return existing data with profileCompleted = false (do NOT overwrite).
 * 3. If document does NOT exist:
 *    - Create base document at users/{uid} with Auth info & profileCompleted: false.
 *    - Return initial data with profileCompleted: false.
 */
export async function ensureUserDocumentExists(
  user: User,
  fallbackData?: {
    profile?: UserProfile;
    readiness?: ReadinessAnalysis;
    roadmap?: RoadmapStep[];
    resume?: ResumeData;
    practiceHistory?: PracticeRecord[];
    subscriptionPlan?: PlanTier;
  }
): Promise<FirestoreUserData> {
  if (!user?.uid || !db) {
    return {
      uid: user?.uid || "",
      userId: user?.uid || "",
      name: user?.displayName || "",
      fullName: user?.displayName || "",
      email: user?.email || "",
      profileCompleted: false,
      skills: [],
    };
  }

  const userDocRef = doc(db, "users", user.uid);
  let snap = null;
  try {
    const getPromise = getDoc(userDocRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
    snap = await Promise.race([getPromise, timeoutPromise]);
  } catch (err) {
    console.warn("Error fetching user document for " + user.uid + ":", err);
  }

  if (snap && snap.exists()) {
    const rawData = snap.data() as Partial<FirestoreUserData>;
    const isCompleted = Boolean(
      rawData.profileCompleted === true ||
      rawData.profile?.onboarding_completed === true
    );

    return {
      uid: user.uid,
      userId: user.uid,
      name: rawData.fullName || rawData.name || user.displayName || rawData.profile?.full_name || "Job Seeker",
      fullName: rawData.fullName || rawData.name || user.displayName || rawData.profile?.full_name || "Job Seeker",
      email: rawData.email || user.email || rawData.profile?.email || "",
      phone: rawData.phone || user.phoneNumber || "",
      photoURL: rawData.photoURL || rawData.profilePhoto || user.photoURL || rawData.profile?.avatar_url || "",
      profilePhoto: rawData.photoURL || rawData.profilePhoto || user.photoURL || rawData.profile?.avatar_url || "",
      college: rawData.college || rawData.profile?.education?.college || "",
      degree: rawData.degree || rawData.profile?.education?.degree || "",
      branch: rawData.branch || rawData.profile?.education?.branch || "",
      currentYear: rawData.currentYear || rawData.currentSemester || "",
      currentSemester: rawData.currentSemester || rawData.currentYear || "",
      graduationYear: rawData.graduationYear || String(rawData.profile?.education?.graduation_year || "2025"),
      cgpa: rawData.cgpa || rawData.profile?.education?.cgpa || "",
      targetRole: rawData.targetRole || rawData.preferredJobRole || rawData.profile?.target_role || "Data Analyst",
      preferredJobRole: rawData.targetRole || rawData.preferredJobRole || rawData.profile?.target_role || "Data Analyst",
      industry: rawData.industry || "Information Technology & Software Services",
      experienceLevel: rawData.experienceLevel || rawData.profile?.experience_level || "Fresher / 0 Years",
      skills: rawData.skills || rawData.profile?.skills || [],
      programmingLanguages: rawData.programmingLanguages || rawData.profile?.interests || [],
      location: rawData.location || rawData.preferredLocation || "",
      preferredLocation: rawData.preferredLocation || rawData.location || "",
      linkedin: rawData.linkedin || rawData.linkedinUrl || rawData.resume?.personalInfo?.linkedin || "",
      linkedinUrl: rawData.linkedin || rawData.linkedinUrl || rawData.resume?.personalInfo?.linkedin || "",
      github: rawData.github || rawData.githubUrl || rawData.resume?.personalInfo?.github || "",
      githubUrl: rawData.github || rawData.githubUrl || rawData.resume?.personalInfo?.github || "",
      portfolioUrl: rawData.portfolioUrl || rawData.resume?.personalInfo?.portfolio || "",
      bio: rawData.bio || rawData.resume?.summary || "",
      availability: rawData.availability || "",
      profileCompleted: isCompleted,

      // Resume fields restoration from Firestore
      resumeURL: rawData.resumeURL || null,
      resumeFileName: rawData.resumeFileName || null,
      resumeStoragePath: rawData.resumeStoragePath || null,
      resumeFileType: rawData.resumeFileType || null,
      resumeFileSize: rawData.resumeFileSize || null,
      resumeUploadedAt: rawData.resumeUploadedAt || null,

      overallScore: rawData.overallScore ?? rawData.readiness?.score ?? 72,
      createdAt: rawData.createdAt,
      updatedAt: rawData.updatedAt,
      profile: rawData.profile || (fallbackData?.profile ? {
        ...fallbackData.profile,
        id: user.uid,
        email: user.email || fallbackData.profile.email,
        full_name: rawData.fullName || rawData.name || user.displayName || fallbackData.profile.full_name,
        avatar_url: rawData.photoURL || rawData.profilePhoto || user.photoURL || fallbackData.profile.avatar_url,
        onboarding_completed: isCompleted,
      } : undefined),
      readiness: rawData.readiness || fallbackData?.readiness,
      roadmap: rawData.roadmap || fallbackData?.roadmap,
      resume: rawData.resume || fallbackData?.resume,
      practiceHistory: rawData.practiceHistory || fallbackData?.practiceHistory,
      subscriptionPlan: rawData.subscriptionPlan || fallbackData?.subscriptionPlan || "Free",
    };
  }

  // User document does NOT exist in Firestore -> Create base document with Google / Auth data
  const baseUserData: FirestoreUserData = {
    uid: user.uid,
    userId: user.uid,
    name: user.displayName || (user.phoneNumber ? `User ${user.phoneNumber.slice(-4)}` : "") || "",
    fullName: user.displayName || (user.phoneNumber ? `User ${user.phoneNumber.slice(-4)}` : "") || "",
    email: user.email || "",
    phone: user.phoneNumber || "",
    photoURL: user.photoURL || "",
    profilePhoto: user.photoURL || "",
    college: "",
    degree: "",
    branch: "",
    currentYear: "",
    currentSemester: "",
    graduationYear: "2025",
    cgpa: "",
    targetRole: "Data Analyst",
    preferredJobRole: "Data Analyst",
    industry: "Information Technology & Software Services",
    experienceLevel: "Fresher / 0 Years",
    skills: [],
    programmingLanguages: [],
    location: "",
    preferredLocation: "",
    linkedin: "",
    linkedinUrl: "",
    github: "",
    githubUrl: "",
    portfolioUrl: "",
    bio: "",
    availability: "",
    profileCompleted: false,

    resumeURL: null,
    resumeFileName: null,
    resumeStoragePath: null,
    resumeFileType: null,
    resumeFileSize: null,
    resumeUploadedAt: null,

    overallScore: 65,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Only create in Firestore if the document was confirmed not to exist
  if (snap && !snap.exists()) {
    try {
      const setPromise = setDoc(userDocRef, baseUserData, { merge: true });
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));
      await Promise.race([setPromise, timeoutPromise]);
    } catch (err: any) {
      console.warn("Notice writing base user document to Firestore:", err?.message || err);
    }
  }

  return baseUserData;
}

// =========================================================================
// AI Skill Gap Analysis Firestore Storage
// Path: users/{uid}/skillGapAnalysis/latest
// =========================================================================

/**
 * Saves the latest skill gap analysis for the authenticated user in Firestore.
 */
export async function saveSkillGapAnalysis(
  userId: string,
  analysis: SkillGapAnalysisResult
): Promise<void> {
  if (!userId) throw new Error("Authenticated user ID is required to save skill gap analysis.");
  
  // Also save to local storage as instant local cache
  try {
    localStorage.setItem(`jobplanner_skillgap_${userId}`, JSON.stringify(analysis));
  } catch (e) {
    console.warn("Notice saving skill gap analysis to localStorage:", e);
  }

  if (!db) {
    console.warn("Firestore database not initialized. Saved to local state.");
    return;
  }

  const analysisDocRef = doc(db, "users", userId, "skillGapAnalysis", "latest");
  
  const payload = {
    ...analysis,
    userId,
    updatedAt: serverTimestamp(),
  };

  try {
    await Promise.race([
      setDoc(analysisDocRef, payload, { merge: true }),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch (err) {
    console.warn("Notice saving skill gap analysis to Firestore:", err);
  }
}

/**
 * Retrieves the latest skill gap analysis for the authenticated user from Firestore.
 */
export async function getLatestSkillGapAnalysis(
  userId: string
): Promise<SkillGapAnalysisResult | null> {
  if (!userId) return null;

  // 1. Try Firestore first
  if (db) {
    try {
      const analysisDocRef = doc(db, "users", userId, "skillGapAnalysis", "latest");
      const snap = await Promise.race([
        getDoc(analysisDocRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (snap && (snap as any).exists && (snap as any).exists()) {
        const data = (snap as any).data() as SkillGapAnalysisResult;
        // Also update local cache
        try {
          localStorage.setItem(`jobplanner_skillgap_${userId}`, JSON.stringify(data));
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn("Notice loading skill gap analysis from Firestore:", err);
    }
  }

  // 2. Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(`jobplanner_skillgap_${userId}`);
    if (cached) {
      return JSON.parse(cached) as SkillGapAnalysisResult;
    }
  } catch (e) {
    console.warn("Notice parsing cached skill gap analysis:", e);
  }

  return null;
}

// =========================================================================
// Job Recommendations & Saved Jobs Firestore Storage
// Paths:
// - users/{uid}/jobRecommendations/latest
// - users/{uid}/savedJobs/{jobId}
// =========================================================================

/**
 * Saves job recommendations for the user in Firestore at users/{uid}/jobRecommendations/latest
 */
export async function saveJobRecommendations(
  userId: string,
  data: JobRecommendationsResult
): Promise<void> {
  if (!userId) throw new Error("Authenticated user ID required.");

  try {
    localStorage.setItem(`jobplanner_job_recs_${userId}`, JSON.stringify(data));
  } catch (e) {
    console.warn("Notice saving recommendations to localStorage:", e);
  }

  if (!db) {
    console.warn("Firestore not initialized. Saved to local storage only.");
    return;
  }

  const docRef = doc(db, "users", userId, "jobRecommendations", "latest");
  const payload = {
    ...data,
    userId,
    updatedAt: serverTimestamp(),
  };

  try {
    await Promise.race([
      setDoc(docRef, payload, { merge: true }),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch (err) {
    console.warn("Notice saving job recommendations to Firestore:", err);
  }
}

/**
 * Loads latest job recommendations for user from users/{uid}/jobRecommendations/latest
 */
export async function getLatestJobRecommendations(
  userId: string
): Promise<JobRecommendationsResult | null> {
  if (!userId) return null;

  if (db) {
    try {
      const docRef = doc(db, "users", userId, "jobRecommendations", "latest");
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (snap && (snap as any).exists && (snap as any).exists()) {
        const data = (snap as any).data() as JobRecommendationsResult;
        try {
          localStorage.setItem(`jobplanner_job_recs_${userId}`, JSON.stringify(data));
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn("Notice loading job recommendations from Firestore:", err);
    }
  }

  try {
    const cached = localStorage.getItem(`jobplanner_job_recs_${userId}`);
    if (cached) {
      return JSON.parse(cached) as JobRecommendationsResult;
    }
  } catch (e) {
    console.warn("Notice parsing cached job recommendations:", e);
  }

  return null;
}

/**
 * Bookmarks/saves a job in users/{uid}/savedJobs/{jobId}
 */
export async function saveJobToFirestore(
  userId: string,
  job: JobListing
): Promise<void> {
  if (!userId || !job.id) throw new Error("User ID and Job ID required.");

  const record: SavedJobRecord = {
    jobId: job.id,
    userId,
    title: job.title,
    company: job.company,
    location: job.location,
    salary: job.salary,
    workMode: job.workMode,
    experience: job.experience,
    matchScore: job.matchScore,
    applyUrl: job.applyUrl || "",
    isDemo: job.isDemo ?? true,
    savedAt: new Date().toISOString(),
    jobData: job,
  };

  // Local storage update
  try {
    const currentCached = localStorage.getItem(`jobplanner_saved_jobs_${userId}`);
    const list: SavedJobRecord[] = currentCached ? JSON.parse(currentCached) : [];
    const updated = list.filter((j) => j.jobId !== job.id).concat(record);
    localStorage.setItem(`jobplanner_saved_jobs_${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn("Notice updating localStorage saved jobs:", e);
  }

  if (!db) return;

  const docRef = doc(db, "users", userId, "savedJobs", job.id);
  try {
    await Promise.race([
      setDoc(docRef, record, { merge: true }),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch (err) {
    console.warn("Notice saving job bookmark to Firestore:", err);
  }
}

/**
 * Removes a saved job from users/{uid}/savedJobs/{jobId}
 */
export async function removeSavedJobFromFirestore(
  userId: string,
  jobId: string
): Promise<void> {
  if (!userId || !jobId) return;

  // Local storage update
  try {
    const currentCached = localStorage.getItem(`jobplanner_saved_jobs_${userId}`);
    if (currentCached) {
      const list: SavedJobRecord[] = JSON.parse(currentCached);
      const updated = list.filter((j) => j.jobId !== jobId);
      localStorage.setItem(`jobplanner_saved_jobs_${userId}`, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn("Notice updating localStorage saved jobs on remove:", e);
  }

  if (!db) return;

  try {
    const docRef = doc(db, "users", userId, "savedJobs", jobId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Notice removing saved job from Firestore:", err);
  }
}

/**
 * Retrieves all saved jobs for the user from users/{uid}/savedJobs
 */
export async function getSavedJobsFromFirestore(
  userId: string
): Promise<SavedJobRecord[]> {
  if (!userId) return [];

  if (db) {
    try {
      const colRef = collection(db, "users", userId, "savedJobs");
      const snap = await Promise.race([
        getDocs(colRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
      ]);

      if (snap && !(snap as any).empty) {
        const records: SavedJobRecord[] = [];
        (snap as any).forEach((d: any) => {
          records.push(d.data() as SavedJobRecord);
        });
        try {
          localStorage.setItem(`jobplanner_saved_jobs_${userId}`, JSON.stringify(records));
        } catch {}
        return records;
      }
    } catch (err) {
      console.warn("Notice loading saved jobs from Firestore:", err);
    }
  }

  try {
    const cached = localStorage.getItem(`jobplanner_saved_jobs_${userId}`);
    if (cached) {
      return JSON.parse(cached) as SavedJobRecord[];
    }
  } catch (e) {
    console.warn("Notice parsing cached saved jobs:", e);
  }

  return [];
}

// ==========================================
// PHASE 5: AI RESUME BUILDER FIRESTORE SYNC
// Subcollection: users/{uid}/generatedResumes/{resumeId}
// ==========================================

/**
 * Saves or updates an AI generated resume under users/{uid}/generatedResumes/{resumeId}
 */
export async function saveGeneratedResumeToFirestore(
  userId: string,
  resumeData: GeneratedResume
): Promise<void> {
  if (!userId || !resumeData) return;
  const resumeId = resumeData.resumeId || resumeData.id || `resume_${Date.now()}`;
  const recordToSave: GeneratedResume = {
    ...resumeData,
    id: resumeId,
    resumeId,
    userId,
    updatedAt: new Date().toISOString(),
    createdAt: resumeData.createdAt || new Date().toISOString(),
  };

  // 1. Instant local storage cache
  try {
    const localKey = `jobplanner_generated_resumes_${userId}`;
    const raw = localStorage.getItem(localKey);
    let list: GeneratedResume[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((r) => (r.resumeId || r.id) === resumeId);
    if (idx >= 0) {
      list[idx] = recordToSave;
    } else {
      list.unshift(recordToSave);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.warn("Notice updating localStorage generated resumes:", e);
  }

  // 2. Cloud Firestore persistence
  if (!db) return;

  try {
    const docRef = doc(db, "users", userId, "generatedResumes", resumeId);
    // Sanitize any undefined values before sending to Firestore
    const cleaned = JSON.parse(JSON.stringify(recordToSave));
    await safeFirestoreOp(
      setDoc(docRef, {
        ...cleaned,
        updatedAtServer: serverTimestamp(),
      }, { merge: true })
    );
  } catch (err) {
    console.warn("Notice saving generated resume to Firestore:", err);
  }
}

/**
 * Retrieves all saved generated resumes for a candidate from users/{uid}/generatedResumes
 */
export async function getGeneratedResumesFromFirestore(
  userId: string
): Promise<GeneratedResume[]> {
  if (!userId) return [];

  // Try Firestore first
  if (db) {
    try {
      const colRef = collection(db, "users", userId, "generatedResumes");
      const snap = await Promise.race([
        getDocs(colRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
      ]);

      if (snap && !(snap as any).empty) {
        const records: GeneratedResume[] = [];
        (snap as any).forEach((d: any) => {
          records.push(d.data() as GeneratedResume);
        });

        // Sort descending by updatedAt
        records.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());

        try {
          localStorage.setItem(`jobplanner_generated_resumes_${userId}`, JSON.stringify(records));
        } catch {}
        return records;
      }
    } catch (err) {
      console.warn("Notice loading generated resumes from Firestore:", err);
    }
  }

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem(`jobplanner_generated_resumes_${userId}`);
    if (cached) {
      return JSON.parse(cached) as GeneratedResume[];
    }
  } catch (e) {
    console.warn("Notice parsing cached generated resumes:", e);
  }

  return [];
}

/**
 * Deletes a generated resume from users/{uid}/generatedResumes/{resumeId}
 */
export async function deleteGeneratedResumeFromFirestore(
  userId: string,
  resumeId: string
): Promise<void> {
  if (!userId || !resumeId) return;

  // Local storage update
  try {
    const localKey = `jobplanner_generated_resumes_${userId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: GeneratedResume[] = JSON.parse(raw);
      const updated = list.filter((r) => (r.resumeId || r.id) !== resumeId);
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn("Notice updating localStorage generated resumes on delete:", e);
  }

  if (!db) return;

  try {
    const docRef = doc(db, "users", userId, "generatedResumes", resumeId);
    await safeFirestoreOp(deleteDoc(docRef));
  } catch (err) {
    console.warn("Notice removing generated resume from Firestore:", err);
  }
}

// ---------------------------------------------------------------------------
// AI Interview Preparation Session Persistence Helpers
// ---------------------------------------------------------------------------

/**
 * Saves or updates an interview session in users/{userId}/interviewSessions/{sessionId}
 * as well as local cache for instant zero-latency retrieval.
 */
export async function saveInterviewSessionToFirestore(
  userId: string,
  session: InterviewSession
): Promise<void> {
  if (!userId || !session || !session.sessionId) return;

  const sessionId = session.sessionId;
  const recordToSave: InterviewSession = {
    ...session,
    userId,
  };

  // 1. Instant local storage cache
  try {
    const localKey = `jobplanner_interview_sessions_${userId}`;
    const raw = localStorage.getItem(localKey);
    let list: InterviewSession[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((s) => s.sessionId === sessionId);
    if (idx >= 0) {
      list[idx] = recordToSave;
    } else {
      list.unshift(recordToSave);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.warn("Notice caching interview session to localStorage:", e);
  }

  // 2. Cloud Firestore persistence under users/{uid}/interviewSessions/{sessionId}
  if (!db) return;

  try {
    const docRef = doc(db, "users", userId, "interviewSessions", sessionId);
    // Sanitize any undefined values
    const cleaned = JSON.parse(JSON.stringify(recordToSave));
    await safeFirestoreOp(
      setDoc(
        docRef,
        {
          ...cleaned,
          updatedAtServer: serverTimestamp(),
        },
        { merge: true }
      )
    );
  } catch (err) {
    console.warn("Notice saving interview session to Firestore:", err);
  }
}

/**
 * Retrieves all saved interview sessions for a candidate from users/{uid}/interviewSessions
 */
export async function getInterviewSessionsFromFirestore(
  userId: string
): Promise<InterviewSession[]> {
  if (!userId) return [];

  // Try Firestore first
  if (db) {
    try {
      const colRef = collection(db, "users", userId, "interviewSessions");
      const snap = await Promise.race([
        getDocs(colRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
      ]);

      if (snap && !(snap as any).empty) {
        const records: InterviewSession[] = [];
        (snap as any).forEach((d: any) => {
          records.push(d.data() as InterviewSession);
        });

        // Sort descending by startedAt or completedAt
        records.sort(
          (a, b) =>
            new Date(b.completedAt || b.startedAt || 0).getTime() -
            new Date(a.completedAt || a.startedAt || 0).getTime()
        );

        try {
          localStorage.setItem(
            `jobplanner_interview_sessions_${userId}`,
            JSON.stringify(records)
          );
        } catch {}
        return records;
      }
    } catch (err) {
      console.warn("Notice loading interview sessions from Firestore:", err);
    }
  }

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem(`jobplanner_interview_sessions_${userId}`);
    if (cached) {
      return JSON.parse(cached) as InterviewSession[];
    }
  } catch (e) {
    console.warn("Notice parsing cached interview sessions:", e);
  }

  return [];
}

/**
 * Deletes an interview session from users/{uid}/interviewSessions/{sessionId}
 */
export async function deleteInterviewSessionFromFirestore(
  userId: string,
  sessionId: string
): Promise<void> {
  if (!userId || !sessionId) return;

  // Local storage update
  try {
    const localKey = `jobplanner_interview_sessions_${userId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: InterviewSession[] = JSON.parse(raw);
      const updated = list.filter((s) => s.sessionId !== sessionId);
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn("Notice updating localStorage interview sessions on delete:", e);
  }

  if (!db) return;

  try {
    const docRef = doc(db, "users", userId, "interviewSessions", sessionId);
    await safeFirestoreOp(deleteDoc(docRef));
  } catch (err) {
    console.warn("Notice removing interview session from Firestore:", err);
  }
}

// =========================================================================
// AI Career Assistant Sessions in Firestore
// Stored at: users/{uid}/careerAssistantSessions/{sessionId}
// =========================================================================

/**
 * Saves or updates a Career Assistant Chat Session to Firestore & localStorage
 */
export async function saveCareerAssistantSessionToFirestore(
  userId: string,
  session: CareerAssistantSession
): Promise<void> {
  if (!userId || !session || !session.sessionId) return;

  // Local storage caching for instant response & offline access
  try {
    const localKey = `jobplanner_career_sessions_${userId}`;
    const raw = localStorage.getItem(localKey);
    let sessions: CareerAssistantSession[] = raw ? JSON.parse(raw) : [];
    const index = sessions.findIndex((s) => s.sessionId === session.sessionId);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    localStorage.setItem(localKey, JSON.stringify(sessions));
  } catch (e) {
    console.warn("Notice caching career assistant session locally:", e);
  }

  if (!db) return;

  try {
    const docRef = doc(db, "users", userId, "careerAssistantSessions", session.sessionId);
    const cleanSession = JSON.parse(JSON.stringify(session));
    await Promise.race([
      setDoc(docRef, cleanSession, { merge: true }),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch (err) {
    console.warn("Notice syncing career assistant session to Firestore:", err);
  }
}

/**
 * Retrieves all Career Assistant Sessions from Firestore with fallback to localStorage
 */
export async function getCareerAssistantSessionsFromFirestore(
  userId: string
): Promise<CareerAssistantSession[]> {
  if (!userId) return [];

  if (db) {
    try {
      const colRef = collection(db, "users", userId, "careerAssistantSessions");
      const snap = await Promise.race([
        getDocs(colRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
      ]);

      if (snap && !(snap as any).empty) {
        const records: CareerAssistantSession[] = [];
        (snap as any).forEach((d: any) => {
          records.push(d.data() as CareerAssistantSession);
        });

        // Sort descending by updatedAt or createdAt
        records.sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime()
        );

        try {
          localStorage.setItem(
            `jobplanner_career_sessions_${userId}`,
            JSON.stringify(records)
          );
        } catch {}
        return records;
      }
    } catch (err) {
      console.warn("Notice loading career assistant sessions from Firestore:", err);
    }
  }

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem(`jobplanner_career_sessions_${userId}`);
    if (cached) {
      return JSON.parse(cached) as CareerAssistantSession[];
    }
  } catch (e) {
    console.warn("Notice parsing cached career assistant sessions:", e);
  }

  return [];
}

/**
 * Deletes a Career Assistant Session from users/{uid}/careerAssistantSessions/{sessionId}
 */
export async function deleteCareerAssistantSessionFromFirestore(
  userId: string,
  sessionId: string
): Promise<void> {
  if (!userId || !sessionId) return;

  // Local storage update
  try {
    const localKey = `jobplanner_career_sessions_${userId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: CareerAssistantSession[] = JSON.parse(raw);
      const updated = list.filter((s) => s.sessionId !== sessionId);
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn("Notice updating localStorage career sessions on delete:", e);
  }

  if (!db) return;

  try {
    const docRef = doc(db, "users", userId, "careerAssistantSessions", sessionId);
    await safeFirestoreOp(deleteDoc(docRef));
  } catch (err) {
    console.warn("Notice removing career assistant session from Firestore:", err);
  }
}

// =========================================================================
// PHASE 8: AI CAREER ROADMAP & PROGRESS TRACKER FIRESTORE UTILITIES
// Stored in users/{userId}/careerRoadmap/current and users/{userId}/careerRoadmap/history/{roadmapId}
// =========================================================================

/**
 * Saves or updates the active Career Roadmap in users/{userId}/careerRoadmap/current
 * If archivePrevious is true, also snapshots the existing active roadmap into users/{userId}/careerRoadmap/history/{roadmapId}
 */
export async function saveCareerRoadmapToFirestore(
  userId: string,
  roadmap: CareerRoadmap,
  archivePrevious: boolean = false
): Promise<void> {
  if (!userId || !roadmap) return;

  const sanitized: CareerRoadmap = {
    ...roadmap,
    userId,
    updatedAt: new Date().toISOString(),
  };

  // Cache to localStorage for instant offline access and resilience
  try {
    localStorage.setItem(
      `jobplanner_career_roadmap_${userId}`,
      JSON.stringify(sanitized)
    );
  } catch (e) {
    console.warn("Notice caching career roadmap to localStorage:", e);
  }

  if (!db || !db.app) return;

  try {
    // Check if archiving previous
    if (archivePrevious) {
      try {
        const currentRef = doc(db, "users", userId, "careerRoadmap", "current");
        const existingSnap = await getDoc(currentRef);
        if (existingSnap.exists()) {
          const oldData = existingSnap.data() as CareerRoadmap;
          if (oldData && oldData.roadmapId) {
            const histId = oldData.roadmapId || `hist_${Date.now()}`;
            const historyRef = doc(
              db,
              "users",
              userId,
              "careerRoadmap",
              "history",
              histId
            );
            const historyRecord: CareerRoadmapHistoryRecord = {
              roadmapId: histId,
              userId,
              targetRole: oldData.targetRole || "Career Target",
              duration: oldData.duration || "3 Months",
              createdAt: oldData.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              overallProgress: oldData.overallProgress || 0,
              completedTasksCount: oldData.completedTasksCount || 0,
              totalTasksCount: oldData.totalTasksCount || 0,
              stagesSummary: (oldData.stages || []).map((s) => ({
                title: s.title,
                progress: s.progress || 0,
              })),
              roadmapSnapshot: oldData,
            };
            await safeFirestoreOp(setDoc(historyRef, historyRecord));
          }
        }
      } catch (histErr) {
        console.warn("Notice archiving previous roadmap to history:", histErr);
      }
    }

    const docRef = doc(db, "users", userId, "careerRoadmap", "current");
    await safeFirestoreOp(setDoc(docRef, sanitized, { merge: true }));
  } catch (err) {
    console.warn("Notice writing career roadmap to Firestore:", err);
  }
}

/**
 * Fetches the user's active Career Roadmap from users/{userId}/careerRoadmap/current
 */
export async function getCareerRoadmapFromFirestore(
  userId: string
): Promise<CareerRoadmap | null> {
  if (!userId) return null;

  if (db && db.app) {
    try {
      const docRef = doc(db, "users", userId, "careerRoadmap", "current");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as CareerRoadmap;
        try {
          localStorage.setItem(
            `jobplanner_career_roadmap_${userId}`,
            JSON.stringify(data)
          );
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn("Notice loading career roadmap from Firestore:", err);
    }
  }

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem(`jobplanner_career_roadmap_${userId}`);
    if (cached) {
      return JSON.parse(cached) as CareerRoadmap;
    }
  } catch (e) {
    console.warn("Notice loading cached career roadmap:", e);
  }

  return null;
}

/**
 * Fetches historical snapshots of roadmaps from users/{userId}/careerRoadmap/history
 */
export async function getCareerRoadmapHistoryFromFirestore(
  userId: string
): Promise<CareerRoadmapHistoryRecord[]> {
  if (!userId) return [];

  if (db && db.app) {
    try {
      const histCol = collection(db, "users", userId, "careerRoadmap", "history");
      const snap = await getDocs(histCol);
      if (!snap.empty) {
        const list: CareerRoadmapHistoryRecord[] = [];
        snap.forEach((d) => {
          list.push(d.data() as CareerRoadmapHistoryRecord);
        });
        return list.sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime()
        );
      }
    } catch (err) {
      console.warn("Notice loading career roadmap history from Firestore:", err);
    }
  }

  return [];
}

// ==========================================
// PHASE 9: CAREER ANALYTICS & INSIGHTS
// ==========================================

/**
 * Saves current Career Analytics snapshot to users/{userId}/careerAnalytics/current
 * and optionally archives a historical record in users/{userId}/careerAnalytics/history/{snapshotId}
 */
export async function saveCareerAnalyticsToFirestore(
  userId: string,
  analytics: CareerAnalyticsSnapshot,
  archiveSnapshot: boolean = true
): Promise<boolean> {
  if (!userId || !analytics) return false;

  // Local storage caching for offline resilience
  try {
    localStorage.setItem(`jobplanner_career_analytics_${userId}`, JSON.stringify(analytics));
  } catch (e) {
    console.warn("Notice caching career analytics locally:", e);
  }

  if (db && db.app) {
    try {
      const currentRef = doc(db, "users", userId, "careerAnalytics", "current");
      await safeFirestoreOp(
        setDoc(
          currentRef,
          {
            ...analytics,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      );

      // Save historical snapshot if requested and score is available
      if (archiveSnapshot && analytics.readiness?.overallScore !== null && analytics.readiness?.overallScore !== undefined) {
        const snapshotId = analytics.id || `snap_${Date.now()}`;
        const historyRef = doc(db, "users", userId, "careerAnalytics", "history", snapshotId);
        const historyRecord: CareerAnalyticsHistoryRecord = {
          snapshotId,
          userId,
          createdAt: analytics.createdAt || new Date().toISOString(),
          overallReadiness: analytics.readiness.overallScore,
          targetRole: analytics.targetRole || "Software Engineer",
          snapshot: {
            id: analytics.id,
            targetRole: analytics.targetRole,
            readiness: analytics.readiness,
            skills: analytics.skills,
            jobs: analytics.jobs,
            resume: analytics.resume,
            interview: analytics.interview,
            roadmap: analytics.roadmap,
            createdAt: analytics.createdAt,
            updatedAt: analytics.updatedAt,
          },
        };

        await safeFirestoreOp(setDoc(historyRef, historyRecord, { merge: true }));
      }

      return true;
    } catch (err) {
      console.warn("Notice saving career analytics to Firestore:", err);
    }
  }

  return true;
}

/**
 * Loads current Career Analytics from users/{userId}/careerAnalytics/current
 */
export async function getCareerAnalyticsFromFirestore(
  userId: string
): Promise<CareerAnalyticsSnapshot | null> {
  if (!userId) return null;

  if (db && db.app) {
    try {
      const currentRef = doc(db, "users", userId, "careerAnalytics", "current");
      const snap = await getDoc(currentRef);
      if (snap.exists()) {
        const data = snap.data() as CareerAnalyticsSnapshot;
        try {
          localStorage.setItem(`jobplanner_career_analytics_${userId}`, JSON.stringify(data));
        } catch {
          // ignore
        }
        return data;
      }
    } catch (err) {
      console.warn("Notice fetching career analytics from Firestore:", err);
    }
  }

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem(`jobplanner_career_analytics_${userId}`);
    if (cached) {
      return JSON.parse(cached) as CareerAnalyticsSnapshot;
    }
  } catch (e) {
    console.warn("Notice loading cached career analytics:", e);
  }

  return null;
}

/**
 * Fetches historical snapshots of analytics from users/{userId}/careerAnalytics/history
 */
export async function getCareerAnalyticsHistoryFromFirestore(
  userId: string
): Promise<CareerAnalyticsHistoryRecord[]> {
  if (!userId) return [];

  if (db && db.app) {
    try {
      const histCol = collection(db, "users", userId, "careerAnalytics", "history");
      const snap = await getDocs(histCol);
      if (!snap.empty) {
        const list: CareerAnalyticsHistoryRecord[] = [];
        snap.forEach((d) => {
          list.push(d.data() as CareerAnalyticsHistoryRecord);
        });
        return list.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
      }
    } catch (err) {
      console.warn("Notice loading career analytics history from Firestore:", err);
    }
  }

  return [];
}

/**
 * Records an activity item to recent activities for the user
 */
export async function recordCareerActivity(
  userId: string,
  activity: Omit<CareerActivityItem, "id" | "timestamp">
): Promise<void> {
  if (!userId) return;

  const newItem: CareerActivityItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...activity,
    timestamp: new Date().toISOString(),
  };

  try {
    const key = `jobplanner_activities_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]") as CareerActivityItem[];
    const updated = [newItem, ...existing.filter((a) => a.id !== newItem.id)].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn("Notice recording career activity:", e);
  }
}

/**
 * Retrieves recent authenticated user career activities
 */
export async function getRecentActivitiesFromFirestore(
  userId: string
): Promise<CareerActivityItem[]> {
  if (!userId) return [];

  try {
    const key = `jobplanner_activities_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as CareerActivityItem[];
    }
  } catch (e) {
    console.warn("Notice fetching recent activities:", e);
  }

  return [];
}

// ==========================================
// AI Job Application Tracker Functions
// ==========================================

/**
 * Retrieves all tracked job applications for a user from Firestore subcollection:
 * users/{userId}/jobApplications
 */
export async function getJobApplicationsFromFirestore(
  userId: string
): Promise<JobApplication[]> {
  if (!userId) {
    try {
      const cached = localStorage.getItem("jobplanner_job_applications_guest");
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn("Notice reading guest job applications:", e);
    }
    return [];
  }

  const cacheKey = `jobplanner_job_applications_${userId}`;

  if (db && db.app) {
    try {
      const appsCol = collection(db, "users", userId, "jobApplications");
      const snap = await getDocs(appsCol);
      if (!snap.empty) {
        const appsList: JobApplication[] = [];
        snap.forEach((d) => {
          appsList.push(d.data() as JobApplication);
        });

        // Sort by updatedAt descending
        appsList.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

        // Cache locally for offline/fast load
        try {
          localStorage.setItem(cacheKey, JSON.stringify(appsList));
        } catch (_) {}

        return appsList;
      }
    } catch (err) {
      console.warn("Notice querying job applications from Firestore:", err);
    }
  }

  // Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached) as JobApplication[];
    }
  } catch (e) {
    console.warn("Notice loading cached job applications:", e);
  }

  return [];
}

/**
 * Saves or updates a tracked job application in Firestore:
 * users/{userId}/jobApplications/{applicationId}
 */
export async function saveJobApplicationToFirestore(
  userId: string,
  application: JobApplication
): Promise<void> {
  const cacheKey = userId
    ? `jobplanner_job_applications_${userId}`
    : "jobplanner_job_applications_guest";

  const updatedApp: JobApplication = {
    ...application,
    updatedAt: new Date().toISOString(),
  };

  // 1. Update localStorage cache
  try {
    const existing = JSON.parse(localStorage.getItem(cacheKey) || "[]") as JobApplication[];
    const filtered = existing.filter((a) => a.applicationId !== updatedApp.applicationId);
    const updated = [updatedApp, ...filtered];
    localStorage.setItem(cacheKey, JSON.stringify(updated));
  } catch (e) {
    console.warn("Notice caching job application locally:", e);
  }

  // 2. Persist to Firestore if user is authenticated and Firestore is connected
  if (userId && db && db.app) {
    try {
      const appRef = doc(db, "users", userId, "jobApplications", updatedApp.applicationId);
      await safeFirestoreOp(setDoc(appRef, updatedApp, { merge: true }));
    } catch (err) {
      console.warn("Notice persisting job application to Firestore:", err);
    }
  }

  // 3. Record recent career activity
  if (userId) {
    try {
      await recordCareerActivity(userId, {
        type: "job_application",
        title: `Application: ${updatedApp.company}`,
        description: `${updatedApp.jobTitle} • Status: ${updatedApp.status}`,
        metric: updatedApp.matchScore ? `${updatedApp.matchScore}%` : updatedApp.status,
      });
    } catch (_) {}
  }
}

/**
 * Updates application status and appends a status change record into statusHistory
 */
export async function updateJobApplicationStatusInFirestore(
  userId: string,
  applicationId: string,
  newStatus: JobApplicationStatus,
  note?: string
): Promise<JobApplication | null> {
  const cacheKey = userId
    ? `jobplanner_job_applications_${userId}`
    : "jobplanner_job_applications_guest";

  let targetApp: JobApplication | null = null;
  try {
    const existing = JSON.parse(localStorage.getItem(cacheKey) || "[]") as JobApplication[];
    const idx = existing.findIndex((a) => a.applicationId === applicationId);
    if (idx !== -1) {
      const now = new Date().toISOString();
      const current = existing[idx];
      const newHistoryEntry: StatusHistoryEntry = {
        status: newStatus,
        timestamp: now,
        note: note || `Status updated to ${newStatus}`,
      };

      targetApp = {
        ...current,
        status: newStatus,
        updatedAt: now,
        statusHistory: [...(current.statusHistory || []), newHistoryEntry],
      };

      existing[idx] = targetApp;
      localStorage.setItem(cacheKey, JSON.stringify(existing));
    }
  } catch (e) {
    console.warn("Notice updating status in local cache:", e);
  }

  if (userId && db && db.app && targetApp) {
    try {
      const appRef = doc(db, "users", userId, "jobApplications", applicationId);
      await safeFirestoreOp(setDoc(appRef, targetApp, { merge: true }));
    } catch (err) {
      console.warn("Notice updating status in Firestore:", err);
    }
  }

  return targetApp;
}

/**
 * Deletes a tracked job application from Firestore:
 * users/{userId}/jobApplications/{applicationId}
 */
export async function deleteJobApplicationFromFirestore(
  userId: string,
  applicationId: string
): Promise<void> {
  const cacheKey = userId
    ? `jobplanner_job_applications_${userId}`
    : "jobplanner_job_applications_guest";

  // Remove from localStorage
  try {
    const existing = JSON.parse(localStorage.getItem(cacheKey) || "[]") as JobApplication[];
    const filtered = existing.filter((a) => a.applicationId !== applicationId);
    localStorage.setItem(cacheKey, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Notice deleting application from cache:", e);
  }

  // Delete from Firestore
  if (userId && db && db.app) {
    try {
      const appRef = doc(db, "users", userId, "jobApplications", applicationId);
      await safeFirestoreOp(deleteDoc(appRef));
    } catch (err) {
      console.warn("Notice deleting application from Firestore:", err);
    }
  }
}

// ============================================================================
// PHASE 11: AI PORTFOLIO BUILDER & GITHUB ANALYZER FIRESTORE & STORAGE HELPERS
// ============================================================================

/**
 * Saves or updates a portfolio project in Firestore:
 * users/{userId}/portfolioProjects/{projectId}
 */
export async function savePortfolioProjectToFirestore(
  userId: string,
  project: PortfolioProject
): Promise<void> {
  const cacheKey = userId ? `jobplanner_portfolio_projects_${userId}` : "jobplanner_portfolio_projects_guest";
  const updatedProject: PortfolioProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  // 1. LocalStorage cache update
  try {
    const existing = JSON.parse(localStorage.getItem(cacheKey) || "[]") as PortfolioProject[];
    const filtered = existing.filter((p) => p.projectId !== updatedProject.projectId);
    const updated = [updatedProject, ...filtered];
    // Sort by displayOrder or createdAt
    updated.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
    localStorage.setItem(cacheKey, JSON.stringify(updated));
  } catch (e) {
    console.warn("Notice caching portfolio project locally:", e);
  }

  // 2. Cloud Firestore persistence
  if (userId && db && db.app) {
    try {
      const cleaned = JSON.parse(JSON.stringify(updatedProject));
      const projectRef = doc(db, "users", userId, "portfolioProjects", updatedProject.projectId);
      await safeFirestoreOp(setDoc(projectRef, cleaned, { merge: true }));
    } catch (err) {
      console.warn("Notice saving portfolio project to Firestore:", err);
    }
  }

  // 3. Record recent career activity
  if (userId) {
    try {
      await recordCareerActivity(userId, {
        type: "portfolio_project",
        title: `Portfolio: ${updatedProject.name}`,
        description: `Project updated with ${updatedProject.technologies?.length || 0} technologies`,
        metric: updatedProject.featured ? "Featured" : "Catalog",
      });
    } catch (_) {}
  }
}

/**
 * Retrieves all portfolio projects for candidate
 */
export async function getPortfolioProjectsFromFirestore(
  userId: string
): Promise<PortfolioProject[]> {
  const cacheKey = userId ? `jobplanner_portfolio_projects_${userId}` : "jobplanner_portfolio_projects_guest";

  if (userId && db && db.app) {
    try {
      const colRef = collection(db, "users", userId, "portfolioProjects");
      const snap = await Promise.race([
        getDocs(colRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
      ]);

      if (snap && !(snap as any).empty) {
        const list: PortfolioProject[] = [];
        (snap as any).forEach((docSnap: any) => {
          list.push(docSnap.data() as PortfolioProject);
        });
        list.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
        try {
          localStorage.setItem(cacheKey, JSON.stringify(list));
        } catch {}
        return list;
      }
    } catch (err) {
      console.warn("Notice loading portfolio projects from Firestore:", err);
    }
  }

  // Fallback to local cache
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const list = JSON.parse(raw) as PortfolioProject[];
      list.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
      return list;
    }
  } catch (e) {
    console.warn("Notice parsing cached portfolio projects:", e);
  }

  return [];
}

/**
 * Deletes a portfolio project
 */
export async function deletePortfolioProjectFromFirestore(
  userId: string,
  projectId: string
): Promise<void> {
  const cacheKey = userId ? `jobplanner_portfolio_projects_${userId}` : "jobplanner_portfolio_projects_guest";

  try {
    const existing = JSON.parse(localStorage.getItem(cacheKey) || "[]") as PortfolioProject[];
    const filtered = existing.filter((p) => p.projectId !== projectId);
    localStorage.setItem(cacheKey, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Notice removing portfolio project from cache:", e);
  }

  if (userId && db && db.app) {
    try {
      const projectRef = doc(db, "users", userId, "portfolioProjects", projectId);
      await safeFirestoreOp(deleteDoc(projectRef));
    } catch (err) {
      console.warn("Notice deleting portfolio project from Firestore:", err);
    }
  }
}

/**
 * Saves portfolio settings:
 * users/{userId}/portfolio/settings
 */
export async function savePortfolioSettingsToFirestore(
  userId: string,
  settings: PortfolioSettings
): Promise<void> {
  const cacheKey = userId ? `jobplanner_portfolio_settings_${userId}` : "jobplanner_portfolio_settings_guest";
  const updatedSettings: PortfolioSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(updatedSettings));
  } catch (e) {
    console.warn("Notice caching portfolio settings locally:", e);
  }

  if (userId && db && db.app) {
    try {
      const cleaned = JSON.parse(JSON.stringify(updatedSettings));
      const settingsRef = doc(db, "users", userId, "portfolio", "settings");
      await safeFirestoreOp(setDoc(settingsRef, cleaned, { merge: true }));
    } catch (err) {
      console.warn("Notice saving portfolio settings to Firestore:", err);
    }
  }
}

/**
 * Retrieves portfolio settings
 */
export async function getPortfolioSettingsFromFirestore(
  userId: string
): Promise<PortfolioSettings | null> {
  const cacheKey = userId ? `jobplanner_portfolio_settings_${userId}` : "jobplanner_portfolio_settings_guest";

  if (userId && db && db.app) {
    try {
      const settingsRef = doc(db, "users", userId, "portfolio", "settings");
      const snap = await Promise.race([
        getDoc(settingsRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (snap && (snap as any).exists()) {
        const data = (snap as any).data() as PortfolioSettings;
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn("Notice loading portfolio settings from Firestore:", err);
    }
  }

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) return JSON.parse(raw) as PortfolioSettings;
  } catch {}

  return null;
}

/**
 * Saves GitHub analysis:
 * users/{userId}/portfolio/github
 */
export async function saveGitHubAnalysisToFirestore(
  userId: string,
  analysis: GitHubAnalysis
): Promise<void> {
  const cacheKey = userId ? `jobplanner_github_analysis_${userId}` : "jobplanner_github_analysis_guest";

  try {
    localStorage.setItem(cacheKey, JSON.stringify(analysis));
  } catch (e) {
    console.warn("Notice caching GitHub analysis locally:", e);
  }

  if (userId && db && db.app) {
    try {
      const cleaned = JSON.parse(JSON.stringify(analysis));
      const githubRef = doc(db, "users", userId, "portfolio", "github");
      await safeFirestoreOp(setDoc(githubRef, cleaned, { merge: true }));
    } catch (err) {
      console.warn("Notice saving GitHub analysis to Firestore:", err);
    }
  }
}

/**
 * Retrieves cached GitHub analysis
 */
export async function getGitHubAnalysisFromFirestore(
  userId: string
): Promise<GitHubAnalysis | null> {
  const cacheKey = userId ? `jobplanner_github_analysis_${userId}` : "jobplanner_github_analysis_guest";

  if (userId && db && db.app) {
    try {
      const githubRef = doc(db, "users", userId, "portfolio", "github");
      const snap = await Promise.race([
        getDoc(githubRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (snap && (snap as any).exists()) {
        const data = (snap as any).data() as GitHubAnalysis;
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn("Notice loading GitHub analysis from Firestore:", err);
    }
  }

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) return JSON.parse(raw) as GitHubAnalysis;
  } catch {}

  return null;
}

/**
 * Uploads a project screenshot or demo asset to Firebase Storage:
 * users/{userId}/portfolio/projects/{projectId}/images/{timestamp}_{filename}
 */
export async function uploadPortfolioProjectImage(
  userId: string,
  projectId: string,
  file: File
): Promise<string> {
  if (!userId || !projectId || !file) {
    throw new Error("Missing parameters for project image upload");
  }

  if (storage) {
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `users/${userId}/portfolio/projects/${projectId}/images/${Date.now()}_${cleanFileName}`;
      const imageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.warn("Notice uploading to Firebase Storage, falling back to data URL:", err);
    }
  }

  // Client-side base64 fallback for environments without storage active
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Publishes sanitized portfolio data to public collection:
 * public_portfolios/{publicId}
 */
export async function publishPublicPortfolioToFirestore(
  publicId: string,
  data: PublicPortfolioData
): Promise<void> {
  if (!publicId) throw new Error("Public ID is required");

  // Local storage cache for instant preview
  try {
    localStorage.setItem(`jobplanner_public_portfolio_${publicId}`, JSON.stringify(data));
  } catch {}

  if (db && db.app) {
    try {
      const publicRef = doc(db, "public_portfolios", publicId);
      const cleaned = JSON.parse(JSON.stringify(data));
      await safeFirestoreOp(setDoc(publicRef, cleaned, { merge: true }));
    } catch (err) {
      console.warn("Notice publishing portfolio to public Firestore:", err);
    }
  }
}

/**
 * Retrieves public portfolio by publicId
 */
export async function getPublicPortfolioFromFirestore(
  publicId: string
): Promise<PublicPortfolioData | null> {
  if (!publicId) return null;

  if (db && db.app) {
    try {
      const publicRef = doc(db, "public_portfolios", publicId);
      const snap = await getDoc(publicRef);
      if (snap.exists()) {
        return snap.data() as PublicPortfolioData;
      }
    } catch (err) {
      console.warn("Notice fetching public portfolio from Firestore:", err);
    }
  }

  try {
    const raw = localStorage.getItem(`jobplanner_public_portfolio_${publicId}`);
    if (raw) return JSON.parse(raw) as PublicPortfolioData;
  } catch {}

  return null;
}

/**
 * Deletes public portfolio from public_portfolios collection
 */
export async function deletePublicPortfolioFromFirestore(publicId: string): Promise<void> {
  if (!publicId) return;
  try {
    localStorage.removeItem(`jobplanner_public_portfolio_${publicId}`);
  } catch {}
  if (db && db.app) {
    try {
      await safeFirestoreOp(deleteDoc(doc(db, "public_portfolios", publicId)));
    } catch (err) {
      console.warn("Notice deleting public portfolio:", err);
    }
  }
}

// Function aliases for Portfolio integration
export const getPortfolioProjects = getPortfolioProjectsFromFirestore;
export const savePortfolioProject = savePortfolioProjectToFirestore;
export const deletePortfolioProject = deletePortfolioProjectFromFirestore;
export const getPortfolioSettings = getPortfolioSettingsFromFirestore;
export const savePortfolioSettings = savePortfolioSettingsToFirestore;
export const getGitHubAnalysis = getGitHubAnalysisFromFirestore;
export const saveGitHubAnalysis = saveGitHubAnalysisToFirestore;
export const savePublicPortfolio = publishPublicPortfolioToFirestore;
export const getPublicPortfolio = getPublicPortfolioFromFirestore;
export const deletePublicPortfolio = deletePublicPortfolioFromFirestore;









