"use client";

import { useState } from "react";
import { CalorieScanner } from "@/components/CalorieScanner";
import { AuthScreen } from "@/components/AuthScreen";
import { LandingHero } from "@/components/LandingHero";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import type { View } from "@/components/dashboard/Views";

export default function Home() {
  const [screen, setScreen] = useState<"landing" | "auth" | "dashboard">("landing");
  const [activeView, setActiveView] = useState<View>("overview");

  return (
    <DashboardProvider>
      {screen === "auth" ? (
        <AuthScreen
          onBack={() => setScreen("landing")}
          onSuccess={() => {
            setActiveView("overview");
            setScreen("dashboard");
          }}
        />
      ) : screen === "dashboard" ? (
        <CalorieScanner
          activeView={activeView}
          onActiveViewChange={setActiveView}
          onLogout={() => setScreen("landing")}
        />
      ) : (
        <LandingHero onLaunch={() => setScreen("auth")} />
      )}
    </DashboardProvider>
  );
}
