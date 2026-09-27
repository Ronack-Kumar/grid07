'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Bot, MoreVertical } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function AgentsPage() {
  const { workspace } = useAuthStore()
  const [agents, setAgents] = useState<any[]>([])

  useEffect(() => {
    if (workspace) {
      api.get(`/workspaces/${workspace.id}/agents`).then(res => setAgents(res.data))
    }
  }, [workspace])

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground mt-2">Manage your specialized AI personas.</p>
        </div>
        <Link 
          href="/agents/new" 
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 gap-2"
        >
          <Plus className="w-4 h-4" /> New Agent
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => (
          <div key={agent.id} className="glass rounded-2xl p-6 flex flex-col hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-semibold">{agent.name}</h3>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">
              {agent.description}
            </p>
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>{agent.model_name}</span>
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-border/50 rounded-2xl">
            <h3 className="text-lg font-medium text-foreground">No agents found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Get started by creating a new AI persona.</p>
            <Link 
              href="/agents/new" 
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
            >
              Create your first agent
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
