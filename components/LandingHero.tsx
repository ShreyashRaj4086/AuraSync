"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Activity, BrainCircuit, ScanLine, Sparkles } from "lucide-react";

interface LandingHeroProps {
  onLaunch: () => void;
}

const bars = [42, 60, 48, 76, 58, 86, 68, 94, 72, 88, 80, 100];

export function LandingHero({ onLaunch }: LandingHeroProps) {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-black px-5 pb-10 pt-5 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-white/[0.04] blur-[140px]" />
      <div className="pointer-events-none absolute bottom-[-15rem] right-[-10rem] -z-10 h-[32rem] w-[32rem] rounded-full bg-cyan-300/[0.035] blur-[140px]" />
      <motion.nav initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-white/[0.035] px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-full border border-cyan-200/20 bg-cyan-100/10"><Sparkles size={15} className="text-cyan-100" /></div><span className="text-sm font-semibold tracking-[0.18em]">AURASYNC</span></div>
        <div className="hidden items-center gap-8 text-xs text-white/45 md:flex"><span>Pattern intelligence</span><span>Metabolic clarity</span><span>Data sovereignty</span></div>
        <button onClick={onLaunch} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-cyan-100">Open workspace <ArrowUpRight size={14} /></button>
      </motion.nav>

      <div className="mx-auto grid max-w-7xl items-center gap-16 pb-8 pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-28">
        <div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }} className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_12px_#a5f3fc]" /> New: Corewave Vision v3.2</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }} className="max-w-3xl text-5xl font-medium leading-[0.98] tracking-[-0.055em] sm:text-7xl lg:text-[5.7rem]">Your Insights.<br />One Clear <em className="font-serif font-normal tracking-[-0.03em] text-white/80">Overview.</em></motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-7 max-w-lg text-base leading-7 text-white/48 sm:text-lg">AuraSync transforms daily habits into transparent, non-clinical wellbeing patterns and metabolic clarity.</motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-9 flex flex-wrap items-center gap-4"><button onClick={onLaunch} className="group flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-100">Launch Dashboard <span className="grid h-6 w-6 place-items-center rounded-full bg-black text-white transition group-hover:translate-x-0.5"><ArrowUpRight size={14} /></span></button><span className="text-xs text-white/35">Built for awareness, not diagnosis</span></motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.96, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.8 }} className="relative rounded-[2rem] border border-white/10 bg-white/[0.035] p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#080a0d] p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-white/8 pb-5"><div><p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Live signal / 09:42:18</p><p className="mt-1.5 text-sm text-white/75">Daily coherence index</p></div><div className="flex items-center gap-1.5 text-[10px] text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-200" /> syncing</div></div>
            <div className="grid grid-cols-3 gap-2 py-6"><div className="col-span-2 rounded-xl border border-white/8 bg-white/[0.025] p-4"><div className="flex items-start justify-between"><div><p className="text-[10px] text-white/35">Throughput</p><p className="mt-1 text-2xl font-medium">84.6 <span className="text-xs text-emerald-300">+12.4%</span></p></div><Activity size={16} className="text-cyan-200/70" /></div><div className="mt-5 flex h-14 items-end gap-1.5">{bars.map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-cyan-100/60" style={{ height: `${height}%`, opacity: 0.35 + index / 20 }} />)}</div></div><div className="rounded-xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[10px] text-white/35">Latency</p><p className="mt-1 text-2xl font-medium">42<span className="text-xs text-white/35">ms</span></p><div className="mt-5 h-1.5 rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-emerald-200" /></div><p className="mt-2 text-[10px] text-emerald-200/70">stable range</p></div></div>
            <div className="grid grid-cols-3 gap-2"><div className="rounded-xl border border-white/8 p-3"><BrainCircuit size={15} className="text-violet-200/75" /><p className="mt-4 text-lg">72%</p><p className="text-[10px] text-white/35">sleep signal</p></div><div className="rounded-xl border border-white/8 p-3"><ScanLine size={15} className="text-amber-100/75" /><p className="mt-4 text-lg">1,842</p><p className="text-[10px] text-white/35">active kcal</p></div><div className="rounded-xl border border-white/8 p-3"><Sparkles size={15} className="text-cyan-100/75" /><p className="mt-4 text-lg">8.4</p><p className="text-[10px] text-white/35">pattern clarity</p></div></div>
          </div>
        </motion.div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-white/8 pt-5 text-[10px] uppercase tracking-[0.18em] text-white/25"><span>Private by design</span><span>Gemini vision + AWS serverless</span><span className="hidden sm:inline">2026 / neuralyn system</span></div>
    </section>
  );
}
