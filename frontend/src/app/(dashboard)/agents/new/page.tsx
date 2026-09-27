'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewAgentPage() {
  const router = useRouter()
  const { workspace } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    personality: '',
    model_name: 'llama-3.1-8b-instant'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspace) return
    setLoading(true)
    try {
      await api.post(`/workspaces/${workspace.id}/agents`, formData)
      router.push('/agents')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/agents" className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Agent</h1>
          <p className="text-muted-foreground mt-1">Configure a new AI persona and routing rules.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b border-border/50 pb-2">Identity</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input 
                required 
                placeholder="e.g. Finance Bro"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (Routing context)</label>
              <textarea 
                required 
                placeholder="What does this agent care about? This is used by the router."
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none h-24 resize-none"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b border-border/50 pb-2">Persona & Behavior</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Personality Instructions (System Prompt)</label>
              <textarea 
                required 
                placeholder="I strictly care about markets, interest rates..."
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none h-32 resize-none"
                value={formData.personality}
                onChange={e => setFormData({...formData, personality: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <select
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                value={formData.model_name}
                onChange={e => setFormData({...formData, model_name: e.target.value})}
              >
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Groq)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-4">
          <Link 
            href="/agents" 
            className="px-6 py-2 rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Agent'}
          </button>
        </div>
      </form>
    </div>
  )
}
