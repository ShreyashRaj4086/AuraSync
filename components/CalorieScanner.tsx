"use client";

import { Clock3, ShieldCheck } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import {
  BusyHoursView,
  CalendarHistoryView,
  DailyGoalView,
  DailyLogsView,
  EnhancedBaselineCalculatorView,
  ExportAuditView,
  ManualEntryView,
  OverviewView,
  PurgeRecordsView,
  UnifiedTrendScorecardsView,
  View,
  VisionScannerView,
} from "@/components/dashboard/Views";

export function CalorieScanner({
  activeView,
  onActiveViewChange,
  onLogout,
}: {
  activeView: View;
  onActiveViewChange: (view: View) => void;
  onLogout: () => void;
}) {
  const dashboard = useDashboard();

  const titles: Record<View, string> = {
    overview: "Your AuraSync overview",
    "vision-scanner": "Vision Scanner",
    "manual-entry": "Manual Food Entry",
    "daily-logs": "Daily Logs",
    "baseline-calculator": "Account Setup",
    "daily-goal": "Daily Goal",
    "adaptive-budget": "Daily Goal",
    "trend-scorecards": "Trend Scorecards",
    "busy-hours": "Busy Hours",
    "calendar-history": "Historical Calendar",
    "export-audit": "Export JSON Audit",
    "purge-records": "Purge Records",
  };

  const subtitles: Record<View, string> = {
    overview: "A calm summary of your daily signals and next actions.",
    "vision-scanner": "Analyze one meal photo with AI vision.",
    "manual-entry": "Log one known food and calorie value.",
    "daily-logs": "Review and manage today's logged meals.",
    "baseline-calculator": "Set baseline biometrics and calculate your metabolic daily goal.",
    "daily-goal": "Review TDEE, WHtR, your daily target, and today's consumption.",
    "adaptive-budget": "Review TDEE, WHtR, and your daily target.",
    "trend-scorecards": "Descriptive sleep, routine busy hours, and mood patterns.",
    "busy-hours": "Record today's routine intensity and demanding hours.",
    "calendar-history": "Browse past daily records — separate from today's live tracking.",
    "export-audit": "Download your local records as JSON.",
    "purge-records": "Remove local meal records from this workspace.",
  };

  const isSetupLocked = !dashboard.isSetupComplete;
  const visibleView = isSetupLocked ? "baseline-calculator" : activeView;
  const guardrail = ["vision-scanner", "manual-entry", "daily-logs", "trend-scorecards"].includes(visibleView);

  const logout = () => {
    localStorage.removeItem("aurasync-session");
    onLogout();
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      {!isSetupLocked && <Navigation view={visibleView} onViewChange={onActiveViewChange} onLogout={logout} />}
      <div className="mx-auto max-w-[1440px]">
        <section className="min-w-0 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          {/* Page Header */}
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-200" /> Executive workspace
              </div>
              <h1 className="text-3xl font-medium tracking-[-0.04em] sm:text-4xl text-slate-100">
                {isSetupLocked ? `Welcome, ${dashboard.profileName || "Shreyash"}` : titles[visibleView] ?? "Workspace"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                {isSetupLocked ? "Complete your baseline to unlock your personalized AuraSync workspace." : subtitles[visibleView] ?? "Explore your daily wellbeing signals."}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-3.5 py-2 text-[11px] text-slate-400">
              <Clock3 size={14} className="text-cyan-300" /> Sep 13, 2026
            </div>
          </div>

          {/* Non-clinical Guardrail */}
          {guardrail && (
            <div className="mb-7 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] px-4 py-3 text-xs leading-5 text-amber-200/90">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber-300" />
              <span>
                <strong className="font-semibold text-amber-100">Non-clinical guardrail:</strong> AuraSync is designed
                for descriptive wellbeing exploration and awareness only. It does not provide diagnoses, clinical
                conclusions, or nutritional prescriptions.
              </span>
            </div>
          )}

          {/* ── Granular Views ── */}
          {visibleView === "overview" && (
            <OverviewView
              metrics={dashboard.metrics}
              consumed={dashboard.consumed}
              onViewChange={onActiveViewChange}
            />
          )}

          {visibleView === "vision-scanner" && (
            <VisionScannerView
              scanFile={dashboard.scanFile}
              fileRef={dashboard.fileRef}
              scanning={dashboard.scanning}
              notice={dashboard.notice}
            />
          )}

          {visibleView === "manual-entry" && (
            <ManualEntryView
              foodName={dashboard.foodName}
              setFoodName={dashboard.setFoodName}
              knownCalories={dashboard.knownCalories}
              setKnownCalories={dashboard.setKnownCalories}
              addManualMeal={dashboard.addManualMeal}
            />
          )}

          {visibleView === "daily-logs" && (
            <DailyLogsView meals={dashboard.meals} setMeals={dashboard.setMeals} />
          )}

          {visibleView === "baseline-calculator" && (
            <EnhancedBaselineCalculatorView
              height={dashboard.height}
              setHeight={dashboard.setHeight}
              weight={dashboard.weight}
              setWeight={dashboard.setWeight}
              age={dashboard.age}
              setAge={dashboard.setAge}
              gender={dashboard.gender}
              setGender={dashboard.setGender}
              activity={dashboard.activity}
              setActivity={dashboard.setActivity}
              waist={dashboard.waist}
              setWaist={dashboard.setWaist}
              bodyFat={dashboard.bodyFat}
              setBodyFat={dashboard.setBodyFat}
              profileName={dashboard.profileName}
              setProfileName={dashboard.setProfileName}
              sleepHours={dashboard.sleepHours}
              setSleepHours={dashboard.setSleepHours}
              activityHours={dashboard.activityHours}
              setActivityHours={dashboard.setActivityHours}
              steps={dashboard.steps}
              setSteps={dashboard.setSteps}
              exerciseDuration={dashboard.exerciseDuration}
              setExerciseDuration={dashboard.setExerciseDuration}
              mood={dashboard.mood}
              setMood={dashboard.setMood}
              customMood={dashboard.customMood}
              setCustomMood={dashboard.setCustomMood}
              generated={dashboard.generated}
              generateMetrics={dashboard.generateMetrics}
              metrics={dashboard.metrics}
              onReset={dashboard.resetInputs}
              onCompleteSetup={dashboard.completeSetup}
              isSetupComplete={dashboard.isSetupComplete}
            />
          )}

          {/* Daily Goal — passes consumed for side-by-side display */}
          {(visibleView === "daily-goal" || visibleView === "adaptive-budget") && (
            <DailyGoalView
              metrics={dashboard.metrics}
              generated={dashboard.generated}
              consumed={dashboard.consumed}
              onNavigateToCalculator={() => onActiveViewChange("baseline-calculator")}
            />
          )}

          {visibleView === "trend-scorecards" && (
            <UnifiedTrendScorecardsView
              sleepHours={dashboard.sleepHours}
              mood={dashboard.mood}
              customMood={dashboard.customMood}
              busyHours={dashboard.busyHours}
              dailyGoal={dashboard.metrics?.target ?? 2000}
            />
          )}

          {visibleView === "busy-hours" && (
            <BusyHoursView busyHours={dashboard.busyHours} setBusyHours={dashboard.setBusyHours} />
          )}

          {/* Calendar History — self-contained, no dashboard state dependency */}
          {visibleView === "calendar-history" && <CalendarHistoryView />}

          {visibleView === "export-audit" && <ExportAuditView exportData={dashboard.exportData} />}

          {visibleView === "purge-records" && <PurgeRecordsView onPurge={dashboard.purgeRecords} />}
        </section>
      </div>
    </main>
  );
}
