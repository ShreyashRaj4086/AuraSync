"use client";

import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudCog,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const DEMO_EMAIL = "demo@aurasync.local";
const DEMO_PASSWORD = "AuraSync2026!";
type StoredAccount = { name: string; email: string; password: string };

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function AuthScreen({ onSuccess, onBack }: AuthScreenProps) {
  const [mode, setMode] = useState<"signin" | "create" | "forgot">("signin");
  const [resetState, setResetState] = useState<"idle" | "loading" | "success">("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const switchMode = (nextMode: "signin" | "create" | "forgot") => {
    setMode(nextMode);
    setResetState("idle");
    setError("");
    setMessage("");
    if (nextMode === "signin") {
      setEmail(DEMO_EMAIL);
      setPassword(DEMO_PASSWORD);
    } else if (nextMode === "create") {
      setEmail("");
      setPassword("");
      setName("");
    } else {
      setEmail("");
    }
  };

  const handleSendReset = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError("");
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setResetState("loading");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to send reset instructions. Please try again.");
        setResetState("idle");
        return;
      }
      setResetState("success");
    } catch {
      setError("Unable to send reset instructions. Please try again.");
      setResetState("idle");
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setResetState("loading");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to resend reset instructions.");
        setResetState("idle");
        return;
      }
      setResetState("success");
      setMessage("A fresh reset link has been dispatched.");
    } catch {
      setError("Unable to resend reset instructions.");
      setResetState("idle");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "forgot") {
      handleSendReset(event);
      return;
    }

    if (mode === "create") {
      if (name.trim().length < 2) {
        setError("Enter your name to create an account.");
        return;
      }
      if (password.length < 8) {
        setError("Use at least 8 characters for your password.");
        return;
      }
      const accounts: StoredAccount[] = JSON.parse(localStorage.getItem("aurasync-accounts") || "[]");
      if (accounts.some((account) => account.email === normalizedEmail)) {
        setError("An account with this email already exists.");
        return;
      }
      localStorage.setItem(
        "aurasync-accounts",
        JSON.stringify([...accounts, { name: name.trim(), email: normalizedEmail, password }])
      );
      setMode("signin");
      setEmail(normalizedEmail);
      setPassword("");
      setMessage("Account created successfully. Sign in to continue.");
      return;
    }

    // Sign In mode
    const accounts: StoredAccount[] = JSON.parse(localStorage.getItem("aurasync-accounts") || "[]");
    const validDemo = normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD;
    const validAccount = accounts.some((account) => account.email === normalizedEmail && account.password === password);

    if (!validDemo && !validAccount) {
      setError("Email or password not recognized.");
      return;
    }
    localStorage.setItem("aurasync-session", normalizedEmail);
    onSuccess();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-5 py-10 text-white">
      {/* Background glow elements */}
      <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-white/[0.03] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-12rem] right-[-8rem] h-72 w-72 rounded-full bg-cyan-300/[0.04] blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl shadow-black/50 backdrop-blur-md sm:p-10"
      >
        <button
          type="button"
          onClick={onBack}
          className="mb-7 flex items-center gap-2 text-xs text-slate-500 transition hover:text-white"
        >
          <ArrowLeft size={14} /> Back to AuraSync
        </button>

        <div className="mb-7 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-black">
                <Sparkles size={17} />
              </span>
              <span className="text-sm font-semibold tracking-[0.16em]">AURASYNC</span>
            </div>
            <h1 className="mt-6 text-2xl font-medium tracking-[-0.04em]">
              {mode === "signin"
                ? "Welcome back"
                : mode === "create"
                ? "Create your account"
                : resetState === "success"
                ? "Check your email"
                : "Reset your password"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {mode === "signin"
                ? "Continue to your private wellbeing workspace."
                : mode === "create"
                ? "Start your private wellbeing workspace."
                : resetState === "success"
                ? "We have dispatched reset instructions to your inbox."
                : "Enter your email to receive recovery instructions."}
            </p>
          </div>
          <span className="hidden rounded-full border border-emerald-200/15 bg-emerald-200/5 px-2.5 py-1.5 text-[10px] text-emerald-100/70 sm:inline-flex">
            AWS serverless
          </span>
        </div>

        <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-[11px] text-slate-400">
          <CloudCog size={15} className="text-cyan-200/70" /> Encrypted architecture · your data stays yours
        </div>

        <AnimatePresence mode="wait">
          {mode === "forgot" && resetState === "success" ? (
            <motion.div
              key="forgot-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 text-center"
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-xl shadow-cyan-500/10">
                <CheckCircle2 size={32} />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left">
                <p className="text-xs leading-6 text-slate-300">
                  If an account exists for <strong className="text-white font-medium">{email || "that email"}</strong>, we have sent password reset instructions. Please check your spam folder. The link will expire in 15 minutes.
                </p>
              </div>

              {message && (
                <p className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-200">
                  {message}
                </p>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
                >
                  Return to Sign In <ArrowRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  className="flex items-center justify-center gap-1.5 mx-auto text-xs text-slate-400 hover:text-cyan-300 transition-colors py-1"
                >
                  <RefreshCw size={13} /> Didn&apos;t receive email? Resend
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={submit}
              className="space-y-4"
            >
              {mode === "create" && (
                <label className="block">
                  <span className="mb-2 block text-xs text-slate-400">Your name</span>
                  <span className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-4 focus-within:ring-1 focus-within:ring-cyan-500">
                    <UserRound size={15} className="text-slate-500" />
                    <input
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Shreyash Raj"
                      className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                    />
                  </span>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-xs text-slate-400">Email address</span>
                <span className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-4 focus-within:ring-1 focus-within:ring-cyan-500">
                  <Mail size={15} className="text-slate-500" />
                  <input
                    required
                    type="email"
                    disabled={mode === "forgot" && resetState === "loading"}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
                  />
                </span>
              </label>

              {mode !== "forgot" && (
                <label className="block">
                  <span className="mb-2 block text-xs text-slate-400">Password</span>
                  <span className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-4 focus-within:ring-1 focus-within:ring-cyan-500">
                    <LockKeyhole size={15} className="text-slate-500" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={mode === "signin" ? "Enter your password" : "At least 8 characters"}
                      className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                    />
                  </span>
                </label>
              )}

              {mode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-slate-400 transition-colors hover:text-cyan-300"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-rose-300/20 bg-rose-300/5 px-3 py-2 text-xs text-rose-200">
                  {error}
                </p>
              )}

              {message && (
                <p className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-200">
                  {message}
                </p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={mode === "forgot" && resetState === "loading"}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {mode === "forgot" ? (
                  resetState === "loading" ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-slate-950" />
                      Sending reset link...
                    </>
                  ) : (
                    <>
                      Send Reset Instructions
                      <ArrowRight size={15} />
                    </>
                  )
                ) : mode === "signin" ? (
                  <>
                    Sign In
                    <ArrowRight size={15} />
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={15} />
                  </>
                )}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-7 text-center text-xs text-slate-500">
          {mode === "signin" ? (
            <p>
              New to AuraSync?{" "}
              <button
                type="button"
                onClick={() => switchMode("create")}
                className="text-slate-400 font-medium transition-colors hover:text-white"
              >
                Create an Account
              </button>
            </p>
          ) : mode === "create" ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-slate-400 font-medium transition-colors hover:text-white"
              >
                Sign In
              </button>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="flex items-center gap-1.5 mx-auto text-slate-400 font-medium transition-colors hover:text-white"
            >
              <KeyRound size={13} /> Back to Sign In
            </button>
          )}
        </div>

        {mode === "signin" && (
          <p className="mt-4 border-t border-slate-800 pt-4 text-center text-[11px] text-slate-500">
            Demo: <span className="text-slate-300">{DEMO_EMAIL}</span> · <span className="text-slate-300">{DEMO_PASSWORD}</span>
          </p>
        )}
      </motion.div>
    </main>
  );
}
