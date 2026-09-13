"use client";

import { ChangeEvent, createContext, RefObject, useContext, useEffect, useRef, useState } from "react";
import { Meal, Metrics, DayRecord, initialHistoryDays } from "@/components/dashboard/Views";

export type ActivityEntry = {
  id: string;
  type: string;
  duration: number; // in hours
  met: number;
  caloriesBurned: number;
};

export const MET_MAP: Record<string, number> = {
  "Walking": 3.5,
  "Gym/Weightlifting": 5.0,
  "Swimming": 7.0,
  "Cycling": 7.5,
  "Yoga": 3.0,
  "HIIT": 8.0,
  "Tennis": 7.3,
  "Basketball": 8.0,
  "Pilates": 3.0,
  "Desk Work/Sedentary": 1.5,
  "General Cardio": 7.0,
  "Running": 9.0,
};

const STORAGE_KEY = "aurasync_dashboard_state_v1";

const initialMeals: Meal[] = [
  { id: 1, name: "Greek yogurt, berries & seeds", calories: 284, source: "MANUAL", grams: 200, time: "08:14" },
  { id: 2, name: "Grilled salmon bowl", calories: 512, source: "VISION", grams: 340, time: "12:38" },
];

const initialActivities: ActivityEntry[] = [
  { id: "1", type: "Walking", duration: 0.5, met: 3.5, caloriesBurned: 119 },
  { id: "2", type: "Gym/Weightlifting", duration: 1.0, met: 5.0, caloriesBurned: 340 },
];

const safeNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const computeBiometricMetrics = (
  height: string,
  weight: string,
  age: string,
  gender: "female" | "male" | "",
  activityMultiplier: string,
  waist: string,
  bodyFat: string,
  activitiesList: ActivityEntry[] = []
): Metrics => {
  const safeHeight = safeNumber(height, 172) / 100;
  const safeWeight = safeNumber(weight, 68);
  const safeAge = safeNumber(age, 29);
  const waistToHeight = safeNumber(waist, 80) / (safeHeight * 100);
  const bodyFatValue = Number(bodyFat);
  const hasBodyFat = Number.isFinite(bodyFatValue) && bodyFatValue > 0 && bodyFatValue < 100;

  const mifflinBmr = gender === "male"
    ? 10 * safeWeight + 6.25 * safeHeight * 100 - 5 * safeAge + 5
    : 10 * safeWeight + 6.25 * safeHeight * 100 - 5 * safeAge - 161;

  const leanBodyMass = hasBodyFat
    ? safeWeight * (1 - bodyFatValue / 100)
    : safeWeight * (gender === "female" ? 0.75 : 0.82);

  const bmr = hasBodyFat ? 370 + 21.6 * leanBodyMass : mifflinBmr;

  const activeCalories = activitiesList.reduce(
    (sum, act) => sum + (Number.isFinite(act.caloriesBurned) ? act.caloriesBurned : 0),
    0
  );

  const tdee = bmr + activeCalories;
  const target = waistToHeight >= 0.5 ? Math.max(1200, tdee - 250) : tdee;

  const label = waistToHeight >= 0.5
    ? "Gentle calorie target for a WHtR above 0.50"
    : "Maintenance target in the healthy WHtR range";

  return {
    waistToHeight,
    bodyFat: hasBodyFat ? bodyFatValue : null,
    leanBodyMass,
    bmr,
    bmrMethod: hasBodyFat ? "Katch-McArdle" : "Mifflin-St Jeor",
    activeCalories,
    tdee,
    target,
    label,
  };
};

export type DashboardContextValue = {
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
  isSetupComplete: boolean;
  completeSetup: () => void;
  activities: ActivityEntry[];
  addActivity: (type: string, durationHours: number, customMet?: number) => void;
  removeActivity: (id: string) => void;
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
  busyHours: string;
  setBusyHours: (v: string) => void;
  generated: boolean;
  generateMetrics: () => void;
  metrics: Metrics | null;
  meals: Meal[];
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  foodName: string;
  setFoodName: (v: string) => void;
  knownCalories: string;
  setKnownCalories: (v: string) => void;
  foodGrams: string;
  setFoodGrams: (v: string) => void;
  scanning: boolean;
  notice: string;
  fileRef: RefObject<HTMLInputElement | null>;
  consumed: number;
  addManualMeal: () => void;
  addMeal: (entry: { name: string; calories: number; grams?: number; source: "VISION" | "MANUAL" }) => void;
  scanFile: (event: ChangeEvent<HTMLInputElement>) => Promise<{ itemName: string; calories: number; estimatedGrams?: number } | null>;
  resetInputs: () => void;
  exportData: () => void;
  purgeRecords: () => void;
  historyRecords: DayRecord[];
  updateHistoryRecord: (dateStr: string, data: Partial<DayRecord>) => void;
  primaryGoal: string;
  setPrimaryGoal: (v: string) => void;
  stressLevel: string;
  setStressLevel: (v: string) => void;
  onboardingDismissed: boolean;
  setOnboardingDismissed: (v: boolean) => void;
  completedGuideItems: Record<string, boolean>;
  setCompletedGuideItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  toggleGuideItem: (id: string) => void;
  isMounted: boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  // Baseline inputs
  const [height, setHeight] = useState("172");
  const [weight, setWeight] = useState("68");
  const [age, setAge] = useState("29");
  const [gender, setGender] = useState<"female" | "male" | "">("female");
  const [activity, setActivity] = useState("1.375");
  const [waist, setWaist] = useState("80");
  const [bodyFat, setBodyFat] = useState("18");
  const [profileName, setProfileName] = useState("Shreyash Raj");
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Personalized survey & onboarding checklist state
  const [primaryGoal, setPrimaryGoal] = useState("Energy & Vitality");
  const [stressLevel, setStressLevel] = useState("Moderate");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [completedGuideItems, setCompletedGuideItems] = useState<Record<string, boolean>>({});

  // Dynamic MET activity log state
  const [activities, setActivities] = useState<ActivityEntry[]>(initialActivities);

  // Historical calendar records state (allows gaps to be recovered)
  const [historyRecords, setHistoryRecords] = useState<DayRecord[]>(initialHistoryDays);

  // Wellbeing inputs
  const [sleepHours, setSleepHours] = useState("7.5");
  const [activityHours, setActivityHours] = useState("2.0");
  const [steps, setSteps] = useState("8500");
  const [exerciseDuration, setExerciseDuration] = useState("45");
  const [mood, setMood] = useState("Fine");
  const [customMood, setCustomMood] = useState("");

  // Routine inputs
  const [busyHours, setBusyHours] = useState("6");

  // Calculation state
  const [generated, setGenerated] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  // Meals & Food tracking state
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [foodName, setFoodName] = useState("");
  const [knownCalories, setKnownCalories] = useState("");
  const [foodGrams, setFoodGrams] = useState("");
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const consumed = meals.reduce((total, meal) => total + meal.calories, 0);

  const toggleGuideItem = (id: string) => {
    setCompletedGuideItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. Hydration-Safe Mount Phase: Load saved state from localStorage (Client-Side Only)
  useEffect(() => {
    setIsMounted(true);
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.height !== undefined) setHeight(data.height);
        if (data.weight !== undefined) setWeight(data.weight);
        if (data.age !== undefined) setAge(data.age);
        if (data.gender !== undefined) setGender(data.gender);
        if (data.activity !== undefined) setActivity(data.activity);
        if (data.waist !== undefined) setWaist(data.waist);
        if (data.bodyFat !== undefined) setBodyFat(data.bodyFat);
        if (data.profileName !== undefined) setProfileName(data.profileName);
        if (data.isSetupComplete !== undefined) setIsSetupComplete(data.isSetupComplete);

        if (data.primaryGoal !== undefined) setPrimaryGoal(data.primaryGoal);
        if (data.stressLevel !== undefined) setStressLevel(data.stressLevel);
        if (data.onboardingDismissed !== undefined) setOnboardingDismissed(data.onboardingDismissed);
        if (data.completedGuideItems !== undefined) setCompletedGuideItems(data.completedGuideItems);

        if (Array.isArray(data.activities)) setActivities(data.activities);
        if (Array.isArray(data.historyRecords)) setHistoryRecords(data.historyRecords);

        if (data.sleepHours !== undefined) setSleepHours(data.sleepHours);
        if (data.activityHours !== undefined) setActivityHours(data.activityHours);
        if (data.steps !== undefined) setSteps(data.steps);
        if (data.exerciseDuration !== undefined) setExerciseDuration(data.exerciseDuration);
        if (data.mood !== undefined) setMood(data.mood);
        if (data.customMood !== undefined) setCustomMood(data.customMood);
        if (data.busyHours !== undefined) setBusyHours(data.busyHours);
        if (Array.isArray(data.meals)) setMeals(data.meals);
      }
    } catch (err) {
      console.error("Failed to restore AuraSync state from localStorage:", err);
    }
  }, []);

  // 2. Hydration-Safe Sync Phase: Save state to localStorage whenever persistent nodes update
  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return;

    try {
      const stateToPersist = {
        height,
        weight,
        age,
        gender,
        activity,
        waist,
        bodyFat,
        profileName,
        isSetupComplete,
        primaryGoal,
        stressLevel,
        onboardingDismissed,
        completedGuideItems,
        activities,
        historyRecords,
        sleepHours,
        activityHours,
        steps,
        exerciseDuration,
        mood,
        customMood,
        busyHours,
        meals,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
    } catch (err) {
      console.error("Failed to save AuraSync state to localStorage:", err);
    }
  }, [
    isMounted,
    height,
    weight,
    age,
    gender,
    activity,
    waist,
    bodyFat,
    profileName,
    isSetupComplete,
    primaryGoal,
    stressLevel,
    onboardingDismissed,
    completedGuideItems,
    activities,
    historyRecords,
    sleepHours,
    activityHours,
    steps,
    exerciseDuration,
    mood,
    customMood,
    busyHours,
    meals,
  ]);

  // Recompute biometrics automatically on input updates or initial load
  useEffect(() => {
    if (isSetupComplete || generated) {
      const result = computeBiometricMetrics(height, weight, age, gender, activity, waist, bodyFat, activities);
      setMetrics(result);
      setGenerated(true);
    }
  }, [height, weight, age, gender, activity, waist, bodyFat, activities, isSetupComplete, generated]);

  const addActivity = (type: string, durationHours: number, customMet?: number) => {
    if (!Number.isFinite(durationHours) || durationHours <= 0) return;
    const met = customMet ?? MET_MAP[type] ?? 3.5;
    const safeW = safeNumber(weight, 68);
    const caloriesBurned = Math.round(met * safeW * durationHours);
    const newEntry: ActivityEntry = {
      id: Date.now().toString(),
      type,
      duration: durationHours,
      met,
      caloriesBurned,
    };
    const updated = [...activities, newEntry];
    setActivities(updated);

    if (generated) {
      const result = computeBiometricMetrics(height, weight, age, gender, activity, waist, bodyFat, updated);
      setMetrics(result);
    }
  };

  const removeActivity = (id: string) => {
    const updated = activities.filter((act) => act.id !== id);
    setActivities(updated);
    if (generated) {
      const result = computeBiometricMetrics(height, weight, age, gender, activity, waist, bodyFat, updated);
      setMetrics(result);
    }
  };

  const generateMetrics = () => {
    const result = computeBiometricMetrics(height, weight, age, gender, activity, waist, bodyFat, activities);
    setMetrics(result);
    setGenerated(true);
  };

  const completeSetup = () => {
    generateMetrics();
    setIsSetupComplete(true);
  };

  const updateHistoryRecord = (dateStr: string, data: Partial<DayRecord>) => {
    setHistoryRecords((prev) => {
      const exists = prev.some((rec) => rec.date === dateStr);
      if (exists) {
        return prev.map((rec) => (rec.date === dateStr ? { ...rec, ...data } : rec));
      } else {
        return [
          ...prev,
          {
            date: dateStr,
            sleepHours: 7.5,
            busyHours: 6.0,
            steps: 8500,
            exerciseDuration: 45,
            mood: "Fine",
            calories: 1950,
            meals: [],
            journalNote: "",
            ...data,
          },
        ];
      }
    });
  };

  const resetInputs = () => {
    setHeight("");
    setWeight("");
    setAge("");
    setGender("");
    setActivity("1.2");
    setWaist("");
    setBodyFat("");
    setProfileName("Shreyash Raj");
    setActivities([]);
    setSleepHours("");
    setActivityHours("");
    setSteps("");
    setExerciseDuration("");
    setMood("Fine");
    setCustomMood("");
    setBusyHours("");
    setGenerated(false);
    setMetrics(null);
    setFoodName("");
    setKnownCalories("");
    setFoodGrams("");
    setNotice("");
    setIsSetupComplete(false);
  };

  const addMeal = (entry: { name: string; calories: number; grams?: number; source: "VISION" | "MANUAL" }) => {
    setMeals((current) => [
      ...current,
      {
        id: Date.now(),
        name: entry.name,
        calories: entry.calories,
        grams: entry.grams,
        source: entry.source,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const addManualMeal = () => {
    const calories = Number(knownCalories);
    const grams = foodGrams ? Number(foodGrams) : undefined;
    if (!foodName.trim() || !Number.isFinite(calories) || calories <= 0) return;
    addMeal({
      name: foodName.trim(),
      calories,
      grams: Number.isFinite(grams) && grams! > 0 ? grams : undefined,
      source: "MANUAL",
    });
    setFoodName("");
    setKnownCalories("");
    setFoodGrams("");
  };

  const scanFile = async (event: ChangeEvent<HTMLInputElement>): Promise<{ itemName: string; calories: number; estimatedGrams?: number } | null> => {
    const file = event.target.files?.[0];
    if (!file) return null;
    setScanning(true);
    setNotice("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/food-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const result = await response.json();
      const calories = Math.max(0, Number(result.calories) || 0);
      const itemName = result.itemName || "Scanned meal";
      const estimatedGrams = Number(result.estimatedGrams) || 300;
      setNotice(
        `Analysis complete: ${itemName} (~${calories} kcal, ~${estimatedGrams}g). Adjust portion weight below if needed.`
      );
      return { itemName, calories, estimatedGrams };
    } catch {
      setNotice("Scan unavailable. Try a manual entry instead.");
      return null;
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      meals,
      metrics,
      activities,
      wellbeing: {
        sleepHours,
        activityHours,
        steps,
        exerciseDuration,
        mood: mood === "Write your own..." ? customMood : mood,
      },
      routine: {
        busyHours,
      },
      note: "AuraSync wellbeing data is descriptive and non-clinical.",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "aurasync-audit.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const purgeRecords = () => {
    if (typeof window !== "undefined" && window.confirm("Purge all local nutrition records and saved workspace state?")) {
      setMeals([]);
      setActivities([]);
      setHistoryRecords(initialHistoryDays);
      setCompletedGuideItems({});
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <DashboardContext.Provider
      value={{
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
        isSetupComplete,
        completeSetup,
        activities,
        addActivity,
        removeActivity,
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
        busyHours,
        setBusyHours,
        generated,
        generateMetrics,
        metrics,
        meals,
        setMeals,
        foodName,
        setFoodName,
        knownCalories,
        setKnownCalories,
        foodGrams,
        setFoodGrams,
        scanning,
        notice,
        fileRef,
        consumed,
        addManualMeal,
        addMeal,
        scanFile,
        resetInputs,
        exportData,
        purgeRecords,
        historyRecords,
        updateHistoryRecord,
        primaryGoal,
        setPrimaryGoal,
        stressLevel,
        setStressLevel,
        onboardingDismissed,
        setOnboardingDismissed,
        completedGuideItems,
        setCompletedGuideItems,
        toggleGuideItem,
        isMounted,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within DashboardProvider");
  return context;
}
