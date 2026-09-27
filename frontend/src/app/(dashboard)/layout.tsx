'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bot, LayoutDashboard, Users, Activity, PlaySquare, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, token, logout, workspace, setWorkspace } = useAuthStore()
  const [workspaces, setWorkspaces] = useState<any[]>([])

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    // Fetch workspaces
    api.get('/workspaces').then(res => {
      setWorkspaces(res.data)
      if (res.data.length > 0 && !workspace) {
        setWorkspace(res.data[0])
      } else if (res.data.length === 0) {
        // Create default workspace
        api.post('/workspaces', { name: 'My Workspace' }).then(res2 => {
          setWorkspace(res2.data)
          setWorkspaces([res2.data])
        })
      }
    })
  }, [token, router])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Agents', href: '/agents', icon: Users },
    { name: 'Playground', href: '/playground', icon: PlaySquare },
    { name: 'Executions', href: '/executions', icon: Activity },
  ]

  if (!user || !workspace) return <div className="min-h-screen bg-background" />

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/40 bg-muted/20 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border/40">
          <Link className="flex items-center gap-2" href="/dashboard">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">GRID07</span>
          </Link>
        </div>
        
        <div className="p-4 border-b border-border/40">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workspace</div>
          <select 
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={workspace?.id}
            onChange={(e) => {
              const ws = workspaces.find(w => w.id === e.target.value)
              if (ws) setWorkspace(ws)
            }}
          >
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border/40">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center px-8 border-b border-border/40 bg-background/50 backdrop-blur-sm sticky top-0 z-10 md:hidden">
            <span className="font-bold text-lg">GRID07</span>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
