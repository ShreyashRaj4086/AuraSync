"use client";

import { ChangeEvent, Dispatch, RefObject, SetStateAction, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDisplayName, getFirstName } from "@/lib/utils";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  HeartPulse,
  ImagePlus,
  Info,
  Leaf,
  Moon,
  Plus,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smile,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { MET_MAP, useDashboard } from "@/components/dashboard/DashboardContext";

/* =========================================================================
   TYPES
   ========================================================================= */
export type Meal = {
  id: number;
  name: string;
  calories: number;
  source: "VISION" | "MANUAL";
  grams?: number;
  time: string;
};

export type Metrics = {
  waistToHeight: number;
  bodyFat: number | null;
  leanBodyMass: number;
  bmr: number;
  bmrMethod: "Katch-McArdle" | "Mifflin-St Jeor";
  activeCalories: number;
  tdee: number;
  target: number;
  label: string;
};

export type View =
  | "overview"
  | "vision-scanner"
  | "manual-entry"
  | "daily-logs"
  | "baseline-calculator"
  | "daily-goal"
  | "adaptive-budget"
  | "trend-scorecards"
  | "busy-hours"
  | "calendar-history"
  | "export-audit"
  | "purge-records";

export const format = (value: number) => Math.round(value).toLocaleString();

/* =========================================================================
   HISTORICAL DATA TYPES & MOCK DATA
   ========================================================================= */
export type DayRecord = {
  date: string; // ISO "YYYY-MM-DD"
  sleepHours: number | null;
  busyHours: number | null;
  steps: number | null;
  exerciseDuration: number | null;
  mood: string | null; // null = missing
  calories: number | null;
  meals: { name: string; calories: number; grams?: number; time: string }[];
  journalNote?: string | null;
};

export const initialHistoryDays: DayRecord[] = [];

export const HISTORY_DATES: string[] = [];

export function isGapDate(dateStr: string): boolean {
  return false;
}

function safeAvg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/* =========================================================================
   SHARED UI PRIMITIVES
   ========================================================================= */
type PanelProps = { children: React.ReactNode; className?: string };
export function Panel({ children, className = "" }: PanelProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-800/80 bg-slate-900/30 backdrop-blur-xl shadow-xl shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}

function Metric({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-medium text-slate-200">{value}</p>
      {subtext && <p className="mt-0.5 text-[10px] text-slate-500">{subtext}</p>}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  alert = false,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  alert?: boolean;
  subtext?: string;
}) {
  return (
    <Panel className={`p-4 transition hover:border-slate-700 ${alert ? "border-rose-400/30 bg-rose-400/[0.04]" : ""}`}>
      <div className="flex items-center gap-2 text-slate-500">
        <span className="text-cyan-200/80">{icon}</span>
        <span className="text-[10px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className={`mt-3 text-2xl font-semibold tracking-tight ${alert ? "text-rose-200" : "text-slate-100"}`}>
        {value}
      </p>
      {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
    </Panel>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  min = 0,
  max,
  step = "any",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium">{label}</span>
      <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-1 focus-within:border-cyan-400/60 focus-within:ring-1 focus-within:ring-cyan-400/30 transition">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent py-2 text-sm text-white outline-none placeholder:text-slate-600"
        />
        <span className="text-xs text-slate-500 font-mono shrink-0 ml-1">{suffix}</span>
      </div>
    </label>
  );
}

function DataGapBanner({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/[0.06] px-4 py-3.5 text-xs leading-5 text-amber-200/90">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
      <span>
        <strong className="font-semibold text-amber-100">Missing Data — </strong>
        {message ??
          "Activity and mood records are missing from this period. Data shown may be incomplete and should not be used for behavioral adjustments."}
      </span>
    </div>
  );
}

/* =========================================================================
   OVERVIEW VIEW — Personal Info & Progress Dashboard
   ========================================================================= */
export function OverviewView({
  metrics,
  consumed,
  onViewChange,
}: {
  metrics: Metrics | null;
  consumed: number;
  onViewChange: (view: View) => void;
}) {
  const dashboard = useDashboard();

  // Profile Input Details State
  const [profileAge, setProfileAge] = useState(dashboard.age || "");
  const [profileHeight, setProfileHeight] = useState(dashboard.height || "");
  const [profileWeight, setProfileWeight] = useState(dashboard.weight || "");
  const [profileGender, setProfileGender] = useState<"female" | "male" | "">(dashboard.gender || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);

  useEffect(() => {
    if (dashboard.age) setProfileAge(dashboard.age);
    if (dashboard.height) setProfileHeight(dashboard.height);
    if (dashboard.weight) setProfileWeight(dashboard.weight);
    if (dashboard.gender) setProfileGender(dashboard.gender);
  }, [dashboard.age, dashboard.height, dashboard.weight, dashboard.gender]);

  const handleSaveBiometricProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileAge || !profileHeight || !profileWeight || !profileGender) {
      alert("Please fill in Age, Height, Weight, and select Gender.");
      return;
    }
    dashboard.setAge(profileAge);
    dashboard.setHeight(profileHeight);
    dashboard.setWeight(profileWeight);
    dashboard.setGender(profileGender);
    dashboard.completeSetup();
    setIsEditingProfile(false);
    setProfileSavedNotice(true);
    setTimeout(() => setProfileSavedNotice(false), 4000);
  };

  const isProfileIncomplete = !dashboard.isSetupComplete || !dashboard.height || !dashboard.weight || !dashboard.age || !dashboard.gender;
  const showSetupCard = isProfileIncomplete || isEditingProfile;

  const hasMetrics = metrics !== null;
  const targetVal = hasMetrics ? metrics.target : 2000;
  const balance = targetVal - consumed;
  const currentWeight = dashboard.weight || "--";

  const { completedGuideItems, toggleGuideItem } = dashboard;

  // Week-at-a-Glance calculations (Last 7 days)
  const recent7Days = HISTORY_DATES.slice(-7);
  const weekGlanceData = recent7Days.map((dateStr) => {
    const rec = dashboard.historyRecords.find((r) => r.date === dateStr);
    const hasCal = rec !== undefined && rec.calories !== null;
    const isTargetMet = hasCal && rec.calories! <= targetVal;
    return {
      dateStr,
      label: dateStr.slice(5).replace("-", "/"),
      calories: rec?.calories ?? null,
      hasCal,
      isTargetMet,
    };
  });

  const metDaysCount = weekGlanceData.filter((d) => d.isTargetMet).length;

  // Recent Journal Snippet (Most recent non-empty journal note from historyRecords)
  const recentJournalRec = [...dashboard.historyRecords]
    .reverse()
    .find((r) => r.journalNote && r.journalNote.trim().length > 0);
  const recentJournalText = recentJournalRec?.journalNote ?? "No recent journal notes logged yet.";
  const recentJournalDate = recentJournalRec?.date ?? "";

  const guideItems = [
    {
      id: "baseline",
      title: "Configure Baselines",
      description: "Set your height, weight, and goals in Biometrics.",
      targetView: "baseline-calculator" as View,
    },
    {
      id: "scan",
      title: "Scan a Meal",
      description: "Use the Vision Scanner to log your first food item.",
      targetView: "vision-scanner" as View,
    },
    {
      id: "activity",
      title: "Log an Activity",
      description: "Add a workout using the Dynamic Activity Log.",
      targetView: "baseline-calculator" as View,
    },
    {
      id: "insights",
      title: "View Insights",
      description: "Check the Trend Scorecards for personalized wellbeing patterns.",
      targetView: "trend-scorecards" as View,
    },
    {
      id: "history",
      title: "Explore History",
      description: "Navigate to the Calendar to read or add past data.",
      targetView: "calendar-history" as View,
    },
  ];

  const isItemChecked = (itemId: string) => {
    return (
      !!completedGuideItems[itemId] ||
      (itemId === "baseline" && dashboard.isSetupComplete) ||
      (itemId === "scan" && dashboard.meals.length > 0) ||
      (itemId === "activity" && dashboard.activities.length > 0)
    );
  };

  const guideCompletedCount = guideItems.filter((item) => isItemChecked(item.id)).length;

  return (
    <div className="space-y-6">
      {/* =========================================================================
         1. EXPANDED PERSONAL DASHBOARD (HOME PAGE - TOP SECTION)
         ========================================================================= */}
      <Panel className="p-6 sm:p-8 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/30 border-cyan-400/20 shadow-2xl">
        <div className="pointer-events-none absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        {/* User Header & Quick Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-widest mb-1">
              <Sparkles size={14} /> Personal Info & Progress Dashboard
            </div>
            <h2 className="text-3xl font-medium tracking-tight text-white">
              Welcome, {getFirstName(dashboard.profileName)}!
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Primary Goal: <strong className="text-cyan-300">{dashboard.primaryGoal || "Maintenance"}</strong> · Stress Level: <strong className="text-amber-300">{dashboard.stressLevel || "Moderate"}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onViewChange("vision-scanner")}
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-100 transition shadow-lg shadow-white/10 active:scale-95"
            >
              Scan a meal
            </button>
            <button
              type="button"
              onClick={() => onViewChange("baseline-calculator")}
              className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
            >
              Account Setup
            </button>
          </div>
        </div>

        {/* Saved Notice Banner */}
        {profileSavedNotice && (
          <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-200 flex items-center justify-between">
            <span>✓ Biometric profile (Age, Height, Weight, Gender) saved successfully! Your baseline metrics have been initialized.</span>
          </div>
        )}

        {/* Profile Input Details Section (Age, Height, Weight, Gender) */}
        {showSetupCard ? (
          <div className="mt-6 rounded-2xl border border-cyan-400/40 bg-slate-950/80 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles size={14} /> Set Baseline Details
                </div>
                <h3 className="text-lg font-medium text-white mt-0.5">Account Biometric Setup</h3>
                <p className="text-xs text-slate-400">Enter your age, height, weight, and gender to set your default values and metabolic target.</p>
              </div>
              {!isProfileIncomplete && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSaveBiometricProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Age (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 25"
                    value={profileAge}
                    onChange={(e) => setProfileAge(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    min="50"
                    max="250"
                    placeholder="e.g. 175"
                    value={profileHeight}
                    onChange={(e) => setProfileHeight(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="20"
                    max="300"
                    step="0.1"
                    placeholder="e.g. 70"
                    value={profileWeight}
                    onChange={(e) => setProfileWeight(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Gender</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileGender("male")}
                      className={`py-2 text-xs font-medium rounded-xl border transition ${
                        profileGender === "male"
                          ? "border-cyan-400 bg-cyan-400/20 text-cyan-200"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileGender("female")}
                      className={`py-2 text-xs font-medium rounded-xl border transition ${
                        profileGender === "female"
                          ? "border-cyan-400 bg-cyan-400/20 text-cyan-200"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <span className="text-[11px] text-slate-400">Saved values persist permanently across sessions.</span>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition active:scale-95"
                >
                  Save Biometric Profile
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between flex-wrap gap-3 p-3.5 rounded-2xl border border-slate-800 bg-slate-950/60 text-xs">
            <div className="flex items-center gap-4 flex-wrap text-slate-300">
              <div><span className="text-slate-400">Age:</span> <strong className="text-white font-mono">{dashboard.age} yrs</strong></div>
              <div><span className="text-slate-400">Height:</span> <strong className="text-white font-mono">{dashboard.height} cm</strong></div>
              <div><span className="text-slate-400">Weight:</span> <strong className="text-white font-mono">{dashboard.weight} kg</strong></div>
              <div><span className="text-slate-400">Gender:</span> <strong className="text-white capitalize">{dashboard.gender}</strong></div>
              {dashboard.metrics && (
                <div><span className="text-slate-400">Target:</span> <strong className="text-cyan-300 font-mono">{Math.round(dashboard.metrics.target)} kcal/day</strong></div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="text-xs text-cyan-300 hover:text-cyan-200 underline font-medium"
            >
              Edit Profile Details
            </button>
          </div>
        )}

        {/* Feature 1: Week-at-a-Glance Calorie Progress Bar / Pills */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Flame size={14} className="text-emerald-400" /> Week-at-a-Glance Calorie Target ({metDaysCount}/7 Days Met)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Goal: {format(targetVal)} kcal/day</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekGlanceData.map((d) => (
              <div
                key={d.dateStr}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                  d.isTargetMet
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : d.hasCal
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : "border-slate-800 bg-slate-950/60 text-slate-500"
                }`}
              >
                <span className="text-[10px] font-mono mb-1 text-slate-400">{d.label}</span>
                <span className="h-2 w-2 rounded-full mb-1" style={{
                  backgroundColor: d.isTargetMet ? "#34d399" : d.hasCal ? "#fbbf24" : "#475569"
                }} />
                <span className="text-[10px] font-semibold font-mono">
                  {d.calories !== null ? `${d.calories}` : "--"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Features 2 & 3: Sleep & Mood Quick View + Recent Journal Snippet */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Sleep & Mood Quick View Cards */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex items-center gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300">
              <Moon size={20} />
            </span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Last Night Sleep</p>
              <p className="text-lg font-semibold text-white mt-0.5">{dashboard.sleepHours || "7.5"} hrs</p>
              <p className="text-[10px] text-slate-500">Rest duration logged</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex items-center gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
              <Smile size={20} />
            </span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Current Mood Check-in</p>
              <p className="text-lg font-semibold text-white mt-0.5 truncate max-w-[140px]">{dashboard.mood || "Fine"}</p>
              <p className="text-[10px] text-slate-500">Self-reported sentiment</p>
            </div>
          </div>

          {/* Feature 3: Recent Journal Snippet */}
          <div
            onClick={() => onViewChange("calendar-history")}
            className="rounded-xl border border-cyan-400/20 bg-slate-950/60 p-4 cursor-pointer hover:border-cyan-400/40 transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                  <BookOpen size={13} /> Recent Journal Entry
                </span>
                {recentJournalDate && (
                  <span className="text-[10px] font-mono text-slate-500">{recentJournalDate}</span>
                )}
              </div>
              <p className="text-xs text-slate-200 truncate italic mt-1 group-hover:text-white transition">
                &ldquo;{recentJournalText}&rdquo;
              </p>
            </div>
            <p className="text-[10px] text-cyan-400 mt-2 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition">
              Open Calendar Journal <ArrowRight size={11} />
            </p>
          </div>
        </div>
      </Panel>

      {/* Primary 3-Metric Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="p-5 border-cyan-400/20">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium">Body Weight</span>
            <Target size={16} className="text-cyan-300" />
          </div>
          <p className="text-3xl font-semibold text-white">
            {currentWeight} <span className="text-sm font-normal text-slate-400">kg</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">Current baseline weight</p>
        </Panel>

        <Panel className="p-5 border-emerald-400/20">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium">Daily Calorie Goal</span>
            <Flame size={16} className="text-emerald-300" />
          </div>
          <p className="text-3xl font-semibold text-white">
            {format(targetVal)} <span className="text-sm font-normal text-slate-400">kcal</span>
          </p>
          <p className={`mt-1 text-xs font-medium ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {balance >= 0 ? `${format(balance)} kcal remaining` : `${format(Math.abs(balance))} kcal over goal`}
          </p>
        </Panel>

        <Panel className="p-5 border-violet-400/20">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium">Active Expenditure</span>
            <Zap size={16} className="text-violet-300" />
          </div>
          <p className="text-3xl font-semibold text-white">
            +{format(dashboard.activities.reduce((acc, a) => acc + a.caloriesBurned, 0))} <span className="text-sm font-normal text-slate-400">kcal</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">{dashboard.activities.length} exercise activities logged today</p>
        </Panel>
      </div>

      {/* =========================================================================
         2. INTERACTIVE FEATURE GUIDE & CHECKLIST (HOME PAGE - BOTTOM SECTION)
         ========================================================================= */}
      <Panel className="p-6 sm:p-8 border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300 font-medium">Interactive Onboarding</p>
              <h3 className="text-xl font-semibold text-white">AuraSync Quick Start Guide</h3>
            </div>
          </div>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 font-mono">
            {guideCompletedCount} / {guideItems.length} Completed
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Explore all primary features of AuraSync. Click checkboxes to physically mark off completed steps or jump directly to any view.
        </p>

        <div className="space-y-3">
          {guideItems.map((item) => {
            const isChecked = isItemChecked(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition ${
                  isChecked
                    ? "border-emerald-400/30 bg-emerald-400/[0.03]"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => toggleGuideItem(item.id)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition ${
                      isChecked
                        ? "bg-emerald-400 text-slate-950 font-bold"
                        : "border border-slate-700 bg-slate-900 hover:border-cyan-400"
                    }`}
                    aria-label={`Toggle ${item.title}`}
                  >
                    {isChecked && <Check size={13} />}
                  </button>
                  <div>
                    <h4 className={`text-sm font-medium ${isChecked ? "line-through text-slate-400" : "text-slate-200"}`}>
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onViewChange(item.targetView)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400/50 hover:text-white transition shrink-0 ml-3"
                >
                  <span>Go to feature</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

const metDictionary: Record<string, number> = {
  gardening: 4.0,
  dancing: 5.0,
  cleaning: 3.0,
  boxing: 9.0,
  hiking: 6.0,
  swimming: 7.0,
  cycling: 7.5,
  running: 9.0,
  walking: 3.5,
  rowing: 7.0,
  skiing: 7.0,
  badminton: 5.5,
  jump_rope: 11.0,
  climbing: 8.0,
  skating: 5.5,
  pilates: 3.0,
  yoga: 3.0,
  tennis: 7.3,
  basketball: 8.0,
};

/* =========================================================================
   VIEW A: ACCOUNT SETUP & MET ACTIVITY LOG
   ========================================================================= */
export function EnhancedBaselineCalculatorView({
  height,
  setHeight,
  weight,
  setWeight,
  age,
  setAge,
  gender,
  setGender,
  activity,
  setActivity,
  waist,
  setWaist,
  bodyFat,
  setBodyFat,
  profileName,
  setProfileName,
  sleepHours,
  setSleepHours,
  activityHours,
  setActivityHours,
  steps,
  setSteps,
  exerciseDuration,
  setExerciseDuration,
  mood,
  setMood,
  customMood,
  setCustomMood,
  generated,
  generateMetrics,
  metrics,
  onReset,
  onCompleteSetup,
  isSetupComplete,
}: {
  height: string;
  setHeight: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  age: string;
  setAge: (v: string) => void;
  gender: "female" | "male" | "";
  setGender: (v: "female" | "male" | "") => void;
  activity: string;
  setActivity: (v: string) => void;
  waist: string;
  setWaist: (v: string) => void;
  bodyFat: string;
  setBodyFat: (v: string) => void;
  profileName: string;
  setProfileName: (v: string) => void;
  sleepHours: string;
  setSleepHours: (v: string) => void;
  activityHours: string;
  setActivityHours: (v: string) => void;
  steps: string;
  setSteps: (v: string) => void;
  exerciseDuration: string;
  setExerciseDuration: (v: string) => void;
  mood: string;
  setMood: (v: string) => void;
  customMood: string;
  setCustomMood: (v: string) => void;
  generated: boolean;
  generateMetrics: () => void;
  metrics: Metrics | null;
  onReset: () => void;
  onCompleteSetup: () => void;
  isSetupComplete: boolean;
}) {
  const dashboard = useDashboard();
  const moodOptions = ["Extremely Good", "Good", "Fine", "Bad", "Extremely Bad", "Write your own..."];

  // Activity Log local state
  const [selectedActivityType, setSelectedActivityType] = useState("Walking");
  const [customActivityName, setCustomActivityName] = useState("");
  const [customActivityIntensity, setCustomActivityIntensity] = useState<"Low" | "Moderate" | "High">("Moderate");
  const [activityDurationHours, setActivityDurationHours] = useState("0.5");
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);

  // Auto-matching MET dictionary lookup
  const nameLower = customActivityName.toLowerCase().trim();
  const autoMatchedKey = Object.keys(metDictionary).find((key) => nameLower.includes(key));
  const autoMetValue = autoMatchedKey ? metDictionary[autoMatchedKey] : null;

  const handleAddActivity = () => {
    const dur = parseFloat(activityDurationHours);
    if (!Number.isFinite(dur) || dur <= 0) return;

    if (selectedActivityType === "Enter your own...") {
      const name = customActivityName.trim() || "Custom Exercise";
      const customMet = autoMetValue !== null
        ? autoMetValue
        : (customActivityIntensity === "Low" ? 3.0 : customActivityIntensity === "High" ? 8.0 : 5.0);

      dashboard.addActivity(name, dur, customMet);
      setCustomActivityName("");
    } else {
      dashboard.addActivity(selectedActivityType, dur);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-slate-100">Account Setup & MET Activity Log</h2>
          <p className="text-xs text-slate-400">Set baseline biometrics, log MET exercises, and generate daily goals.</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3.5 py-2 text-xs text-slate-400 transition hover:border-slate-700 hover:text-white"
        >
          <RefreshCw size={13} /> Reset inputs
        </button>
      </div>

      <Panel className="p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
            <Target size={15} />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80 font-medium">Baseline Stats</p>
            <h3 className="text-base font-medium text-slate-200">Physical & Metabolic Metrics</h3>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-3">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium">Name</span>
            <input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400" />
          </label>
          <NumberInput label="Height" value={height} onChange={setHeight} suffix="cm" placeholder="172" min={50} max={260} />
          <NumberInput label="Weight" value={weight} onChange={setWeight} suffix="kg" placeholder="68" min={20} max={300} />
          <NumberInput label="Age" value={age} onChange={setAge} suffix="yrs" placeholder="29" min={10} max={120} />
          <NumberInput label="Waist Circumference" value={waist} onChange={setWaist} suffix="cm" placeholder="80" min={30} max={250} />
          <NumberInput label="Body Fat % (Optional)" value={bodyFat} onChange={setBodyFat} suffix="%" placeholder="18" min={1} max={99} step="0.1" />
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium">Gender</span>
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1 focus-within:border-cyan-400/60 focus-within:ring-1 focus-within:ring-cyan-400/30 transition">
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value as "female" | "male" | "")}
                className="w-full bg-transparent py-2 text-sm text-white outline-none"
              >
                <option value="" className="bg-slate-950 text-slate-400">Select</option>
                <option value="female" className="bg-slate-950 text-white">Female</option>
                <option value="male" className="bg-slate-950 text-white">Male</option>
              </select>
            </div>
          </label>
        </div>

        {/* ── MET-based Dynamic Activity Log ── */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2 mb-3">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <Zap size={15} />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/80 font-medium">Dynamic Activity Log</p>
              <h4 className="text-sm font-medium text-slate-200">MET-Based Calorie Expenditure</h4>
            </div>
          </div>

          {/* Add Activity Form */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] items-end">
              <label className="block">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-slate-400">Activity Type</span>
                <select
                  value={selectedActivityType}
                  onChange={(e) => setSelectedActivityType(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                >
                  {Object.keys(MET_MAP).map((type) => (
                    <option key={type} value={type}>
                      {type} (~{MET_MAP[type]} MET)
                    </option>
                  ))}
                  <option value="Enter your own...">Enter your own...</option>
                </select>
              </label>

              <NumberInput
                label="Duration"
                value={activityDurationHours}
                onChange={setActivityDurationHours}
                suffix="hrs"
                placeholder="0.5"
                step="0.1"
                min={0.1}
              />

              <button
                type="button"
                onClick={handleAddActivity}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-95"
              >
                <Plus size={14} /> Add Exercise
              </button>
            </div>

            {/* Custom Activity Inputs when "Enter your own..." is selected */}
            {selectedActivityType === "Enter your own..." && (
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-slate-800/80 animate-in fade-in duration-200">
                <label className="block">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-cyan-300">Custom Exercise Name</span>
                    {autoMetValue !== null && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Auto-matched MET
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customActivityName}
                    onChange={(e) => setCustomActivityName(e.target.value)}
                    placeholder="e.g. Dancing, Boxing, Gardening, Hiking..."
                    className="w-full rounded-lg border border-cyan-400/30 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 placeholder:text-slate-600"
                  />
                </label>

                {/* Reveal fallback Intensity Level dropdown ONLY if text does NOT match dictionary */}
                {autoMetValue === null ? (
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-slate-400">Fallback Intensity Level</span>
                    <select
                      value={customActivityIntensity}
                      onChange={(e) => setCustomActivityIntensity(e.target.value as "Low" | "Moderate" | "High")}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      <option value="Low">Low (~3.0 MET)</option>
                      <option value="Moderate">Moderate (~5.0 MET)</option>
                      <option value="High">High (~8.0 MET)</option>
                    </select>
                  </label>
                ) : (
                  <div className="flex flex-col justify-center px-3 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                    <span className="text-[10px] uppercase font-mono tracking-wider">Smart MET Auto-Locked</span>
                    <p className="text-xs font-semibold mt-0.5">{autoMetValue} MET (Matched &quot;{autoMatchedKey}&quot;)</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Toggleable Accordion Log Viewer for Activity Logs */}
          <div className="mt-4 border border-slate-800/80 rounded-xl bg-slate-950/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsLogViewerOpen(!isLogViewerOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-slate-300 hover:bg-slate-900/60 transition"
            >
              <span className="flex items-center gap-2">
                <Zap size={14} className="text-emerald-400" />
                View Activity Logs ({dashboard.activities.length} logged today)
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                {isLogViewerOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </span>
            </button>

            {isLogViewerOpen && (
              <div className="p-4 pt-2 border-t border-slate-800/80 space-y-2 animate-in fade-in duration-200">
                {dashboard.activities.length > 0 ? (
                  dashboard.activities.map((act) => (
                    <div key={act.id} className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/50 px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-white">{act.type}</span>
                        <span className="text-slate-400">{act.duration} hrs</span>
                        <span className="rounded bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-300 font-mono">{act.met} MET</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-emerald-400">+{act.caloriesBurned} active kcal</span>
                        <button
                          type="button"
                          onClick={() => dashboard.removeActivity(act.id)}
                          className="text-slate-500 hover:text-rose-400 transition"
                          aria-label="Remove exercise"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-slate-500">No exercise activities logged for today yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            id="complete-setup-btn"
            onClick={isSetupComplete ? generateMetrics : onCompleteSetup}
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:bg-cyan-100 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Sparkles size={16} /> {isSetupComplete ? "Refresh metabolic metrics" : "Complete Setup & Generate Goals"}
          </button>
          {generated && metrics ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 size={15} /> Calculations active & updated
            </span>
          ) : (
            <span className="text-xs text-slate-500">Add waist circumference; body fat enables Katch-McArdle BMR.</span>
          )}
        </div>

        {generated && metrics && (
          <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300/80 font-medium">Calculated Baseline</p>
                <h4 className="mt-0.5 text-lg font-medium text-white">{metrics.label}</h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Daily Calorie Target: </span>
                <span className="text-xl font-bold text-cyan-200">{format(metrics.target)} kcal</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 border-t border-slate-800/80 pt-4">
              <div className="rounded-lg bg-slate-950/60 p-3 text-center border border-slate-800/60">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Base BMR</p>
                <p className="mt-1 text-lg font-semibold text-slate-100">{format(metrics.bmr)} kcal</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{metrics.bmrMethod}</p>
              </div>
              <div className="rounded-lg bg-slate-950/60 p-3 text-center border border-slate-800/60">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Active MET Burn</p>
                <p className="mt-1 text-lg font-semibold text-emerald-400">+{format(metrics.activeCalories)} kcal</p>
                <p className="mt-0.5 text-[10px] text-slate-400">From logged activities</p>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-lg bg-slate-950/60 p-3 text-center border border-slate-800/60">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Total TDEE</p>
                <p className="mt-1 text-lg font-semibold text-slate-100">{format(metrics.tdee)} kcal</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Base BMR + MET Burn</p>
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* Scientific MET Calculation Explanation Block */}
      <Panel className="p-6 sm:p-8 border-cyan-400/20 bg-slate-900/40">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
            <Info size={15} />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300 font-medium">Metabolic Methodology</p>
            <h3 className="text-base font-medium text-slate-100">Scientific MET Calorie Calculation</h3>
          </div>
        </div>
        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <p>
            <strong className="text-white">Active Calories Formula:</strong>{" "}
            <code className="rounded bg-slate-950 px-2 py-1 text-cyan-300 font-mono">Active Calories = MET × Weight (kg) × Duration (hours)</code>
          </p>
          <p>
            <strong className="text-white">What is a MET?</strong> MET (Metabolic Equivalent of Task) standardizes energy expenditure across varying body weights. 1 MET equals baseline resting energy expenditure (~1 kcal/kg/hour). For example, moderate walking (~3.5 METs) burns energy at 3.5× your resting rate.
          </p>
          <p className="text-slate-400 text-[11px]">
            By multiplying specific exercise METs by your body weight in kilograms and duration in hours, AuraSync calculates precision active expenditure.
          </p>
        </div>
      </Panel>

      <Panel className="p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
            <HeartPulse size={15} />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/80 font-medium">Daily Rhythms</p>
            <h3 className="text-base font-medium text-slate-200">Comprehensive Wellbeing Inputs</h3>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Capture sleep, activity, and emotional valence to power your descriptive Trend Scorecards.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-300">
              <Moon size={15} className="text-cyan-300" />
              <span className="text-xs font-medium">1. Sleep</span>
            </div>
            <NumberInput label="Sleep Hours" value={sleepHours} onChange={setSleepHours} suffix="hrs" placeholder="7.5" min={0} max={24} step="0.5" />
          </div>

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1 text-slate-300">
              <Activity size={15} className="text-emerald-300" />
              <span className="text-xs font-medium">2. Activity Pulse</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <NumberInput label="Steps" value={steps} onChange={setSteps} suffix="steps" placeholder="8500" min={0} step="100" />
              <NumberInput label="Exercise Duration" value={exerciseDuration} onChange={setExerciseDuration} suffix="min" placeholder="45" min={0} step="5" />
            </div>
          </div>

          <div className="sm:col-span-2 rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-300">
              <Smile size={15} className="text-amber-300" />
              <span className="text-xs font-medium">3. Mood & Emotional Valence</span>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-slate-300">How are you feeling today?</span>
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-1 focus-within:border-amber-400/60 focus-within:ring-1 focus-within:ring-amber-400/30 transition">
                <select
                  value={mood}
                  onChange={(event) => setMood(event.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm text-white outline-none"
                >
                  <option value="" className="bg-slate-950 text-slate-400">Select mood...</option>
                  {moodOptions.map((opt) => (
                    <option key={opt} value={opt} className="bg-slate-950 text-white">{opt}</option>
                  ))}
                </select>
              </div>
            </label>
            {mood === "Write your own..." && (
              <div className="mt-4 animate-in fade-in duration-200">
                <label className="block">
                  <span className="mb-2 block text-xs text-amber-300/90 font-medium">Write your own mood description:</span>
                  <input
                    type="text"
                    value={customMood}
                    onChange={(event) => setCustomMood(event.target.value)}
                    placeholder="e.g. Centered, fatigued after travel, exhilarated..."
                    className="w-full rounded-xl border border-amber-400/30 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 placeholder:text-slate-600 transition"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================================
   VIEW B: DAILY GOAL
   ========================================================================= */
export function DailyGoalView({
  metrics,
  generated,
  consumed,
  onNavigateToCalculator,
}: {
  metrics: Metrics | null;
  generated: boolean;
  consumed: number;
  onNavigateToCalculator?: () => void;
}) {
  const isReady = generated && metrics !== null;
  const balance = isReady ? metrics.target - consumed : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Panel className="p-6 sm:p-8 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-medium">Daily Goal Target</p>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] text-cyan-200 font-mono uppercase tracking-wider">
            {isReady ? "Active Baseline" : "Needs Calculation"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-400 mb-1">Target</p>
            <p className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              {isReady ? format(metrics.target) : "--"}{" "}
              <span className="text-lg font-normal tracking-normal text-slate-500">kcal</span>
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {isReady ? metrics.label : "Complete your biometrics to compute your personalized Daily Goal."}
            </p>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5">
            <p className="text-xs text-slate-400 mb-1">Calories Consumed Today</p>
            <p className="text-4xl font-semibold tracking-tight text-white">
              {format(consumed)}{" "}
              <span className="text-sm font-normal text-slate-500">kcal</span>
            </p>
            {isReady && balance !== null && (
              <p className={`mt-2 text-sm font-medium ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {balance >= 0 ? `${format(balance)} kcal remaining` : `${format(Math.abs(balance))} kcal over goal`}
              </p>
            )}
          </div>
        </div>

        {!isReady && onNavigateToCalculator && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onNavigateToCalculator}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100"
            >
              Open account setup <ArrowRight size={14} />
            </button>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<Target size={18} />}
          label="Waist-to-Height Ratio"
          value={isReady ? metrics.waistToHeight.toFixed(2) : "--"}
          subtext={
            isReady
              ? metrics.waistToHeight < 0.5 ? "Healthy range (< 0.50)" : "Above healthy range"
              : "Not calculated yet"
          }
        />
        <Stat icon={<Flame size={18} />} label="BMR (Basal Metabolic Rate)" value={isReady ? `${format(metrics.bmr)} kcal` : "--"} subtext={isReady ? metrics.bmrMethod : "Resting energy expenditure"} />
        <Stat icon={<Zap size={18} />} label="Active MET Calories" value={isReady ? `+${format(metrics.activeCalories)} kcal` : "--"} subtext="From exercise log" />
      </div>

      <Panel className="p-6">
        <div className="flex items-center gap-2 text-slate-300">
          <Info size={16} className="text-cyan-300" />
          <h3 className="text-sm font-medium text-slate-200">How your Daily Goal is derived</h3>
        </div>
        <div className="mt-4 grid gap-3 text-xs leading-6 text-slate-400 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
            <p className="font-medium text-slate-200">1. Basal BMR + Active MET Expenditure</p>
            <p className="mt-1">Body fat enables Katch-McArdle BMR from lean mass; otherwise Mifflin-St Jeor is used. Active calories from logged exercises are added directly on top of BMR.</p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
            <p className="font-medium text-slate-200">2. Gentle Target Calibration</p>
            <p className="mt-1">WHtR is the primary indicator. A ratio at or above 0.50 applies a gentle 250 kcal calibration; otherwise the target is maintenance.</p>
          </div>
        </div>
        <p className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
          <Leaf size={13} className="text-emerald-400/70" /> Descriptive estimates for lifestyle awareness, not clinical prescriptions.
        </p>
      </Panel>
    </div>
  );
}

/* =========================================================================
   VIEW C: BUSY HOURS
   ========================================================================= */
export function BusyHoursView({ busyHours, setBusyHours }: { busyHours: string; setBusyHours: (v: string) => void }) {
  const presets = [
    { label: "Light Day", hours: "3" },
    { label: "Standard Workday", hours: "6" },
    { label: "Heavy Focus", hours: "8.5" },
    { label: "Full Surge", hours: "11" },
  ];
  const numericHours = parseFloat(busyHours) || 0;
  const intensity =
    numericHours === 0 ? "Not logged"
    : numericHours <= 4 ? "Light routine load"
    : numericHours <= 7.5 ? "Moderate routine load"
    : numericHours <= 10 ? "Demanding routine load"
    : "High-intensity surge";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Panel className="p-6 sm:p-8">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Clock size={17} /></span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-medium">Daily Routine</p>
            <h2 className="text-2xl font-medium tracking-tight text-white">Busy Hours</h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Log how many demanding, focused, or busy hours you experienced today. Cross-referenced with your sleep and mood in Trend Scorecards.
        </p>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400">Hours spent busy today</span>
              <p className="mt-1 text-3xl font-semibold text-white">
                {busyHours ? `${busyHours} hrs` : "0 hrs"}{" "}
                <span className="text-xs font-normal text-cyan-300">({intensity})</span>
              </p>
            </div>
            <div className="w-36">
              <NumberInput label="Quick Edit" value={busyHours} onChange={setBusyHours} suffix="hrs" placeholder="6" min={0} max={24} step="0.5" />
            </div>
          </div>
          <div className="mt-6">
            <input type="range" min="0" max="16" step="0.5" value={busyHours || "0"} onChange={(e) => setBusyHours(e.target.value)} className="w-full accent-cyan-300 cursor-pointer" />
            <div className="mt-2 flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0h (Rest)</span><span>4h (Light)</span><span>8h (Full day)</span><span>12h+ (Surge)</span>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium mb-3">Quick Presets</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button key={p.label} type="button" onClick={() => setBusyHours(p.hours)}
                  className={`rounded-xl border px-3.5 py-2 text-xs transition ${busyHours === p.hours ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white"}`}>
                  {p.label} ({p.hours}h)
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>
      <Panel className="p-6">
        <div className="flex items-center gap-2"><Sparkles size={15} className="text-cyan-300" /><h3 className="text-sm font-medium text-slate-200">How Busy Hours integrates with your dashboard</h3></div>
        <p className="mt-3 text-xs leading-6 text-slate-400">
          In your <strong className="text-slate-200 font-medium">Trend Scorecards</strong>, AuraSync correlates your logged busy hours against your sleep duration and emotional check-in to provide a non-clinical narrative of your daily recovery balance.
        </p>
      </Panel>
    </div>
  );
}

/* =========================================================================
   VIEW D: TREND SCORECARDS — Dynamically reacts to calendar gap updates!
   ========================================================================= */
/* =========================================================================
   VIEW D: TREND SCORECARDS — Advanced Wellbeing Explorer & Credibility Scores
   ========================================================================= */
export function UnifiedTrendScorecardsView({
  sleepHours,
  mood,
  customMood,
  busyHours,
  dailyGoal,
}: {
  sleepHours: string;
  mood: string;
  customMood: string;
  busyHours: string;
  dailyGoal: number;
}) {
  const dashboard = useDashboard();
  const { primaryGoal, stressLevel } = dashboard;
  const displayMood = mood === "Write your own..." ? customMood || "Custom Mood" : mood || "Not logged";
  const displaySleep = sleepHours || "7.5";
  const displayBusy = busyHours || "6";

  const allRecords = dashboard.historyRecords;
  const hasGapInRange = allRecords.some((r) => r.steps === null || r.mood === null);

  const avgSleep = safeAvg(allRecords.map((r) => r.sleepHours));
  const avgBusy = safeAvg(allRecords.map((r) => r.busyHours));
  const avgSteps = safeAvg(allRecords.map((r) => r.steps));

  const moodScore = (value: string | null) => {
    const scores: Record<string, number> = { "Extremely Bad": 1, Bad: 2, Fine: 3, Good: 4, "Extremely Good": 5 };
    return value ? scores[value] ?? null : null;
  };

  const recentTrendData = HISTORY_DATES.slice(-7).map((date) => {
    const record = allRecords.find((r) => r.date === date);
    return {
      date: date.slice(5).replace("-", "/"),
      steps: record?.steps ?? null,
      activityHours: record?.exerciseDuration === null || record?.exerciseDuration === undefined ? null : Number((record.exerciseDuration / 60).toFixed(1)),
      moodScore: moodScore(record?.mood ?? null),
      calories: record?.calories ?? null,
      goal: dailyGoal,
    };
  });

  // Data completeness volume & credibility score calculations
  const totalDaysCount = allRecords.length;
  const completeDaysCount = allRecords.filter(
    (r) => r.sleepHours !== null && r.mood !== null && r.steps !== null && r.calories !== null
  ).length;

  const isHighConfidence = !hasGapInRange && completeDaysCount >= 7;
  const baseScore = isHighConfidence
    ? Math.min(98, Math.round(88 + (completeDaysCount / totalDaysCount) * 10))
    : Math.max(35, Math.round(35 + (completeDaysCount / totalDaysCount) * 20));

  // 4 Distinct Pattern Observations with individual Credibility Scores
  const insightPatterns = [
    {
      id: "act-vs-mood",
      title: "1. Movement & Emotional Valence (Activity vs. Mood)",
      icon: <Activity size={17} className="text-cyan-300" />,
      score: baseScore,
      isHigh: isHighConfidence,
      narrative: avgSteps !== null && avgSteps > 8000
        ? `Sustained activity pacing (avg ${Math.round(avgSteps).toLocaleString()} steps) strongly correlates with positive mood check-ins ('${displayMood}'). On active days exceeding 8,000 steps, reported emotional valence remains consistently elevated.`
        : `Activity pacing currently averages ${avgSteps ? Math.round(avgSteps).toLocaleString() : "incomplete"} steps across complete days. Step volume serves as an stabilizing anchor for self-reported emotional valence.`,
      metricTag: "Active Pacing",
      metricVal: `${avgSteps ? Math.round(avgSteps).toLocaleString() : "--"} steps avg`,
    },
    {
      id: "sleep-vs-burn",
      title: "2. Rest Rhythm & Active Expenditure (Sleep vs. Calorie Burn)",
      icon: <Moon size={17} className="text-violet-300" />,
      score: isHighConfidence ? Math.min(96, baseScore + 2) : Math.max(38, baseScore - 2),
      isHigh: isHighConfidence,
      narrative: avgSleep !== null && avgSleep >= 7.0
        ? `Consistent nocturnal rest (${displaySleep}h today, ${avgSleep.toFixed(1)}h historical avg) directly supports higher active MET calorie expenditure during workouts, maintaining baseline recovery.`
        : `Nocturnal sleep logged at ${displaySleep}h. Rest recovery under 7.0h tends to correlate with reduced workout duration and lower active calorie burn on subsequent days.`,
      metricTag: "Sleep Rhythm",
      metricVal: `${displaySleep}h Logged Today`,
    },
    {
      id: "cal-vs-mood",
      title: "3. Energy Balance & Sentiment (Caloric Target vs. Mood)",
      icon: <Flame size={17} className="text-emerald-300" />,
      score: isHighConfidence ? Math.min(94, baseScore - 1) : Math.max(32, baseScore + 3),
      isHigh: isHighConfidence,
      narrative: `Daily caloric intake kept near your metabolic goal (${dailyGoal} kcal) prevents severe energy deficits, maintaining stable mood scores ('${displayMood}'). Balanced nutrition avoids fatigue-induced mood drops.`,
      metricTag: "Calorie Target",
      metricVal: `${dailyGoal} kcal Daily Goal`,
    },
    {
      id: "busy-vs-recovery",
      title: "4. Schedule Intensity & Recovery Demand (Busy Hours vs. Rest)",
      icon: <Clock size={17} className="text-amber-300" />,
      score: isHighConfidence ? Math.min(95, baseScore + 1) : Math.max(40, baseScore),
      isHigh: isHighConfidence,
      narrative: parseFloat(displayBusy) >= 8
        ? `Demanding schedule load (${displayBusy} busy hours today) increases evening fatigue. Pairing heavy work surges with 7.5h+ sleep cushions against cumulative fatigue.`
        : `Moderate routine intensity (${displayBusy} busy hours) balances comfortably with your reported sleep rhythm (${displaySleep}h), preserving daily energy buffer.`,
      metricTag: "Routine Load",
      metricVal: `${displayBusy}h Busy Volume`,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Gap warning banner — automatically removed when gap is filled */}
      {hasGapInRange && (
        <DataGapBanner message="A week of activity and mood records (Sep 1–7) is missing from this dataset. Use the Calendar view to Add Missing Data and upgrade Credibility Scores to 85-100%!" />
      )}

      {/* Survey Integration Personalization Banner */}
      {(primaryGoal || stressLevel) && (
        <Panel className="p-4 border-cyan-400/30 bg-cyan-400/[0.03] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
              <Target size={16} />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300 font-medium">Personalized Strategy Profile</p>
              <p className="text-xs text-slate-200 mt-0.5">
                Primary Goal: <span className="font-medium text-white">{primaryGoal || "Not set"}</span> · Baseline Stress: <span className="font-medium text-white">{stressLevel || "Not set"}</span>
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
            Tailoring multi-signal pattern observations
          </span>
        </Panel>
      )}

      {/* Dataset Overview & Global Credibility Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-medium">Advanced Wellbeing Explorer</p>
          <h2 className="text-2xl font-medium text-white">Pattern Synthesis & Credibility Scores</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasGapInRange ? (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] text-amber-200 font-medium">
              <TrendingDown size={13} className="text-amber-300" /> Gap Dataset · {baseScore}% Credibility
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11px] text-emerald-200 font-medium">
              <TrendingUp size={13} className="text-emerald-300" /> High Data Volume · {baseScore}% Credibility
            </span>
          )}
        </div>
      </div>

      {/* 4 Primary Metric Scorecards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Moon size={17} /></span>
            <span className="text-[10px] uppercase font-mono text-cyan-200/70">Rest</span>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-slate-500">Sleep Rhythm</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{sleepHours ? `${sleepHours}h` : "7.5h"}</p>
          <p className="mt-1 text-xs text-slate-400">{sleepHours ? "User-recorded today" : "Baseline average steady"}</p>
          {avgSleep !== null && (
            <p className="mt-2 text-[10px] text-slate-500">Historical avg: {avgSleep.toFixed(1)}h</p>
          )}
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Clock size={17} /></span>
            <span className="text-[10px] uppercase font-mono text-amber-200/70">Routine</span>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-slate-500">Busy Hours</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{busyHours ? `${busyHours}h` : "--"}</p>
          <p className="mt-1 text-xs text-slate-400">{busyHours ? "Logged routine intensity" : "Not logged yet today"}</p>
          {avgBusy !== null && (
            <p className="mt-2 text-[10px] text-slate-500">Non-gap avg: {avgBusy.toFixed(1)}h</p>
          )}
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><Activity size={17} /></span>
            <span className="text-[10px] uppercase font-mono text-emerald-200/70">Pacing</span>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-slate-500">Activity Pulse</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">
            {avgSteps !== null ? Math.round(avgSteps).toLocaleString() : "--"}
          </p>
          <p className="mt-1 text-xs text-slate-400">steps avg (complete days only)</p>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Smile size={17} /></span>
            <span className="text-[10px] uppercase font-mono text-violet-200/70">Valence</span>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-slate-500">Mood Check-in</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100 truncate">{displayMood}</p>
          <p className="mt-1 text-xs text-slate-400">Self-reported check-in</p>
        </Panel>
      </div>

      {/* Recharts Visual Trends */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300 font-medium">Activity vs. Mood</p>
            <h3 className="mt-1 text-base font-medium text-slate-100">Seven-day movement and mood</h3>
            <p className="mt-1 text-xs text-slate-400">Steps are shown as bars; mood uses a 1–5 self-report scale.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={recentTrendData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="steps" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <YAxis yAxisId="mood" orientation="right" domain={[0, 5]} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip wrapperClassName="!rounded-xl !border !border-slate-700 !bg-slate-900/80 !backdrop-blur-md" contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem" }} labelStyle={{ color: "#e2e8f0" }} itemStyle={{ color: "#cbd5e1" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Bar yAxisId="steps" dataKey="steps" name="Daily steps" fill="#22d3ee" fillOpacity={0.72} radius={[5, 5, 0, 0]} />
                <Line yAxisId="mood" type="monotone" dataKey="moodScore" name="Mood score" stroke="#c084fc" strokeWidth={2.5} dot={{ r: 3, fill: "#c084fc" }} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 font-medium">Nutrition vs. Goal</p>
            <h3 className="mt-1 text-base font-medium text-slate-100">Seven-day calorie alignment</h3>
            <p className="mt-1 text-xs text-slate-400">Missing calorie records remain empty rather than inferred.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentTrendData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip wrapperClassName="!rounded-xl !border !border-slate-700 !bg-slate-900/80 !backdrop-blur-md" contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem" }} labelStyle={{ color: "#e2e8f0" }} itemStyle={{ color: "#cbd5e1" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Line type="monotone" dataKey="calories" name="Calories" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: "#34d399" }} connectNulls={false} />
                <Line type="linear" dataKey="goal" name="Daily goal" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* 4 Detailed Generated Pattern Observations with Credibility Scores */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
              <BrainCircuit size={16} />
            </span>
            <h3 className="text-lg font-medium text-slate-100">Multi-Signal Pattern Observations (4 Observations)</h3>
          </div>
          <span className="text-[10px] uppercase tracking-[0.14em] font-mono text-slate-500">Credibility Engine Active</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {insightPatterns.map((p) => (
            <Panel key={p.id} className="p-5 flex flex-col justify-between border-slate-800 hover:border-slate-700 transition">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {p.icon}
                    <h4 className="text-xs font-semibold text-slate-200">{p.title}</h4>
                  </div>
                  {/* Credibility Badge */}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                    p.isHigh
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  }`}>
                    {p.isHigh ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {p.score}% {p.isHigh ? "High Credibility" : "Low (Gap Data)"}
                  </span>
                </div>

                {/* Sleek Progress Bar for Credibility Score */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Data Volume Confidence</span>
                    <span className="font-mono">{p.score}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        p.isHigh ? "bg-gradient-to-r from-emerald-500 to-cyan-400" : "bg-gradient-to-r from-amber-500 to-amber-300"
                      }`}
                      style={{ width: `${p.score}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs leading-6 text-slate-300">{p.narrative}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>{p.metricTag}</span>
                <span className="font-medium text-slate-200 font-mono">{p.metricVal}</span>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
/* =========================================================================
   VIEW E: CALENDAR HISTORY — with Add Missing Data & Daily Journal Entries!
   ========================================================================= */
export function CalendarHistoryView() {
  const dashboard = useDashboard();
  const searchParams = useSearchParams();
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];
  const dateParam = searchParams.get("date");
  const selectedDate = dateParam || today;

  const initialD = new Date(selectedDate + "T12:00:00");
  const initialYear = isNaN(initialD.getFullYear()) ? new Date().getFullYear() : initialD.getFullYear();
  const initialMonth = isNaN(initialD.getMonth()) ? new Date().getMonth() + 1 : initialD.getMonth() + 1;

  const [calMonth, setCalMonth] = useState<{ year: number; month: number }>({ year: initialYear, month: initialMonth });

  const record = dashboard.historyRecords.find((r) => r.date === selectedDate) ?? null;
  const hasJournalNote = Boolean(record?.journalNote && record.journalNote.trim().length > 0);
  const hasMetricsData = record !== null && (
    record.sleepHours !== null ||
    record.busyHours !== null ||
    record.steps !== null ||
    record.exerciseDuration !== null ||
    record.mood !== null ||
    record.calories !== null ||
    (record.meals && record.meals.length > 0)
  );
  const isMissing = record === null || (!hasJournalNote && !hasMetricsData);

  // Journal Note State — strictly bound to selectedDate
  const [journalInput, setJournalInput] = useState<string>("");
  const [journalSaved, setJournalSaved] = useState<boolean>(false);

  // Record Form State (Sleep, Mood, Busy Hours, Steps, Exercise Duration, Calories)
  const [recSleep, setRecSleep] = useState("");
  const [recBusy, setRecBusy] = useState("");
  const [recSteps, setRecSteps] = useState("");
  const [recExDuration, setRecExDuration] = useState("");
  const [recMood, setRecMood] = useState("");
  const [recCalories, setRecCalories] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditingRecord, setIsEditingRecord] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate + "T12:00:00");
      if (!isNaN(d.getFullYear())) {
        setCalMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
      }
      dashboard.fetchCalendarRecord(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const currentRec = dashboard.historyRecords.find((r) => r.date === selectedDate);
    setJournalInput(currentRec?.journalNote ?? "");
    setJournalSaved(false);

    setRecSleep(currentRec?.sleepHours !== null && currentRec?.sleepHours !== undefined ? currentRec.sleepHours.toString() : "");
    setRecBusy(currentRec?.busyHours !== null && currentRec?.busyHours !== undefined ? currentRec.busyHours.toString() : "");
    setRecSteps(currentRec?.steps !== null && currentRec?.steps !== undefined ? currentRec.steps.toString() : "");
    setRecExDuration(currentRec?.exerciseDuration !== null && currentRec?.exerciseDuration !== undefined ? currentRec.exerciseDuration.toString() : "");
    setRecMood(currentRec?.mood || "");
    setRecCalories(currentRec?.calories !== null && currentRec?.calories !== undefined ? currentRec.calories.toString() : "");
    setIsEditingRecord(false);
  }, [selectedDate, dashboard.historyRecords]);

  const handleSelectDate = (dateStr: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "calendar");
    params.set("date", dateStr);
    router.push(`/?${params.toString()}`);
  };

  const handleSaveJournalNote = () => {
    dashboard.updateHistoryRecord(selectedDate, { journalNote: journalInput });
    setJournalSaved(true);
    setTimeout(() => setJournalSaved(false), 3000);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const sleep = recSleep ? parseFloat(recSleep) : null;
    const busy = recBusy ? parseFloat(recBusy) : null;
    const stp = recSteps ? parseInt(recSteps, 10) : null;
    const exDur = recExDuration ? parseInt(recExDuration, 10) : null;
    const cal = recCalories ? parseInt(recCalories, 10) : null;

    dashboard.updateHistoryRecord(selectedDate, {
      sleepHours: sleep,
      busyHours: busy,
      steps: stp,
      exerciseDuration: exDur,
      mood: recMood || null,
      calories: cal,
      meals: record?.meals?.length ? record.meals : (cal ? [{ name: "User logged entry", calories: cal, time: "12:00" }] : []),
    });
    setSaveSuccess(true);
    setIsEditingRecord(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month - 1, 1).getDay();

  const daysInMonth = getDaysInMonth(calMonth.year, calMonth.month);
  const firstDay = getFirstDayOfMonth(calMonth.year, calMonth.month);
  const monthLabel = new Date(calMonth.year, calMonth.month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => {
    setCalMonth((prev) =>
      prev.month === 1 ? { year: prev.year - 1, month: 12 } : { year: prev.year, month: prev.month - 1 }
    );
  };
  const nextMonth = () => {
    setCalMonth((prev) =>
      prev.month === 12 ? { year: prev.year + 1, month: 1 } : { year: prev.year, month: prev.month + 1 }
    );
  };

  const formatDate = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const isWithin90Days = (dateStr: string, todayStr: string = "2026-09-13"): boolean => {
    const d = new Date(dateStr + "T00:00:00");
    const todayDate = new Date(todayStr + "T00:00:00");
    const diffTime = todayDate.getTime() - d.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 90;
  };

  const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><CalendarDays size={17} /></span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-medium">Historical Records & Daily Journal</p>
          <h2 className="text-2xl font-medium text-white">Calendar & Insightful Journal</h2>
        </div>
      </div>
      <p className="text-sm text-slate-400">
        Browse historical daily records, reflect in your insightful daily journal, or recover missing outage data to upgrade your Credibility Scores.
      </p>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Calendar Grid */}
        <Panel className="p-5 w-full lg:w-80">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth} className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:text-white transition"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-slate-200">{monthLabel}</span>
            <button type="button" onClick={nextMonth} className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:text-white transition"><ChevronRight size={16} /></button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {dayLabels.map((d) => (
              <div key={d} className="text-center text-[10px] text-slate-500 font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDate(calMonth.year, calMonth.month, day);
              const dayRec = dashboard.historyRecords.find((r) => r.date === dateStr);
              const hasRecord = !!dayRec;
              const dayHasJournal = Boolean(dayRec?.journalNote && dayRec.journalNote.trim().length > 0);
              const dayHasMetrics = dayRec !== undefined && dayRec !== null && (
                dayRec.sleepHours !== null ||
                dayRec.busyHours !== null ||
                dayRec.steps !== null ||
                dayRec.exerciseDuration !== null ||
                dayRec.mood !== null ||
                dayRec.calories !== null ||
                (dayRec.meals && dayRec.meals.length > 0)
              );
              const dayIsMissing = !dayRec || (!dayHasJournal && !dayHasMetrics);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === today;
              const in90Days = isWithin90Days(dateStr, today);

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={!in90Days}
                  onClick={() => handleSelectDate(dateStr)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition
                    ${isSelected ? "bg-white text-black shadow-md font-bold" : ""}
                    ${!isSelected && hasRecord && dayIsMissing ? "bg-amber-400/10 text-amber-300 border border-amber-400/30" : ""}
                    ${!isSelected && hasRecord && !dayIsMissing ? "text-slate-200 hover:bg-slate-800" : ""}
                    ${!isSelected && !hasRecord && in90Days ? "text-slate-300 hover:bg-slate-800/80 border border-dashed border-slate-700/60 cursor-pointer" : ""}
                    ${!in90Days ? "text-slate-700 cursor-not-allowed opacity-40" : "cursor-pointer"}
                    ${isToday && !isSelected ? "ring-1 ring-cyan-400/60" : ""}
                  `}
                >
                  {day}
                  {hasRecord && !dayIsMissing && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-400/60" />
                  )}
                  {hasRecord && dayIsMissing && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-amber-400/80" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-[10px] text-slate-500">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400/60 shrink-0" /> Complete record</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400/80 shrink-0" /> Incomplete data (Click to recover)</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full border border-dashed border-slate-500 shrink-0" /> Interactive (Within 90 days)</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-700 shrink-0" /> Outside 90-day window</div>
          </div>
        </Panel>

        {/* Day Detail, Journal Entry & Data Recovery/Edit Form */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <p className="text-lg font-medium text-slate-200">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
              {isMissing ? (
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[10px] text-amber-300 font-medium">
                  Incomplete Record
                </span>
              ) : (
                <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] text-emerald-300 font-medium">
                  Complete Record
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsEditingRecord(!isEditingRecord)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition"
            >
              {isEditingRecord ? "Close Editor" : "Edit Daily Entry (Sleep, Mood, etc.)"}
            </button>
          </div>

          {/* Insightful Journal Entry Textarea */}
          <Panel className="p-5 border-cyan-400/20 bg-slate-900/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <BookOpen size={15} />
                </span>
                <h3 className="text-sm font-medium text-slate-100">Insightful Journal Entry</h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-300/80">{selectedDate}</span>
            </div>
            <textarea
              rows={3}
              value={journalInput}
              onChange={(e) => setJournalInput(e.target.value)}
              placeholder="Reflect on your day, energy levels, achievements, or mood drivers for this date..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/60 transition resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {journalInput.length > 0 ? `${journalInput.length} characters` : "No journal note written"}
              </span>
              <div className="flex items-center gap-2">
                {journalSaved && <span className="text-xs text-emerald-400 font-medium animate-in fade-in">✓ Note saved!</span>}
                <button
                  type="button"
                  onClick={handleSaveJournalNote}
                  className="rounded-lg bg-cyan-400/20 border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/30 transition active:scale-95"
                >
                  Save Journal Entry
                </button>
              </div>
            </div>
          </Panel>

          {/* Editable Form for Sleep, Mood, Busy Hours, Steps, Exercise Duration, and Calories */}
          {(isEditingRecord || isMissing || !record) && (
            <Panel className="p-6 border-cyan-400/30 bg-slate-900/80 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-cyan-300 mb-2">
                <Sparkles size={16} />
                <h3 className="text-sm font-semibold">Edit / Log Daily Entry for {selectedDate}</h3>
              </div>
              <p className="text-xs text-slate-400 mb-5 leading-5">
                Update sleep duration, mood, busy hours, step count, exercise time, and calorie intake for this date.
              </p>

              <form onSubmit={handleSaveRecord} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <NumberInput label="Sleep Hours" value={recSleep} onChange={setRecSleep} suffix="hrs" placeholder="7.5" step="0.5" />
                  <NumberInput label="Busy Hours" value={recBusy} onChange={setRecBusy} suffix="hrs" placeholder="6.0" step="0.5" />
                  <NumberInput label="Steps" value={recSteps} onChange={setRecSteps} suffix="steps" placeholder="8500" step="500" />
                  <NumberInput label="Exercise Duration" value={recExDuration} onChange={setRecExDuration} suffix="min" placeholder="45" step="5" />
                  <NumberInput label="Calorie Intake" value={recCalories} onChange={setRecCalories} suffix="kcal" placeholder="1950" step="50" />

                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium">Mood Check-in</span>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1">
                      <select
                        value={recMood}
                        onChange={(e) => setRecMood(e.target.value)}
                        className="w-full bg-transparent py-2 text-xs text-white outline-none"
                      >
                        <option value="Extremely Good">Extremely Good</option>
                        <option value="Good">Good</option>
                        <option value="Fine">Fine</option>
                        <option value="Bad">Bad</option>
                        <option value="Extremely Bad">Extremely Bad</option>
                      </select>
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 active:scale-95"
                  >
                    <CheckCircle2 size={15} /> Save & Update Entry
                  </button>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
                      Entry updated successfully for {selectedDate}!
                    </span>
                  )}
                </div>
              </form>
            </Panel>
          )}

          {record && !isMissing ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Panel className="p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2"><Moon size={14} className="text-cyan-300" /><span className="text-[10px] uppercase tracking-[0.12em]">Sleep</span></div>
                  <p className="text-xl font-semibold text-slate-100">{record.sleepHours !== null ? `${record.sleepHours}h` : "--"}</p>
                </Panel>
                <Panel className="p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2"><Clock size={14} className="text-amber-300" /><span className="text-[10px] uppercase tracking-[0.12em]">Busy Hours</span></div>
                  <p className="text-xl font-semibold text-slate-100">{record.busyHours !== null ? `${record.busyHours}h` : "—"}</p>
                </Panel>
                <Panel className="p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2"><Activity size={14} className="text-emerald-300" /><span className="text-[10px] uppercase tracking-[0.12em]">Steps</span></div>
                  <p className="text-xl font-semibold text-slate-100">{record.steps !== null ? record.steps.toLocaleString() : "—"}</p>
                </Panel>
                <Panel className="p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2"><Smile size={14} className="text-violet-300" /><span className="text-[10px] uppercase tracking-[0.12em]">Mood</span></div>
                  <p className="text-sm font-semibold text-slate-100">{record.mood ?? "—"}</p>
                </Panel>
              </div>

              <Panel className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-medium">Meals</p>
                    <h3 className="text-sm font-medium text-slate-200">{record.meals.length} meals logged</h3>
                  </div>
                  {record.calories !== null && (
                    <span className="text-sm font-semibold text-slate-300">{format(record.calories)} kcal total</span>
                  )}
                </div>
                {record.meals.length > 0 ? (
                  <div className="divide-y divide-slate-800/80">
                    {record.meals.map((meal, i) => (
                      <div key={i} className="flex items-center gap-3 py-3">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-cyan-200 shrink-0"><Utensils size={14} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-slate-200">{meal.name}</p>
                          <p className="text-[10px] text-slate-500">{meal.time} {meal.grams ? `· ${meal.grams}g` : ""}</p>
                        </div>
                        <span className="text-sm font-medium text-slate-300 shrink-0">{meal.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">No meals recorded for this day.</p>
                )}
              </Panel>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   NUTRITION VIEWS
   ========================================================================= */
export function VisionScannerView({
  scanFile,
  fileRef,
  scanning,
  notice,
}: {
  scanFile: (event: ChangeEvent<HTMLInputElement>) => Promise<{ itemName: string; calories: number; estimatedGrams?: number } | null>;
  fileRef: RefObject<HTMLInputElement | null>;
  scanning: boolean;
  notice: string;
}) {
  const dashboard = useDashboard();
  const [scannedItem, setScannedItem] = useState<{ itemName: string; calories: number; estimatedGrams: number } | null>(null);
  const [userGrams, setUserGrams] = useState<string>("");
  const [loggedSuccess, setLoggedSuccess] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setLoggedSuccess(false);
    const result = await scanFile(e);
    if (result) {
      const grams = result.estimatedGrams || 300;
      setScannedItem({ itemName: result.itemName, calories: result.calories, estimatedGrams: grams });
      setUserGrams(grams.toString());
    }
  };

  const numericUserGrams = parseFloat(userGrams) || 0;
  const scaledCalories = scannedItem && scannedItem.estimatedGrams > 0 && numericUserGrams > 0
    ? Math.round((numericUserGrams / scannedItem.estimatedGrams) * scannedItem.calories)
    : scannedItem?.calories ?? 0;

  const handleLogMeal = () => {
    if (!scannedItem) return;
    dashboard.addMeal({
      name: scannedItem.itemName,
      calories: scaledCalories,
      grams: numericUserGrams > 0 ? numericUserGrams : scannedItem.estimatedGrams,
      source: "VISION",
    });
    setScannedItem(null);
    setUserGrams("");
    setLoggedSuccess(true);
    setTimeout(() => setLoggedSuccess(false), 3000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Panel className="p-6 sm:p-10 text-center">
        <ScanLine className="mx-auto text-cyan-300" size={28} />
        <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">Vision Scanner</p>
        <h2 className="mt-2 text-2xl font-medium text-slate-100">Analyze one meal photo</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Upload a clear image and AuraSync will return an approximate calorie estimate with precision weight overrides.
        </p>
        <label className="relative mx-auto mt-8 flex min-h-52 max-w-xl cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-cyan-400/25 bg-cyan-400/[0.03] hover:bg-cyan-400/[0.07] transition">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          {scanning && <span className="absolute inset-10 animate-ping rounded-full border border-cyan-400/30" />}
          <Camera size={30} className="text-cyan-200" />
          <span className="text-sm text-slate-200 font-medium">{scanning ? "Analyzing image..." : "Choose or take a meal photo"}</span>
          <span className="text-xs text-slate-500">JPG, PNG, or mobile camera capture</span>
        </label>
        {notice && (
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-300">
            <Check size={15} className="shrink-0 text-emerald-300" />{notice}
          </p>
        )}
        {loggedSuccess && (
          <p className="mt-4 text-xs font-semibold text-emerald-400 animate-in fade-in">
            ✓ Meal successfully added to today's log!
          </p>
        )}
      </Panel>

      {/* Precision Weight Overrides Card */}
      {scannedItem && (
        <Panel className="p-6 border-cyan-400/30 bg-cyan-950/20 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-300 font-medium">AI Analysis Result</span>
              <h3 className="text-lg font-semibold text-white">{scannedItem.itemName}</h3>
            </div>
            <span className="rounded-full bg-cyan-400/10 border border-cyan-400/30 px-3 py-1 text-xs text-cyan-200 font-mono">
              AI Base: {scannedItem.estimatedGrams}g · {scannedItem.calories} kcal
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 items-center">
            <div>
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-300">Override Portion Weight (Grams)</span>
                <div className="flex items-center rounded-xl border border-cyan-400/40 bg-slate-950 px-3.5 py-2.5 focus-within:border-cyan-300 focus-within:ring-1 focus-within:ring-cyan-300/40 transition">
                  <input
                    type="number"
                    min="1"
                    value={userGrams}
                    onChange={(e) => setUserGrams(e.target.value)}
                    className="w-full bg-transparent text-sm text-white font-medium outline-none"
                    placeholder={scannedItem.estimatedGrams.toString()}
                  />
                  <span className="text-xs font-mono text-cyan-300 ml-1">grams</span>
                </div>
              </label>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Scaling formula: <code className="text-cyan-200">({numericUserGrams || 0}g / {scannedItem.estimatedGrams}g) × {scannedItem.calories} kcal</code>
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-center">
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Calculated Final Calories</span>
              <p className="mt-1 text-3xl font-bold text-emerald-400">
                {scaledCalories} <span className="text-sm font-normal text-slate-400">kcal</span>
              </p>
              {numericUserGrams !== scannedItem.estimatedGrams && numericUserGrams > 0 && (
                <p className="mt-1 text-[11px] text-cyan-300">
                  {scaledCalories > scannedItem.calories ? `+${scaledCalories - scannedItem.calories}` : `-${scannedItem.calories - scaledCalories}`} kcal vs AI baseline
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleLogMeal}
              className="flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-400/10 hover:bg-emerald-300 transition active:scale-95"
            >
              <Plus size={15} /> Add to Today&apos;s Log ({scaledCalories} kcal, {numericUserGrams || scannedItem.estimatedGrams}g)
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

const foodDensity: Record<string, number> = {
  rice: 1.3,
  chicken: 1.65,
  apple: 0.52,
  egg: 1.55,
  salmon: 1.5,
  oatmeal: 0.68,
  steak: 2.1,
  pasta: 1.31,
  banana: 0.89,
  salad: 0.35,
  bread: 2.65,
  pizza: 2.66,
  burger: 2.5,
  yogurt: 0.6,
  turkey: 1.35,
  tuna: 1.32,
};

export function ManualEntryView({
  foodName, setFoodName, knownCalories, setKnownCalories, addManualMeal,
}: {
  foodName: string; setFoodName: (v: string) => void;
  knownCalories: string; setKnownCalories: (v: string) => void;
  addManualMeal: () => void;
}) {
  const dashboard = useDashboard();
  const [isManualCalorieOverride, setIsManualCalorieOverride] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Auto calculate calories based on density when foodName or foodGrams changes
  useEffect(() => {
    if (isManualCalorieOverride) return;
    const nameLower = foodName.toLowerCase().trim();
    const grams = parseFloat(dashboard.foodGrams);
    if (!nameLower || !Number.isFinite(grams) || grams <= 0) return;

    const matchedKey = Object.keys(foodDensity).find((key) => nameLower.includes(key));
    if (matchedKey) {
      const density = foodDensity[matchedKey];
      const autoCalories = Math.round(grams * density);
      setKnownCalories(autoCalories.toString());
    }
  }, [foodName, dashboard.foodGrams, isManualCalorieOverride, setKnownCalories]);

  const handleAddMealSubmit = () => {
    addManualMeal();
    setShowSuccessToast(true);
    setIsManualCalorieOverride(false);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
  };

  return (
    <Panel className="relative mx-auto max-w-2xl p-6 sm:p-10">
      {/* 3-second Success Toast */}
      {showSuccessToast && (
        <div className="absolute top-4 right-4 flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-4 py-2.5 text-xs text-emerald-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>Meal added successfully to today&apos;s log!</span>
        </div>
      )}

      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">Manual Entry</p>
      <h2 className="mt-2 text-2xl font-medium text-slate-100">Log a known meal</h2>
      <p className="mt-2 text-sm text-slate-400">Add food description, portion weight in grams, and calories (auto-estimated by food density).</p>
      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-slate-300">Food name</span>
          <input
            value={foodName}
            onChange={(e) => {
              setIsManualCalorieOverride(false);
              setFoodName(e.target.value);
            }}
            placeholder="e.g. Chicken rice bowl, Apple, Grilled salmon..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition placeholder:text-slate-600"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-300">Portion Size (Grams)</span>
            <input
              type="number"
              min="1"
              value={dashboard.foodGrams}
              onChange={(e) => {
                setIsManualCalorieOverride(false);
                dashboard.setFoodGrams(e.target.value);
              }}
              placeholder="250"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition placeholder:text-slate-600"
            />
          </label>
          <label className="block">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">Calories (kcal)</span>
              {isManualCalorieOverride && (
                <span className="text-[10px] text-amber-300 font-mono">Manual override</span>
              )}
            </div>
            <input
              type="number"
              min="1"
              value={knownCalories}
              onChange={(e) => {
                setIsManualCalorieOverride(true);
                setKnownCalories(e.target.value);
              }}
              placeholder="420"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition placeholder:text-slate-600"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleAddMealSubmit}
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 active:scale-[0.99]"
        >
          <Plus size={16} /> Add to today&apos;s log
        </button>
      </div>
    </Panel>
  );
}

export function DailyLogsView({ meals, setMeals }: { meals: Meal[]; setMeals: Dispatch<SetStateAction<Meal[]>> }) {
  return (
    <Panel className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">Daily Logs</p>
          <h2 className="mt-1 text-2xl font-medium text-slate-100">Today&apos;s items ({meals.length})</h2>
        </div>
        <span className="text-xs text-slate-400">Total: {format(meals.reduce((acc, m) => acc + m.calories, 0))} kcal</span>
      </div>
      <div className="mt-6 divide-y divide-slate-800/80">
        {meals.length ? (
          meals.map((meal) => (
            <div key={meal.id} className="flex items-center gap-3 py-4 transition hover:bg-slate-800/20 px-2 rounded-lg">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-cyan-200">
                {meal.source === "VISION" ? <ImagePlus size={16} /> : <Utensils size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">{meal.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{meal.time} · [{meal.source}] {meal.grams ? `· ${meal.grams}g` : ""}</p>
              </div>
              <span className="text-sm font-semibold text-slate-300">{meal.calories} kcal</span>
              <button type="button" onClick={() => setMeals((c) => c.filter((i) => i.id !== meal.id))}
                className="text-slate-600 hover:text-rose-300 transition p-1" aria-label="Remove item">
                <X size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-sm">
            <Utensils size={28} className="mx-auto mb-2.5 text-slate-600" />
            <p className="text-slate-300 font-medium">No meals logged yet today.</p>
            <p className="mt-1 text-xs text-slate-500">Click &ldquo;Vision Scanner&rdquo; or &ldquo;Manual Entry&rdquo; to add your first meal!</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function ExportAuditView({ exportData }: { exportData: () => void }) {
  return (
    <Panel className="mx-auto max-w-xl p-8 text-center">
      <h2 className="mt-4 text-2xl font-medium text-slate-100">Export JSON Audit</h2>
      <p className="mt-2 text-sm text-slate-400">Download a portable copy of your logged meals, biometrics, and descriptive context.</p>
      <button type="button" onClick={exportData} className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">Download audit</button>
    </Panel>
  );
}

export function PurgeRecordsView({ onPurge }: { onPurge: () => void }) {
  return (
    <Panel className="mx-auto max-w-xl p-8 text-center">
      <h2 className="mt-4 text-2xl font-medium text-slate-100">Purge Records</h2>
      <p className="mt-2 text-sm text-slate-400">Remove all locally stored meal and routine records from this workspace.</p>
      <button type="button" onClick={onPurge} className="mt-6 rounded-xl border border-rose-400/25 px-5 py-3 text-sm font-medium text-rose-200 hover:bg-rose-400/10 transition">Purge local records</button>
    </Panel>
  );
}

/* =========================================================================
   BACKWARD-COMPATIBILITY ALIASES
   ========================================================================= */
export const BaselineCalculatorView = EnhancedBaselineCalculatorView;
export const AdaptiveBudgetView = DailyGoalView;
export const TrendScorecardsView = UnifiedTrendScorecardsView;
export const PatternSynthesisView = UnifiedTrendScorecardsView;
