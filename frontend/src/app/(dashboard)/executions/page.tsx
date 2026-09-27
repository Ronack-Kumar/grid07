'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Activity, Clock, Search, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function ExecutionsPage() {
  const { workspace } = useAuthStore()
  const [executions, setExecutions] = useState<any[]>([])

  useEffect(() => {
    if (workspace) {
      api.get(`/workspaces/${workspace.id}/executions`).then(res => setExecutions(res.data))
    }
  }, [workspace])

  return (
    <div className="space-y-8 max-w-6xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executions</h1>
        <p className="text-muted-foreground mt-2">Inspect routing decisions and agent reasoning traces.</p>
      </div>

      <div className="flex-1 glass rounded-2xl overflow-hidden flex flex-col border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium">Input</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Latency</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Inspect</th>
              </tr>
            </thead>
            <tbody>
              {executions.map(exec => (
                <tr key={exec.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground max-w-md truncate">
                    {exec.input_text}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                      ${exec.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 
                        exec.status === 'FAILED' ? 'bg-red-500/10 text-red-500' : 
                        'bg-blue-500/10 text-blue-500'}`}>
                      {exec.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> {exec.latency_ms ? `${exec.latency_ms}ms` : '-'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(exec.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => alert(JSON.stringify(exec, null, 2))}
                      className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1"
                    >
                      View Trace <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {executions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No executions found. Head to the Playground to run a query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
