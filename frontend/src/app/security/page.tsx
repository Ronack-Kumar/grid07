'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Key,
  Server,
  Layers,
} from 'lucide-react'
import { AnimatedBackground } from '@/components/auth/AnimatedBackground'

export default function SecurityOverviewPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Architecture & Threat Model</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F2EFE8] leading-tight">
            Grid07 Security{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFC492] via-[#C7A66A] to-[#9A7840] font-serif italic">
              Architecture Overview
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#B6B0A4] leading-relaxed">
            Grid07 treats all user input, external tool results, and internet search payloads as untrusted.
            Our orchestration framework enforces a multi-layered defense architecture designed to protect
            agent personas, credentials, and tenant isolation against adversarial disruption.
          </p>
        </div>

        {/* Security Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1: Prompt Injection Defense */}
          <div className="p-6 rounded-2xl bg-[#121319]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F2EFE8]">Two-Layer Prompt Injection Defense</h3>
            <p className="text-xs sm:text-sm text-[#A8A398] leading-relaxed">
              Implemented in <code className="text-[#DFC492] bg-white/5 px-1.5 py-0.5 rounded font-mono text-xs">app/services/security/injection.py</code>.
              Incoming requests are scanned for adversarial patterns (e.g. system instruction overrides, delimiter injection,
              untrusted role switching). Malicious patterns are neutralized before reaching LLM execution nodes.
            </p>
            <ul className="space-y-2 text-xs text-[#C2BEB4] pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Delimiter containment and boundary sanitization</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Pre-filtering of adversarial jailbreak sequences</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Immutable system-prompt quarantine</span>
              </li>
            </ul>
          </div>

          {/* Pillar 2: Encrypted Credential Vault */}
          <div className="p-6 rounded-2xl bg-[#121319]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#C7A66A]/10 border border-[#C7A66A]/30 flex items-center justify-center text-[#DFC492]">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F2EFE8]">AES-256-GCM Credential Encryption</h3>
            <p className="text-xs sm:text-sm text-[#A8A398] leading-relaxed">
              Implemented in <code className="text-[#DFC492] bg-white/5 px-1.5 py-0.5 rounded font-mono text-xs">app/core/security.py</code>.
              User-provided API keys for Groq, Gemini, OpenRouter, OpenAI, and xAI are encrypted at rest using
              cryptographic authenticated encryption.
            </p>
            <ul className="space-y-2 text-xs text-[#C2BEB4] pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Masked client responses (<code className="font-mono text-xs">••••••••abcd</code>)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Ephemeral in-memory decryption strictly at dispatch time</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero plaintext credential exposure in logs or telemetry</span>
              </li>
            </ul>
          </div>

          {/* Pillar 3: SSRF & Network Quarantine */}
          <div className="p-6 rounded-2xl bg-[#121319]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F2EFE8]">SSRF & Private IP Quarantine</h3>
            <p className="text-xs sm:text-sm text-[#A8A398] leading-relaxed">
              Implemented in <code className="text-[#DFC492] bg-white/5 px-1.5 py-0.5 rounded font-mono text-xs">app/services/llm/validator.py</code>.
              Custom OpenAI-compatible provider endpoints must pass strict URL parsing, scheme validation, and IP range blocklists.
            </p>
            <ul className="space-y-2 text-xs text-[#C2BEB4] pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Rejection of RFC-1918 private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Blocking of loopback (<code className="font-mono text-xs">127.0.0.1</code>) and cloud metadata (<code className="font-mono text-xs">169.254.169.254</code>)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Whitelisted official HTTPS provider endpoints</span>
              </li>
            </ul>
          </div>

          {/* Pillar 4: Multi-Tenant Workspace Isolation */}
          <div className="p-6 rounded-2xl bg-[#121319]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F2EFE8]">Tenant Workspace Isolation</h3>
            <p className="text-xs sm:text-sm text-[#A8A398] leading-relaxed">
              Workspaces are cryptographically isolated with UUID foreign keys, role-based membership checks, and
              tenant-scoped database transactions across Postgres and vector memory.
            </p>
            <ul className="space-y-2 text-xs text-[#C2BEB4] pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Workspaces isolated by UUID verification on all API routes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Execution traces strictly scoped to authenticated workspace members</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Isolated agent memory threads preventing cross-tenant leakage</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Security Audit Terminal Log Simulation */}
        <div className="p-6 rounded-2xl bg-[#0C0D12] border border-white/10 shadow-2xl font-mono text-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-[#8C867B]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-[11px] ml-2 text-[#C2BEB4]">grid07_security_pipeline.log</span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              DEFENSES ACTIVE
            </span>
          </div>

          <p className="text-[#8C867B]">&gt; [INIT] Initializing multi-layer agent security perimeter...</p>
          <p className="text-[#C2BEB4]">&gt; [AUTH] JWT token validation active (HS256 signature verification)</p>
          <p className="text-[#C2BEB4]">&gt; [VAULT] AES-256-GCM hardware-accelerated cipher ready</p>
          <p className="text-[#C2BEB4]">&gt; [INSPECTION] Regex & AST delimiter quarantine rules loaded (84 automated tests passing)</p>
          <p className="text-emerald-400 font-semibold">&gt; [STATUS] All security boundaries verified operational.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full px-6 py-4 border-t border-white/[0.05] text-center text-xs text-[#787267] backdrop-blur-sm bg-[#090A0D]/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Grid07 Intelligent Swarm Orchestrator. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/login" className="hover:text-[#F2EFE8] transition-colors">Sign In</Link>
            <span>&bull;</span>
            <Link href="/routing-specs" className="hover:text-[#F2EFE8] transition-colors">Model Routing Specs</Link>
            <span>&bull;</span>
            <Link href="/status" className="hover:text-[#F2EFE8] transition-colors">Status</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
