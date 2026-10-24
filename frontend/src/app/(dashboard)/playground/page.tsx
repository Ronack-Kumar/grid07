'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  ExternalLink,
  Loader2,
  MessageSquare,
  Network,
  PanelRightClose,
  PanelRightOpen,
  Send,
  SlidersHorizontal,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react'

import Image from 'next/image'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { useAuthStore } from '@/lib/store'
import type { Agent, ChatMessage, Execution, ProviderInfo, OpenRouterModelInfo } from '@/lib/types'
import { MarkdownContent } from '@/components/MarkdownContent'

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED'])

const getAgentPortrait = (agentName?: string) => {
  const lower = (agentName || '').toLowerCase()
  if (lower.includes('code') || lower.includes('python')) return '/assets/portrait_code.jpg'
  if (lower.includes('security') || lower.includes('threat')) return '/assets/portrait_security.jpg'
  if (lower.includes('research') || lower.includes('general')) return '/assets/portrait_research.jpg'
  return '/assets/portrait_finance.jpg'
}

const PROVIDER_NAMES: Record<string, string> = {
  openrouter: 'OpenRouter',
  groq: 'Groq',
  gemini: 'Gemini',
  openai: 'OpenAI',
  xai: 'xAI',
  openai_compatible: 'OpenAI-compatible',
}

export default function PlaygroundPage() {

  const { workspace } = useAuthStore()
  const [agents, setAgents] = useState<Agent[]>([])
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState('auto')
  const [providerOverride, setProviderOverride] = useState('')
  const [modelOverride, setModelOverride] = useState('')
  const [openrouterModels, setOpenrouterModels] = useState<OpenRouterModelInfo[]>([])
  const [openrouterFreeOnly, setOpenrouterFreeOnly] = useState(true)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [execution, setExecution] = useState<Execution | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isTraceOpen, setIsTraceOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!workspace) return
    Promise.all([
      api.get<Agent[]>(`/workspaces/${workspace.id}/agents`),
      api.get<{ providers: ProviderInfo[] }>('/llm/providers'),
    ])
      .then(([agentsResponse, providersResponse]) => {
        setAgents(agentsResponse.data)
        setProviders(providersResponse.data.providers)
        const params = new URLSearchParams(window.location.search)
        const requestedAgent = params.get('agent_id')
        if (requestedAgent && agentsResponse.data.some((agent) => agent.id === requestedAgent)) {
          setSelectedAgentId(requestedAgent)
        }
        if (params.get('saved') === '1') {
          setNotice('Persona saved successfully. Run a prompt below to verify the configured provider response.')
        }
      })
      .catch((requestError: unknown) =>
        setError(getApiErrorMessage(requestError, 'Could not load playground configuration.')),
      )
  }, [workspace])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (providerOverride === 'openrouter' && openrouterModels.length === 0) {
      api.get<{ models: OpenRouterModelInfo[] }>('/llm/openrouter/models')
        .then(({ data }) => setOpenrouterModels(data.models))
        .catch(() => {})
    }
  }, [providerOverride, openrouterModels.length])

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId)
  const overrideProvider = providers.find((provider) => provider.id === providerOverride)
  const effectiveProvider = providerOverride || selectedAgent?.provider || 'groq'
  const effectiveModel = modelOverride || selectedAgent?.model_name || 'openai/gpt-oss-20b'
  const canSubmit = Boolean(input.trim() && workspace && (selectedAgentId === 'auto' || selectedAgent))

  const modelOptions = useMemo(() => {
    if (providerOverride === 'openrouter' && openrouterModels.length > 0) {
      const filtered = openrouterFreeOnly ? openrouterModels.filter((m) => m.is_free) : openrouterModels
      return filtered.map((m) => m.id)
    }
    return overrideProvider?.models ?? []
  }, [overrideProvider, providerOverride, openrouterModels, openrouterFreeOnly])

  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault()
    if (!canSubmit || !workspace || loading) return
    const currentInput = input.trim()
    setLoading(true)
    setError('')
    setNotice('')
    setInput('')
    setMessages((current) => [...current, { role: 'user', content: currentInput }])

    try {
      let activeConversationId = conversationId
      if (!activeConversationId) {
        const conversation = await api.post<{ id: string }>(`/workspaces/${workspace.id}/conversations`, {
          title: 'Playground Chat',
          agent_id: selectedAgent?.id ?? null,
        })
        activeConversationId = conversation.data.id
        setConversationId(activeConversationId)
      }

      const payload = {
        input_text: currentInput,
        conversation_id: activeConversationId,
        ...(providerOverride ? { provider: providerOverride, model: modelOverride } : {}),
      }
      const response = selectedAgent
        ? await api.post<Execution>(`/workspaces/${workspace.id}/agents/${selectedAgent.id}/test`, payload)
        : await api.post<Execution>(`/workspaces/${workspace.id}/executions`, payload)

      let currentExecution = response.data
      setExecution(currentExecution)

      for (let attempt = 0; attempt < 30 && !TERMINAL_STATUSES.has(currentExecution.status); attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000))
        const check = await api.get<Execution>(`/workspaces/${workspace.id}/executions/${currentExecution.id}`)
        currentExecution = check.data
        setExecution(currentExecution)
      }
      setExecution(currentExecution)

      if (!TERMINAL_STATUSES.has(currentExecution.status)) {
        throw new Error('The execution is still running after 30 seconds. Check Execution History for its final state.')
      }

      if (currentExecution.status === 'FAILED') {
        setMessages((current) => [
          ...current,
          {
            role: 'agent',
            content: currentExecution.error_message || 'Execution failed.',
            failed: true,
          },
        ])
      } else {
        setMessages((current) => [
          ...current,
          {
            role: 'agent',
            content: currentExecution.output_text || 'No response was returned.',
          },
        ])
      }
    } catch (requestError: unknown) {
      const message = getApiErrorMessage(requestError, 'Execution failed.')
      setError(message)
      setMessages((current) => [...current, { role: 'agent', content: message, failed: true }])
    } finally {
      setLoading(false)
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col h-[calc(100vh-7.5rem)] gap-3">
      {/* Top Header & Compact Controls */}
      <div className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
            <p className="text-xs text-muted-foreground">
              Interactive persona workspace with live LLM execution and telemetry
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isConfigOpen
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted/60 hover:bg-muted text-muted-foreground border-border/60'
              }`}
              title="Toggle configuration panel"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Routing & Overrides</span>
              {isConfigOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              onClick={() => setIsTraceOpen(!isTraceOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isTraceOpen
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/80 hover:bg-muted text-foreground border-border/70'
              }`}
              title="Toggle Execution Trace drawer"
            >
              {isTraceOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              <span>Execution Trace</span>
              {execution && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    execution.status === 'COMPLETED'
                      ? 'bg-green-400'
                      : execution.status === 'FAILED'
                        ? 'bg-red-400'
                        : 'bg-blue-400 animate-pulse'
                  }`}
                />
              )}
            </button>
          </div>
        </div>

        {/* Compact Metadata Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-muted/40 border border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 font-medium">
              <Bot className="w-4 h-4 text-primary shrink-0" />
              <span className="text-foreground">{selectedAgent?.name || 'Auto Semantic Routing'}</span>
            </div>

            <div className="h-3 w-px bg-border/70 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Target:</span>
              <span className="font-mono text-foreground font-semibold bg-background/80 px-1.5 py-0.5 rounded border border-border/50">
                {execution?.actual_provider && execution?.actual_model
                  ? `${execution.actual_provider} / ${execution.actual_model}`
                  : `${effectiveProvider} / ${effectiveModel}`}
              </span>
              {providerOverride && (
                <span className="text-[10px] text-amber-500 font-medium px-1 rounded bg-amber-500/10">override</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {execution ? (
              <>
                <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  <span>search: {execution.search_status ?? 'pending'}</span>
                </div>

                {execution.latency_ms != null && (
                  <div className="flex items-center gap-1 font-mono text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{execution.latency_ms}ms</span>
                  </div>
                )}

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    execution.status === 'COMPLETED'
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : execution.status === 'FAILED'
                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                        : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}
                >
                  {execution.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : execution.status === 'FAILED' ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  {execution.status}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground italic text-[11px]">Ready for prompt</span>
            )}
          </div>
        </div>

        {/* Collapsible Config Options Toolbar */}
        {isConfigOpen && (
          <div className="glass rounded-xl border border-border/60 p-3.5 grid gap-3 sm:grid-cols-3 text-xs animate-in fade-in duration-200">
            <label className="grid gap-1 font-medium text-muted-foreground">
              <span>Persona Selection</span>
              <select
                className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                value={selectedAgentId}
                onChange={(event) => {
                  setSelectedAgentId(event.target.value)
                  setProviderOverride('')
                  setModelOverride('')
                  setConversationId(null)
                }}
              >
                <option value="auto">Automatic semantic routing</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 font-medium text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Provider Override</span>
                {providerOverride && providers.find((p) => p.id === providerOverride) && !providers.find((p) => p.id === providerOverride)?.configured && (
                  <span className="text-[10px] text-amber-500 font-normal">Requires API key</span>
                )}
              </div>
              <select
                className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                value={providerOverride}
                onChange={(event) => {
                  const provider = providers.find((item) => item.id === event.target.value)
                  setProviderOverride(event.target.value)
                  setModelOverride(provider?.models[0] ?? '')
                }}
              >
                <option value="">Use persona configuration</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.display_name || PROVIDER_NAMES[provider.id] || provider.id}
                  </option>
                ))}
              </select>
            </label>


            <div className="grid gap-1 font-medium text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Model Override</span>
                {providerOverride === 'openrouter' && openrouterModels.length > 0 && (
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer font-normal">
                    <input
                      type="checkbox"
                      checked={openrouterFreeOnly}
                      onChange={(e) => setOpenrouterFreeOnly(e.target.checked)}
                      className="rounded scale-75"
                    />
                    <span>Free only</span>
                  </label>
                )}
              </div>
              <select
                disabled={!providerOverride}
                className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 focus:ring-1 focus:ring-primary outline-none"
                value={providerOverride ? modelOverride : effectiveModel ?? ''}
                onChange={(event) => setModelOverride(event.target.value)}
              >
                {providerOverride ? (
                  providerOverride === 'openrouter' && openrouterModels.length > 0 ? (
                    (openrouterFreeOnly ? openrouterModels.filter((m) => m.is_free) : openrouterModels).map((model) => (
                      <option key={model.id} value={model.id}>
                        [{model.is_free ? 'FREE' : 'PAID'}] {model.name} — {model.pricing_label}
                      </option>
                    ))
                  ) : (
                    modelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))
                  )
                ) : (
                  <option>{effectiveModel ?? 'Default'}</option>
                )}
              </select>
            </div>
          </div>
        )}

        {notice && (
          <p role="status" className="rounded-xl border border-green-500/30 bg-green-500/10 p-2.5 text-xs text-green-500">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
            {error}
          </p>
        )}
      </div>

      {/* Main Workspace: Chat + Collapsible Drawer */}
      <div className="flex-1 flex overflow-hidden rounded-2xl border border-border/60 glass relative min-h-0">
        {/* Chat-First Conversation Workspace */}
        <section className="flex-1 flex flex-col h-full min-w-0 bg-background/40 relative">
          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h2 className="font-semibold text-foreground text-base">
                      {selectedAgent ? selectedAgent.name : 'Grid07 Agent Playground'}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedAgent?.description ||
                        'Ask questions or send prompts to test personas and examine real-time provider execution.'}
                    </p>
                  </div>
                  {selectedAgent?.personality && (
                    <div className="max-w-md p-3 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground text-left">
                      <span className="font-semibold text-foreground block mb-0.5">Configured Persona:</span>
                      <p className="line-clamp-3">{selectedAgent.personality}</p>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex gap-3 sm:gap-4 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'agent' && (
                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[90%] sm:max-w-[85%] text-sm leading-relaxed ${
                        message.failed
                          ? 'bg-red-500/10 border border-red-500/30 text-red-500'
                          : message.role === 'user'
                            ? 'bg-[#1A1A1E] text-[#FAF8F5] dark:bg-[#C7A66A] dark:text-[#171715] font-medium ml-12 rounded-tr-sm shadow-sm'
                            : 'bg-muted/40 dark:bg-[#22211E] border border-border/60 dark:border-[#38352D] text-foreground dark:text-[#F2EFE8] rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {message.failed ? (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                      ) : message.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <MarkdownContent content={message.content} />
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-muted dark:bg-[#25241F] border border-border dark:border-[#38352D] flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-4 h-4 text-muted-foreground dark:text-[#B6B0A4]" />
                      </div>
                    )}
                  </div>
                ))
              )}

              {loading && (
                <div className="p-4 rounded-2xl bg-white dark:bg-[#22211E] border border-[#DDD7C9] dark:border-[#38352D] shadow-md max-w-2xl space-y-3.5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#B89355]/40 shrink-0 expert-portrait-active">
                      <Image
                        src={getAgentPortrait(
                          selectedAgent?.name ||
                          (execution?.routing_decisions as Record<string, unknown> | undefined)?.decision
                            ? ((execution?.routing_decisions as Record<string, unknown>).decision as Record<string, unknown>).selected_persona as string
                            : undefined
                        )}
                        alt="Expert Portrait"
                        fill
                        className="object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      <div className="absolute inset-0 border border-[#B89355]/50 rounded-xl" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1A1A1E] dark:text-[#FAF8F5]">
                          {selectedAgent?.name ||
                           ((execution?.routing_decisions as Record<string, unknown> | undefined)?.decision as Record<string, unknown> | undefined)?.selected_persona as string ||
                           'Selecting Expert...'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B89355]/15 text-[#8C6D32] dark:text-[#D8BC88] font-semibold">
                          {execution?.status === 'ROUTING'
                            ? 'Evaluating intent'
                            : execution?.status === 'RETRIEVING'
                              ? 'Context retrieval'
                              : 'Generating'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 bg-[#B89355] rounded-full animate-waveform-1 h-2" />
                          <span className="w-0.5 bg-[#B89355] rounded-full animate-waveform-2 h-3" />
                          <span className="w-0.5 bg-[#B89355] rounded-full animate-waveform-3 h-1.5" />
                          <span className="w-0.5 bg-[#B89355] rounded-full animate-waveform-4 h-2.5" />
                        </div>
                        <span className="text-[11px] text-[#736E65] dark:text-[#A6A298]">
                          {execution?.status === 'ROUTING'
                            ? 'Evaluating intent and matching persona expertise...'
                            : execution?.status === 'RETRIEVING'
                              ? 'Retrieving relevant domain context...'
                              : `Generating response using ${execution?.actual_provider || effectiveProvider} / ${execution?.actual_model || effectiveModel}...`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Real Backend Lifecycle Stages */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[#EAE5DA] dark:border-[#262633] text-[10px]">
                    <div className={`p-1.5 rounded-lg flex flex-col items-center text-center transition-colors ${
                      execution?.status === 'ROUTING'
                        ? 'bg-[#B89355]/15 text-[#8C6D32] dark:text-[#D8BC88] font-semibold border border-[#B89355]/30'
                        : 'bg-[#F5F2EB] dark:bg-[#1E1E28] text-[#8C877D]'
                    }`}>
                      <span className="font-bold">1. Intent</span>
                      <span className="text-[9px] mt-0.5">{execution?.status === 'ROUTING' ? 'Active' : 'Passed'}</span>
                    </div>

                    <div className={`p-1.5 rounded-lg flex flex-col items-center text-center transition-colors ${
                      execution?.status === 'ROUTING'
                        ? 'bg-[#F5F2EB] dark:bg-[#1E1E28] text-[#8C877D]'
                        : execution?.agent_id
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400 font-semibold border border-green-500/20'
                          : 'bg-[#B89355]/15 text-[#8C6D32] dark:text-[#D8BC88] font-semibold border border-[#B89355]/30'
                    }`}>
                      <span className="font-bold">2. Routing</span>
                      <span className="text-[9px] mt-0.5 truncate max-w-full">
                        {execution?.agent_id ? 'Matched' : 'In progress'}
                      </span>
                    </div>

                    <div className={`p-1.5 rounded-lg flex flex-col items-center text-center transition-colors ${
                      execution?.status === 'RETRIEVING'
                        ? 'bg-[#B89355]/15 text-[#8C6D32] dark:text-[#D8BC88] font-semibold border border-[#B89355]/30'
                        : execution?.search_status === 'completed'
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400 font-semibold'
                          : execution?.search_status === 'disabled' || execution?.search_status === 'skipped'
                            ? 'bg-[#F5F2EB] dark:bg-[#1E1E28] text-[#9E988D]'
                            : 'bg-[#F5F2EB] dark:bg-[#1E1E28] text-[#8C877D]'
                    }`}>
                      <span className="font-bold">3. Context</span>
                      <span className="text-[9px] mt-0.5">
                        {execution?.search_status === 'disabled' || execution?.search_status === 'skipped'
                          ? 'Skipped'
                          : execution?.status === 'RETRIEVING'
                            ? 'Searching'
                            : 'Verified'}
                      </span>
                    </div>

                    <div className={`p-1.5 rounded-lg flex flex-col items-center text-center transition-colors ${
                      execution?.status === 'GENERATING'
                        ? 'bg-[#B89355]/15 text-[#8C6D32] dark:text-[#D8BC88] font-semibold border border-[#B89355]/30'
                        : 'bg-[#F5F2EB] dark:bg-[#1E1E28] text-[#8C877D]'
                    }`}>
                      <span className="font-bold">4. Generation</span>
                      <span className="text-[9px] mt-0.5">
                        {execution?.status === 'GENERATING' ? 'Synthesizing' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Fixed Bottom Message Composer */}
          <div className="p-3 sm:p-4 border-t border-border/50 bg-background/80 backdrop-blur-md">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full relative flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                aria-label="Test prompt"
                placeholder={
                  selectedAgent
                    ? `Message ${selectedAgent.name}... (Enter to send, Shift+Enter for new line)`
                    : 'Ask anything to route to a persona... (Enter to send)'
                }
                className="flex-1 bg-muted/40 border border-border/70 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none min-h-[46px] max-h-32 transition-all leading-normal"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                aria-label="Run execution"
                type="submit"
                disabled={loading || !canSubmit}
                className="w-11 h-11 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all shrink-0 shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </section>

        {/* Collapsible Right-Side Execution Trace Drawer (Desktop Docked & Mobile Overlay) */}
        {isTraceOpen && (
          <>
            {/* Mobile Backdrop */}
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsTraceOpen(false)}
            />

            <aside className="w-full sm:w-96 lg:w-[400px] shrink-0 border-l border-border/60 bg-background/95 backdrop-blur-md flex flex-col h-full z-50 lg:z-auto fixed lg:relative right-0 top-0 bottom-0 shadow-xl lg:shadow-none animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-3.5 border-b border-border/60 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm">Execution Trace</h2>
                  {execution?.latency_ms != null && (
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                      {execution.latency_ms}ms
                    </span>
                  )}
                </div>
                <button
                  aria-label="Close trace drawer"
                  onClick={() => setIsTraceOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 p-4 overflow-y-auto space-y-5 text-xs">
                {!execution ? (
                  <div className="py-16 text-center text-muted-foreground space-y-2">
                    <MessageSquare className="w-8 h-8 opacity-40 mx-auto" />
                    <p>No execution recorded yet.</p>
                    <p className="text-[11px]">Send a message to view routing, model latency, and node events.</p>
                  </div>
                ) : (
                  <>
                    {/* Execution Status Overview */}
                    <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground">Status</span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            execution.status === 'COMPLETED'
                              ? 'bg-green-500/10 text-green-500'
                              : execution.status === 'FAILED'
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {execution.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Provider / Model</span>
                        <span className="font-mono text-foreground font-semibold">
                          {execution.actual_provider && execution.actual_model
                            ? `${execution.actual_provider} / ${execution.actual_model}`
                            : `${effectiveProvider} / ${effectiveModel}`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Search Context</span>
                        <span className="font-mono font-medium">{execution.search_status ?? 'pending'}</span>
                      </div>

                      {execution.fallback_used && (
                        <div className="text-amber-500 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 text-[11px]">
                          Fallback was triggered and recorded.
                        </div>
                      )}

                      {execution.error_message && (
                        <div className="text-red-500 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-[11px] space-y-1">
                          <span className="font-semibold block">{execution.error_category}</span>
                          <p className="leading-relaxed">{execution.error_message}</p>
                        </div>
                      )}
                    </div>

                    {/* Routing Decisions */}
                    {execution.routing_decisions?.matches && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                          <Network className="w-3.5 h-3.5 text-primary" />
                          <span>Routing Matches</span>
                        </div>
                        <div className="space-y-1.5">
                          {execution.routing_decisions.matches.map((match) => (
                            <div
                              key={match.agent_id}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                match.selected
                                  ? 'bg-primary/5 border-primary/30 text-foreground'
                                  : 'bg-muted/20 border-border/40 text-muted-foreground'
                              }`}
                            >
                              <span className="font-medium truncate">{match.agent_name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={match.selected ? 'text-primary font-bold font-mono' : 'font-mono'}>
                                  {match.score.toFixed(3)}
                                </span>
                                {match.selected && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Node Events Lifecycle */}
                    {execution.node_events && execution.node_events.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span>Pipeline Lifecycle Events</span>
                        </div>
                        <div className="space-y-1.5">
                          {execution.node_events.map((event, index) => (
                            <div
                              key={`${event.node}-${index}`}
                              className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5">
                                <span className="font-semibold text-foreground block">{event.node}</span>
                                {event.provider && (
                                  <span className="text-[10px] text-muted-foreground font-mono block">
                                    {event.provider}/{event.model}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                  event.status === 'completed'
                                    ? 'bg-green-500/10 text-green-500'
                                    : event.status === 'failed'
                                      ? 'bg-red-500/10 text-red-500'
                                      : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {event.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Retrieved Sources */}
                    {execution.search_sources && execution.search_sources.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                          <Database className="w-3.5 h-3.5 text-green-500" />
                          <span>Retrieved Sources</span>
                        </div>
                        <div className="space-y-1.5">
                          {execution.search_sources.map((source, index) => (
                            <a
                              key={index}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:border-primary/50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-1 text-primary font-medium truncate">
                                <span>{source.title || source.url}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                                {source.content}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  )
}
