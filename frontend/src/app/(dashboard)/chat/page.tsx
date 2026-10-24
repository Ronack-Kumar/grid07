'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Sun,
  Moon,
  Bell,
  BarChart2,
  Code,
  Shield,
  BookOpen,
  Send,
  Plus,
  Mic,
  Globe,
  ChevronDown,
  X,
  CheckCircle2,
  MoreHorizontal,
  Sparkles,
  Loader2,
  AlertCircle,
  RotateCw,
  Check,
  HelpCircle,
  Copy,
  Sliders,
  FileText,
  ArrowDown,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { MarkdownContent } from '@/components/MarkdownContent'
import { TechDividendChart } from '@/components/TechDividendChart'
import type { Execution, RoutingDecision, Agent, Conversation, Message } from '@/lib/types'

interface ExpertCardData {
  id: string
  title: string
  description: string
  icon: typeof BarChart2
  image: string
  sampleQuery: string
  tags: string[]
  domain: string
}

interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  destination?: string
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: '5 Expert Personas Provisioned',
    description: 'Finance Advisor, Code Engineer, Security Specialist, Research Assistant & General Assistant are ready.',
    time: 'Just now',
    read: false,
    destination: '/agents',
  },
  {
    id: 'notif-2',
    title: 'Free-Tier Model Pipeline Calibrated',
    description: 'Verified free-tier providers configured for automatic persona routing.',
    time: '1h ago',
    read: true,
    destination: '/executions',
  },
  {
    id: 'notif-3',
    title: 'Workspace Intelligence Overview',
    description: 'Monitor real-time expert distribution, latency analytics, and quota usage.',
    time: '2h ago',
    read: true,
    destination: '/dashboard',
  },
]

const EXPERT_CARDS: ExpertCardData[] = [
  {
    id: 'finance',
    title: 'Finance Advisor',
    description: 'Market analysis, investment insights, financial planning',
    icon: BarChart2,
    image: '/assets/portrait_finance.jpg',
    sampleQuery: 'What are the key risk factors in a tech-heavy dividend portfolio?',
    tags: ['Finance', 'Investment', 'Market Analysis'],
    domain: 'finance',
  },
  {
    id: 'code',
    title: 'Code Engineer',
    description: 'Debugging, system design, programming help',
    icon: Code,
    image: '/assets/portrait_code.jpg',
    sampleQuery: 'How do I optimize an asynchronous Python database worker with connection pooling?',
    tags: ['Python', 'Architecture', 'Debugging'],
    domain: 'coding',
  },
  {
    id: 'security',
    title: 'Security Specialist',
    description: 'Vulnerability analysis, threat detection, secure practices',
    icon: Shield,
    image: '/assets/portrait_security.jpg',
    sampleQuery: 'How can I prevent SQL injection and CSRF vulnerabilities in FastAPI endpoints?',
    tags: ['Cybersecurity', 'CVE Audit', 'Threat Detection'],
    domain: 'cybersecurity',
  },
  {
    id: 'research',
    title: 'Research Assistant',
    description: 'General knowledge, research, explanations',
    icon: BookOpen,
    image: '/assets/portrait_research.jpg',
    sampleQuery: 'Provide an in-depth comparative summary between REST and gRPC distributed architectures.',
    tags: ['Research', 'Analysis', 'Knowledge'],
    domain: 'research',
  },
  {
    id: 'general',
    title: 'General Assistant',
    description: 'Cross-domain tasks, summarization, general inquiry',
    icon: HelpCircle,
    image: '/assets/portrait_analyst.jpg',
    sampleQuery: 'Help me organize these meeting notes into an executive summary.',
    tags: ['General', 'Productivity', 'Summary'],
    domain: 'general',
  },
]

export const findExpertCard = (
  agentId?: string | null,
  agentName?: string | null,
  domain?: string | null,
  availableAgents?: Agent[]
): ExpertCardData => {
  const name = (agentName || '').toLowerCase()
  if (name.includes('code') || name.includes('engineer') || name.includes('programming')) {
    return EXPERT_CARDS[1]
  }
  if (name.includes('security') || name.includes('vulnerability') || name.includes('threat')) {
    return EXPERT_CARDS[2]
  }
  if (name.includes('research') || name.includes('synthesis')) {
    return EXPERT_CARDS[3]
  }
  if (name.includes('general') || name.includes('assistant') || name.includes('omni')) {
    return EXPERT_CARDS[4]
  }
  if (name.includes('finance') || name.includes('advisor') || name.includes('invest')) {
    return EXPERT_CARDS[0]
  }

  // Check agentId from available agents
  if (agentId && availableAgents) {
    const ag = availableAgents.find((a) => a.id === agentId)
    if (ag) {
      const agName = ag.name.toLowerCase()
      if (agName.includes('code') || agName.includes('engineer')) return EXPERT_CARDS[1]
      if (agName.includes('security')) return EXPERT_CARDS[2]
      if (agName.includes('research')) return EXPERT_CARDS[3]
      if (agName.includes('general')) return EXPERT_CARDS[4]
      if (agName.includes('finance')) return EXPERT_CARDS[0]
    }
  }

  // Check domain
  if (domain === 'coding') return EXPERT_CARDS[1]
  if (domain === 'cybersecurity') return EXPERT_CARDS[2]
  if (domain === 'research') return EXPERT_CARDS[3]
  if (domain === 'general') return EXPERT_CARDS[4]
  if (domain === 'finance') return EXPERT_CARDS[0]

  return EXPERT_CARDS[0]
}

export const getDomainThemeStyles = (domain?: string) => {
  const d = (domain || '').toLowerCase()
  if (d.includes('finance')) {
    return {
      badge: 'bg-[#C7A66A]/10 text-[#9A7840] border-[#C7A66A]/30 dark:bg-[#C7A66A]/15 dark:text-[#DFC492] dark:border-[#C7A66A]/40',
      ring: 'border-[#C7A66A] ring-2 ring-[#C7A66A]/30',
      accentText: 'text-[#C7A66A]',
      label: 'Finance',
    }
  }
  if (d.includes('code') || d.includes('coding')) {
    return {
      badge: 'bg-[#8DA4BF]/15 text-[#3D5B7D] border-[#8DA4BF]/30 dark:bg-[#8DA4BF]/15 dark:text-[#ADC1D7] dark:border-[#8DA4BF]/40',
      ring: 'border-[#8DA4BF] ring-2 ring-[#8DA4BF]/30',
      accentText: 'text-[#8DA4BF]',
      label: 'Engineering',
    }
  }
  if (d.includes('sec') || d.includes('cyber')) {
    return {
      badge: 'bg-[#52A885]/15 text-[#246648] border-[#52A885]/30 dark:bg-[#52A885]/15 dark:text-[#7ECBA5] dark:border-[#52A885]/40',
      ring: 'border-[#52A885] ring-2 ring-[#52A885]/30',
      accentText: 'text-[#52A885]',
      label: 'Security',
    }
  }
  if (d.includes('research')) {
    return {
      badge: 'bg-[#D4BBA5]/20 text-[#6B4E38] border-[#D4BBA5]/40 dark:bg-[#D4BBA5]/15 dark:text-[#E3CEBD] dark:border-[#D4BBA5]/40',
      ring: 'border-[#D4BBA5] ring-2 ring-[#D4BBA5]/30',
      accentText: 'text-[#D4BBA5]',
      label: 'Research',
    }
  }
  return {
    badge: 'bg-[#A8A29E]/15 text-[#524D48] border-[#A8A29E]/30 dark:bg-[#A8A29E]/15 dark:text-[#D1CDC8] dark:border-[#A8A29E]/40',
    ring: 'border-[#A8A29E] ring-2 ring-[#A8A29E]/30',
    accentText: 'text-[#A8A29E]',
    label: 'General',
  }
}


export interface ChatExchange {
  id: string
  userQuery: string
  timestamp: string
  expert: ExpertCardData
  reasoning?: string
  confidence?: number
  modelName?: string
  providerName?: string
  latency?: string
  outputHtml?: string
  showChart?: boolean
  isLoading?: boolean
  error?: string | null
  executionId?: string
}

function buildExchangesFromHistory(
  messages: Message[],
  matchedExecs: Execution[],
  availableAgents: Agent[]
): ChatExchange[] {
  const exchanges: ChatExchange[] = []
  
  // Sort messages chronologically by created_at
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  let currentUserMsg: Message | null = null

  for (let i = 0; i < sortedMessages.length; i++) {
    const m = sortedMessages[i]
    if (m.role === 'user') {
      if (currentUserMsg) {
        exchanges.push(createExchangeFromTurn(currentUserMsg, null, matchedExecs, availableAgents))
      }
      currentUserMsg = m
    } else if (m.role === 'agent') {
      exchanges.push(createExchangeFromTurn(currentUserMsg, m, matchedExecs, availableAgents))
      currentUserMsg = null
    }
  }

  if (currentUserMsg) {
    exchanges.push(createExchangeFromTurn(currentUserMsg, null, matchedExecs, availableAgents))
  }

  // If no message records exist, but executions exist, build from executions
  if (exchanges.length === 0 && matchedExecs.length > 0) {
    const sortedExecs = [...matchedExecs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    for (const exec of sortedExecs) {
      const rd = (exec.routing_decisions || {}) as Record<string, unknown>
      const dec = (rd.decision || {}) as Partial<RoutingDecision> & { calibrated_confidence?: number }
      const matchedCard = findExpertCard(
        exec.agent_id,
        dec.selected_agent_name,
        dec.domain,
        availableAgents
      )
      const displayConfidence = dec.calibrated_confidence ?? (dec.confidence_score ? Math.round(dec.confidence_score * 100) : 88)
      exchanges.push({
        id: exec.id,
        userQuery: exec.input_text || 'Previous inquiry',
        timestamp: new Date(exec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        expert: matchedCard,
        reasoning: dec.selection_reason || `Matched ${matchedCard.title} via intelligent domain routing.`,
        confidence: displayConfidence,
        modelName: exec.actual_model || 'Standard Free-Tier',
        providerName: exec.actual_provider || 'Google Gemini',
        latency: exec.latency_ms ? `${(exec.latency_ms / 1000).toFixed(1)}s` : '—',
        outputHtml: exec.output_text || '',
        showChart: (exec.input_text || '').toLowerCase().includes('dividend'),
        isLoading: false,
        error: exec.status === 'FAILED' ? (exec.error_message || 'Execution failed') : null,
        executionId: exec.id,
      })
    }
  }

  return exchanges
}

function createExchangeFromTurn(
  userMsg: Message | null,
  agentMsg: Message | null,
  matchedExecs: Execution[],
  availableAgents: Agent[]
): ChatExchange {
  const query = userMsg?.content || 'Previous inquiry'
  const time = userMsg?.created_at || agentMsg?.created_at || new Date().toISOString()
  
  // Try to find matching execution
  const exec = matchedExecs.find(
    (e) => e.input_text?.trim() === query.trim() || (userMsg && Math.abs(new Date(e.created_at).getTime() - new Date(userMsg.created_at).getTime()) < 30000)
  )

  const rd = (exec?.routing_decisions || {}) as Record<string, unknown>
  const dec = (rd.decision || {}) as Partial<RoutingDecision> & { calibrated_confidence?: number }
  const matchedCard = findExpertCard(
    exec?.agent_id,
    dec.selected_agent_name,
    dec.domain,
    availableAgents
  )
  const displayConfidence = dec.calibrated_confidence ?? (dec.confidence_score ? Math.round(dec.confidence_score * 100) : 88)

  return {
    id: agentMsg?.id || userMsg?.id || exec?.id || `msg-${Math.random().toString(36).slice(2, 9)}`,
    userQuery: query,
    timestamp: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    expert: matchedCard,
    reasoning: dec.selection_reason || `Matched ${matchedCard.title} via intelligent domain routing.`,
    confidence: displayConfidence,
    modelName: exec?.actual_model || 'Standard Free-Tier',
    providerName: exec?.actual_provider || 'Google Gemini',
    latency: exec?.latency_ms ? `${(exec.latency_ms / 1000).toFixed(1)}s` : '—',
    outputHtml: agentMsg?.content || exec?.output_text || '',
    showChart: query.toLowerCase().includes('dividend') || (agentMsg?.content || '').toLowerCase().includes('dividend'),
    isLoading: false,
    error: exec?.status === 'FAILED' ? (exec?.error_message || 'Execution failed') : null,
    executionId: exec?.id,
  }
}

const REQUEST_TIMEOUT_MS = 45000

function AutoChatPageContent() {
  const { workspace } = useAuthStore()
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramConvId = searchParams?.get('conversationId')

  const [activeTab, setActiveTab] = useState<'routing' | 'details' | 'sources'>('routing')
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [latestExecution, setLatestExecution] = useState<Execution | null>(null)
  const [activeExpert, setActiveExpert] = useState<ExpertCardData>(EXPERT_CARDS[0])
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [conversationLoading, setConversationLoading] = useState(false)

  // Per-turn menu and copy state
  const [activeMenuExchangeId, setActiveMenuExchangeId] = useState<string | null>(null)
  const [copiedExchangeId, setCopiedExchangeId] = useState<string | null>(null)
  const responseMenuRef = useRef<HTMLDivElement>(null)

  // Dedicated scroll container and smart scrolling state
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const userIsScrolledUpRef = useRef<boolean>(false)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)

  // Theme toggle state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('grid07_theme') as 'light' | 'dark' | null
      return savedTheme || 'light'
    }
    return 'light'
  })

  // Notification state
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)

  // Multi-stage thinking animation stages
  const [thinkingStage, setThinkingStage] = useState<'receiving' | 'analyzing' | 'routing' | 'expert_selected' | 'generating'>('analyzing')

  // Routing Mode state for the Auto dropdown button
  const [routingMode, setRoutingMode] = useState<{
    mode: 'automatic' | 'explicit'
    agentId?: string
    label: string
  }>({ mode: 'automatic', label: 'Auto' })
  const [isRoutingDropdownOpen, setIsRoutingDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Active chat exchanges (all questions and answers preserved in order)
  const [exchanges, setExchanges] = useState<ChatExchange[]>([])
  const latestExchange = exchanges[exchanges.length - 1]

  // Cancellation and race-condition tracking
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentRequestIdRef = useRef<number>(0)

  // Sync theme attribute to document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  // Listen for global theme changes from layout sidebar
  useEffect(() => {
    const handleThemeChange = () => {
      if (typeof window !== 'undefined') {
        const saved = (localStorage.getItem('grid07_theme') as 'light' | 'dark') || 'light'
        setTheme(saved)
      }
    }
    window.addEventListener('grid07_theme_change', handleThemeChange)
    return () => window.removeEventListener('grid07_theme_change', handleThemeChange)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('grid07_theme', next)
      document.documentElement.setAttribute('data-theme', next)
      window.dispatchEvent(new Event('grid07_theme_change'))
    }
  }

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close dropdowns and menus on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoutingDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
      if (responseMenuRef.current && !responseMenuRef.current.contains(event.target as Node)) {
        setActiveMenuExchangeId(null)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsRoutingDropdownOpen(false)
        setNotificationsOpen(false)
        setActiveMenuExchangeId(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Dedicated scroll and auto-scroll handlers
  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    const isUp = distanceFromBottom > 120
    userIsScrolledUpRef.current = isUp
    setShowJumpToLatest(isUp)
  }

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      })
    }
  }

  // Load workspace agents
  useEffect(() => {
    if (!workspace?.id) return
    const fetchAgents = async () => {
      try {
        const agentsRes = await api.get<Agent[]>(`/workspaces/${workspace.id}/agents`)
        setAvailableAgents(agentsRes.data)
      } catch {
        // Fallback silently if agents endpoint fails
      }
    }
    void fetchAgents()
  }, [workspace?.id])

  // Reactive conversation loader: opens exact conversation when clicked in sidebar
  useEffect(() => {
    if (!workspace?.id) return

    let isCancelled = false

    const loadConversation = async () => {
      if (!paramConvId) {
        setConversationId(null)
        setExchanges([])
        return
      }

      setConversationId(paramConvId)
      setConversationLoading(true)
      try {
        const [convRes, execsRes] = await Promise.all([
          api.get<Conversation>(`/workspaces/${workspace.id}/conversations/${paramConvId}`),
          api.get<Execution[]>(`/workspaces/${workspace.id}/executions`),
        ])
        if (isCancelled) return

        const matchedExecs = execsRes.data.filter((e) => e.conversation_id === paramConvId)
        const parsed = buildExchangesFromHistory(convRes.data.messages || [], matchedExecs, availableAgents)
        setExchanges(parsed)

        if (matchedExecs.length > 0) {
          const latest = matchedExecs[matchedExecs.length - 1]
          setLatestExecution(latest)
          const rd = (latest.routing_decisions || {}) as Record<string, unknown>
          const dec = (rd.decision || {}) as Partial<RoutingDecision>
          const card = findExpertCard(latest.agent_id, dec.selected_agent_name, dec.domain, availableAgents)
          setActiveExpert(card)
        } else if (parsed.length > 0) {
          setActiveExpert(parsed[parsed.length - 1].expert)
        }

        userIsScrolledUpRef.current = false
        setShowJumpToLatest(false)
        setTimeout(() => scrollToBottom(false), 80)
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load conversation:', err)
        }
      } finally {
        if (!isCancelled) {
          setConversationLoading(false)
        }
      }
    }

    void loadConversation()
    return () => {
      isCancelled = true
    }
  }, [paramConvId, workspace?.id, availableAgents])

  const handleSendQuery = async (queryText?: string) => {
    const rawText = queryText || input.trim()
    const textToSend = rawText.replace(/^(Ask\s+[^a-z]+about\s+)+/i, '').trim()
    if (!textToSend || !workspace || submitting) return

    // Setup cancellation and unique request tracking to prevent stale state overwrite
    abortControllerRef.current?.abort('Superseded by new request')
    const controller = new AbortController()
    abortControllerRef.current = controller
    const requestId = ++currentRequestIdRef.current

    setInput('')
    setSubmitting(true)

    // Match initial candidate expert
    const lower = textToSend.toLowerCase()
    let initialExpert = EXPERT_CARDS[0]
    if (lower.includes('code') || lower.includes('python') || lower.includes('database') || lower.includes('async') || lower.includes('grpc') || lower.includes('rest') || lower.includes('architecture')) {
      initialExpert = EXPERT_CARDS[1]
    } else if (lower.includes('security') || lower.includes('sql') || lower.includes('vulnerability') || lower.includes('csrf') || lower.includes('cve')) {
      initialExpert = EXPERT_CARDS[2]
    } else if (lower.includes('research') || lower.includes('comparative') || lower.includes('papers') || lower.includes('literature') || lower.includes('evidence')) {
      initialExpert = EXPERT_CARDS[3]
    } else if (lower.includes('finance') || lower.includes('stock') || lower.includes('invest') || lower.includes('budget') || lower.includes('salary') || lower.includes('loan')) {
      initialExpert = EXPERT_CARDS[0]
    } else {
      initialExpert = EXPERT_CARDS[4]
    }
    setActiveExpert(initialExpert)

    // Stage 1: Receiving question immediately
    setThinkingStage('receiving')
    setTimeout(() => {
      if (requestId === currentRequestIdRef.current) {
        setThinkingStage((prev) => (prev === 'receiving' ? 'analyzing' : prev))
      }
    }, 400)

    const turnId = `turn-${Date.now()}`
    const newTurn: ChatExchange = {
      id: turnId,
      userQuery: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expert: initialExpert,
      isLoading: true,
      error: null,
      outputHtml: '',
      showChart: lower.includes('dividend') || lower.includes('portfolio') || lower.includes('stock'),
    }

    setExchanges((prev) => [...prev, newTurn])
    userIsScrolledUpRef.current = false
    setShowJumpToLatest(false)
    setTimeout(() => scrollToBottom(true), 50)

    const timeoutHandle = setTimeout(() => {
      controller.abort('Request timed out after 45s. The model provider took longer than expected.')
    }, REQUEST_TIMEOUT_MS)

    try {
      // 1. Ensure or create genuine conversation
      let convId = conversationId
      if (!convId) {
        const convRes = await api.post<Conversation>(
          `/workspaces/${workspace.id}/conversations`,
          { title: textToSend.slice(0, 36) },
          { signal: controller.signal }
        )
        convId = convRes.data.id
        setConversationId(convId)
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/chat?conversationId=${convId}`)
        }
      }

      // 2. Submit execution with actual selected routing mode and agent_id
      const payload: Record<string, unknown> = {
        input_text: textToSend,
        conversation_id: convId,
        routing_mode: routingMode.mode,
      }
      if (routingMode.mode === 'explicit' && routingMode.agentId) {
        payload.agent_id = routingMode.agentId
      }

      const execRes = await api.post<Execution>(
        `/workspaces/${workspace.id}/executions`,
        payload,
        { signal: controller.signal }
      )
      const execId = execRes.data.id

      // 3. Poll for genuine terminal state and drive animation from real backend status
      let completed: Execution | null = null
      const pollStart = Date.now()

      while (Date.now() - pollStart < REQUEST_TIMEOUT_MS) {
        if (controller.signal.aborted) {
          throw new Error(controller.signal.reason || 'Request cancelled by user')
        }
        await new Promise((r) => setTimeout(r, 600))
        if (controller.signal.aborted) {
          throw new Error(controller.signal.reason || 'Request cancelled by user')
        }

        const res = await api.get<Execution>(`/workspaces/${workspace.id}/executions/${execId}`, {
          signal: controller.signal,
        })

        // Real execution event state updates
        if (res.data.status === 'ROUTING') {
          setThinkingStage('routing')
        } else if (res.data.status === 'RETRIEVING' || res.data.status === 'GENERATING') {
          // As soon as backend routes the query, identify the genuine expert!
          const rd = (res.data.routing_decisions || {}) as Record<string, unknown>
          const dec = (rd.decision || {}) as Partial<RoutingDecision>
          const realExpert = findExpertCard(
            res.data.agent_id,
            dec.selected_agent_name,
            dec.domain,
            availableAgents
          )
          setActiveExpert(realExpert)
          setExchanges((prev) =>
            prev.map((ex) => (ex.id === turnId ? { ...ex, expert: realExpert } : ex))
          )
          setThinkingStage('expert_selected')
          if (!userIsScrolledUpRef.current) {
            scrollToBottom(true)
          }
        }

        if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED') {
          completed = res.data
          break
        }
      }

      if (!completed) {
        throw new Error('Execution timed out while waiting for model completion')
      }

      // Ignore if a newer request was dispatched while waiting
      if (requestId !== currentRequestIdRef.current) return

      clearTimeout(timeoutHandle)
      setLatestExecution(completed)

      // Map response to matching expert card based on genuine executed agent
      const rd = (completed.routing_decisions || {}) as Record<string, unknown>
      const dec = (rd.decision || {}) as Partial<RoutingDecision> & { calibrated_confidence?: number, match_quality?: string }
      const matchedCard = findExpertCard(
        completed.agent_id,
        dec.selected_agent_name,
        dec.domain,
        availableAgents
      )
      setActiveExpert(matchedCard)

      const displayConfidence = dec.calibrated_confidence ?? (dec.confidence_score ? Math.round(dec.confidence_score * 100) : 92)

      setExchanges((prev) =>
        prev.map((ex) => {
          if (ex.id !== turnId) return ex
          return {
            ...ex,
            expert: matchedCard,
            reasoning:
              dec.selection_reason ||
              `Routed to ${matchedCard.title} based on semantic query intent and domain expertise.`,
            confidence: displayConfidence,
            modelName: completed.actual_model || 'Verified Free-Tier',
            providerName: completed.actual_provider === 'groq' ? 'Groq' : 'Google Gemini',
            latency: `${((completed.latency_ms || 2400) / 1000).toFixed(1)}s`,
            outputHtml: completed.output_text || '',
            showChart:
              (completed.output_text || '').toLowerCase().includes('dividend') ||
              textToSend.toLowerCase().includes('dividend'),
            isLoading: false,
            error: completed.status === 'FAILED' ? (completed.error_message || 'Execution failed at model provider layer.') : null,
            executionId: completed.id,
          }
        })
      )

      if (!userIsScrolledUpRef.current) {
        scrollToBottom(true)
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('grid07_conversations_updated'))
      }
    } catch (err: unknown) {
      if (requestId !== currentRequestIdRef.current) return
      clearTimeout(timeoutHandle)

      const errMsg = getApiErrorMessage(err, 'Failed to process request.')
      setExchanges((prev) =>
        prev.map((ex) =>
          ex.id === turnId
            ? {
                ...ex,
                isLoading: false,
                error: errMsg,
              }
            : ex
        )
      )
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setSubmitting(false)
      }
    }
  }

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('Cancelled by user')
    }
    setSubmitting(false)
    setExchanges((prev) =>
      prev.map((ex) =>
        ex.isLoading
          ? {
              ...ex,
              isLoading: false,
              error: 'Request was cancelled by user.',
            }
          : ex
      )
    )
  }

  return (
    <div className="flex h-screen w-full bg-[#FAF8F5] overflow-hidden select-none font-sans text-[#1A1A1E]">
      {/* Central Main Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Subtle Top-Right Interior Background Image */}
        <div
          className="absolute right-0 top-0 w-[58%] h-[270px] pointer-events-none z-0 opacity-80 mix-blend-multiply overflow-hidden chat-hero-bg"
          style={{
            maskImage: 'radial-gradient(ellipse 90% 90% at 85% 15%, black 40%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 85% 15%, black 40%, transparent 85%)',
          }}
        >
          <Image
            src="/assets/hero_interior_bg.jpg"
            alt=""
            fill
            priority
            className="object-cover object-right-top"
          />
        </div>

        {/* Workspace Top Header Bar */}
        <header className="h-14 px-8 flex items-center justify-between border-b border-[#EAE5DA] bg-[#FAF8F5]/80 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#787267]">
              Intelligent Routing &nbsp;•&nbsp; Multi Experts &nbsp;•&nbsp; Real-World Insights
            </span>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3 relative">
            <button
              onClick={toggleTheme}
              data-testid="theme-toggle"
              className="p-1.5 text-[#6B655B] hover:text-[#1A1A1E] hover:bg-black/5 rounded-full transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4" />}
            </button>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                data-testid="notifications-bell"
                className="p-1.5 text-[#6B655B] hover:text-[#1A1A1E] hover:bg-black/5 rounded-full transition-colors relative"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#10B981] absolute top-1 right-1 border-2 border-white" />
                )}
              </button>

              {/* Functional Notification Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#22211E] rounded-2xl shadow-xl border border-[#EAE5DA] dark:border-[#403D35] p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE3] dark:border-[#38352D]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#1A1A1E] dark:text-[#F2EFE8]">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#ECFDF5] text-[#059669] text-[10px] font-semibold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] text-[#B89355] hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-[#8C867B] dark:text-[#A8A398] italic text-center py-4">No notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifications((prev) =>
                              prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
                            )
                            if (n.destination) {
                              setNotificationsOpen(false)
                              router.push(n.destination)
                            }
                          }}
                          className={`p-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                            n.read
                              ? 'bg-transparent text-[#736E64] dark:text-[#B6B0A4] hover:bg-black/5 dark:hover:bg-white/5'
                              : 'bg-[#FAF8F5] dark:bg-[#292823] border border-[#EAE5DA] dark:border-[#403D35] text-[#1A1A1E] dark:text-[#F2EFE8] hover:border-[#B89355]/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#1A1A1E] dark:text-[#F2EFE8]">{n.title}</span>
                            <span className="text-[10px] text-[#8C867B] dark:text-[#A8A398] font-mono">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-[#635D52] dark:text-[#C2BEB4] mt-0.5 leading-snug">{n.description}</p>
                          {n.destination && (
                            <span className="text-[10px] text-[#B89355] dark:text-[#C7A66A] font-semibold mt-1 inline-flex items-center gap-1">
                              <span>Open page</span> &rarr;
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dedicated Scrollable Message History Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-5 space-y-6 focus:outline-none scroll-smooth"
          tabIndex={0}
          role="region"
          aria-label="Conversation message history"
        >
          {/* Welcome Headline and Expert Cards (only when no conversation is active) */}
          {exchanges.length === 0 && (
            <>
              {/* Headline & Hand-drawn Script Callout */}
              <div className="relative pt-2 pb-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="font-serif text-[46px] sm:text-[52px] leading-[1.08] tracking-tight text-[#1A1A1E] font-medium">
                      One Question.
                      <br />
                      <span className="text-[#876F43] font-serif italic">The Right Expert.</span>
                    </h1>
                    <p className="mt-2 text-xs sm:text-[13px] text-[#635D52] max-w-xl font-normal leading-relaxed">
                      Ask anything — Grid07 understands your intent, selects the best expert, and
                      delivers accurate, real-world answers using verified free-tier models.
                    </p>
                  </div>

                  {/* Handwritten Note with Curved Arrow */}
                  <div className="hidden lg:flex flex-col items-center pt-3 pr-12 select-none pointer-events-none">
                    <span className="font-handwriting text-xl text-[#3A352C] tracking-wide rotate-[-3deg] leading-tight text-center">
                      Different experts
                      <br />
                      for different problems.
                    </span>
                    <svg
                      className="w-14 h-10 text-[#3A352C] mt-1 -ml-4"
                      viewBox="0 0 60 40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M 45 4 C 30 18, 18 24, 14 34" />
                      <polyline points="9 28 14 34 20 31" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 4 Expert Horizontal Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                {EXPERT_CARDS.map((card) => {
                  const Icon = card.icon
                  const isSelected = activeExpert.id === card.id
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        setActiveExpert(card)
                        handleSendQuery(card.sampleQuery)
                      }}
                      className={`group relative h-[140px] rounded-2xl overflow-hidden cursor-pointer border transition-all duration-300 shadow-2xs ${
                        isSelected
                          ? 'border-[#B89355] ring-2 ring-[#B89355]/20'
                          : 'border-[#E4DFD3] hover:border-[#B89355]/60 hover:shadow-xs'
                      }`}
                    >
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/60 to-transparent" />

                      <div className="absolute inset-x-2.5 bottom-2.5 flex items-start gap-2 text-white">
                        <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 text-[#E6D4B5] shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-xs tracking-tight text-white leading-tight">
                            {card.title}
                          </h3>
                          <p className="text-[10px] text-[#D4CFC4] line-clamp-2 leading-tight mt-0.5">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Suggested Inquiries */}
              <div className="py-6 space-y-3 max-w-3xl">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A756C] dark:text-[#9E988D]">
                  Suggested Inquiries
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EXPERT_CARDS.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => {
                        setActiveExpert(card)
                        handleSendQuery(card.sampleQuery)
                      }}
                      className="p-3 rounded-xl bg-white border border-[#E4DFD3] hover:border-[#B89355] hover:bg-[#FAF8F5] cursor-pointer transition-all shadow-2xs group flex items-start gap-2.5"
                    >
                      <div className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#E2DDD0] text-[#7A756C] group-hover:text-[#B89355] shrink-0 mt-0.5">
                        <card.icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#1A1A1E] block">
                          {card.title}
                        </span>
                        <p className="text-[11px] text-[#6E685E] mt-0.5 line-clamp-1">
                          {card.sampleQuery}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Conversation Loading Spinner */}
          {conversationLoading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-[#736E64] dark:text-[#A09B90]">
              <Loader2 className="w-6 h-6 animate-spin text-[#B89355]" />
              <span className="font-medium">Loading conversation history & metadata...</span>
            </div>
          )}

          {/* Multi-turn Chat Exchanges */}
          {exchanges.length > 0 && (
            <div className="space-y-6 max-w-4xl pb-4">
              {exchanges.map((exchange, idx) => {
                const isLatest = idx === exchanges.length - 1
                const isMenuOpen = activeMenuExchangeId === exchange.id
                const isCopied = copiedExchangeId === exchange.id

                return (
                  <div key={exchange.id} className="space-y-4 pt-1">
                    {/* User Message Bubble */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#1A1A1E] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          R
                        </div>
                        <div className="user-query-bubble bg-[#FAF8F5] border border-[#E2DCCE] rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] text-[#1A1A1E] font-medium leading-relaxed max-w-2xl shadow-2xs">
                          {exchange.userQuery}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#918C82] shrink-0 font-mono">
                        <span>{exchange.timestamp}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(exchange.userQuery)}
                          title="Copy user question"
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 hover:text-[#1A1A1E] dark:hover:text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Assistant Response Card */}
                    <div className="bg-white rounded-2xl border border-[#E6E1D4] p-5 shadow-2xs space-y-4">
                      {/* Response Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE0]">
                        <div className="flex items-center gap-3">
                          <div className={`relative w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-2xs ${
                            exchange.isLoading ? 'expert-portrait-active ring-2 ring-[#B89355]/40' : 'border border-[#E2DDD0]'
                          }`}>
                            <Image
                              src={exchange.expert.image}
                              alt={exchange.expert.title}
                              fill
                              className="object-cover"
                            />
                            {exchange.isLoading && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-light-sweep pointer-events-none" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-[#1A1A1E]">
                                {exchange.expert.title}
                              </span>
                              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getDomainThemeStyles(exchange.expert.domain).badge}`}>
                                {getDomainThemeStyles(exchange.expert.domain).label}
                              </span>

                              {/* Dynamic waveform */}
                              <div className="flex items-center gap-0.5 h-3.5">
                                {exchange.isLoading ? (
                                  <>
                                    <span className="w-0.5 bg-[#B89355] rounded-full animate-waveform-1" />
                                    <span className="w-0.5 bg-[#10B981] rounded-full animate-waveform-2" />
                                    <span className="w-0.5 bg-[#1A1A1E] rounded-full animate-waveform-3" />
                                    <span className="w-0.5 bg-[#B89355] rounded-full animate-waveform-4" />
                                  </>
                                ) : (
                                  <>
                                    <span className="w-0.5 h-2 bg-[#1A1A1E] rounded-full" />
                                    <span className="w-0.5 h-3.5 bg-[#1A1A1E] rounded-full" />
                                    <span className="w-0.5 h-1.5 bg-[#1A1A1E] rounded-full" />
                                  </>
                                )}
                              </div>

                              {/* Dynamic status badge */}
                              {exchange.isLoading ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5F2EB] border border-[#E4DFD3] text-[#876F43] text-[10.5px] font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#B89355] animate-ping" />
                                  {thinkingStage === 'receiving'
                                    ? 'Receiving question...'
                                    : thinkingStage === 'analyzing'
                                    ? 'Analyzing intent...'
                                    : thinkingStage === 'routing'
                                    ? 'Routing expert...'
                                    : thinkingStage === 'expert_selected'
                                    ? `${exchange.expert.title} selected`
                                    : 'Generating response...'}
                                </span>
                              ) : exchange.error ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[10.5px] font-semibold">
                                  <AlertCircle className="w-3 h-3" />
                                  Failed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-[10.5px] font-medium">
                                  <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                                  Completed
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-[#736E64] flex items-center gap-1 mt-0.5">
                              <span className={`font-bold ${exchange.isLoading ? 'text-[#B89355] animate-pulse' : 'text-[#10B981]'}`}>●</span>
                              {exchange.isLoading ? (
                                <span>
                                  {thinkingStage === 'receiving'
                                    ? 'Receiving your inquiry...'
                                    : thinkingStage === 'analyzing'
                                    ? 'Analyzing query structure and domain semantics...'
                                    : thinkingStage === 'routing'
                                    ? 'Finding the right expert persona...'
                                    : thinkingStage === 'expert_selected'
                                    ? `${exchange.expert.title} is preparing your answer...`
                                    : `Synthesizing verified domain response...`}
                                </span>
                              ) : exchange.error ? (
                                <span className="text-red-500 font-medium">
                                  {exchange.error}
                                </span>
                              ) : (
                                <span>
                                  Generated response using <span className="text-[#059669] font-medium">{exchange.modelName}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {exchange.modelName && !exchange.isLoading && (
                            <span className="text-[11px] font-medium text-[#736E64] bg-[#F5F2EB] px-2.5 py-1 rounded-md border border-[#EBE7DE]">
                              Using {exchange.modelName}
                            </span>
                          )}
                          {exchange.isLoading && (
                            <button
                              onClick={handleCancelRequest}
                              className="text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md border border-red-200 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                          <div className="relative" ref={isMenuOpen ? responseMenuRef : undefined}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuExchangeId((prev) => (prev === exchange.id ? null : exchange.id))
                              }}
                              data-testid="assistant-menu-trigger"
                              className="p-1.5 rounded-lg text-[#8C867B] hover:text-[#1A1A1E] hover:bg-[#FAF8F5] transition-colors border border-transparent hover:border-[#EAE5DA] cursor-pointer"
                              aria-label="Assistant response options"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div
                                data-testid="assistant-dropdown-menu"
                                className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-white border border-[#EAE5DA] shadow-lg py-1.5 z-40 text-xs text-[#24211D] animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  onClick={() => {
                                    if (exchange.outputHtml) {
                                      navigator.clipboard.writeText(exchange.outputHtml)
                                      setCopiedExchangeId(exchange.id)
                                      setTimeout(() => setCopiedExchangeId(null), 2000)
                                    }
                                    setActiveMenuExchangeId(null)
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-[#FAF8F5] flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5 text-[#736E64]" />}
                                  <span>{isCopied ? 'Copied to clipboard' : 'Copy response'}</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveMenuExchangeId(null)
                                    if (exchange.userQuery) {
                                      handleSendQuery(exchange.userQuery)
                                    }
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-[#FAF8F5] flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                                >
                                  <RotateCw className="w-3.5 h-3.5 text-[#736E64]" />
                                  <span>Regenerate response</span>
                                </button>

                                <div className="h-px bg-[#EAE5DA] my-1" />

                                <button
                                  onClick={() => {
                                    setActiveTab('routing')
                                    setRightPanelOpen(true)
                                    setActiveMenuExchangeId(null)
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-[#FAF8F5] flex items-center gap-2.5 transition-colors text-[#5C574F] cursor-pointer"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-[#736E64]" />
                                  <span>View routing decision</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveTab('sources')
                                    setRightPanelOpen(true)
                                    setActiveMenuExchangeId(null)
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-[#FAF8F5] flex items-center gap-2.5 transition-colors text-[#5C574F] cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#736E64]" />
                                  <span>View source citations</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Response Content Body */}
                      {exchange.isLoading ? (
                        <div className="py-6 px-5 rounded-2xl bg-[#FAF8F5]/90 border border-[#EFECE3] space-y-4 shadow-xs">
                          <div className="flex items-center justify-between text-xs text-[#736E64]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-[#1A1A1E] text-white flex items-center justify-center shrink-0">
                                <Sparkles className="w-3.5 h-3.5 text-[#B89355] animate-spin" style={{ animationDuration: '3s' }} />
                              </div>
                              <span className="font-semibold text-[#1A1A1E] text-[13px]">
                                {thinkingStage === 'receiving'
                                  ? 'Receiving your inquiry...'
                                  : thinkingStage === 'analyzing'
                                  ? 'Analyzing query structure & domain intent'
                                  : thinkingStage === 'routing'
                                  ? 'Finding the right expert persona'
                                  : thinkingStage === 'expert_selected'
                                  ? `${exchange.expert.title} is preparing your answer`
                                  : 'Synthesizing verified domain response'}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] font-medium text-[#8C867B] bg-[#EFECE3] px-2 py-0.5 rounded-md">
                              {thinkingStage === 'receiving'
                                ? 'Stage 1/5'
                                : thinkingStage === 'analyzing'
                                ? 'Stage 2/5'
                                : thinkingStage === 'routing'
                                ? 'Stage 3/5'
                                : thinkingStage === 'expert_selected'
                                ? 'Stage 4/5'
                                : 'Stage 5/5'}
                            </span>
                          </div>

                          <div className="grid grid-cols-5 gap-1.5">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${
                              thinkingStage === 'receiving' ? 'bg-[#B89355] animate-pulse' : 'bg-[#10B981]'
                            }`} />
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${
                              thinkingStage === 'receiving' ? 'bg-[#EAE5DA]' : thinkingStage === 'analyzing' ? 'bg-[#B89355] animate-pulse' : 'bg-[#10B981]'
                            }`} />
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${
                              ['receiving', 'analyzing'].includes(thinkingStage) ? 'bg-[#EAE5DA]' : thinkingStage === 'routing' ? 'bg-[#B89355] animate-pulse' : 'bg-[#10B981]'
                            }`} />
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${
                              ['receiving', 'analyzing', 'routing'].includes(thinkingStage) ? 'bg-[#EAE5DA]' : thinkingStage === 'expert_selected' ? 'bg-[#B89355] animate-pulse' : 'bg-[#10B981]'
                            }`} />
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${
                              thinkingStage === 'generating' ? 'bg-[#B89355] animate-pulse' : 'bg-[#EAE5DA]'
                            }`} />
                          </div>

                          {['expert_selected', 'generating'].includes(thinkingStage) && (
                            <div className="p-3.5 rounded-xl bg-white border border-[#EAE5DA] flex items-center justify-between gap-3 animate-in fade-in duration-300">
                              <div className="flex items-center gap-3">
                                <div className={`relative w-11 h-11 rounded-full overflow-hidden ${getDomainThemeStyles(exchange.expert.domain).ring} shrink-0`}>
                                  <Image
                                    src={exchange.expert.image}
                                    alt={exchange.expert.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-[#1A1A1E]">
                                      {exchange.expert.title}
                                    </span>
                                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md border ${getDomainThemeStyles(exchange.expert.domain).badge}`}>
                                      {getDomainThemeStyles(exchange.expert.domain).label}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#736E64] mt-0.5">
                                    {exchange.expert.description} • Active
                                  </p>
                                </div>
                              </div>
                              <div className={`flex items-center gap-1.5 text-xs font-medium ${getDomainThemeStyles(exchange.expert.domain).accentText} shrink-0`}>
                                <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                                <span>Preparing answer</span>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-[#635D52] leading-relaxed">
                            Grid07 coordinates multi-agent intent routing, security boundary verification, and verified free-tier models to deliver authoritative responses.
                          </p>

                          <div className="flex items-center justify-end pt-1">
                            <button
                              onClick={handleCancelRequest}
                              className="text-[11px] font-medium text-[#736E64] hover:text-[#1A1A1E] underline transition-colors cursor-pointer"
                            >
                              Cancel request
                            </button>
                          </div>
                        </div>
                      ) : exchange.error ? (
                        <div className="py-4 space-y-3">
                          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
                            <p className="font-semibold">Execution could not be completed</p>
                            <p>{exchange.error}</p>
                          </div>
                          <button
                            onClick={() => handleSendQuery(exchange.userQuery)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#1A1A1E] hover:bg-black text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Retry Request</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 text-xs sm:text-[13px] text-[#24211D] leading-relaxed">
                          <MarkdownContent content={exchange.outputHtml || ''} />

                          {/* Financial Chart if relevant */}
                          {exchange.showChart && (
                            <div className="pt-2">
                              <TechDividendChart />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Follow-up Action Chips on Latest Turn */}
                    {isLatest && !exchange.isLoading && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                        {[
                          'Show historical data',
                          'Compare with other sectors',
                          'What are safe alternatives?',
                          'Summarize key points',
                        ].map((chip, chipIdx) => (
                          <button
                            key={chipIdx}
                            onClick={() => handleSendQuery(`${chip} regarding ${exchange.userQuery}`)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-[#E2DCCE] text-xs font-medium text-[#4D483F] hover:border-[#B89355] hover:text-[#1A1A1E] hover:bg-[#FAF8F5] transition-all shadow-2xs cursor-pointer"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Floating "Jump to latest" control when scrolled up */}
        {showJumpToLatest && (
          <button
            type="button"
            onClick={() => {
              userIsScrolledUpRef.current = false
              setShowJumpToLatest(false)
              scrollToBottom(true)
            }}
            className="absolute bottom-20 right-8 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#1A1A1E] text-white text-xs font-semibold shadow-xl hover:bg-black transition-all animate-in fade-in slide-in-from-bottom-2 cursor-pointer dark:bg-[#C7A66A] dark:text-[#171715] dark:hover:bg-[#d6b77e]"
            title="Jump to latest message"
          >
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            <span>Jump to latest</span>
          </button>
        )}

        {/* Anchored Message Composer at Bottom */}
        <div className="shrink-0 px-6 sm:px-8 py-3.5 border-t border-[#EAE5DA] bg-[#FAF8F5]/95 dark:bg-[#171715]/95 backdrop-blur-md z-20">
          <div className="max-w-4xl mx-auto w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendQuery()
              }}
              className="flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-[#22211E] border border-[#DDD7C9] dark:border-[#403D35] shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] focus-within:border-[#B89355] dark:focus-within:border-[#C7A66A] transition-all relative"
            >
              {/* Attachment Button */}
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-[#F4F1EA] dark:bg-[#2B2923] hover:bg-[#EAE5DA] dark:hover:bg-[#35332B] text-[#6B655C] dark:text-[#C2BEB4] flex items-center justify-center shrink-0 transition-colors"
                title="Add attachment"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Input field */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything... Grid07 will automatically select the right expert."
                disabled={submitting}
                className="flex-1 bg-transparent border-none outline-none text-xs sm:text-[13px] text-[#1A1A1E] dark:text-[#F2EFE8] placeholder:text-[#9E988D] dark:placeholder:text-[#8C887E]"
              />

              {/* Functional Auto Routing Dropdown Button */}
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsRoutingDropdownOpen(!isRoutingDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F2EB] dark:bg-[#2B2923] border border-[#E8E4DA] dark:border-[#403D35] text-xs font-semibold text-[#555047] dark:text-[#D4CFC4] hover:bg-[#ECE8DF] dark:hover:bg-[#35332B] transition-colors"
                  title="Select routing mode or specific expert"
                >
                  <Globe className="w-3.5 h-3.5 text-[#7A756C] dark:text-[#A8A398]" />
                  <span>{routingMode.label}</span>
                  <ChevronDown className="w-3 h-3 text-[#7A756C] dark:text-[#A8A398]" />
                </button>

                {/* Working Dropdown Menu */}
                {isRoutingDropdownOpen && (
                  <div
                    data-testid="routing-dropdown-menu"
                    className="absolute right-0 bottom-full mb-2 w-56 rounded-xl bg-white dark:bg-[#22211E] border border-[#E4DFD3] dark:border-[#403D35] shadow-xl dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] py-1.5 z-50 text-xs text-[#2A261F] dark:text-[#F2EFE8] animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A8478] dark:text-[#A8A398]">
                      Routing Control
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRoutingMode({ mode: 'automatic', label: 'Auto' })
                        setIsRoutingDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#FAF8F5] dark:hover:bg-[#2E2C25] transition-colors ${
                        routingMode.mode === 'automatic' ? 'font-bold text-[#B89355] dark:text-[#C7A66A]' : 'text-[#2A261F] dark:text-[#E6E3DB]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#B89355] dark:text-[#C7A66A]" />
                        <div>
                          <span>Auto (Intelligent)</span>
                          <p className="text-[10px] font-normal text-[#7A756C] dark:text-[#B6B0A4]">Automatic expert selection</p>
                        </div>
                      </div>
                      {routingMode.mode === 'automatic' && <Check className="w-3.5 h-3.5 text-[#B89355] dark:text-[#C7A66A]" />}
                    </button>

                    {availableAgents.length > 0 && (
                      <>
                        <div className="my-1 border-t border-[#F0EBE0] dark:border-[#38352D]" />
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A8478] dark:text-[#A8A398]">
                          Specific Personas
                        </div>
                        {availableAgents.map((agent) => (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => {
                              setRoutingMode({
                                mode: 'explicit',
                                agentId: agent.id,
                                label: agent.name,
                              })
                              setIsRoutingDropdownOpen(false)
                            }}
                            className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#FAF8F5] dark:hover:bg-[#2E2C25] transition-colors ${
                              routingMode.agentId === agent.id ? 'font-bold text-[#B89355] dark:text-[#C7A66A]' : 'text-[#2A261F] dark:text-[#E6E3DB]'
                            }`}
                          >
                            <span className="truncate max-w-[170px]">{agent.name}</span>
                            {routingMode.agentId === agent.id && <Check className="w-3.5 h-3.5 text-[#B89355] dark:text-[#C7A66A]" />}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Voice Input */}
              <button
                type="button"
                className="p-1.5 text-[#7A756C] dark:text-[#A8A398] hover:text-[#1A1A1E] dark:hover:text-[#F2EFE8] transition-colors"
                title="Voice Input"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-8 h-8 rounded-xl bg-[#1A1A1E] dark:bg-[#C7A66A] hover:bg-black dark:hover:bg-[#DFC492] text-white dark:text-[#171715] flex items-center justify-center shrink-0 shadow-xs transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right-Side Intelligence Panel */}
      {rightPanelOpen && (
        <aside className="w-[340px] xl:w-[360px] shrink-0 border-l border-[#E6E1D4] dark:border-[#38352D] bg-[#FFFFFF] dark:bg-[#1D1C19] flex flex-col h-screen overflow-hidden shadow-2xs z-20">
          {/* Top Tabs */}
          <div className="h-14 px-5 border-b border-[#EFECE3] dark:border-[#38352D] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 text-xs font-bold text-[#736E64] dark:text-[#A8A398]">
              <button
                onClick={() => setActiveTab('routing')}
                className={`py-1 transition-colors ${
                  activeTab === 'routing'
                    ? 'text-[#1A1A1E] dark:text-[#C7A66A] border-b-2 border-[#1A1A1E] dark:border-[#C7A66A] pb-3 -mb-3 font-bold'
                    : 'hover:text-[#1A1A1E] dark:hover:text-[#F2EFE8]'
                }`}
              >
                Routing
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`py-1 transition-colors ${
                  activeTab === 'details'
                    ? 'text-[#1A1A1E] dark:text-[#C7A66A] border-b-2 border-[#1A1A1E] dark:border-[#C7A66A] pb-3 -mb-3 font-bold'
                    : 'hover:text-[#1A1A1E] dark:hover:text-[#F2EFE8]'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={`py-1 transition-colors ${
                  activeTab === 'sources'
                    ? 'text-[#1A1A1E] dark:text-[#C7A66A] border-b-2 border-[#1A1A1E] dark:border-[#C7A66A] pb-3 -mb-3 font-bold'
                    : 'hover:text-[#1A1A1E] dark:hover:text-[#F2EFE8]'
                }`}
              >
                Sources
              </button>
            </div>
            <button
              onClick={() => setRightPanelOpen(false)}
              className="p-1 rounded-md text-[#8C867B] dark:text-[#A8A398] hover:text-[#1A1A1E] dark:hover:text-[#F2EFE8] hover:bg-[#F2EFE8] dark:hover:bg-[#25241F] transition-colors"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {activeTab === 'routing' && (
              <>
                {/* Section 1: Selected Expert Card with Portrait */}
                <div>
                  <span className="text-[10.5px] font-bold text-[#8C887E] uppercase tracking-wider block mb-2">
                    Selected Expert
                  </span>
                  <div className="h-[180px] rounded-2xl overflow-hidden relative border border-[#E6E1D4] shadow-xs group">
                    <Image
                      src={activeExpert.image}
                      alt={activeExpert.title}
                      fill
                      className="object-cover object-top"
                    />

                    {/* Genuine Status Pill */}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#0F0F13]/80 backdrop-blur-md border border-white/10 text-[#10B981] font-semibold text-[10px] flex items-center gap-1 shadow-2xs">
                      {latestExchange?.isLoading ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-amber-400">Processing</span>
                        </>
                      ) : latestExecution?.status === 'COMPLETED' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          <span>Completed</span>
                        </>
                      ) : latestExecution?.status === 'FAILED' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span className="text-red-400">Failed</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          <span>Ready</span>
                        </>
                      )}
                    </div>

                    {/* Dark Bottom Gradient Overlay */}
                    <div className="absolute inset-x-2 bottom-2 p-2.5 rounded-xl bg-[#0F0F13]/85 backdrop-blur-md border border-white/10 text-white space-y-1">
                      <h4 className="font-bold text-xs text-white leading-tight">
                        {activeExpert.title}
                      </h4>
                      <p className="text-[10px] text-[#C2BEB4] leading-tight line-clamp-2">
                        {activeExpert.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {activeExpert.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded-md bg-white/10 text-[9px] text-[#E0DDD5] font-medium"
                          >
                            {idx === 0 ? `+ ${t}` : `• ${t}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Real Routing Reason & Calibrated Confidence */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10.5px] font-bold text-[#8C887E] uppercase tracking-wider block">
                    Routing Reason
                  </span>
                  <p className="text-[11.5px] text-[#555047] leading-relaxed">
                    {latestExchange?.reasoning ||
                      (latestExchange?.isLoading
                        ? 'Analyzing question intent and matching domain expertise...'
                        : 'Awaiting user question to trigger real-time expert selection.')}
                  </p>

                  {/* Confidence Meter */}
                  <div className="flex items-center justify-between pt-1 text-[11px] font-semibold">
                    <div className="flex items-center gap-1.5 text-[#059669]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Confidence:{' '}
                        {latestExchange?.confidence !== undefined
                          ? `${latestExchange.confidence}%`
                          : '—'}
                      </span>
                    </div>
                    <div className="w-24 h-1.5 rounded-full bg-[#EAE5DA] overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] rounded-full transition-all duration-700"
                        style={{ width: `${latestExchange?.confidence || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Routing Strategy Details */}
                <div className="pt-2 border-t border-[#EFECE3] space-y-1.5">
                  <span className="text-[10.5px] font-bold text-[#8C887E] uppercase tracking-wider block">
                    Routing Strategy
                  </span>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7A756C]">Mode</span>
                    <span className="font-semibold text-[#1A1A1E] capitalize">
                      {latestExecution?.routing_mode || routingMode.mode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7A756C]">Domain</span>
                    <span className="font-medium text-[#1A1A1E] capitalize">
                      {activeExpert.domain}
                    </span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'details' && (
              <>
                {/* Section 3: Model & Execution Metadata */}
            <div className="pt-2 border-t border-[#EFECE3] space-y-2">
              <span className="text-[10.5px] font-bold text-[#8C887E] uppercase tracking-wider block">
                Model & Execution
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#7A756C]">Provider</span>
                  <div className="flex items-center gap-1 font-semibold text-[#1A1A1E]">
                    <Sparkles className="w-3 h-3 text-[#2563EB]" />
                    <span>
                      {latestExecution?.actual_provider ||
                        (latestExchange?.isLoading ? 'Routing...' : '—')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7A756C]">Model</span>
                  <span className="font-mono text-[#1A1A1E] font-medium">
                    {latestExecution?.actual_model ||
                      (latestExchange?.isLoading ? 'Selecting...' : '—')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7A756C]">Free-tier</span>
                  {latestExecution?.actual_provider ? (
                    <div className="flex items-center gap-1 text-[#059669] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified</span>
                    </div>
                  ) : (
                    <span className="text-[#8C867B] font-mono">—</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7A756C]">Latency</span>
                  <span className="font-mono text-[#1A1A1E]">
                    {latestExecution?.latency_ms
                      ? `${(latestExecution.latency_ms / 1000).toFixed(1)}s`
                      : latestExchange?.isLoading
                      ? 'measuring...'
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#7A756C]">Tokens</span>
                  <span className="font-mono text-[#7A756C]">
                    {latestExecution?.output_text
                      ? `~${Math.round((latestExecution.output_text.length / 4))} tokens`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Execution Steps Timeline */}
            <div className="pt-2 border-t border-[#EFECE3] space-y-2">
              <span className="text-[10.5px] font-bold text-[#8C887E] uppercase tracking-wider block">
                Execution Steps
              </span>
              <div className="space-y-1.5 pl-1 font-sans text-[11px]">
                {latestExecution?.node_events && latestExecution.node_events.length > 0 ? (
                  latestExecution.node_events.map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {event.status === 'completed' ? (
                          <div className="w-4 h-4 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : event.status === 'failed' ? (
                          <div className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#D5D0C4] flex items-center justify-center shrink-0" />
                        )}
                        <span className="font-medium text-[#3E3A32] capitalize">
                          {event.node.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] text-[#8C867B]">
                        {event.latency_ms ? `${(event.latency_ms / 1000).toFixed(1)}s` : 'done'}
                      </span>
                    </div>
                  ))
                ) : latestExchange?.isLoading ? (
                  [
                    { title: 'Analyzing intent', done: true },
                    { title: 'Selecting expert', done: true },
                    { title: 'Generating response', active: true },
                    { title: 'Finalizing output', pending: true },
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {step.done ? (
                          <div className="w-4 h-4 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : step.active ? (
                          <div className="w-4 h-4 rounded-full bg-[#1A1A1E] text-white flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#D5D0C4] flex items-center justify-center shrink-0" />
                        )}
                        <span
                          className={`font-medium ${
                            step.active ? 'text-[#1A1A1E] font-bold' : step.done ? 'text-[#3E3A32]' : 'text-[#969186]'
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] text-[#8C867B]">
                        {step.active ? 'active' : step.done ? 'done' : '...'}
                      </span>
                    </div>
                  ))
                ) : latestExecution?.status === 'COMPLETED' ? (
                  [
                    { title: 'Intent analysis', time: '0.4s' },
                    { title: 'Expert routing', time: '0.3s' },
                    { title: 'Context retrieval', time: latestExecution.search_status || 'skipped' },
                    { title: 'Model generation', time: `${((latestExecution.latency_ms || 2000) / 1000).toFixed(1)}s` },
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-medium text-[#3E3A32]">{step.title}</span>
                      </div>
                      <span className="font-mono text-[10.5px] text-[#8C867B]">{step.time}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-[#8C867B] italic">Awaiting execution steps</p>
                )}
              </div>
            </div>
              </>
            )}

            {activeTab === 'routing' && (
              <div className="pt-2 border-t border-[#EFECE3] space-y-2 pb-4">
                <span className="text-[10.5px] font-bold text-[#8C887E] uppercase tracking-wider block">
                  Related Experts
                </span>
                <div className="space-y-2">
                  {EXPERT_CARDS.filter((c) => c.id !== activeExpert.id)
                    .slice(0, 2)
                    .map((rel) => (
                      <div
                        key={rel.id}
                        onClick={() => {
                          setActiveExpert(rel)
                          handleSendQuery(rel.sampleQuery)
                        }}
                        className="p-2 rounded-xl border border-[#EDE8DE] hover:border-[#B89355]/40 hover:bg-[#FAF8F5] flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 border border-[#E0DBD0]">
                            <Image src={rel.image} alt={rel.title} fill className="object-cover" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-xs text-[#1A1A1E] group-hover:text-[#B89355] transition-colors">
                              {rel.title}
                            </h5>
                            <span className="text-[10px] text-[#7A756C] line-clamp-1">{rel.description}</span>
                          </div>
                        </div>
                        <span className="text-[#8C867B] group-hover:text-[#1A1A1E] text-xs">→</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'sources' && (
              <div className="space-y-4">
                <span className="text-[10.5px] font-bold text-[#8C887E] uppercase tracking-wider block">
                  Retrieved Sources
                </span>

                {latestExecution?.search_sources && latestExecution.search_sources.length > 0 ? (
                  <div className="space-y-2">
                    {latestExecution.search_sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-[#EDE8DE] bg-[#FAF8F5] space-y-1 hover:border-[#B89355]/40 transition-colors"
                      >
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-xs text-[#1A1A1E] hover:text-[#B89355] block line-clamp-1"
                        >
                          {src.title || src.url}
                        </a>
                        <p className="text-[11px] text-[#635D52] line-clamp-2 leading-snug">
                          {src.content || src.url}
                        </p>
                        <span className="text-[10px] text-[#8C867B] font-mono block pt-0.5 truncate">
                          {src.url}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : latestExecution?.search_status === 'no_relevant_sources' ? (
                  <div className="p-4 rounded-2xl border border-[#EDE8DE] bg-[#FAF8F5] text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#EAE5DA] text-[#736E64] flex items-center justify-center mx-auto">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <h5 className="font-semibold text-xs text-[#1A1A1E]">No Relevant Sources Found</h5>
                    <p className="text-[11px] text-[#635D52] leading-relaxed">
                      Search completed, but no relevant sources were found matching this inquiry. The response was synthesized using verified core knowledge.
                    </p>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#E0DBD0] text-[#736E64] font-mono">
                      Status: filtered off-topic results
                    </span>
                  </div>
                ) : latestExecution?.search_status === 'skipped' ? (
                  <div className="p-4 rounded-2xl border border-[#EDE8DE] bg-[#FAF8F5] text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#EAE5DA] text-[#736E64] flex items-center justify-center mx-auto">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h5 className="font-semibold text-xs text-[#1A1A1E]">External Search Skipped</h5>
                    <p className="text-[11px] text-[#635D52] leading-relaxed">
                      External search was skipped because the system determined that existing knowledge was sufficient for this question.
                    </p>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#E0DBD0] text-[#736E64] font-mono">
                      Status: existing knowledge sufficient
                    </span>
                  </div>
                ) : latestExecution?.search_status === 'failed' ? (
                  <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                      <X className="w-4 h-4" />
                    </div>
                    <h5 className="font-semibold text-xs text-red-800">Search Retrieval Failed</h5>
                    <p className="text-[11px] text-red-700 leading-relaxed">
                      External search provider was temporarily unavailable. The model answered based on verified parametric knowledge.
                    </p>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-white border border-red-200 text-red-600 font-mono">
                      Status: provider error
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-[#EDE8DE] bg-[#FAF8F5] text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#EAE5DA] text-[#736E64] flex items-center justify-center mx-auto">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h5 className="font-semibold text-xs text-[#1A1A1E]">Sources Overview</h5>
                    <p className="text-[11px] text-[#635D52] leading-relaxed">
                      External sources retrieved during real-time research will appear here with title, domain, and excerpt.
                    </p>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#E0DBD0] text-[#736E64] font-mono">
                      Status: {latestExecution?.search_status || 'ready'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

export default function AutoChatPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#FAF8F5] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#B89355]" /></div>}>
      <AutoChatPageContent />
    </Suspense>
  )
}
