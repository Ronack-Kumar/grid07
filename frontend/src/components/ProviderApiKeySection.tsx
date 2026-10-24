'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink, KeyRound, Loader2, RefreshCw, Trash2 } from 'lucide-react'

import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import type { ProviderInfo } from '@/lib/types'

interface ProviderApiKeySectionProps {
  provider: ProviderInfo
  onProviderUpdated: () => Promise<void> | void
  onModelDetected?: (models: string[]) => void
  enteredKey: string
  setEnteredKey: (val: string) => void
  enteredBaseUrl: string
  setEnteredBaseUrl: (val: string) => void
}

export function ProviderApiKeySection({
  provider,
  onProviderUpdated,
  onModelDetected,
  enteredKey,
  setEnteredKey,
  enteredBaseUrl,
  setEnteredBaseUrl,
}: ProviderApiKeySectionProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  const hasSavedCredential = Boolean(provider.credential && !isReplacing)

  const handleTestConnection = async () => {
    setStatusMessage(null)
    setLoadingAction('test')
    try {
      const payload: { provider: string; api_key?: string; base_url?: string } = {
        provider: provider.id,
      }
      if (enteredKey.trim()) {
        payload.api_key = enteredKey.trim()
      }
      if (provider.id === 'openai_compatible' && enteredBaseUrl.trim()) {
        payload.base_url = enteredBaseUrl.trim()
      }

      const res = await api.post<{
        valid: boolean
        message: string
        models?: string[]
      }>('/llm/credentials/test', payload)

      if (res.data.valid) {
        setStatusMessage({
          type: 'success',
          text: `Connection verified successfully! ${res.data.message}`,
        })
        if (res.data.models && res.data.models.length > 0 && onModelDetected) {
          onModelDetected(res.data.models)
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: res.data.message || 'Validation failed. Please verify your API key.',
        })
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: getApiErrorMessage(err, 'Failed to test connection to provider.'),
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const handleSaveCredential = async () => {
    if (!enteredKey.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter an API key before saving.' })
      return
    }
    if (provider.id === 'openai_compatible' && !enteredBaseUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'Base URL is required for OpenAI-compatible provider.' })
      return
    }

    setStatusMessage(null)
    setLoadingAction('save')
    try {
      const res = await api.post<{
        status: string
        is_valid: boolean
        message: string
        masked: string
        detected_models?: string[]
      }>('/llm/credentials', {
        provider: provider.id,
        api_key: enteredKey.trim(),
        base_url: provider.id === 'openai_compatible' ? enteredBaseUrl.trim() : undefined,
        validate: true,
      })

      setStatusMessage({
        type: 'success',
        text: `Key saved and encrypted securely. (${res.data.masked})`,
      })
      setEnteredKey('')
      setIsReplacing(false)
      if (res.data.detected_models && res.data.detected_models.length > 0 && onModelDetected) {
        onModelDetected(res.data.detected_models)
      }
      await onProviderUpdated()
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: getApiErrorMessage(err, 'Failed to save and verify credential.'),
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const handleRemoveCredential = async () => {
    if (!confirm(`Are you sure you want to remove your personal key for ${provider.display_name || provider.id}?`)) {
      return
    }
    setStatusMessage(null)
    setLoadingAction('remove')
    try {
      await api.delete(`/llm/credentials/${provider.id}`)
      setStatusMessage({
        type: 'info',
        text: `Personal key for ${provider.display_name || provider.id} has been removed.`,
      })
      setEnteredKey('')
      setIsReplacing(false)
      await onProviderUpdated()
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: getApiErrorMessage(err, 'Failed to remove credential.'),
      })
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-4 transition-all">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Provider API Key
          </h3>
          {hasSavedCredential ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> Personal key configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Requires API key
            </span>
          )}
        </div>

        {provider.official_key_url && (
          <a
            href={provider.official_key_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            Get {provider.display_name || provider.id} Key <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {hasSavedCredential
          ? `Your personal key is encrypted at rest using server-side AES encryption and used only for your persona executions.`
          : `${provider.display_name || provider.id} is not configured globally. Provide your API key to enable this provider. Keys are encrypted at rest with server-side secrets and never exposed in browser storage, logs, or execution traces.`}
      </p>

      {/* When Key is Already Saved */}
      {hasSavedCredential && provider.credential ? (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border text-xs">
            <div className="space-y-0.5">
              <div className="text-muted-foreground font-medium">Configured Key:</div>
              <div className="font-mono text-sm tracking-wider font-semibold text-foreground">
                {provider.credential.masked}
              </div>
              {provider.credential.base_url && (
                <div className="text-[11px] text-muted-foreground font-mono mt-1">
                  Base URL: {provider.credential.base_url}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={Boolean(loadingAction)}
                onClick={handleTestConnection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors disabled:opacity-50"
              >
                {loadingAction === 'test' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Test connection
              </button>

              <button
                type="button"
                disabled={Boolean(loadingAction)}
                onClick={() => {
                  setIsReplacing(true)
                  setStatusMessage(null)
                  if (provider.credential?.base_url) {
                    setEnteredBaseUrl(provider.credential.base_url)
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors disabled:opacity-50"
              >
                Replace key
              </button>

              <button
                type="button"
                disabled={Boolean(loadingAction)}
                onClick={handleRemoveCredential}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400 border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-50"
                title="Remove personal key"
              >
                {loadingAction === 'remove' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* When Inputting New or Replacement Key */
        <div className="space-y-3 pt-1">
          {provider.id === 'openai_compatible' && (
            <label className="grid gap-1 text-xs font-medium text-foreground">
              Base URL (e.g. https://api.together.xyz/v1)
              <input
                type="url"
                placeholder="https://api.example.com/v1"
                value={enteredBaseUrl}
                onChange={(e) => setEnteredBaseUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </label>
          )}

          <label className="grid gap-1 text-xs font-medium text-foreground">
            API Key
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={`Enter your ${provider.display_name || provider.id} API key...`}
                value={enteredKey}
                onChange={(e) => setEnteredKey(e.target.value)}
                className="w-full px-3 py-2 pr-10 text-xs bg-background border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showPassword ? 'Hide API key' : 'Show API key'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={Boolean(loadingAction) || !enteredKey.trim()}
                onClick={handleTestConnection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors disabled:opacity-50"
              >
                {loadingAction === 'test' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Test connection
              </button>

              <button
                type="button"
                disabled={Boolean(loadingAction) || !enteredKey.trim()}
                onClick={handleSaveCredential}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {loadingAction === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Key
              </button>

              {isReplacing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReplacing(false)
                    setEnteredKey('')
                    setStatusMessage(null)
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              )}
            </div>

            <span className="text-[11px] text-muted-foreground">
              You can also proceed to save the persona directly.
            </span>
          </div>
        </div>
      )}

      {/* Status Feedback */}
      {statusMessage && (
        <div
          role="alert"
          className={`flex items-start gap-2 p-3 rounded-lg text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
              : statusMessage.type === 'error'
              ? 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
              : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  )
}
