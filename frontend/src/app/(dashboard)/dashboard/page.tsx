'use client'

import { useEffect, useState } from 'react'
import { Activity, Users, Zap, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function DashboardPage() {
  const { workspace } = useAuthStore()
  const [stats, setStats] = useState({
    total_agents: 0,
    total_executions: 0,
    success_rate: 0,
    avg_latency_ms: 0
  })
  const [recentExecutions, setRecentExecutions] = useState<any[]>([])

  useEffect(() => {
    if (workspace) {
      api.get(`/workspaces/${workspace.id}/analytics`).then(res => setStats(res.data))
      api.get(`/workspaces/${workspace.id}/executions`).then(res => setRecentExecutions(res.data.slice(0, 5)))
    }
  }, [workspace])
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your workspace agents and executions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 glass rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <h3 className="font-medium text-sm">Total Agents</h3>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-bold">{stats.total_agents}</div>
        </div>
        <div className="p-6 glass rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <h3 className="font-medium text-sm">Total Executions</h3>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-bold">{stats.total_executions}</div>
        </div>
        <div className="p-6 glass rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <h3 className="font-medium text-sm">Success Rate</h3>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-bold">{stats.success_rate}%</div>
        </div>
        <div className="p-6 glass rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <h3 className="font-medium text-sm">Avg Latency</h3>
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-bold">{(stats.avg_latency_ms / 1000).toFixed(2)}s</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 border-b border-border/50 pb-2">Recent Executions</h3>
          <div className="space-y-4">
            {recentExecutions.map(exec => (
              <div key={exec.id} className="flex items-center justify-between">
                <div className="truncate pr-4 flex-1">
                  <p className="text-sm font-medium truncate">{exec.input_text}</p>
                  <p className="text-xs text-muted-foreground">{new Date(exec.created_at).toLocaleString()}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0
                  ${exec.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 
                    exec.status === 'FAILED' ? 'bg-red-500/10 text-red-500' : 
                    'bg-blue-500/10 text-blue-500'}`}>
                  {exec.status}
                </span>
              </div>
            ))}
            {recentExecutions.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent executions.</p>
            )}
          </div>
        </div>
        
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 border-b border-border/50 pb-2">Agent Activity</h3>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Activity breakdown coming soon.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
