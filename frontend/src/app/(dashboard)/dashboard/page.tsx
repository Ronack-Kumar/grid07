'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  Users,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import type { Execution } from '@/lib/types'

interface PersonaBreakdownItem {
  agent_id?: string
  agent_name?: string
  name?: string
  count: number
  percentage?: number
  success_rate?: number
  avg_latency_ms?: number
}

interface AnalyticsData {
  total_agents: number
  total_executions: number
  success_rate: number
  avg_latency_ms: number
  persona_breakdown?: PersonaBreakdownItem[]
  provider_breakdown?: Record<string, number>
}

export default function DashboardPage() {
  const { workspace } = useAuthStore()
  const [stats, setStats] = useState<AnalyticsData>({
    total_agents: 0,
    total_executions: 0,
    success_rate: 0,
    avg_latency_ms: 0,
    persona_breakdown: [],
    provider_breakdown: {},
  })
  const [recentExecutions, setRecentExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspace) return
    Promise.all([
      api.get<AnalyticsData>(`/workspaces/${workspace.id}/analytics`),
      api.get<Execution[]>(`/workspaces/${workspace.id}/executions`),
    ])
      .then(([analyticsRes, executionsRes]) => {
        setStats(analyticsRes.data)
        setRecentExecutions(executionsRes.data.slice(0, 6))
      })
      .catch(() => {
        // Fallback silently if offline or initializing
      })
      .finally(() => setLoading(false))
  }, [workspace])

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-[#EAE5DA] pb-5">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B89355] block mb-1">
          Workspace Intelligence Overview
        </span>
        <h1 className="text-3xl font-serif font-medium tracking-tight text-[#1A1A1E]">
          System Dashboard
        </h1>
        <p className="text-xs text-[#736E65] mt-1 max-w-xl leading-relaxed">
          Real-time metrics on provisioned expert personas, query volume, provider routing, and free-tier latency.
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 bg-white dark:bg-[#22211E] rounded-2xl border border-[#E6E1D4] dark:border-[#38352D] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#736E65] dark:text-[#A8A398]">
            <h3 className="font-semibold text-xs tracking-wide">Enabled Personas</h3>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] dark:bg-[#292823] border border-[#EAE5DA] dark:border-[#403D35] text-[#B89355] dark:text-[#C7A66A]">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-serif text-[#1A1A1E] dark:text-[#F2EFE8]">{stats.total_agents}</div>
          <p className="text-[11px] text-[#8C867B] dark:text-[#A8A398]">Provisioned across 5 core domains</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#22211E] rounded-2xl border border-[#E6E1D4] dark:border-[#38352D] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#736E65] dark:text-[#A8A398]">
            <h3 className="font-semibold text-xs tracking-wide">Total Executions</h3>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] dark:bg-[#292823] border border-[#EAE5DA] dark:border-[#403D35] text-[#2563EB] dark:text-[#60A5FA]">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-serif text-[#1A1A1E] dark:text-[#F2EFE8]">{stats.total_executions}</div>
          <p className="text-[11px] text-[#8C867B] dark:text-[#A8A398]">Persisted end-to-end traces</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#22211E] rounded-2xl border border-[#E6E1D4] dark:border-[#38352D] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#736E65] dark:text-[#A8A398]">
            <h3 className="font-semibold text-xs tracking-wide">Success Rate</h3>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] dark:bg-[#292823] border border-[#EAE5DA] dark:border-[#403D35] text-[#10B981] dark:text-[#63B995]">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-serif text-[#1A1A1E] dark:text-[#F2EFE8]">{stats.success_rate}%</div>
          <p className="text-[11px] text-[#8C867B] dark:text-[#A8A398]">Zero-failure provider routing</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#22211E] rounded-2xl border border-[#E6E1D4] dark:border-[#38352D] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#736E65] dark:text-[#A8A398]">
            <h3 className="font-semibold text-xs tracking-wide">Avg Latency</h3>
            <div className="p-1.5 rounded-lg bg-[#FAF8F5] dark:bg-[#292823] border border-[#EAE5DA] dark:border-[#403D35] text-[#EAB308] dark:text-[#FBBF24]">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-serif text-[#1A1A1E] dark:text-[#F2EFE8]">
            {stats.avg_latency_ms ? `${(stats.avg_latency_ms / 1000).toFixed(2)}s` : '0.00s'}
          </div>
          <p className="text-[11px] text-[#8C867B] dark:text-[#A8A398]">Provider inference & routing</p>
        </div>
      </div>

      {/* Grid: Agent Breakdown & Provider Usage */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Real Data-Backed Persona Breakdown */}
        <div className="bg-white dark:bg-[#22211E] rounded-2xl border border-[#E6E1D4] dark:border-[#38352D] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE3] dark:border-[#38352D]">
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1E] dark:text-[#F2EFE8]">Persona Activity Breakdown</h3>
              <p className="text-[11px] text-[#736E65] dark:text-[#A8A398]">Distribution of routed requests by expert</p>
            </div>
            <Link
              href="/agents"
              className="text-[11px] font-semibold text-[#B89355] dark:text-[#C7A66A] hover:underline flex items-center gap-0.5"
            >
              <span>View Personas</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats.persona_breakdown && stats.persona_breakdown.length > 0 ? (
              stats.persona_breakdown.map((item, idx) => {
                const itemKey = item.agent_id || item.agent_name || item.name || `persona-breakdown-${idx}`
                const displayName = item.agent_name || item.name || 'Auto-routed'
                const pct = typeof item.percentage === 'number' ? item.percentage : 0
                return (
                  <div key={itemKey} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1A1A1E] dark:text-[#F2EFE8]">{displayName}</span>
                      <span className="text-[#736E65] dark:text-[#B6B0A4] font-mono text-[11px]">
                        {item.count} req ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#EAE5DA] dark:bg-[#323028] overflow-hidden">
                      <div
                        className="h-full bg-[#B89355] dark:bg-[#C7A66A] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-[#8C867B] dark:text-[#A8A398] italic py-4 text-center">
                No persona executions recorded yet. Submit queries in Auto Chat.
              </p>
            )}
          </div>
        </div>

        {/* Provider Distribution */}
        <div className="bg-white dark:bg-[#22211E] rounded-2xl border border-[#E6E1D4] dark:border-[#38352D] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE3] dark:border-[#38352D]">
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1E] dark:text-[#F2EFE8]">Provider Engine Usage</h3>
              <p className="text-[11px] text-[#736E65] dark:text-[#A8A398]">Actual compute engines utilized for execution</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-semibold">
              Free-Tier Quota
            </span>
          </div>

          <div className="space-y-3">
            {stats.provider_breakdown && Object.keys(stats.provider_breakdown).length > 0 ? (
              Object.entries(stats.provider_breakdown).map(([provider, count]) => {
                const total = stats.total_executions || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={provider} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-[#1A1A1E] dark:text-[#F2EFE8] capitalize">
                        <Sparkles className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" />
                        <span>{provider}</span>
                      </div>
                      <span className="text-[#736E65] dark:text-[#B6B0A4] font-mono text-[11px]">
                        {count} calls ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#EAE5DA] dark:bg-[#323028] overflow-hidden">
                      <div
                        className="h-full bg-[#1A1A1E] dark:bg-[#C7A66A] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-[#8C867B] dark:text-[#A8A398] italic py-4 text-center">
                Awaiting provider executions.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Executions Stream */}
      <div className="bg-white dark:bg-[#22211E] rounded-2xl border border-[#E6E1D4] dark:border-[#38352D] p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE3] dark:border-[#38352D]">
          <div>
            <h3 className="font-bold text-sm text-[#1A1A1E] dark:text-[#F2EFE8]">Recent Execution Traces</h3>
            <p className="text-[11px] text-[#736E65] dark:text-[#A8A398]">Last verified inferences processed through Grid07</p>
          </div>
          <Link
            href="/executions"
            className="text-[11px] font-semibold text-[#B89355] dark:text-[#C7A66A] hover:underline flex items-center gap-0.5"
          >
            <span>All Executions</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-[#F0ECE3] dark:divide-[#38352D]">
          {recentExecutions.map((exec) => (
            <div key={exec.id} className="py-2.5 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#1A1A1E] dark:text-[#F2EFE8] truncate max-w-xl">
                  {exec.input_text}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-[#8C867B] dark:text-[#A8A398] mt-0.5 font-mono">
                  <span>{new Date(exec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>&bull;</span>
                  <span>{exec.actual_provider || 'auto'} / {exec.actual_model || 'free-tier'}</span>
                  <span>&bull;</span>
                  <span>{exec.latency_ms ? `${(exec.latency_ms / 1000).toFixed(1)}s` : '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    exec.status === 'COMPLETED'
                      ? 'bg-[#ECFDF5] text-[#059669]'
                      : exec.status === 'FAILED'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-[#F2EFE8] text-[#736E65]'
                  }`}
                >
                  {exec.status}
                </span>
                <Link
                  href="/executions"
                  className="p-1 rounded-md text-[#8C867B] dark:text-[#A8A398] hover:text-[#1A1A1E] dark:hover:text-[#F2EFE8] transition-colors"
                  title="View Trace"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {recentExecutions.length === 0 && !loading && (
            <p className="text-xs text-[#8C867B] dark:text-[#A8A398] italic py-6 text-center">
              No recent executions. Run a prompt in Auto Chat or Playground to start tracking.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
