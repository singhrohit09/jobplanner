import React, { useState, useEffect } from "react";
import {
  Compass,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Phone,
  GraduationCap,
  Briefcase,
  Layers,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import {
  loginWithEmail,
  registerWithEmail,
  signInWithGoogle,
  sendResetPassword,
  sendPhoneOtp,
  verifyPhoneOtp,
  clearRecaptchaVerifier,
  ConfirmationResult,
} from "../lib/firebase";

interface LoginPageProps {
  onSuccess: (user: FirebaseUser) => void;
  onExploreGuest?: () => void;
}

interface CountryCodeOption {
  code: string;
  country: string;
  flag: string;
  min: number;
  max: number;
}

const COUNTRY_CODES: CountryCodeOption[] = [
  { code: "+91", country: "India", flag: "🇮🇳", min: 10, max: 10 },
  { code: "+1", country: "USA / Canada", flag: "🇺🇸", min: 10, max: 10 },
  { code: "+44", country: "UK", flag: "🇬🇧", min: 10, max: 10 },
  { code: "+971", country: "UAE", flag: "🇦🇪", min: 9, max: 9 },
  { code: "+65", country: "Singapore", flag: "🇸🇬", min: 8, max: 8 },
  { code: "+61", country: "Australia", flag: "🇦🇺", min: 9, max: 9 },
  { code: "+49", country: "Germany", flag: "🇩🇪", min: 10, max: 11 },
  { code: "+33", country: "France", flag: "🇫🇷", min: 9, max: 9 },
  { code: "+81", country: "Japan", flag: "🇯🇵", min: 10, max: 10 },
  { code: "+82", country: "South Korea", flag: "🇰🇷", min: 9, max: 10 },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦", min: 9, max: 9 },
  { code: "+974", country: "Qatar", flag: "🇶🇦", min: 8, max: 8 },
  { code: "+60", country: "Malaysia", flag: "🇲🇾", min: 9, max: 10 },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩", min: 10, max: 10 },
  { code: "+977", country: "Nepal", flag: "🇳🇵", min: 10, max: 10 },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰", min: 9, max: 9 },
  { code: "+234", country: "Nigeria", flag: "🇳🇬", min: 10, max: 10 },
  { code: "+27", country: "South Africa", flag: "🇿🇦", min: 9, max: 10 },
  { code: "+55", country: "Brazil", flag: "🇧🇷", min: 10, max: 11 },
];

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onExploreGuest,
}) => {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "phone">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone Authentication State
  const [phoneStep, setPhoneStep] = useState<"input" | "otp">("input");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resend Countdown Timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      clearRecaptchaVerifier();
    };
  }, []);

  // Clear messages when switching modes
  const switchMode = (newMode: "login" | "register" | "forgot" | "phone") => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (newMode !== "phone") {
      clearRecaptchaVerifier();
      setPhoneStep("input");
      setOtpCode("");
    }
  };

  // Handle Phone Auth - Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanDigits = phoneNumber.replace(/\D/g, "");
    if (!cleanDigits) {
      setErrorMessage("Please enter your mobile phone number.");
      return;
    }

    const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode);
    const minDigits = selectedCountry?.min || 7;
    const maxDigits = selectedCountry?.max || 15;

    if (cleanDigits.length < minDigits || cleanDigits.length > maxDigits) {
      setErrorMessage(
        `Please enter a valid ${minDigits === maxDigits ? minDigits + "-digit" : ""} phone number for ${selectedCountry?.country || "the selected country"}.`
      );
      return;
    }

    const fullPhoneNumber = `${countryCode}${cleanDigits}`;
    setIsPhoneLoading(true);

    try {
      const { confirmationResult: conf, error } = await sendPhoneOtp(
        fullPhoneNumber,
        "recaptcha-phone-container"
      );
      setIsPhoneLoading(false);

      if (error) {
        setErrorMessage(error);
      } else if (conf) {
        setConfirmationResult(conf);
        setPhoneStep("otp");
        setOtpCode("");
        setResendCountdown(30);
        setSuccessMessage(
          `Verification code sent to ${countryCode} ${cleanDigits}. Please check your SMS messages.`
        );
      }
    } catch (err: any) {
      setIsPhoneLoading(false);
      setErrorMessage(err?.message || "Failed to send verification code. Please try again.");
    }
  };

  // Handle Phone Auth - Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!confirmationResult) {
      setErrorMessage("Verification session expired. Please request a new OTP.");
      setPhoneStep("input");
      return;
    }

    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage("Please enter a valid 6-digit numeric OTP.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsPhoneLoading(true);

    try {
      const { user, error } = await verifyPhoneOtp(confirmationResult, cleanOtp);
      setIsPhoneLoading(false);

      if (error) {
        setErrorMessage(error);
      } else if (user) {
        setSuccessMessage("Phone verified successfully! Logging you in...");
        onSuccess(user);
      }
    } catch (err: any) {
      setIsPhoneLoading(false);
      setErrorMessage(err?.message || "Failed to verify code. Please try again.");
    }
  };

  // Handle Phone Auth - Resend OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isPhoneLoading) return;
    await handleSendOtp();
  };

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);

    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setErrorMessage(result.error);
      } else if (result.user) {
        onSuccess(result.user);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to sign in with Google.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle Email + Password Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (mode === "forgot") {
      setIsLoading(true);
      const { success, error } = await sendResetPassword(trimmedEmail);
      setIsLoading(false);
      if (success) {
        setSuccessMessage(
          "Password reset link sent! Check your inbox to set a new password."
        );
      } else {
        setErrorMessage(error || "Failed to send password reset email.");
      }
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    if (mode === "register") {
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match. Please verify.");
        return;
      }
      if (!displayName.trim()) {
        setErrorMessage("Please enter your full name.");
        return;
      }

      setIsLoading(true);
      const { user, error } = await registerWithEmail(
        trimmedEmail,
        password,
        displayName.trim()
      );
      setIsLoading(false);

      if (error) {
        setErrorMessage(error);
      } else if (user) {
        onSuccess(user);
      }
    } else {
      // Login mode
      setIsLoading(true);
      const { user, error } = await loginWithEmail(trimmedEmail, password);
      setIsLoading(false);

      if (error) {
        setErrorMessage(error);
      } else if (user) {
        onSuccess(user);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col justify-between selection:bg-[#F2D7CC] selection:text-[#7A2C10]">
      {/* Top Header Bar */}
      <header className="px-6 py-4 border-b border-[#EDE7DD] bg-[#FAF8F5]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/jobplanner-logo.svg"
              alt="JobPlanner Logo"
              className="w-10 h-10 object-contain rounded-xl shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold tracking-tight text-stone-900">
                  JOBPLANNER
                </span>
                <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-[#F3ECE4] text-[#8C4A2F] border border-[#E9DFD3]">
                  Early Career
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">
                Learn. Prepare. Get Hired.
              </p>
            </div>
          </div>

          {onExploreGuest && (
            <button
              onClick={onExploreGuest}
              className="text-xs text-stone-600 hover:text-stone-900 font-medium px-3.5 py-1.5 rounded-lg border border-[#E0D8CC] hover:bg-[#F2ECE3] transition-colors"
            >
              Explore Demo Mode &rarr;
            </button>
          )}
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] shadow-xs p-6 sm:p-8">
            {/* Title & Tagline */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FBF0EB] border border-[#F3DACF] text-[#C85A32] mb-3">
                {mode === "forgot" ? (
                  <Mail className="w-6 h-6" />
                ) : mode === "register" ? (
                  <Sparkles className="w-6 h-6" />
                ) : mode === "phone" ? (
                  phoneStep === "otp" ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : (
                    <Phone className="w-6 h-6" />
                  )
                ) : (
                  <img
                    src="/assets/jobplanner-logo.svg"
                    alt="JobPlanner"
                    className="w-7 h-7 object-contain"
                  />
                )}
              </div>
              <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
                {mode === "login"
                  ? "Welcome Back to JobPlanner"
                  : mode === "register"
                  ? "Create Your Account"
                  : mode === "phone"
                  ? phoneStep === "otp"
                    ? "Enter verification code"
                    : "Continue with Phone Number"
                  : "Reset Your Password"}
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 font-sans">
                {mode === "login" ? (
                  "Sign in to access your tailored roadmaps, ATS resume, and AI prep."
                ) : mode === "register" ? (
                  "Learn. Prepare. Get Hired. Start your career journey today."
                ) : mode === "phone" ? (
                  phoneStep === "otp" ? (
                    <span className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                      <span>We sent a 6-digit code to</span>
                      <strong className="text-stone-900">{countryCode} {phoneNumber}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneStep("input");
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          setOtpCode("");
                        }}
                        className="text-[#A64522] hover:text-[#7A2C10] font-bold underline underline-offset-2 ml-1 cursor-pointer"
                      >
                        Change
                      </button>
                    </span>
                  ) : (
                    "Enter your mobile number to receive a 6-digit verification code (OTP)."
                  )
                ) : (
                  "Enter your registered email and we'll send a password recovery link."
                )}
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-[#FDF2F0] border border-[#F6C6BE] flex items-start gap-2.5 text-xs text-[#99281B] animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#C85A32]" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div className="mb-5 p-3 rounded-xl bg-[#F0F6F1] border border-[#CCE2D0] flex items-start gap-2.5 text-xs text-[#285732] animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#3D7A4A]" />
                <div className="flex-1 leading-relaxed">{successMessage}</div>
              </div>
            )}

            {/* Invisible reCAPTCHA container for Phone Auth */}
            <div id="recaptcha-phone-container" />

            {mode === "phone" ? (
              /* PHONE AUTHENTICATION UI */
              <div>
                {phoneStep === "input" ? (
                  /* Step 1: Phone number & Country Code Input */
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                        Mobile Phone Number <span className="text-[#C85A32]">*</span>
                      </label>
                      <div className="flex gap-2">
                        {/* Country Code Selector */}
                        <div className="relative w-36 shrink-0">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            disabled={isPhoneLoading}
                            className="w-full px-2.5 py-2.5 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none font-medium text-stone-800 transition-all cursor-pointer appearance-none pr-7"
                          >
                            {COUNTRY_CODES.map((item) => (
                              <option key={item.code + item.country} value={item.code}>
                                {item.flag} {item.code} ({item.country})
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                            </svg>
                          </div>
                        </div>

                        {/* Phone Number Input */}
                        <div className="relative flex-1">
                          <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "");
                              setPhoneNumber(digits);
                            }}
                            placeholder={countryCode === "+91" ? "98765 43210" : "Mobile number"}
                            maxLength={15}
                            disabled={isPhoneLoading}
                            className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none font-sans text-stone-900 transition-all"
                            required
                            autoFocus
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-2">
                        We will send a 6-digit one-time code via SMS. Standard carrier rates may apply.
                      </p>
                    </div>

                    {/* Send OTP Button */}
                    <button
                      type="submit"
                      disabled={isPhoneLoading || !phoneNumber.trim()}
                      className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-[#FAF8F5] text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isPhoneLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending Verification Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send OTP</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Step 2: 6-Digit OTP Verification Screen */
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-stone-700">
                          6-Digit Verification Code <span className="text-[#C85A32]">*</span>
                        </label>
                        <span className="text-[11px] text-stone-500 font-mono">
                          {otpCode.length}/6 digits
                        </span>
                      </div>

                      {/* OTP Monospace Input */}
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setOtpCode(val);
                        }}
                        placeholder="••••••"
                        className="w-full py-3 px-4 text-center tracking-[0.4em] font-mono text-xl font-bold rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none text-stone-900 transition-all placeholder:tracking-normal placeholder:text-stone-300"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Resend OTP & Change Phone Actions */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneStep("input");
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          setOtpCode("");
                        }}
                        className="text-stone-600 hover:text-stone-900 font-medium transition-colors cursor-pointer"
                      >
                        ← Change phone
                      </button>

                      <div>
                        {resendCountdown > 0 ? (
                          <span className="text-stone-500 font-medium text-[11px]">
                            Resend code in <strong className="text-stone-800">{resendCountdown}s</strong>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={isPhoneLoading}
                            className="text-[#A64522] hover:text-[#7A2C10] font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Verify Button */}
                    <button
                      type="submit"
                      disabled={isPhoneLoading || otpCode.length !== 6}
                      className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-[#FAF8F5] text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isPhoneLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify &amp; Sign In</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Back to standard login */}
                <div className="mt-6 pt-5 border-t border-[#EDE7DD] text-center text-xs text-stone-600">
                  <p>
                    Prefer email or Google?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-semibold text-[#A64522] hover:text-[#7A2C10] transition-colors cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              /* STANDARD LOGIN / REGISTER / FORGOT UI */
              <>
            {/* Social Google Login Button (only on login/register) */}
            {mode !== "forgot" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[#D9D3C7] bg-[#FFFFFF] hover:bg-[#F9F7F3] text-stone-800 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <div className="w-4 h-4 border-2 border-stone-400 border-t-stone-800 rounded-full animate-spin" />
                  ) : (
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
                  )}
                  <span>
                    {isGoogleLoading
                      ? "Connecting Google Account..."
                      : mode === "login"
                      ? "Sign in with Google"
                      : "Sign up with Google"}
                  </span>
                </button>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#EAE4DC]" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                    <span className="bg-[#FFFFFF] px-3 text-stone-600 font-medium">
                      or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field for registration */}
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Full Name <span className="text-[#C85A32]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Krissh Singh"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email field */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Address <span className="text-[#C85A32]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu or name@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password field (only for login/register) */}
              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Password <span className="text-[#C85A32]">*</span>
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-[11px] text-[#A64522] hover:text-[#7A2C10] font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (register mode) */}
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Confirm Password <span className="text-[#C85A32]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D9D3C7] bg-[#FAF8F5] focus:bg-[#FFFFFF] focus:border-[#C85A32] focus:ring-2 focus:ring-[#C85A32]/15 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-[#FAF8F5] text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === "login"
                        ? "Sign In to JobPlanner"
                        : mode === "register"
                        ? "Create Account & Get Started"
                        : "Send Password Reset Link"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* 3. Continue with Phone Number Option (on login and register) */}
            {mode !== "forgot" && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#EAE4DC]" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                    <span className="bg-[#FFFFFF] px-3 text-stone-600 font-medium">
                      or continue with phone
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    switchMode("phone");
                    setPhoneStep("input");
                  }}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-[#D9D3C7] bg-[#FFFFFF] hover:bg-[#F9F7F3] text-stone-800 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Phone className="w-4 h-4 text-[#C85A32]" />
                  <span>Continue with Phone Number</span>
                </button>
              </>
            )}

            {/* Bottom Mode Switch Links */}
            <div className="mt-6 pt-5 border-t border-[#EDE7DD] text-center text-xs text-stone-600">
              {mode === "login" ? (
                <p>
                  Don&apos;t have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="font-semibold text-[#A64522] hover:text-[#7A2C10] transition-colors cursor-pointer"
                  >
                    Create Account
                  </button>
                </p>
              ) : mode === "register" ? (
                <p>
                  Already have a JobPlanner account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-semibold text-[#A64522] hover:text-[#7A2C10] transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              ) : (
                <p>
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-semibold text-[#A64522] hover:text-[#7A2C10] transition-colors cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </p>
              )}
            </div>
          </>
        )}
          </div>

          {/* Value Highlights */}
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-[#FFFFFF]/60 border border-[#EDE7DD]">
              <GraduationCap className="w-4 h-4 mx-auto text-[#C85A32] mb-1.5" />
              <div className="text-[11px] font-semibold text-stone-800">
                Skill Gap
              </div>
              <div className="text-[10px] text-stone-500">
                AI Role Analysis
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#FFFFFF]/60 border border-[#EDE7DD]">
              <Layers className="w-4 h-4 mx-auto text-[#395C3E] mb-1.5" />
              <div className="text-[11px] font-semibold text-stone-800">
                ATS Resume
              </div>
              <div className="text-[10px] text-stone-500">
                Instant Export
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#FFFFFF]/60 border border-[#EDE7DD]">
              <Briefcase className="w-4 h-4 mx-auto text-[#975A16] mb-1.5" />
              <div className="text-[11px] font-semibold text-stone-800">
                Interview Prep
              </div>
              <div className="text-[10px] text-stone-500">
                Tailored Questions
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-stone-500 border-t border-[#EDE7DD]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} JOBPLANNER – Learn. Prepare. Get Hired.</span>
          <div className="flex items-center gap-4 text-stone-600">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3D7A4A]" />
              Secured with Firebase Authentication
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
