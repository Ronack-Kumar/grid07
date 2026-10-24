'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Clock,
  Loader2,
  RefreshCw,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { useAuthStore } from '@/lib/store'
import type { Execution } from '@/lib/types'
import { MarkdownContent } from '@/components/MarkdownContent'

export default function ExecutionsPage() {
  const { workspace } = useAuthStore()
  const [executions, setExecutions] = useState<Execution[]>([])
  const [selected, setSelected] = useState<Execution | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadExecutions = useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    setError('')
    try {
      const response = await api.get<Execution[]>(`/workspaces/${workspace.id}/executions`)
      setExecutions(response.data)
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Could not load execution history.'))
    } finally {
      setLoading(false)
    }
  }, [workspace])

  useEffect(() => {
    if (!workspace) return
    let active = true
    api.get<Execution[]>(`/workspaces/${workspace.id}/executions`)
      .then((res) => {
        if (active) {
          setExecutions(res.data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(getApiErrorMessage(err, 'Could not load execution history.'))
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [workspace])

  const filteredExecutions = executions.filter((exec) => {
    const textMatches =
      (exec.input_text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exec.actual_provider || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exec.actual_model || '').toLowerCase().includes(searchQuery.toLowerCase())
    if (!textMatches) return false
    if (statusFilter !== 'ALL' && exec.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DA] pb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B89355] block mb-1">
            Execution Lifecycle & Audit
          </span>
          <h1 className="text-3xl font-serif font-medium tracking-tight text-[#1A1A1E]">
            Execution Traces
          </h1>
          <p className="text-xs text-[#736E65] mt-1 max-w-xl leading-relaxed">
            Inspect real-time routing decisions, provider latency, search retrieval status, and full trace logs.
          </p>
        </div>
        <button
          onClick={() => void loadExecutions()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E0DBD0] bg-white px-3.5 py-2 text-xs font-semibold text-[#1A1A1E] hover:bg-[#FAF8F5] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-[#8C867B] dark:text-[#A8A398] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search queries, models, providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E0DBD0] dark:border-[#403D35] bg-white dark:bg-[#1F1E1B] text-xs text-[#1A1A1E] dark:text-[#F2EFE8] placeholder:text-[#A09A8F] dark:placeholder:text-[#8C887E] focus:outline-none focus:border-[#B89355] dark:focus:border-[#C7A66A] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['ALL', 'COMPLETED', 'FAILED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-[#1A1A1E] dark:bg-[#C7A66A] text-white dark:text-[#171715] shadow-2xs'
                  : 'bg-[#F2EFE8] dark:bg-[#25241F] text-[#736E65] dark:text-[#B6B0A4] hover:text-[#1A1A1E] dark:hover:text-[#F2EFE8] hover:bg-[#EAE5DA] dark:hover:bg-[#2E2C25]'
              }`}
            >
              {st === 'ALL' ? 'All Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Executions Table */}
      <div className="bg-white dark:bg-[#22211E] rounded-2xl overflow-hidden border border-[#E6E1D4] dark:border-[#38352D] shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-xs text-[#736E65] dark:text-[#A8A398]">
            <Loader2 className="w-6 h-6 animate-spin text-[#B89355] dark:text-[#C7A66A]" />
            <span>Loading executions...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10.5px] font-bold text-[#8C887E] dark:text-[#A8A398] uppercase tracking-wider bg-[#FAF8F5] dark:bg-[#1D1C19] border-b border-[#EAE5DA] dark:border-[#38352D]">
                <tr>
                  <th className="px-5 py-3.5">Query Input</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Engine / Model</th>
                  <th className="px-5 py-3.5">Latency</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE3] dark:divide-[#38352D]">
                {filteredExecutions.map((execution) => {
                  const cleanInput = (execution.input_text || '').replace(/^(Ask\s+[^a-z]+about\s+)+/i, '').trim()
                  return (
                    <tr key={execution.id} className="hover:bg-[#FAF8F5]/80 dark:hover:bg-[#25241F]/80 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-[#1A1A1E] dark:text-[#F2EFE8] max-w-sm truncate">
                        {cleanInput}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            execution.status === 'COMPLETED'
                              ? 'bg-[#ECFDF5] text-[#059669]'
                              : execution.status === 'FAILED'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-[#F2EFE8] text-[#736E65]'
                          }`}
                        >
                          {execution.status === 'COMPLETED' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {execution.status === 'FAILED' && <AlertCircle className="w-2.5 h-2.5" />}
                          <span>{execution.status}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[#736E65] dark:text-[#B6B0A4]">
                        {execution.actual_provider ?? execution.requested_provider ?? '-'} /{' '}
                        {execution.actual_model ?? execution.requested_model ?? '-'}
                      </td>
                      <td className="px-5 py-3.5 text-[#736E65] dark:text-[#B6B0A4] font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#A09A8F] dark:text-[#8C887E]" />
                          {execution.latency_ms != null ? `${(execution.latency_ms / 1000).toFixed(2)}s` : '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelected(execution)}
                          className="font-semibold text-[#B89355] dark:text-[#C7A66A] hover:text-[#9A7840] dark:hover:text-[#DFC492] hover:underline"
                        >
                          View Trace
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filteredExecutions.length === 0 && !error && (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-[#8C867B] dark:text-[#A8A398] italic">
                      No matching executions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trace Details Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Execution details"
        >
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#E4DFD3] dark:border-[#403D35] bg-white dark:bg-[#22211E] p-6 space-y-5 shadow-2xl text-xs">
            <div className="flex items-start justify-between gap-4 border-b border-[#F0ECE3] dark:border-[#38352D] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B89355] dark:text-[#C7A66A]">
                  Trace ID
                </span>
                <h2 className="text-base font-bold text-[#1A1A1E] dark:text-[#F2EFE8] font-mono mt-0.5">{selected.id}</h2>
              </div>
              <button
                aria-label="Close details"
                onClick={() => setSelected(null)}
                className="p-1 rounded-lg text-[#8C867B] dark:text-[#A8A398] hover:text-[#1A1A1E] dark:hover:text-[#F2EFE8] hover:bg-[#F2EFE8] dark:hover:bg-[#292823] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 bg-[#FAF8F5] dark:bg-[#1D1C19] p-3.5 rounded-xl border border-[#EAE5DA] dark:border-[#38352D]">
              <div>
                <dt className="text-[#8C867B] dark:text-[#A8A398]">Requested Provider / Model</dt>
                <dd className="font-mono text-[#1A1A1E] dark:text-[#F2EFE8] font-medium mt-0.5">
                  {selected.requested_provider ?? 'auto'} / {selected.requested_model ?? 'auto'}
                </dd>
              </div>
              <div>
                <dt className="text-[#8C867B] dark:text-[#A8A398]">Actual Executed Engine</dt>
                <dd className="font-mono text-[#1A1A1E] dark:text-[#F2EFE8] font-medium mt-0.5">
                  {selected.actual_provider ?? '-'} / {selected.actual_model ?? '-'}
                  {selected.fallback_used ? ' (fallback policy applied)' : ''}
                </dd>
              </div>
              <div>
                <dt className="text-[#8C867B] dark:text-[#A8A398]">Search Retrieval</dt>
                <dd className="font-mono text-[#1A1A1E] dark:text-[#F2EFE8] mt-0.5">{selected.search_status ?? 'skipped'}</dd>
              </div>
              <div>
                <dt className="text-[#8C867B] dark:text-[#A8A398]">Total Inference Duration</dt>
                <dd className="font-mono text-[#1A1A1E] dark:text-[#F2EFE8] font-medium mt-0.5">
                  {selected.latency_ms != null ? `${(selected.latency_ms / 1000).toFixed(2)}s (${selected.latency_ms}ms)` : '-'}
                </dd>
              </div>
            </dl>

            <section className="space-y-1.5">
              <h3 className="font-bold text-xs text-[#1A1A1E] dark:text-[#F2EFE8]">Original Input</h3>
              <div className="rounded-xl border border-[#EAE5DA] dark:border-[#38352D] bg-[#FAF8F5] dark:bg-[#1D1C19] p-3 text-[#1A1A1E] dark:text-[#F2EFE8] font-medium">
                {(selected.input_text || '').replace(/^(Ask\s+[^a-z]+about\s+)+/i, '').trim()}
              </div>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-xs text-[#1A1A1E] dark:text-[#F2EFE8]">Output Response</h3>
              <div
                className={`rounded-xl p-4 leading-relaxed ${
                  selected.status === 'FAILED'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-[#FAF8F5] dark:bg-[#1D1C19] text-[#1A1A1E] dark:text-[#F2EFE8] border border-[#EAE5DA] dark:border-[#38352D]'
                }`}
              >
                {selected.status === 'FAILED' ? (
                  selected.error_message ?? selected.output_text ?? 'Execution failed.'
                ) : selected.output_text ? (
                  <MarkdownContent content={selected.output_text} />
                ) : (
                  'No output recorded.'
                )}
              </div>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-xs text-[#1A1A1E] dark:text-[#F2EFE8]">Node Lifecycle Events</h3>
              <div className="space-y-1.5">
                {selected.node_events?.length ? (
                  selected.node_events.map((event, index) => (
                    <div
                      key={`${event.node}-${index}`}
                      className="rounded-xl border border-[#EAE5DA] dark:border-[#38352D] bg-[#FAF8F5] dark:bg-[#1D1C19] p-2.5 flex justify-between items-center"
                    >
                      <span className="font-medium text-[#1A1A1E] dark:text-[#F2EFE8] capitalize">{event.node.replace('_', ' ')}</span>
                      <span className="text-[#736E65] dark:text-[#B6B0A4] font-mono text-[11px]">
                        {event.status}
                        {event.latency_ms ? ` &bull; ${(event.latency_ms / 1000).toFixed(2)}s` : ''}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[#8C867B] dark:text-[#A8A398] italic">No node events recorded.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
