'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react'

import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { useAuthStore } from '@/lib/store'
import type { Agent } from '@/lib/types'

const PERSONA_PORTRAIT_MAP: Record<string, string> = {
  'finance advisor': '/assets/portrait_finance.jpg',
  'code engineer': '/assets/portrait_code.jpg',
  'security specialist': '/assets/portrait_security.jpg',
  'research assistant': '/assets/portrait_research.jpg',
  'general assistant': '/assets/portrait_analyst.jpg',
}

const getPortraitForAgent = (agentName: string): string => {
  const lower = agentName.toLowerCase().trim()
  for (const [key, path] of Object.entries(PERSONA_PORTRAIT_MAP)) {
    if (lower.includes(key)) return path
  }
  if (lower.includes('finance') || lower.includes('invest')) return '/assets/portrait_finance.jpg'
  if (lower.includes('code') || lower.includes('dev') || lower.includes('python')) return '/assets/portrait_code.jpg'
  if (lower.includes('sec') || lower.includes('cyber') || lower.includes('vuln')) return '/assets/portrait_security.jpg'
  if (lower.includes('research') || lower.includes('scien')) return '/assets/portrait_research.jpg'
  return '/assets/portrait_analyst.jpg'
}

export default function AgentsPage() {
  const { workspace } = useAuthStore()
  const [agents, setAgents] = useState<Agent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDomain, setFilterDomain] = useState<'all' | 'finance' | 'code' | 'security' | 'research' | 'general'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAgents = useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    setError('')
    try {
      const response = await api.get<Agent[]>(`/workspaces/${workspace.id}/agents`)
      setAgents(response.data)
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Could not load personas.'))
    } finally {
      setLoading(false)
    }
  }, [workspace])

  useEffect(() => {
    if (!workspace) return
    let active = true
    api.get<Agent[]>(`/workspaces/${workspace.id}/agents`)
      .then((res) => {
        if (active) {
          setAgents(res.data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(getApiErrorMessage(err, 'Could not load personas.'))
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [workspace])

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.provider || '').toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false
    if (filterDomain === 'all') return true
    const nameLower = agent.name.toLowerCase()
    if (filterDomain === 'finance') return nameLower.includes('finance')
    if (filterDomain === 'code') return nameLower.includes('code')
    if (filterDomain === 'security') return nameLower.includes('security')
    if (filterDomain === 'research') return nameLower.includes('research')
    if (filterDomain === 'general') return nameLower.includes('general')
    return true
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DA] pb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B89355] block mb-1">
            Intelligent Multi-Agent System
          </span>
          <h1 className="text-3xl font-serif font-medium tracking-tight text-[#1A1A1E]">
            Expert Personas
          </h1>
          <p className="text-xs text-[#736E65] mt-1 max-w-xl leading-relaxed">
            Manage, configure, and directly test specialized AI expert personas provisioned for this workspace.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => void loadAgents()}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E0DBD0] hover:bg-[#FAF8F5] text-[#6B655B] hover:text-[#1A1A1E] transition-colors"
            title="Refresh Personas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/agents/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1E] hover:bg-black px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Persona</span>
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <span>{error}</span>
          <button onClick={() => void loadAgents()} className="inline-flex items-center gap-1.5 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#8C867B] dark:text-[#A8A398] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search personas, models, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E0DBD0] dark:border-[#403D35] bg-white dark:bg-[#1F1E1B] text-xs text-[#1A1A1E] dark:text-[#F2EFE8] placeholder:text-[#A09A8F] dark:placeholder:text-[#8C887E] focus:outline-none focus:border-[#B89355] dark:focus:border-[#C7A66A] transition-colors"
          />
        </div>

        {/* Domain Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['all', 'finance', 'code', 'security', 'research', 'general'] as const).map((dom) => (
            <button
              key={dom}
              onClick={() => setFilterDomain(dom)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-colors ${
                filterDomain === dom
                  ? 'bg-[#1A1A1E] dark:bg-[#C7A66A] text-white dark:text-[#171715] font-semibold shadow-2xs'
                  : 'bg-[#F2EFE8] dark:bg-[#25241F] text-[#736E65] dark:text-[#B6B0A4] hover:text-[#1A1A1E] dark:hover:text-[#F2EFE8] hover:bg-[#EAE5DA] dark:hover:bg-[#2E2C25]'
              }`}
            >
              {dom === 'all' ? 'All Experts' : dom}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Expert Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-xs text-[#736E65] dark:text-[#A8A398]">
          <Loader2 className="w-6 h-6 animate-spin text-[#B89355] dark:text-[#C7A66A]" />
          <span>Loading verified expert personas...</span>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => {
            const portrait = getPortraitForAgent(agent.name)
            return (
              <article
                key={agent.id}
                className="bg-white dark:bg-[#22211E] rounded-2xl border border-[#E4DFD3] dark:border-[#38352D] overflow-hidden shadow-2xs hover:shadow-xs hover:border-[#B89355]/60 dark:hover:border-[#C7A66A]/60 transition-all flex flex-col group"
              >
                {/* Portrait Header */}
                <div className="h-40 relative overflow-hidden bg-[#0F0F13]">
                  <Image
                    src={portrait}
                    alt={agent.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F13] via-[#0F0F13]/40 to-transparent" />

                  {/* Status badge */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#0F0F13]/85 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-[#10B981] flex items-center gap-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span>Active</span>
                  </div>

                  {/* Persona name & provider tag */}
                  <div className="absolute inset-x-3 bottom-3 text-white">
                    <h3 className="font-bold text-sm tracking-tight text-white leading-tight">
                      {agent.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#D4CFC4] mt-0.5">
                      <Sparkles className="w-3 h-3 text-[#CBB080]" />
                      <span>{agent.provider} &bull; {agent.model_name}</span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-[#5C574E] dark:text-[#C2BEB4] leading-relaxed line-clamp-3">
                    {agent.description || 'Specialized expert persona configured for domain-specific inquiry and execution.'}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-[#EFECE3] dark:border-[#38352D]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8C867B] dark:text-[#A8A398]">Provider / Engine</span>
                      <span className="font-mono text-[#1A1A1E] dark:text-[#F2EFE8] font-medium">{agent.provider}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8C867B] dark:text-[#A8A398]">Model ID</span>
                      <span className="font-mono text-[#1A1A1E] dark:text-[#F2EFE8] truncate max-w-[170px]">{agent.model_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8C867B] dark:text-[#A8A398]">Tier</span>
                      <span className="text-[#059669] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified Free-Tier
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 flex items-center gap-2">
                    <Link
                      href={`/playground?agent_id=${agent.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#292823] hover:bg-[#F0ECE3] dark:hover:bg-[#323028] border border-[#E0DBD0] dark:border-[#403D35] px-3 py-1.5 text-xs font-semibold text-[#1A1A1E] dark:text-[#F2EFE8] transition-colors"
                    >
                      <Play className="w-3 h-3 text-[#B89355] dark:text-[#C7A66A]" />
                      <span>Test Persona</span>
                    </Link>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="p-1.5 rounded-xl border border-[#E0DBD0] dark:border-[#403D35] hover:bg-[#FAF8F5] dark:hover:bg-[#292823] text-[#6B655B] dark:text-[#A8A398] hover:text-[#1A1A1E] dark:hover:text-[#F2EFE8] transition-colors"
                      title="Edit Persona"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}

          {filteredAgents.length === 0 && !error && (
            <div className="col-span-full py-16 text-center border border-dashed border-[#DDD7CB] dark:border-[#403D35] rounded-2xl bg-white dark:bg-[#22211E] p-6">
              <h3 className="text-sm font-semibold text-[#1A1A1E] dark:text-[#F2EFE8]">No personas match filter</h3>
              <p className="text-xs text-[#736E65] dark:text-[#A8A398] mt-1 mb-4">
                Try searching for another domain or create a new custom agent.
              </p>
              <Link
                href="/agents/new"
                className="inline-flex rounded-xl bg-[#1A1A1E] dark:bg-[#C7A66A] text-white dark:text-[#171715] px-4 py-2 text-xs font-semibold"
              >
                Create Agent
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
