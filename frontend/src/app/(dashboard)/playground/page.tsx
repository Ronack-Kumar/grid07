'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Send, Loader2, Bot, User as UserIcon, Network, Database } from 'lucide-react'

export default function PlaygroundPage() {
  const { workspace } = useAuthStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [execution, setExecution] = useState<any>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !workspace) return
    
    setLoading(true)
    const currentInput = input
    setInput('')
    
    try {
      let cid = conversationId
      if (!cid) {
        // Create new conversation
        const convRes = await api.post(`/workspaces/${workspace.id}/conversations`, { title: 'Playground Chat' })
        cid = convRes.data.id
        setConversationId(cid)
      }

      // Optimistically add user message to UI
      setMessages(prev => [...prev, { role: 'user', content: currentInput }])

      // Create execution
      const res = await api.post(`/workspaces/${workspace.id}/executions`, { 
        input_text: currentInput,
        conversation_id: cid
      })
      
      // Poll for completion (Mock implementation since we use background tasks)
      let exec = res.data
      let attempts = 0
      while (exec.status !== 'COMPLETED' && exec.status !== 'FAILED' && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const check = await api.get(`/workspaces/${workspace.id}/executions/${exec.id}`)
        exec = check.data
        attempts++
      }
      setExecution(exec)
      
      // Add agent message to UI
      if (exec.status === 'COMPLETED' || exec.status === 'FAILED') {
        setMessages(prev => [...prev, { role: 'agent', content: exec.output_text }])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
        <p className="text-muted-foreground mt-2">Test agent routing and generation in real-time.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        
        {/* Chat / Input Side */}
        <div className="glass rounded-2xl flex flex-col border border-border/50 overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {messages.length > 0 ? (
              messages.map((msg, i) => (
                <div key={i} className="flex gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-muted' : 'bg-primary/20 text-primary'}`}>
                    {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm w-full ${msg.role === 'user' ? 'bg-muted rounded-tl-sm' : 'bg-primary/10 border border-primary/20 rounded-tr-sm space-y-3'}`}>
                    <p>{msg.content}</p>
                    {msg.role === 'agent' && i === messages.length - 1 && execution?.retrieved_context && (
                      <div className="mt-4 pt-3 border-t border-primary/20 text-xs text-primary/80">
                        <span className="font-semibold mb-1 block">Context Used:</span>
                        <pre className="whitespace-pre-wrap font-sans">{execution.retrieved_context.sources}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                <Bot className="w-8 h-8 opacity-50" />
                <p>Send a message to see the routing engine in action.</p>
              </div>
            )}
            
            {loading && (
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing through GRID07...
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-border/50 bg-background/50">
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
              <input 
                type="text"
                placeholder="Ask something..."
                className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary pr-12"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-primary text-primary-foreground rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Inspector Side */}
        <div className="glass rounded-2xl border border-border/50 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/20 font-medium text-sm flex items-center justify-between">
            Execution Trace
            {execution && (
              <span className="text-xs bg-muted px-2 py-1 rounded-md">{execution.latency_ms}ms</span>
            )}
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {!execution ? (
              <div className="text-sm text-muted-foreground text-center mt-12">
                Execution trace will appear here.
              </div>
            ) : (
              <>
                {/* Routing Step */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Network className="w-4 h-4" /> 1. Semantic Routing
                  </h3>
                  <div className="bg-background border border-border rounded-lg p-4 space-y-3 text-sm">
                    {execution.routing_decisions?.matches?.map((match: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${match.selected ? 'bg-green-500' : 'bg-muted'}`} />
                          {match.agent_name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{match.reason}</span>
                          <span className={`font-mono ${match.selected ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {match.score.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Retrieval Step */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2">
                    <Database className="w-4 h-4" /> 2. RAG / Research
                  </h3>
                  <div className="bg-background border border-border rounded-lg p-4 text-sm font-mono text-muted-foreground">
                    {execution.retrieved_context ? "Context retrieved successfully." : "No external context required."}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
