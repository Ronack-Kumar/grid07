'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { useAuthStore } from '@/lib/store'
import type { Agent, ProviderInfo, OpenRouterModelInfo } from '@/lib/types'
import { ProviderApiKeySection } from '@/components/ProviderApiKeySection'
import { OpenRouterModelSelector } from '@/components/OpenRouterModelSelector'

const PROVIDER_NAMES: Record<string, string> = {
  openrouter: 'OpenRouter',
  groq: 'Groq',
  gemini: 'Gemini',
  openai: 'OpenAI',
  xai: 'xAI',
  openai_compatible: 'OpenAI-compatible',
}

export default function EditAgentPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string
  const { workspace } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [providerLoading, setProviderLoading] = useState(true)
  const [error, setError] = useState('')
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [openrouterModels, setOpenrouterModels] = useState<OpenRouterModelInfo[]>([])
  const [openrouterLoading, setOpenrouterLoading] = useState(false)
  const [enteredKey, setEnteredKey] = useState('')
  const [enteredBaseUrl, setEnteredBaseUrl] = useState('')
  const [detectedModels, setDetectedModels] = useState<Record<string, string[]>>({})

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    personality: '',
    provider: 'groq',
    model_name: 'openai/gpt-oss-20b',
    search_enabled: true,
  })

  const loadProviders = async () => {
    try {
      const { data } = await api.get<{ providers: ProviderInfo[] }>('/llm/providers')
      setProviders(data.providers)
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Could not load providers.'))
    }
  }

  useEffect(() => {
    if (!workspace || !agentId) return
    let active = true

    Promise.all([
      api.get<Agent>(`/workspaces/${workspace.id}/agents/${agentId}`),
      api.get<{ providers: ProviderInfo[] }>('/llm/providers'),
      api.get<{ models: OpenRouterModelInfo[] }>('/llm/openrouter/models').catch(() => ({ data: { models: [] } })),
    ])
      .then(([agentRes, providersRes, openrouterRes]) => {
        if (!active) return
        const agent = agentRes.data
        const tools = (agent.tools as Record<string, unknown> | null) || {}
        setFormData({
          name: agent.name || '',
          description: agent.description || '',
          personality: agent.personality || '',
          provider: agent.provider || 'groq',
          model_name: agent.model_name || '',
          search_enabled: tools.search_enabled !== false,
        })
        setProviders(providersRes.data.providers)
        if (openrouterRes?.data?.models) {
          setOpenrouterModels(openrouterRes.data.models)
        }
      })
      .catch((err: unknown) => {
        if (active) setError(getApiErrorMessage(err, 'Could not load persona details.'))
      })
      .finally(() => {
        if (active) {
          setInitialLoading(false)
          setProviderLoading(false)
          setOpenrouterLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [workspace, agentId])

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === formData.provider),
    [formData.provider, providers],
  )

  const availableModels = useMemo(() => {
    const fromProvider = selectedProvider?.models ?? []
    const detected = detectedModels[formData.provider] ?? []
    const combined = Array.from(new Set([...fromProvider, ...detected]))
    return combined.length > 0 ? combined : ['default-model']
  }, [selectedProvider, detectedModels, formData.provider])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!workspace || !agentId) return
    setError('')
    setLoading(true)

    // If user provided a personal key directly in the form, securely save it first
    if (enteredKey.trim() && selectedProvider && !selectedProvider.globally_configured) {
      try {
        await api.post('/llm/credentials', {
          provider: formData.provider,
          api_key: enteredKey.trim(),
          base_url: formData.provider === 'openai_compatible' ? enteredBaseUrl.trim() : undefined,
          validate: true,
        })
        await loadProviders()
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to validate and save provider API key.'))
        setLoading(false)
        return
      }
    }

    try {
      await api.patch<Agent>(`/workspaces/${workspace.id}/agents/${agentId}`, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        personality: formData.personality.trim(),
        provider: formData.provider,
        model_name: formData.model_name,
        tools: { search_enabled: formData.search_enabled },
      })
      router.push(`/playground?agent_id=${agentId}&saved=1`)
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Could not update the persona.'))
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/agents" className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Persona</h1>
          <p className="text-muted-foreground mt-1">Configure expertise, routing keywords, and model execution settings.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border/50 pb-2">Identity</h2>
          <label className="grid gap-1 text-sm font-medium">
            Name
            <input required minLength={2} maxLength={120} className="px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Description used for routing
            <textarea required minLength={3} maxLength={4000} className="px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none h-24 resize-none" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
          </label>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium border-b border-border/50 pb-2">Persona and model</h2>
          <label className="grid gap-1 text-sm font-medium">
            Trusted personality instructions
            <textarea required maxLength={8000} className="px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none h-32 resize-none" value={formData.personality} onChange={(event) => setFormData({ ...formData, personality: event.target.value })} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              <div className="flex items-center justify-between">
                <span>Provider</span>
                {selectedProvider && !selectedProvider.configured && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                    Requires API key
                  </span>
                )}
                {selectedProvider && selectedProvider.user_configured && selectedProvider.configured && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                    Personal key active
                  </span>
                )}
              </div>
              <select
                disabled={providerLoading}
                className="px-4 py-2 bg-background border border-border rounded-lg"
                value={formData.provider}
                onChange={(event) => {
                  const pId = event.target.value
                  const provider = providers.find((item) => item.id === pId)
                  let defaultModel = provider?.models[0] ?? ''
                  if (pId === 'openrouter' && openrouterModels.length > 0) {
                    const firstFree = openrouterModels.find((m) => m.is_free)?.id
                    defaultModel = firstFree || openrouterModels[0].id
                  } else if (detectedModels[pId]?.length) {
                    defaultModel = detectedModels[pId][0]
                  }
                  setFormData({ ...formData, provider: pId, model_name: defaultModel })
                  setEnteredKey('')
                }}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.display_name || PROVIDER_NAMES[provider.id] || provider.id}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-1 text-sm font-medium">
              <span>Model</span>
              {formData.provider === 'openrouter' ? (
                <OpenRouterModelSelector
                  models={openrouterModels}
                  selectedModelId={formData.model_name}
                  onSelectModel={(modelId) => setFormData((prev) => ({ ...prev, model_name: modelId }))}
                  loading={openrouterLoading}
                />
              ) : (
                <select
                  disabled={providerLoading}
                  className="px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                  value={formData.model_name}
                  onChange={(event) => setFormData({ ...formData, model_name: event.target.value })}
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Inline Personal API Key configuration section for providers missing global keys */}
          {selectedProvider && (!selectedProvider.globally_configured || selectedProvider.user_configured) && (
            <ProviderApiKeySection
              provider={selectedProvider}
              onProviderUpdated={loadProviders}
              onModelDetected={(models) => {
                setDetectedModels((prev) => ({ ...prev, [formData.provider]: models }))
                if (models.length > 0 && !models.includes(formData.model_name)) {
                  setFormData((prev) => ({ ...prev, model_name: models[0] }))
                }
              }}
              enteredKey={enteredKey}
              setEnteredKey={setEnteredKey}
              enteredBaseUrl={enteredBaseUrl}
              setEnteredBaseUrl={setEnteredBaseUrl}
            />
          )}

          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={formData.search_enabled} onChange={(event) => setFormData({ ...formData, search_enabled: event.target.checked })} />
            Allow this persona to request external search context
          </label>
        </section>

        {error && <p role="alert" className="text-sm text-red-500 bg-red-500/10 rounded-lg p-3">{error}</p>}
        <div className="pt-4 flex justify-end gap-4">
          <Link href="/agents" className="px-6 py-2 rounded-lg font-medium hover:bg-muted">Cancel</Link>
          <button type="submit" disabled={loading || providerLoading || !selectedProvider} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
