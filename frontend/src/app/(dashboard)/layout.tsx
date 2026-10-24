'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare,
  LayoutGrid,
  Users,
  PlaySquare,
  Activity,
  ChevronDown,
  MoreHorizontal,
  Hexagon,
  Sparkles,
  Loader2,
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import type { User, Workspace, Conversation } from '@/lib/types'

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeConvId = searchParams?.get('conversationId')
  const { user, token, logout, workspace, setWorkspace } = useAuthStore()
  const [, setWorkspaces] = useState<Workspace[]>([])
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState('')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  const [globalTheme, setGlobalTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('grid07_theme') as 'light' | 'dark') || 'light'
    }
    return 'light'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = (localStorage.getItem('grid07_theme') as 'light' | 'dark') || 'light'
      document.documentElement.setAttribute('data-theme', t)
    }
    const handleThemeChange = () => {
      if (typeof window !== 'undefined') {
        const t = (localStorage.getItem('grid07_theme') as 'light' | 'dark') || 'light'
        setGlobalTheme(t)
      }
    }
    window.addEventListener('grid07_theme_change', handleThemeChange)
    return () => window.removeEventListener('grid07_theme_change', handleThemeChange)
  }, [])

  const toggleGlobalTheme = () => {
    const next = globalTheme === 'light' ? 'dark' : 'light'
    setGlobalTheme(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('grid07_theme', next)
      document.documentElement.setAttribute('data-theme', next)
      window.dispatchEvent(new Event('grid07_theme_change'))
    }
  }

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])


  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    const initialize = async () => {
      setInitializing(true)
      setError('')
      try {
        if (!useAuthStore.getState().user) {
          const currentUser = await api.get<User>('/auth/me')
          useAuthStore.getState().setUser(currentUser.data)
        }
        const response = await api.get<Workspace[]>('/workspaces')
        let available = response.data
        if (available.length === 0) {
          const created = await api.post<Workspace>('/workspaces', { name: 'My Workspace' })
          available = [created.data]
        }
        setWorkspaces(available)
        const storedId = localStorage.getItem('workspace_id')
        const selected = available.find((item) => item.id === storedId) ?? available[0]
        const currentWorkspace = useAuthStore.getState().workspace
        if (!currentWorkspace || currentWorkspace.id !== selected.id) setWorkspace(selected)
      } catch (requestError: unknown) {
        setError(getApiErrorMessage(requestError, 'Could not initialize the workspace.'))
      } finally {
        setInitializing(false)
      }
    }
    void initialize()
  }, [token, router, setWorkspace])

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)

  useEffect(() => {
    if (!workspace?.id) return
    let isCancelled = false
    const fetchConversations = async () => {
      setLoadingConversations(true)
      try {
        const res = await api.get<Conversation[]>(`/workspaces/${workspace.id}/conversations`)
        if (!isCancelled) {
          setConversations(res.data)
        }
      } catch {
        if (!isCancelled) {
          setConversations([])
        }
      } finally {
        if (!isCancelled) {
          setLoadingConversations(false)
        }
      }
    }
    void fetchConversations()
    window.addEventListener('grid07_conversations_updated', fetchConversations)
    return () => {
      isCancelled = true
      window.removeEventListener('grid07_conversations_updated', fetchConversations)
    }
  }, [workspace?.id])

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diffSec < 60) return 'just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}h ago`
    const diffDays = Math.floor(diffHour / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const navItems = [
    { name: 'Auto Chat', href: '/chat', icon: MessageSquare },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { name: 'Agents', href: '/agents', icon: Users },
    { name: 'Playground', href: '/playground', icon: PlaySquare },
    { name: 'Executions', href: '/executions', icon: Activity },
  ]

  if (initializing || !user || !workspace) {
    return (
      <div className="min-h-screen bg-[#0F0F13] flex items-center justify-center">
        {error ? <p className="text-red-400">{error}</p> : <Loader2 className="w-6 h-6 animate-spin text-[#B89355]" />}
      </div>
    )
  }

  const isFullBleed = pathname === '/chat'

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex overflow-hidden">
      {/* Fixed Dark Left Sidebar */}
      <aside className="w-[245px] shrink-0 bg-[#0F0F13] border-r border-[#1C1C24] flex flex-col justify-between hidden md:flex z-30 select-none">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Brand Header */}
          <div className="pt-5 pb-3 px-5">
            <Link className="flex items-center gap-2.5" href="/chat">
              {/* Star / Sparkle Logo Icon */}
              <div className="w-7 h-7 flex items-center justify-center text-[#CBB080]">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white leading-none">Grid07</span>
                <span className="text-[9px] font-semibold text-[#8C887E] tracking-wider uppercase mt-1">
                  Multi Expert AI Workspace
                </span>
              </div>
            </Link>
          </div>

          {/* Workspace Switcher */}
          <div className="px-3 py-2">
            <div className="p-2 rounded-xl bg-[#17171F] border border-[#23232E] flex items-center justify-between cursor-pointer hover:border-[#353545] transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#3D3524] text-[#D8BC88] font-bold text-xs flex items-center justify-center">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-[#F0EDE6] truncate max-w-[130px]">
                  {workspace.name}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#88857D]" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 pt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#1C1C26] text-[#FAF8F5] border border-[#2D2D3D] shadow-inner'
                      : 'text-[#8E8B82] hover:bg-[#16161D] hover:text-[#E8E5DD]'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#CBB080]' : 'text-[#7A776F]'}`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Real Recent Conversations */}
          <div className="px-4 pt-5 flex-1 overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#636058] mb-2 px-1">
              Recent Conversations
            </div>
            {loadingConversations ? (
              <div className="py-2 px-2 flex items-center gap-2 text-[11px] text-[#636058]">
                <Loader2 className="w-3 h-3 animate-spin text-[#B89355]" />
                <span>Loading...</span>
              </div>
            ) : conversations.filter((c) => c.title && !c.title.startsWith('Playground Chat')).length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-[#55524B] italic">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1 pb-4">
                {conversations
                  .filter((c) => c.title && !c.title.startsWith('Playground Chat'))
                  .slice(0, 10)
                  .map((c) => {
                    const isCurrent = activeConvId === c.id
                    return (
                      <Link
                        key={c.id}
                        href={`/chat?conversationId=${c.id}`}
                        className={`flex items-start gap-2.5 px-2 py-1.5 rounded-lg text-left group transition-colors ${
                          isCurrent
                            ? 'bg-[#1C1C26] text-white border-l-2 border-[#B89355]'
                            : 'hover:bg-[#16161E] text-[#9B978D]'
                        }`}
                      >
                        <Hexagon className={`w-3.5 h-3.5 shrink-0 mt-0.5 transition-colors ${
                          isCurrent ? 'text-[#B89355]' : 'text-[#55524B] group-hover:text-[#B89355]'
                        }`} />
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs truncate font-medium ${
                            isCurrent ? 'text-white font-semibold' : 'group-hover:text-white'
                          }`}>
                            {c.title.replace(/^(Ask\s+[^a-z]+about\s+)+/i, '') || 'Untitled Conversation'}
                          </span>
                          <span className="text-[10px] text-[#55524B] font-mono">
                            {formatRelativeTime(c.updated_at || c.created_at)}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Bottom: User Account Footer */}
        <div className="p-3 border-t border-[#1C1C24]/80 dark:border-[#38352D] relative" ref={accountMenuRef}>
          {accountMenuOpen && (
            <div
              className="absolute left-3 right-3 bottom-full mb-2 bg-[#171720] dark:bg-[#22211E] border border-[#2B2B38] dark:border-[#403D35] rounded-xl shadow-2xl p-2.5 z-50 text-xs text-[#FAF8F5] animate-in fade-in slide-in-from-bottom-2 space-y-2"
              data-testid="account-menu"
              role="menu"
            >
              <div className="px-1 py-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#736E65] dark:text-[#A8A398] block">
                  Signed in as
                </span>
                <span className="font-semibold text-white dark:text-[#F2EFE8] truncate block mt-0.5">
                  {user.email}
                </span>
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-[#20202B] dark:bg-[#292823] border border-[#2B2B38] dark:border-[#403D35] text-[11px] text-[#A6A298] dark:text-[#C2BEB4] flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B89355] dark:text-[#C7A66A] shrink-0" />
                <span className="truncate">Active: <strong className="text-white dark:text-[#F2EFE8] font-medium">{workspace.name}</strong></span>
              </div>
              <div className="border-t border-[#262633] dark:border-[#38352D] pt-1">
                <button
                  type="button"
                  data-testid="logout-button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation()
                    setAccountMenuOpen(false)
                    logout()
                    router.push('/login')
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors font-medium text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-1.5 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#2D2A24] border border-[#3E3A32] shrink-0 flex items-center justify-center text-xs font-bold text-[#D8BC88]">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#F2EFE8] truncate">
                  {user.email.split('@')[0]}
                </span>
                <span className="text-[10px] text-[#736E65] dark:text-[#A8A398] truncate font-mono">{user.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleGlobalTheme}
                title={`Switch to ${globalTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
                aria-label="Toggle Theme"
                className="p-1.5 rounded-md text-[#736E65] dark:text-[#A8A398] hover:text-[#FAF8F5] hover:bg-[#1E1E26] dark:hover:bg-[#25241F] transition-colors"
              >
                {globalTheme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-[#88857D]" />
                )}
              </button>
              <button
                type="button"
                data-testid="account-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                onClick={(e) => {
                  e.stopPropagation()
                  setAccountMenuOpen((prev) => !prev)
                }}
                title="Account Options"
                className={`p-1.5 rounded-md transition-colors ${
                  accountMenuOpen
                    ? 'text-[#FAF8F5] bg-[#232330] dark:bg-[#292823]'
                    : 'text-[#736E65] dark:text-[#A8A398] hover:text-[#FAF8F5] hover:bg-[#1E1E26] dark:hover:bg-[#25241F]'
                }`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Body */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#FAF8F5] dark:bg-[#171715]">
        {/* Mobile Navbar */}
        <header className="h-14 flex items-center justify-between px-5 border-b border-[#E8E3D8] dark:border-[#38352D] bg-[#FAF8F5] dark:bg-[#171715] md:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center text-[#B89355] dark:text-[#C7A66A]">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm tracking-tight text-[#1A1A1E] dark:text-[#F2EFE8]">Grid07</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link href="/chat" className="px-2.5 py-1 rounded-md bg-[#1A1A1E] dark:bg-[#C7A66A] text-white dark:text-[#171715] font-semibold">
              Auto Chat
            </Link>
          </div>
        </header>

        {/* Content Viewport */}
        <div className={`flex-1 overflow-hidden ${isFullBleed ? 'p-0' : 'p-6 overflow-y-auto'}`}>
          {children}
        </div>
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  )
}
