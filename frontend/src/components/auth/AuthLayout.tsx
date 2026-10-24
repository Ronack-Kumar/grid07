'use client'

import React from 'react'
import Link from 'next/link'
import {
  Bot,
  Cpu,
  Compass,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { AnimatedBackground } from './AnimatedBackground'
import { ConnectedAgentNetwork } from './ConnectedAgentNetwork'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[#090A0D] text-[#F2EFE8] flex flex-col justify-between selection:bg-[#C7A66A]/25">
      {/* 1. Coordinated Animated Background with Perspective Grid and Ambient Light Fields */}
      <AnimatedBackground />

      {/* 2. Top Navigation Bar */}
      <header className="relative z-20 w-full px-6 py-5 lg:px-12 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-md bg-[#090A0D]/50">
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A66A] rounded-lg p-1 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#27231B] to-[#14151C] border border-[#C7A66A]/50 flex items-center justify-center shadow-md shadow-black/60 group-hover:border-[#DFC492] transition-colors">
            <Bot className="w-5 h-5 text-[#DFC492] group-hover:scale-105 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-[#F2EFE8] group-hover:text-[#DFC492] transition-colors">
              GRID<span className="text-[#C7A66A]">07</span>
            </span>
            <span className="text-[10px] tracking-widest text-[#8C867B] uppercase font-mono -mt-0.5">
              Multi-Agent Orchestrator
            </span>
          </div>
        </Link>

        {/* Small AI Agent Platform Label */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#14151C] border border-white/10 text-xs font-medium text-[#C2BEB4]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
          </span>
          <span className="hidden sm:inline">AI Agent Platform</span>
          <span className="text-[#8C867B] text-[11px] font-mono">v2.4</span>
        </div>
      </header>

      {/* 3. Main Split-Screen Workspace */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        
        {/* =====================================================================
            LEFT SECTION: Product Narrative & Connected Agent Network
            ===================================================================== */}
        <div className="w-full lg:w-[56%] flex flex-col justify-center space-y-8 animate-auth-reveal">
          
          {/* Section Eyebrow & Headline */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E1C18]/80 border border-[#C7A66A]/30 text-xs font-medium text-[#DFC492]">
              <Sparkles className="w-3.5 h-3.5 text-[#C7A66A]" />
              <span>Intelligent Swarm Routing & Dynamic Execution</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F2EFE8] leading-[1.15]">
              Build. Route.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5C992] via-[#C7A66A] to-[#9A7840] animate-gradient-sheen font-serif italic">
                Orchestrate.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#B6B0A4] max-w-xl leading-relaxed">
              Grid07 coordinates specialized autonomous agents across multiple LLM providers,
              enforcing persona-driven routing, live neural search, and stateful verification workflows.
            </p>
          </div>

          {/* Centerpiece: Connected Agent Network Graphic */}
          <div className="py-2">
            <ConnectedAgentNetwork />
          </div>

          {/* Staggered Feature List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Feature 1 */}
            <div className="p-3.5 rounded-xl bg-[#13141B]/75 border border-white/[0.07] hover:border-[#C7A66A]/40 transition-colors group">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#C7A66A]/10 border border-[#C7A66A]/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Cpu className="w-4 h-4 text-[#DFC492]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#F2EFE8]">Multi-LLM Providers</h4>
                  <p className="text-[11px] text-[#8C867B]">Groq, Gemini, OpenRouter, OpenAI, xAI</p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-3.5 rounded-xl bg-[#13141B]/75 border border-white/[0.07] hover:border-emerald-500/40 transition-colors group">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#F2EFE8]">Persona-Based Routing</h4>
                  <p className="text-[11px] text-[#8C867B]">Intelligent multi-expert task dispatch</p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-3.5 rounded-xl bg-[#13141B]/75 border border-white/[0.07] hover:border-sky-500/40 transition-colors group">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Compass className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#F2EFE8]">Web Search & Tools</h4>
                  <p className="text-[11px] text-[#8C867B]">Exa neural search & Tavily verification</p>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-3.5 rounded-xl bg-[#13141B]/75 border border-white/[0.07] hover:border-purple-500/40 transition-colors group">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#F2EFE8]">Flexible Workflows</h4>
                  <p className="text-[11px] text-[#8C867B]">Stateful LangGraph execution traces</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            RIGHT SECTION: Polished, Stable Authentication Card
            ===================================================================== */}
        <div className="w-full lg:w-[42%] max-w-md mx-auto animate-auth-reveal" style={{ animationDelay: '0.15s' }}>
          <div className="relative">
            {/* Soft Ambient Card Glow */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-[#C7A66A]/20 to-transparent blur-xl opacity-60 pointer-events-none" />

            {/* Main Card Surface */}
            <div className="relative rounded-2xl bg-[#121319]/85 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80 p-7 sm:p-9 transition-all">
              
              {/* Card Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-[#F2EFE8]">
                  {title}
                </h2>
                <p className="text-xs sm:text-sm text-[#A8A398] mt-1.5 leading-normal">
                  {subtitle}
                </p>
              </div>

              {/* Children (The Form) */}
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* 4. Minimalist Footer */}
      <footer className="relative z-20 w-full px-6 py-4 border-t border-white/[0.05] text-center text-xs text-[#787267] backdrop-blur-sm bg-[#090A0D]/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Grid07 Intelligent Swarm Orchestrator. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link
              href="/security"
              className="hover:text-[#F2EFE8] focus-visible:text-[#DFC492] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C7A66A] rounded-sm transition-colors cursor-pointer"
            >
              Security Overview
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link
              href="/routing-specs"
              className="hover:text-[#F2EFE8] focus-visible:text-[#DFC492] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C7A66A] rounded-sm transition-colors cursor-pointer"
            >
              Model Routing Specs
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link
              href="/status"
              className="hover:text-[#F2EFE8] focus-visible:text-[#DFC492] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C7A66A] rounded-sm transition-colors cursor-pointer"
            >
              Status
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
