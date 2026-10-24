'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Server,
  Activity,
} from 'lucide-react'
import { AnimatedBackground } from '@/components/auth/AnimatedBackground'

interface HealthState {
  checking: boolean
  operational: boolean
  statusCode: number | null
  serviceName: string | null
  latencyMs: number | null
  lastChecked: string | null
  errorMessage: string | null
}

const UPSTREAM_SERVICES = [
  {
    name: 'OpenRouter API',
    description: 'Dynamic model catalog & chat completions gateway',
    statusUrl: 'https://status.openrouter.ai/',
    verifiedHost: 'status.openrouter.ai',
  },
  {
    name: 'Groq Cloud',
    description: 'LPU inference infrastructure',
    statusUrl: 'https://status.groq.com/',
    verifiedHost: 'status.groq.com',
  },
  {
    name: 'Google Gemini & Cloud AI',
    description: 'Generative language v1beta endpoints',
    statusUrl: 'https://status.cloud.google.com/',
    verifiedHost: 'status.cloud.google.com',
  },
  {
    name: 'Exa Neural Search',
    description: 'Real-time web search and neural retrieval API',
    statusUrl: 'https://status.exa.ai/',
    verifiedHost: 'status.exa.ai',
  },
]

export default function StatusPage() {
  const [health, setHealth] = useState<HealthState>({
    checking: true,
    operational: false,
    statusCode: null,
    serviceName: null,
    latencyMs: null,
    lastChecked: null,
    errorMessage: null,
  })

  const runProbe = async () => {
    const start = performance.now()
    try {
      const response = await fetch('http://localhost:8000/health', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      const latency = Math.round(performance.now() - start)

      if (response.ok) {
        const data = await response.json()
        setHealth({
          checking: false,
          operational: data.status === 'ok',
          statusCode: response.status,
          serviceName: data.service || 'Grid07 Backend',
          latencyMs: latency,
          lastChecked: new Date().toLocaleTimeString(),
          errorMessage: null,
        })
      } else {
        setHealth({
          checking: false,
          operational: false,
          statusCode: response.status,
          serviceName: null,
          latencyMs: latency,
          lastChecked: new Date().toLocaleTimeString(),
          errorMessage: `Backend health returned HTTP ${response.status}`,
        })
      }
    } catch (err: unknown) {
      const latency = Math.round(performance.now() - start)
      const message = err instanceof Error ? err.message : 'Connection to http://localhost:8000/health refused'
      setHealth({
        checking: false,
        operational: false,
        statusCode: null,
        serviceName: null,
        latencyMs: latency,
        lastChecked: new Date().toLocaleTimeString(),
        errorMessage: message,
      })
    }
  }

  const handleManualRefresh = () => {
    setHealth((prev) => ({ ...prev, checking: true, errorMessage: null }))
    runProbe()
  }

  useEffect(() => {
    let isMounted = true
    const initialProbe = async () => {
      const start = performance.now()
      try {
        const response = await fetch('http://localhost:8000/health', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
        const latency = Math.round(performance.now() - start)
        if (!isMounted) return

        if (response.ok) {
          const data = await response.json()
          setHealth({
            checking: false,
            operational: data.status === 'ok',
            statusCode: response.status,
            serviceName: data.service || 'Grid07 Backend',
            latencyMs: latency,
            lastChecked: new Date().toLocaleTimeString(),
            errorMessage: null,
          })
        } else {
          setHealth({
            checking: false,
            operational: false,
            statusCode: response.status,
            serviceName: null,
            latencyMs: latency,
            lastChecked: new Date().toLocaleTimeString(),
            errorMessage: `Backend health returned HTTP ${response.status}`,
          })
        }
      } catch (err: unknown) {
        if (!isMounted) return
        const latency = Math.round(performance.now() - start)
        const message = err instanceof Error ? err.message : 'Connection to http://localhost:8000/health refused'
        setHealth({
          checking: false,
          operational: false,
          statusCode: null,
          serviceName: null,
          latencyMs: latency,
          lastChecked: new Date().toLocaleTimeString(),
          errorMessage: message,
        })
      }
    }

    initialProbe()
    return () => {
      isMounted = false
    }
  }, [])

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
      <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-10">
        {/* Page Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
              <Activity className="w-3.5 h-3.5" />
              <span>System Telemetry & Health Probe</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F2EFE8]">
              Grid07 System{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFC492] via-[#C7A66A] to-[#9A7840] font-serif italic">
                Status
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#A8A398]">
              Live operational health probed directly from the Grid07 Core backend service.
            </p>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={health.checking}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#14151C] hover:bg-[#1C1D27] border border-white/10 text-xs font-semibold text-[#F2EFE8] hover:text-[#DFC492] transition-all self-start sm:self-center disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${health.checking ? 'animate-spin text-[#C7A66A]' : ''}`} />
            <span>{health.checking ? 'Probing...' : 'Re-check Status'}</span>
          </button>
        </div>

        {/* Live System Health Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#121319]/90 backdrop-blur-xl border border-white/10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  health.operational
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                }`}
              >
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F2EFE8]">
                  {health.serviceName || 'Grid07 Core API'}
                </h3>
                <p className="text-xs text-[#8C867B] font-mono mt-0.5">
                  Target: http://localhost:8000/health
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`flex h-2.5 w-2.5 rounded-full ${
                  health.operational ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  health.operational
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {health.operational ? 'Operational' : 'Service Offline / Degraded'}
              </span>
            </div>
          </div>

          {/* Telemetry Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-[#0E0F14] border border-white/5 space-y-1">
              <div className="text-[11px] text-[#8C867B]">HTTP Status</div>
              <div className="text-sm font-semibold text-[#F2EFE8] font-mono">
                {health.statusCode ? `${health.statusCode} OK` : 'No response'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0E0F14] border border-white/5 space-y-1">
              <div className="text-[11px] text-[#8C867B]">Probe Latency</div>
              <div className="text-sm font-semibold text-emerald-400 font-mono">
                {health.latencyMs !== null ? `${health.latencyMs} ms` : '—'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0E0F14] border border-white/5 space-y-1">
              <div className="text-[11px] text-[#8C867B]">State Payload</div>
              <div className="text-sm font-semibold text-[#DFC492] font-mono">
                {health.operational ? 'status: ok' : 'unavailable'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0E0F14] border border-white/5 space-y-1">
              <div className="text-[11px] text-[#8C867B]">Last Probed</div>
              <div className="text-sm font-semibold text-[#A8A398] font-mono">
                {health.lastChecked || 'Checking...'}
              </div>
            </div>
          </div>

          {/* Error Message if Unreachable */}
          {health.errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{health.errorMessage}</span>
            </div>
          )}
        </div>

        {/* Upstream Provider Dashboards */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#F2EFE8]">Upstream Provider Status Dashboards</h3>
            <p className="text-xs text-[#8C867B] mt-0.5">
              Live status for external LLM inference and web search providers. Verified official status portals:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {UPSTREAM_SERVICES.map((service) => (
              <a
                key={service.name}
                href={service.statusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-[#121319]/80 border border-white/10 hover:border-[#C7A66A]/40 transition-all group flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#F2EFE8] group-hover:text-[#DFC492] transition-colors">
                      {service.name}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-[11px] text-[#8C867B]">{service.description}</p>
                  <p className="text-[10px] font-mono text-[#635D52] group-hover:text-[#8C867B] transition-colors">
                    {service.verifiedHost}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-[#736E65] group-hover:text-[#DFC492] transition-colors shrink-0 mt-0.5" />
              </a>
            ))}
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
            <Link href="/routing-specs" className="hover:text-[#F2EFE8] transition-colors">Model Routing Specs</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
