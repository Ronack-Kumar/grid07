'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  Cpu,
  Compass,
  GitBranch,
  Layers,
  Zap,
  CheckCircle2,
} from 'lucide-react'
import { AnimatedBackground } from '@/components/auth/AnimatedBackground'

export default function ModelRoutingSpecsPage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[#090A0D] text-[#F2EFE8] flex flex-col justify-between selection:bg-[#C7A66A]/25">
      <AnimatedBackground />

      {/* Top Header Navigation */}
      <header className="relative z-20 w-full px-6 py-5 lg:px-12 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-md bg-[#090A0D]/60">
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

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#14151C] hover:bg-[#1A1B24] border border-white/10 text-xs font-semibold text-[#F2EFE8] hover:text-[#DFC492] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-12">
        {/* Page Hero */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C7A66A]/10 border border-[#C7A66A]/30 text-xs font-medium text-[#DFC492]">
            <GitBranch className="w-3.5 h-3.5 text-[#C7A66A]" />
            <span>Engine Specifications & Routing Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F2EFE8] leading-tight">
            Model Routing & Execution{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFC492] via-[#C7A66A] to-[#9A7840] font-serif italic">
              Specifications
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#B6B0A4] leading-relaxed">
            Technical architecture and benchmark specifications for Grid07&apos;s dynamic catalog integration,
            semantic intent routing engine, free router dispatch, and automated fallback nodes.
          </p>
        </div>

        {/* Technical Specs Sections */}
        <div className="space-y-8">
          
          {/* Section 1: Dynamic OpenRouter Catalog Engine */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#121319]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C7A66A]/15 border border-[#C7A66A]/30 flex items-center justify-center text-[#DFC492]">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F2EFE8]">1. Dynamic OpenRouter Catalog Engine</h3>
                <p className="text-xs text-[#8C867B]">Real-time synchronization with upstream model registry</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#A8A398] leading-relaxed">
              Implemented in <code className="text-[#DFC492] bg-white/5 px-1.5 py-0.5 rounded font-mono text-xs">app/services/llm/openrouter_catalog.py</code>.
              Rather than maintaining hardcoded model IDs, Grid07 connects directly to OpenRouter&apos;s catalog API (<code className="font-mono text-xs">GET https://openrouter.ai/api/v1/models</code>),
              dynamically ingesting 460+ models with automated TTL caching and graceful fallback resilience.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-[#0E0F14] border border-white/5">
                <div className="text-[11px] text-[#8C867B]">Modality Filtering</div>
                <div className="text-sm font-semibold text-[#F2EFE8] mt-1">Text-Gen & Multimodal</div>
                <p className="text-[10px] text-[#736E65] mt-1">Filters out image-only diffusions while preserving chat, code & vision models.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0E0F14] border border-white/5">
                <div className="text-[11px] text-[#8C867B]">Pricing Classification</div>
                <div className="text-sm font-semibold text-emerald-400 mt-1">100% Free vs Paid</div>
                <p className="text-[10px] text-[#736E65] mt-1">Classifies models by prompt & completion pricing per 1M tokens.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0E0F14] border border-white/5">
                <div className="text-[11px] text-[#8C867B]">Caching & Failover</div>
                <div className="text-sm font-semibold text-sky-400 mt-1">Thread-Safe TTL</div>
                <p className="text-[10px] text-[#736E65] mt-1">1-hour memory cache with async locks and curated offline fallbacks.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Dynamic Free Router (openrouter/free) */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#121319]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F2EFE8]">2. Dynamic Free Models Router (<code className="font-mono text-emerald-400 text-sm">openrouter/free</code>)</h3>
                <p className="text-xs text-[#8C867B]">Automated selection across available high-uptime free models</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#A8A398] leading-relaxed">
              The <code className="text-emerald-400 font-mono text-xs">openrouter/free</code> router endpoint dynamically routes queries to
              available zero-cost LLMs (e.g. Meta Llama 3.3 70B, Qwen 2.5 Coder, Liquid LFM).
              Grid07 inspects the actual underlying model selected by OpenRouter from the response payload (<code className="font-mono text-xs">data[&quot;model&quot;]</code>)
              and logs the true executing model into the execution trace.
            </p>

            <ul className="space-y-2 text-xs text-[#C2BEB4] pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero silently billed requests — guaranteed free tier</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Transparent trace recording of dynamically selected model IDs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automatic uptime failover if a specific free model experiences upstream rate limits</span>
              </li>
            </ul>
          </div>

          {/* Section 3: Supported Provider Matrix */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#121319]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F2EFE8]">3. Supported Multi-LLM Provider Engine</h3>
                <p className="text-xs text-[#8C867B]">Unified abstraction across global and personal credentials</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[#8C867B]">
                    <th className="py-2.5 px-3 font-semibold">Provider</th>
                    <th className="py-2.5 px-3 font-semibold">Integration</th>
                    <th className="py-2.5 px-3 font-semibold">Default Models</th>
                    <th className="py-2.5 px-3 font-semibold">Credential Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[#C2BEB4]">
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#F2EFE8]">OpenRouter</td>
                    <td className="py-2.5 px-3 text-[#A8A398]">Dynamic Catalog (460+ models)</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-400">openrouter/free, nemotron, llama-3.3</td>
                    <td className="py-2.5 px-3">System Key or Personal Key</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#F2EFE8]">Groq</td>
                    <td className="py-2.5 px-3 text-[#A8A398]">Ultra-low latency LPU</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-sky-400">llama-3.3-70b-versatile, qwen-2.5-32b</td>
                    <td className="py-2.5 px-3">System Key or Personal Key</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#F2EFE8]">Google Gemini</td>
                    <td className="py-2.5 px-3 text-[#A8A398]">Generative Language v1beta</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-purple-400">gemini-2.5-flash, gemini-1.5-pro</td>
                    <td className="py-2.5 px-3">System Key or Personal Key</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#F2EFE8]">OpenAI & xAI</td>
                    <td className="py-2.5 px-3 text-[#A8A398]">Direct Native API</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-amber-400">gpt-4o, gpt-4o-mini, grok-2</td>
                    <td className="py-2.5 px-3">Personal Key Vault (Encrypted)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#F2EFE8]">OpenAI-Compatible</td>
                    <td className="py-2.5 px-3 text-[#A8A398]">v1/chat/completions</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#A8A398]">Custom endpoint & model ID</td>
                    <td className="py-2.5 px-3">SSRF-validated custom Base URL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Live Web Search Routing */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#121319]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F2EFE8]">4. Autonomous Web Search Routing</h3>
                <p className="text-xs text-[#8C867B]">Exa Neural Search with Tavily Verification Fallback</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#A8A398] leading-relaxed">
              Implemented in <code className="text-[#DFC492] bg-white/5 px-1.5 py-0.5 rounded font-mono text-xs">app/services/retrieval/search.py</code>.
              During agent execution, a dedicated reasoning node evaluates query ambiguity and factual requirements.
              If context is insufficient, it formulates an autonomous neural search query via Exa (<code className="font-mono text-xs">api.exa.ai</code>)
              with automatic failover to Tavily (<code className="font-mono text-xs">api.tavily.com</code>).
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full px-6 py-4 border-t border-white/[0.05] text-center text-xs text-[#787267] backdrop-blur-sm bg-[#090A0D]/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Grid07 Intelligent Swarm Orchestrator. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/login" className="hover:text-[#F2EFE8] transition-colors">Sign In</Link>
            <span>&bull;</span>
            <Link href="/security" className="hover:text-[#F2EFE8] transition-colors">Security Overview</Link>
            <span>&bull;</span>
            <Link href="/status" className="hover:text-[#F2EFE8] transition-colors">Status</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
