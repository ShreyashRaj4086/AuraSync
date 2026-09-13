"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Clock,
  Flame,
  Home,
  Menu,
  ScanLine,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { View } from "@/components/dashboard/Views";

type NavigationProps = {
  view: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
};

type MenuItem = {
  label: string;
  description: string;
  icon: typeof ScanLine;
  view?: View;
  action?: () => void;
};

type MenuGroup = {
  label: string;
  icon: typeof ScanLine;
  items: MenuItem[];
};

export function Navigation({ view, onViewChange, onLogout }: NavigationProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  const choose = (item: MenuItem) => {
    if (item.view) {
      onViewChange(item.view);
    }
    item.action?.();
    close();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groups: MenuGroup[] = [
    {
      label: "Biometrics & Goals",
      icon: Target,
      items: [
        {
          label: "Account Setup",
          description: "Set baseline metrics and metabolic goals",
          icon: Target,
          view: "baseline-calculator",
        },
        {
          label: "Daily Goal",
          description: "Review target calories and metabolic goals",
          icon: Flame,
          view: "daily-goal",
        },
      ],
    },
    {
      label: "Nutrition & Tracking",
      icon: ScanLine,
      items: [
        {
          label: "Vision Scanner",
          description: "Analyze meal photo with AI vision",
          icon: ScanLine,
          view: "vision-scanner",
        },
        {
          label: "Manual Entry",
          description: "Log known calories manually",
          icon: Sparkles,
          view: "manual-entry",
        },
        {
          label: "Daily Logs",
          description: "Review and manage today's logged meals",
          icon: Activity,
          view: "daily-logs",
        },
      ],
    },
    {
      label: "Routine",
      icon: Zap,
      items: [
        {
          label: "Busy Hours",
          description: "Log today's busy hours and routine load",
          icon: Clock,
          view: "busy-hours",
        },
      ],
    },
    {
      label: "Wellbeing Explorer",
      icon: Activity,
      items: [
        {
          label: "Trend Scorecards",
          description: "Consolidated trends, rhythms & pattern synthesis",
          icon: Activity,
          view: "trend-scorecards",
        },
      ],
    },
    {
      label: "Calendar",
      icon: CalendarDays,
      items: [
        {
          label: "Historical Data",
          description: "Browse past daily records by date",
          icon: CalendarDays,
          view: "calendar-history",
        },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#020617]/90 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl sm:px-6 lg:px-8">
      <div ref={navRef} className="mx-auto flex max-w-[1440px] items-center gap-5">
        {/* Brand Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="AuraSync home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-black shadow-lg shadow-white/10">
            <Sparkles size={17} />
          </span>
          <span className="hidden sm:block">
            <span className="block text-sm font-semibold tracking-[0.16em] text-white">AURASYNC</span>
          </span>
        </Link>

        {/* Primary Desktop Navigation */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 xl:flex" aria-label="Primary navigation">
          {/* Direct Home Button (Far left, right after AuraSync logo) */}
          <button
            type="button"
            onClick={() => {
              onViewChange("overview");
              setOpenMenu(null);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              view === "overview"
                ? "bg-slate-800/60 text-cyan-200"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <Home size={14} className={view === "overview" ? "text-cyan-300" : "text-slate-400"} />
            Home
          </button>

          {groups.map((group) => {
            const isGroupActive = group.items.some((item) => item.view === view);
            const isOpen = openMenu === group.label;

            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenMenu(isOpen ? null : group.label)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                    isGroupActive
                      ? "bg-slate-800/60 text-cyan-200"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <group.icon size={14} className={isGroupActive ? "text-cyan-300" : "text-slate-400"} />
                  {group.label}
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-cyan-300" : "text-slate-500"}`}
                  />
                </button>

                {isOpen && (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-2xl border border-slate-800 bg-[#0b1329] p-2 shadow-2xl shadow-black/80 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                    {group.items.map((item) => {
                      const isItemActive = item.view === view;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => choose(item)}
                          className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                            isItemActive
                              ? "bg-slate-800/90 text-white"
                              : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                          }`}
                        >
                          <item.icon
                            size={16}
                            className={`mt-0.5 shrink-0 ${isItemActive ? "text-cyan-300" : "text-slate-400"}`}
                          />
                          <span>
                            <span className="block text-xs font-medium">{item.label}</span>
                            <span className="mt-0.5 block text-[11px] text-slate-400/90">{item.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={onLogout}
            className="hidden rounded-xl border border-slate-800 bg-slate-900/40 px-3.5 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-white transition sm:block"
          >
            Log out
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-white transition xl:hidden"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileOpen && (
        <nav className="mx-auto mt-3 max-w-[1440px] border-t border-slate-800 pt-3 xl:hidden animate-in fade-in duration-200">
          {/* Mobile Home Button */}
          <button
            type="button"
            onClick={() => {
              onViewChange("overview");
              setMobileOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3.5 py-2.5 text-xs font-medium transition mb-2 ${
              view === "overview" ? "bg-slate-800 text-cyan-200 font-medium" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Home size={14} className={view === "overview" ? "text-cyan-300" : "text-slate-400"} />
            Home (Personal Info & Progress)
          </button>

          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((group) => {
              const isOpen = openMenu === group.label;
              return (
                <div key={group.label} className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(isOpen ? null : group.label)}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium text-slate-300"
                  >
                    <span className="flex items-center gap-2">
                      <group.icon size={14} className="text-cyan-300" />
                      {group.label}
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-800/80 bg-slate-900/50 px-2 py-2 space-y-1">
                      {group.items.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => choose(item)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                            item.view === view
                              ? "bg-slate-800 text-cyan-200 font-medium"
                              : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                          }`}
                        >
                          <item.icon size={14} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3.5 py-2 text-center text-xs text-slate-400 hover:text-white"
          >
            Log out
          </button>
        </nav>
      )}
    </header>
  );
}
