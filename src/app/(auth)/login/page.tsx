"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/lib/api";
import { Eye, EyeOff, ArrowLeft, UtensilsCrossed, ChefHat, Mail, ShieldCheck, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

type Role = "Customer" | "Chef" | "";
type AuthTab = "login" | "signup";
type ForgotStep = "email" | "otp" | "newpass";

// Batch B1: cuisines shown as checkbox pills in chef signup.
// Kept separate from app-wide CUISINE_OPTIONS in types/index.ts so signup
// can evolve independently of the Book-a-Chef filter dropdown.
const CUISINE_PRESETS = [
  "Gujarati",
  "Punjabi",
  "North Indian",
  "South Indian",
  "Chinese",
  "Continental",
  "Rajasthani",
  "Jain",
  "Street Food",
  "Sweets & Desserts",
  "Mughlai",
  "Italian",
];

function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login: storeLogin } = useAuthStore();

  const [step, setStep] = useState<"role" | "auth" | "verify-email">("role");
  const [role, setRole] = useState<Role>("");
  const [tab, setTab] = useState<AuthTab>("login");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Signup fields
  const [signupFname, setSignupFname] = useState("");
  const [signupLname, setSignupLname] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPass, setSignupPass] = useState("");
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Chef signup fields
  // Batch B1: specialties is now a multi-select checkbox grid with optional custom input.
  // On submit we join everything into a comma-separated string for the backend
  // (backend specialties field stays as string — no backend change needed).
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [customCuisine, setCustomCuisine] = useState("");
  const [experience, setExperience] = useState("");

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [showForgotPass, setShowForgotPass] = useState(false);

  // Email OTP verification
  const [verifyEmail, setVerifyEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(0);

  // Track the role of the user that just signed up (for post-OTP redirect)
  const [pendingRole, setPendingRole] = useState<string>("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const roleParam = searchParams.get("role");
    if (tabParam === "signup") {
      setTab("signup");
      setRole(roleParam === "chef" ? "Chef" : "Customer");
      setStep("auth");
    }
  }, [searchParams]);

  useEffect(() => {
    const token = Cookies.get("coc_token");
    if (token) {
      router.push("/dashboard/customer");
    }
  }, [router]);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  function saveAuth(data: { accessToken: string; refreshToken?: string; user: any }) {
    Cookies.set("coc_token", data.accessToken, { expires: 1 / 96 });
    if (data.refreshToken) {
      Cookies.set("coc_refresh_token", data.refreshToken, { expires: 7 });
    }
    storeLogin(data.user, data.accessToken);
  }

  // Round A Fix #5: Auto-redirect after role selection — no Continue button
  function handleRoleSelect(selectedRole: Role) {
    setRole(selectedRole);
    // Auto-advance to auth screen immediately
    setStep("auth");
  }

  async function handleLogin() {
    if (!loginEmail || !loginPass) {
      toast.error("Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login({
        email: loginEmail,
        password: loginPass,
      });

      const responseData = data.data || data;
      saveAuth({
        accessToken: responseData.accessToken || responseData.access_token,
        refreshToken: responseData.refreshToken || responseData.refresh_token,
        user: responseData.user,
      });

      toast.success("Login successful!");

      // Round A Fix #2: Always go to customer dashboard.
      // Admin navigates to /dashboard/admin manually when needed.
      const userRole = responseData.user?.role;
      if (userRole === "cook") router.push("/dashboard/cook");
      else router.push("/dashboard/customer");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "Login failed.";

      // Round A Fix #1: Handle EMAIL_NOT_VERIFIED — redirect to OTP screen
      if (msg === "EMAIL_NOT_VERIFIED") {
        toast.error("Please verify your email first. We've sent a new code.");
        setVerifyEmail(loginEmail);
        setPendingRole(""); // We'll detect role from response after OTP
        setStep("verify-email");
        setOtpTimer(60);
        return;
      }

      // Round A Fix #3: Show error message inline, don't redirect
      toast.error(msg === "Invalid email or password" ? "Incorrect email or password. Please try again." : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!signupFname || !signupLname) { toast.error("Please enter your full name."); return; }
    if (!signupPhone) { toast.error("Phone number is required."); return; }
    if (!signupEmail) { toast.error("Email address is required."); return; }
    if (!signupPass || signupPass.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (!termsAccepted) { toast.error("Please accept the Terms of Service."); return; }

    // Batch B1: chef must pick at least one specialty
    if (role === "Chef") {
      const customTrim = customCuisine.trim();
      if (selectedCuisines.length === 0 && !customTrim) {
        toast.error("Please select at least one specialty.");
        return;
      }
    }

    setLoading(true);
    try {
      const body: any = {
        name: `${signupFname} ${signupLname}`.trim(),
        phone: signupPhone,
        email: signupEmail,
        password: signupPass,
        role: role === "Chef" ? "cook" : "user",
      };
      if (role === "Chef") {
        // Combine checkbox selections + optional custom cuisine into one CSV string.
        // Backend `specialties` field is a simple string — no backend change needed.
        const customTrim = customCuisine.trim();
        const all = [...selectedCuisines, ...(customTrim ? [customTrim] : [])];
        body.specialties = all.join(", ");
        body.experience = experience;
        // Rate field removed in Batch B1 — platform pricing is fixed (₹49 visit fee).
        // Backend defaults price_per_session to ₹49 when omitted (see auth.service.ts).
      }

      await authApi.register(body);

      // Round A Fix #1: Do NOT save auth tokens — backend no longer returns them.
      // Instead, go to email verification step. User gets tokens after OTP verification.
      setPendingRole(role === "Chef" ? "cook" : "user");
      setVerifyEmail(signupEmail);
      setStep("verify-email");
      setOtpTimer(60);
      toast.success("Account created! Check your email for the verification code.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "Signup failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpInput(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    // Auto-focus next input
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(""));
      const last = document.getElementById("otp-5");
      last?.focus();
    }
  }

  async function handleVerifyEmail() {
    const otp = otpDigits.join("");
    if (otp.length !== 6) { toast.error("Please enter the 6-digit code."); return; }

    setLoading(true);
    try {
      const { data } = await authApi.verifyEmailOtp({ email: verifyEmail, otp });
      const responseData = data.data || data;

      // Round A Fix #1: Backend now returns tokens after OTP verification — save them
      if (responseData.access_token || responseData.accessToken) {
        saveAuth({
          accessToken: responseData.accessToken || responseData.access_token,
          refreshToken: responseData.refreshToken || responseData.refresh_token,
          user: responseData.user,
        });
      }

      toast.success("Email verified! Welcome to CookOnCall!");

      // Redirect based on role
      const userRole = responseData.user?.role || pendingRole;
      if (userRole === "cook") router.push("/dashboard/cook");
      else router.push("/dashboard/customer");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid OTP. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (otpTimer > 0) return;
    try {
      await authApi.sendEmailOtp({ email: verifyEmail });
      setOtpTimer(60);
      setOtpDigits(["", "", "", "", "", ""]);
      toast.success("New OTP sent to your email!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to resend OTP.";
      toast.error(msg);
    }
  }

  // Round A Fix #6: Forgot password — Step 1: Send OTP
  async function handleForgotSendOtp() {
    if (!forgotEmail) { toast.error("Please enter your email."); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: forgotEmail });
      setForgotStep("otp");
      setOtpTimer(60);
      toast.success("Reset code sent to your email!");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg && msg.includes("wait")) {
        toast.error(msg); // Rate limit message
      } else {
        // Always show success for security — don't reveal if email exists
        setForgotStep("otp");
        setOtpTimer(60);
        toast.success("If the email exists, a reset code has been sent.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Round A Fix #6: Forgot password — Step 2: Verify OTP only
  async function handleForgotVerifyOtp() {
    if (!forgotOtp || forgotOtp.length !== 6) { toast.error("Enter the 6-digit code."); return; }

    setLoading(true);
    try {
      await authApi.verifyForgotOtp({ email: forgotEmail, otp: forgotOtp });
      toast.success("Code verified! Now create your new password.");
      setForgotStep("newpass");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid code. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Round A Fix #6: Forgot password — Step 3: Set new password (OTP already verified)
  async function handleForgotResetPassword() {
    if (!forgotNewPass || forgotNewPass.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (forgotNewPass !== forgotConfirmPass) { toast.error("Passwords do not match."); return; }

    setLoading(true);
    try {
      await authApi.resetPassword({
        email: forgotEmail,
        otp: forgotOtp,
        new_password: forgotNewPass,
      });
      toast.success("Password reset! You can now log in.");
      setShowForgot(false);
      setForgotStep("email");
      setForgotEmail("");
      setForgotOtp("");
      setForgotNewPass("");
      setForgotConfirmPass("");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Reset failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // ═══ EMAIL VERIFICATION SCREEN ═══
  if (step === "verify-email") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream-100)] p-5">
        <div className="max-w-[440px] w-full text-center">
          <div className="font-display font-[900] text-[1.8rem] text-[var(--brown-800)] mb-6">
            COOK<span className="text-[var(--orange-500)]">ONCALL</span>
          </div>

          <div className="w-20 h-20 rounded-full bg-[rgba(212,114,26,0.1)] flex items-center justify-center mx-auto mb-5">
            <Mail className="w-10 h-10 text-[var(--orange-500)]" />
          </div>

          <h1 className="font-display text-[1.5rem] font-[900] text-[var(--brown-800)] mb-2">
            Verify Your Email
          </h1>
          <p className="text-[var(--text-muted)] text-[0.9rem] mb-6 leading-relaxed">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-[var(--brown-800)]">{verifyEmail}</span>.
            <br />Enter it below to verify your account.
          </p>

          {/* OTP Input */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpInput(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className={cn(
                  "w-[52px] h-[60px] text-center text-[1.5rem] font-bold border-[2px] rounded-[12px] outline-none transition-all",
                  digit
                    ? "border-[var(--orange-500)] bg-[rgba(212,114,26,0.04)]"
                    : "border-[var(--cream-300)] bg-white"
                )}
                style={{ fontFamily: "var(--font-body)" }}
              />
            ))}
          </div>

          <button
            onClick={handleVerifyEmail}
            disabled={loading || otpDigits.join("").length !== 6}
            className="w-full py-4 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-base cursor-pointer transition-all hover:bg-[var(--orange-400)] disabled:opacity-60 mb-4"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>

          <div className="text-[0.85rem] text-[var(--text-muted)] mb-3">
            Didn&apos;t receive the code?{" "}
            <button
              onClick={handleResendOtp}
              disabled={otpTimer > 0}
              className={cn(
                "font-semibold bg-transparent border-none cursor-pointer",
                otpTimer > 0 ? "text-[var(--text-muted)]" : "text-[var(--orange-500)]"
              )}
              style={{ fontFamily: "var(--font-body)" }}
            >
              {otpTimer > 0 ? `Resend in ${otpTimer}s` : "Resend Code"}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ═══ ROLE SELECTION SCREEN ═══
  // Round A Fix #5: Clicking a role card auto-advances to auth — no Continue button
  if (step === "role") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream-100)] p-5">
        <div className="max-w-[520px] w-full text-center">
          <div className="font-display font-[900] text-[1.8rem] text-[var(--brown-800)] mb-8">
            COOK<span className="text-[var(--orange-500)]">ONCALL</span>
          </div>
          <h1 className="font-display text-[1.8rem] font-[900] text-[var(--brown-800)] mb-2">
            Welcome! How would you like to join?
          </h1>
          <p className="text-[var(--text-muted)] text-[0.95rem] mb-9">
            Choose your role to get started.
          </p>
          <div className="flex gap-5 mb-7 flex-col sm:flex-row">
            {[
              {
                key: "Customer" as Role,
                icon: <UtensilsCrossed className="w-9 h-9 text-[var(--orange-500)]" />,
                title: "I'm a Customer",
                desc: "Book professional chefs to cook in your home",
              },
              {
                key: "Chef" as Role,
                icon: <ChefHat className="w-9 h-9 text-[var(--orange-500)]" />,
                title: "I'm a Chef",
                desc: "Join the platform, set your menu, and earn money",
              },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleRoleSelect(opt.key)}
                className={cn(
                  "flex-1 py-8 px-5 rounded-[16px] border-2 bg-white cursor-pointer transition-all duration-300 text-center",
                  "border-[var(--cream-300)] hover:border-[var(--orange-500)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(26,15,10,0.08)]"
                )}
              >
                <div className="w-14 h-14 rounded-2xl bg-[rgba(212,114,26,0.08)] flex items-center justify-center mx-auto mb-3">
                  {opt.icon}
                </div>
                <div className="font-bold text-[1.1rem] mb-1">{opt.title}</div>
                <div className="text-[0.82rem] text-[var(--text-muted)] leading-relaxed">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
          {/* Round A Fix #5: Continue button REMOVED — role card click auto-advances */}
          <div className="mt-5">
            <Link href="/" className="text-[0.85rem] text-[var(--text-muted)] no-underline hover:text-[var(--orange-500)]">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══ AUTH SCREEN (Login / Signup) ═══
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 bg-[var(--brown-800)] flex-col justify-center items-center p-[60px] relative overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(212,114,26,0.15)_0%,transparent_70%)] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <Link href="/" className="font-display font-[900] text-[1.8rem] text-white no-underline mb-12 relative z-[1]">
          COOK<span className="text-[var(--orange-500)]">ONCALL</span>
        </Link>
        <div className="relative z-[1] text-center max-w-[400px]">
          <h2 className="font-display text-[2.2rem] font-[900] text-white mb-4 leading-[1.2]">
            Fresh Meals,<br /><span className="text-[var(--orange-500)]">Real Chefs.</span>
          </h2>
          <p className="text-[rgba(255,255,255,0.6)] text-base leading-[1.7]">
            Book a verified home chef in Ahmedabad. They cook in your kitchen — fresh, hygienic, and personal. Expanding across Gujarat city by city.
          </p>
          <div className="mt-10 flex flex-col gap-4 text-left">
            {["100% verified, FSSAI-compliant chefs", "30+ cuisines — Gujarati to Continental", "Starting at just ₹49 per visit", "Cancel anytime — no commitment"].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-[rgba(255,255,255,0.7)] text-[0.92rem]">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[var(--orange-400)] shrink-0">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
                {feat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 min-h-screen bg-[var(--cream-100)]">
        <div className="w-full max-w-[440px]">
          <div className="lg:hidden font-display font-[900] text-[1.5rem] text-[var(--brown-800)] text-center mb-8">
            COOK<span className="text-[var(--orange-500)]">ONCALL</span>
          </div>
          <button
            onClick={() => setStep("role")}
            className="flex items-center gap-1.5 mb-3 text-[0.85rem] text-[var(--text-muted)] bg-transparent border-none cursor-pointer hover:text-[var(--orange-500)]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Change role ({role})
          </button>

          {/* Tabs */}
          <div className="flex mb-9 border-b-2 border-[var(--cream-200)]">
            {(["login", "signup"] as AuthTab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setShowForgot(false); }}
                className={cn(
                  "flex-1 py-3.5 text-center font-semibold text-base border-none border-b-[2.5px] -mb-[2px] transition-all duration-300 bg-transparent cursor-pointer",
                  tab === t
                    ? "text-[var(--orange-500)] border-b-[var(--orange-500)]"
                    : "text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-dark)]"
                )}
                style={{ fontFamily: "var(--font-body)" }}
              >
                {t === "login" ? "Login" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* ═══ LOGIN TAB ═══ */}
          {tab === "login" && (
            <div className="animate-fade-in">
              {!showForgot ? (
                <>
                  <div className="mb-5">
                    <label className="block font-semibold text-[0.88rem] mb-2 text-[var(--text-dark)]">Email</label>
                    <input
                      type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none transition-all focus:border-[var(--orange-500)] focus:shadow-[0_0_0_3px_rgba(212,114,26,0.1)] placeholder:text-[#B0A090]"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block font-semibold text-[0.88rem] mb-2 text-[var(--text-dark)]">Password</label>
                    <div className="relative">
                      <input
                        type={showLoginPass ? "text" : "password"} value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        placeholder="Enter your password"
                        className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none transition-all focus:border-[var(--orange-500)] focus:shadow-[0_0_0_3px_rgba(212,114,26,0.1)] placeholder:text-[#B0A090] pr-12"
                        style={{ fontFamily: "var(--font-body)" }}
                      />
                      <button type="button" onClick={() => setShowLoginPass(!showLoginPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1">
                        {showLoginPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => { setShowForgot(true); setForgotStep("email"); }}
                    className="block text-right text-[0.85rem] text-[var(--orange-500)] no-underline mb-6 bg-transparent border-none cursor-pointer w-full"
                    style={{ fontFamily: "var(--font-body)" }}>
                    Forgot password?
                  </button>
                  <button onClick={handleLogin} disabled={loading}
                    className="w-full py-4 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-base cursor-pointer transition-all hover:bg-[var(--orange-400)] hover:-translate-y-0.5 disabled:opacity-60"
                    style={{ fontFamily: "var(--font-body)" }}>
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </>
              ) : (
                /* ═══ FORGOT PASSWORD FLOW — Round A Fix #6: Three-step ═══ */
                <div className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-[rgba(212,114,26,0.1)] flex items-center justify-center">
                      {forgotStep === "email" ? <Mail className="w-5 h-5 text-[var(--orange-500)]" /> :
                       forgotStep === "otp" ? <ShieldCheck className="w-5 h-5 text-[var(--orange-500)]" /> :
                       <KeyRound className="w-5 h-5 text-[var(--orange-500)]" />}
                    </div>
                    <div>
                      <div className="font-bold text-[1rem]">
                        {forgotStep === "email" ? "Reset Password" : forgotStep === "otp" ? "Enter Code" : "New Password"}
                      </div>
                      <div className="text-[0.78rem] text-[var(--text-muted)]">
                        {forgotStep === "email" ? "We'll send a code to your email" :
                         forgotStep === "otp" ? `Code sent to ${forgotEmail}` :
                         "Choose a new password"}
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Enter email */}
                  {forgotStep === "email" && (
                    <>
                      <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        onKeyDown={(e) => e.key === "Enter" && handleForgotSendOtp()}
                        className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none mb-4 focus:border-[var(--orange-500)]"
                        style={{ fontFamily: "var(--font-body)" }} />
                      <button onClick={handleForgotSendOtp} disabled={loading}
                        className="w-full py-3.5 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold cursor-pointer hover:bg-[var(--orange-400)] disabled:opacity-60"
                        style={{ fontFamily: "var(--font-body)" }}>
                        {loading ? "Sending..." : "Send Reset Code"}
                      </button>
                    </>
                  )}

                  {/* Step 2: Enter OTP only (Round A Fix #6) */}
                  {forgotStep === "otp" && (
                    <>
                      <input type="text" value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit code" maxLength={6}
                        onKeyDown={(e) => e.key === "Enter" && handleForgotVerifyOtp()}
                        className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none mb-4 focus:border-[var(--orange-500)] text-center text-[1.2rem] tracking-[6px] font-bold"
                        style={{ fontFamily: "var(--font-body)" }} />
                      <button onClick={handleForgotVerifyOtp} disabled={loading || forgotOtp.length !== 6}
                        className="w-full py-3.5 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold cursor-pointer hover:bg-[var(--orange-400)] disabled:opacity-60"
                        style={{ fontFamily: "var(--font-body)" }}>
                        {loading ? "Verifying..." : "Verify Code"}
                      </button>
                      <div className="text-center mt-3 text-[0.82rem] text-[var(--text-muted)]">
                        Didn&apos;t receive the code?{" "}
                        <button
                          onClick={handleForgotSendOtp}
                          disabled={otpTimer > 0}
                          className={cn(
                            "font-semibold bg-transparent border-none cursor-pointer",
                            otpTimer > 0 ? "text-[var(--text-muted)]" : "text-[var(--orange-500)]"
                          )}
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          {otpTimer > 0 ? `Resend in ${otpTimer}s` : "Resend Code"}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 3: New password (only after OTP verified) (Round A Fix #6) */}
                  {forgotStep === "newpass" && (
                    <>
                      <div className="mb-3 relative">
                        <input type={showForgotPass ? "text" : "password"} value={forgotNewPass} onChange={(e) => setForgotNewPass(e.target.value)}
                          placeholder="New password (min 8 characters)"
                          className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)] pr-12"
                          style={{ fontFamily: "var(--font-body)" }} />
                        <button type="button" onClick={() => setShowForgotPass(!showForgotPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1">
                          {showForgotPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <input type="password" value={forgotConfirmPass} onChange={(e) => setForgotConfirmPass(e.target.value)}
                        placeholder="Confirm new password"
                        onKeyDown={(e) => e.key === "Enter" && handleForgotResetPassword()}
                        className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none mb-4 focus:border-[var(--orange-500)]"
                        style={{ fontFamily: "var(--font-body)" }} />
                      <button onClick={handleForgotResetPassword} disabled={loading}
                        className="w-full py-3.5 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold cursor-pointer hover:bg-[var(--orange-400)] disabled:opacity-60"
                        style={{ fontFamily: "var(--font-body)" }}>
                        {loading ? "Resetting..." : "Reset Password"}
                      </button>
                    </>
                  )}

                  <button onClick={() => { setShowForgot(false); setForgotStep("email"); }}
                    className="w-full mt-3 py-3 bg-transparent border-none text-[var(--text-muted)] text-[0.85rem] cursor-pointer"
                    style={{ fontFamily: "var(--font-body)" }}>
                    ← Back to Login
                  </button>
                </div>
              )}

              {!showForgot && (
                <div className="mt-7 text-center text-[0.88rem] text-[var(--text-muted)]">
                  Don&apos;t have an account?{" "}
                  <button onClick={() => setTab("signup")}
                    className="text-[var(--orange-500)] font-semibold bg-transparent border-none cursor-pointer"
                    style={{ fontFamily: "var(--font-body)" }}>
                    Sign up
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══ SIGNUP TAB ═══ */}
          {tab === "signup" && (
            <div className="animate-fade-in">
              <div className="flex gap-3 mb-5">
                <div className="flex-1">
                  <label className="block font-semibold text-[0.88rem] mb-2">First Name</label>
                  <input type="text" value={signupFname} onChange={(e) => setSignupFname(e.target.value)}
                    placeholder="First Name"
                    className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)] placeholder:text-[#B0A090]"
                    style={{ fontFamily: "var(--font-body)" }} />
                </div>
                <div className="flex-1">
                  <label className="block font-semibold text-[0.88rem] mb-2">Last Name</label>
                  <input type="text" value={signupLname} onChange={(e) => setSignupLname(e.target.value)}
                    placeholder="Last Name"
                    className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)] placeholder:text-[#B0A090]"
                    style={{ fontFamily: "var(--font-body)" }} />
                </div>
              </div>
              <div className="mb-5">
                <label className="block font-semibold text-[0.88rem] mb-2">Phone Number</label>
                <input type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)] placeholder:text-[#B0A090]"
                  style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div className="mb-5">
                <label className="block font-semibold text-[0.88rem] mb-2">Email</label>
                <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)] placeholder:text-[#B0A090]"
                  style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div className="mb-5">
                <label className="block font-semibold text-[0.88rem] mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showSignupPass ? "text" : "password"} value={signupPass}
                    onChange={(e) => setSignupPass(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)] placeholder:text-[#B0A090] pr-12"
                    style={{ fontFamily: "var(--font-body)" }} />
                  <button type="button" onClick={() => setShowSignupPass(!showSignupPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1">
                    {showSignupPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {role === "Chef" && (
                <div className="animate-fade-in">
                  {/* Batch B1: specialties as pill checkbox grid + optional custom input.
                      Mobile-friendly: chips wrap to multiple rows. */}
                  <div className="mb-5">
                    <label className="block font-semibold text-[0.88rem] mb-2">
                      Your Specialties <span className="text-[var(--orange-500)]">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {CUISINE_PRESETS.map((c) => {
                        const checked = selectedCuisines.includes(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() =>
                              setSelectedCuisines((prev) =>
                                prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                              )
                            }
                            className={cn(
                              "px-3.5 py-2 rounded-full border-[1.5px] text-[0.82rem] font-medium cursor-pointer transition-all",
                              checked
                                ? "border-[var(--orange-500)] bg-[var(--orange-500)] text-white"
                                : "border-[var(--cream-300)] bg-white text-[var(--text-muted)] hover:border-[var(--orange-500)] hover:text-[var(--orange-500)]"
                            )}
                            style={{ fontFamily: "var(--font-body)" }}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={customCuisine}
                      onChange={(e) => setCustomCuisine(e.target.value)}
                      placeholder="Anything else? Add custom cuisine"
                      className="w-full px-4 py-3 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.9rem] bg-white outline-none focus:border-[var(--orange-500)] placeholder:text-[#B0A090]"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                  </div>
                  <div className="mb-5">
                    <label className="block font-semibold text-[0.88rem] mb-2">Experience</label>
                    <input
                      type="text"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="e.g. 5 years"
                      className="w-full px-4 py-3.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)] placeholder:text-[#B0A090]"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 mb-6">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-[18px] h-[18px] accent-[var(--orange-500)] cursor-pointer" id="terms" />
                <label htmlFor="terms" className="text-[0.88rem] text-[var(--text-muted)] cursor-pointer">
                  I agree to the <Link href="/terms" target="_blank" className="text-[var(--orange-500)] no-underline hover:underline">Terms of Service</Link> and{" "}
                  <Link href="/privacy" target="_blank" className="text-[var(--orange-500)] no-underline hover:underline">Privacy Policy</Link>
                </label>
              </div>

              <button onClick={handleSignup} disabled={loading}
                className="w-full py-4 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-base cursor-pointer transition-all hover:bg-[var(--orange-400)] hover:-translate-y-0.5 disabled:opacity-60"
                style={{ fontFamily: "var(--font-body)" }}>
                {loading ? "Creating account..." : "Create Account"}
              </button>

              <div className="mt-7 text-center text-[0.88rem] text-[var(--text-muted)]">
                Already have an account?{" "}
                <button onClick={() => setTab("login")}
                  className="text-[var(--orange-500)] font-semibold bg-transparent border-none cursor-pointer"
                  style={{ fontFamily: "var(--font-body)" }}>
                  Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
