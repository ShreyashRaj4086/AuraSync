"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, CloudCog, KeyRound, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type StoredAccount = { name: string; email: string; password: string };

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    // Update stored local accounts if matching email exists
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const accounts: StoredAccount[] = JSON.parse(localStorage.getItem("aurasync-accounts") || "[]");
      const updatedAccounts = accounts.map((acc) =>
        acc.email === normalizedEmail ? { ...acc, password } : acc
      );
      localStorage.setItem("aurasync-accounts", JSON.stringify(updatedAccounts));
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl shadow-black/50 backdrop-blur-md sm:p-10"
    >
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="mb-7 flex items-center gap-2 text-xs text-slate-500 transition hover:text-white"
      >
        <ArrowLeft size={14} /> Back to Sign In
      </button>

      <div className="mb-7 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-black">
              <Sparkles size={17} />
            </span>
            <span className="text-sm font-semibold tracking-[0.16em]">AURASYNC</span>
          </div>
          <h1 className="mt-6 text-2xl font-medium tracking-[-0.04em]">Create New Password</h1>
          <p className="mt-2 text-sm text-slate-400">
            {email ? (
              <>Resetting password for <strong className="text-slate-200 font-medium">{email}</strong></>
            ) : (
              "Enter your new secure password below."
            )}
          </p>
        </div>
        <span className="hidden rounded-full border border-emerald-200/15 bg-emerald-200/5 px-2.5 py-1.5 text-[10px] text-emerald-100/70 sm:inline-flex">
          Encrypted Token
        </span>
      </div>

      <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-[11px] text-slate-400">
        <CloudCog size={15} className="text-cyan-200/70" /> Token verified · {token ? token.slice(0, 8) + "..." : "Authorized session"}
      </div>

      {success ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center py-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-lg font-medium text-white">Password Updated!</h2>
          <p className="text-xs text-slate-400">Your password has been saved. Redirecting to Sign In...</p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs text-slate-400">New Password</span>
            <span className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-4 focus-within:ring-1 focus-within:ring-cyan-500">
              <LockKeyhole size={15} className="text-slate-500" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs text-slate-400">Confirm New Password</span>
            <span className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-4 focus-within:ring-1 focus-within:ring-cyan-500">
              <LockKeyhole size={15} className="text-slate-500" />
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
              />
            </span>
          </label>

          {error && (
            <p className="rounded-lg border border-rose-300/20 bg-rose-300/5 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
          >
            Save New Password <ArrowRight size={15} />
          </motion.button>
        </form>
      )}

      <p className="mt-6 border-t border-slate-800 pt-4 text-center text-[11px] text-slate-500">
        Need assistance? Contact support@aurasync.local
      </p>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-5 py-10 text-white">
      <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-white/[0.03] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-12rem] right-[-8rem] h-72 w-72 rounded-full bg-cyan-300/[0.04] blur-[100px]" />

      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-400">
            Loading reset verification...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
