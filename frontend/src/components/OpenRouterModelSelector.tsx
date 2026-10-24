'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronsUpDown,
  Search,
  Sparkles,
  X,
  Loader2,
  Cpu,
  Info,
} from 'lucide-react'

import type { OpenRouterModelInfo } from '@/lib/types'

export interface FormattedModelDisplay {
  primaryName: string
  vendor: string
  secondaryText: string
  contextText: string
  isRouter: boolean
  isFree: boolean
}

export function formatOpenRouterModel(model?: OpenRouterModelInfo | null): FormattedModelDisplay {
  if (!model) {
    return {
      primaryName: 'Select an OpenRouter model...',
      vendor: '',
      secondaryText: '',
      contextText: '',
      isRouter: false,
      isFree: false,
    }
  }

  if (model.id === 'openrouter/free') {
    return {
      primaryName: 'Auto-select a free model',
      vendor: 'OpenRouter',
      secondaryText: 'OpenRouter · Free (Dynamic Router)',
      contextText: model.context_length ? `${Math.round(model.context_length / 1024)}k ctx` : '',
      isRouter: true,
      isFree: true,
    }
  }

  let vendor = ''
  let primaryName = model.name || model.id

  if (primaryName.includes(':')) {
    const parts = primaryName.split(':')
    vendor = parts[0].trim()
    primaryName = parts.slice(1).join(':').trim()
  } else if (model.id.includes('/')) {
    vendor = model.id.split('/')[0].replace(/[-_]/g, ' ')
    vendor = vendor.charAt(0).toUpperCase() + vendor.slice(1)
  }

  // Strip trailing (free)/(Free) and redundant prefixes
  primaryName = primaryName
    .replace(/\s*\((free|Free|FREE)\)\s*$/, '')
    .replace(/^\[(free|Free|FREE)\]\s*/, '')
    .replace(new RegExp(`^${vendor}[:\\s]+`, 'i'), '')
    .trim()

  if (!primaryName) {
    primaryName = model.id
  }

  const contextText = model.context_length
    ? model.context_length >= 1024
      ? `${Math.round(model.context_length / 1024)}k ctx`
      : `${model.context_length} ctx`
    : ''

  const pricePart = model.is_free ? 'Free' : (model.pricing_label || 'Paid')
  const secondaryText = vendor ? `${vendor} · ${pricePart}` : pricePart

  return {
    primaryName,
    vendor,
    secondaryText,
    contextText,
    isRouter: false,
    isFree: model.is_free,
  }
}

const DYNAMIC_FREE_ROUTER_MODEL: OpenRouterModelInfo = {
  id: 'openrouter/free',
  name: 'Auto-select a free model',
  description: 'Automatically routes requests to currently available high-uptime free models on OpenRouter.',
  context_length: 131072,
  is_free: true,
  tier: 'free',
  pricing_label: 'Free',
}

interface OpenRouterModelSelectorProps {
  models: OpenRouterModelInfo[]
  selectedModelId: string
  onSelectModel: (modelId: string) => void
  loading?: boolean
  disabled?: boolean
}

export function OpenRouterModelSelector({
  models,
  selectedModelId,
  onSelectModel,
  loading = false,
  disabled = false,
}: OpenRouterModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [freeOnly, setFreeOnly] = useState(true)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Find currently selected model
  const selectedModel = useMemo(() => {
    if (selectedModelId === 'openrouter/free') {
      return models.find((m) => m.id === 'openrouter/free') || DYNAMIC_FREE_ROUTER_MODEL
    }
    return models.find((m) => m.id === selectedModelId) || null
  }, [models, selectedModelId])

  const selectedDisplay = useMemo(() => {
    if (!selectedModel && selectedModelId) {
      // Model id saved but not yet found in current list
      return {
        primaryName: selectedModelId,
        vendor: 'Saved Selection',
        secondaryText: 'Saved Selection',
        contextText: '',
        isRouter: false,
        isFree: selectedModelId.includes(':free') || selectedModelId === 'openrouter/free',
      }
    }
    return formatOpenRouterModel(selectedModel)
  }, [selectedModel, selectedModelId])

  // Count models including dynamic router
  const hasRouterInCatalog = useMemo(() => models.some((m) => m.id === 'openrouter/free'), [models])
  const totalFreeCount = useMemo(() => {
    const count = models.filter((m) => m.is_free).length
    return hasRouterInCatalog ? count : count + 1
  }, [models, hasRouterInCatalog])
  const totalCount = useMemo(() => {
    return hasRouterInCatalog ? models.length : models.length + 1
  }, [models, hasRouterInCatalog])

  // Filtered models
  const filteredModels = useMemo(() => {
    let result = models
    if (freeOnly) {
      result = result.filter((m) => m.is_free)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q))
      )
    }
    return result
  }, [models, freeOnly, searchQuery])

  // Router model vs standard models in filtered results
  const routerModel = useMemo(() => {
    const existing = models.find((m) => m.id === 'openrouter/free')
    const candidate = existing || DYNAMIC_FREE_ROUTER_MODEL

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matches =
        candidate.name.toLowerCase().includes(q) ||
        candidate.id.toLowerCase().includes(q) ||
        (candidate.description && candidate.description.toLowerCase().includes(q)) ||
        'auto dynamic free router'.includes(q)
      if (!matches) return null
    }
    return candidate
  }, [models, searchQuery])

  const individualModels = useMemo(() => {
    return filteredModels.filter((m) => m.id !== 'openrouter/free')
  }, [filteredModels])

  // All actionable selectable items in ordered sequence for keyboard navigation
  const selectableItems = useMemo(() => {
    const items: OpenRouterModelInfo[] = []
    if (routerModel) items.push(routerModel)
    items.push(...individualModels)
    return items
  }, [routerModel, individualModels])

  // Click outside listener to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = () => {
    const selIdx = selectableItems.findIndex((m) => m.id === selectedModelId)
    setHighlightedIndex(selIdx >= 0 ? selIdx : 0)
    setIsOpen(true)
  }

  // Auto-focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])


  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleOpen()
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        const next = prev + 1 >= selectableItems.length ? 0 : prev + 1
        scrollItemIntoView(next)
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        const next = prev - 1 < 0 ? Math.max(0, selectableItems.length - 1) : prev - 1
        scrollItemIntoView(next)
        return next
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectableItems[highlightedIndex]) {
        handleSelect(selectableItems[highlightedIndex].id)
      }
    }
  }

  const scrollItemIntoView = (index: number) => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('[data-model-item]')
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' })
    }
  }

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative w-full text-foreground" onKeyDown={handleKeyDown}>
      {/* Compact Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="openrouter-models-panel"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className={`w-full px-3.5 py-2.5 rounded-lg border text-left flex items-center justify-between gap-2.5 transition-all outline-none bg-background ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border hover:border-border/80 focus:ring-2 focus:ring-primary/20'

        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate text-foreground">
              {selectedDisplay.primaryName}
            </span>
            {selectedDisplay.isRouter ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                <Sparkles className="w-2.5 h-2.5" /> ROUTER
              </span>
            ) : selectedDisplay.isFree ? (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                FREE
              </span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                PAID
              </span>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2 mt-0.5">
            <span>{selectedDisplay.secondaryText}</span>
            {selectedDisplay.contextText && (
              <>
                <span>•</span>
                <span className="font-mono">{selectedDisplay.contextText}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <ChevronsUpDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Bounded Popover Panel */}
      {isOpen && (
        <div
          id="openrouter-models-panel"
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-border bg-popover/95 backdrop-blur-md shadow-2xl p-2.5 space-y-2.5 animate-in fade-in-0 zoom-in-95 duration-100 max-h-[440px] flex flex-col"
        >
          {/* Header Controls: Search Input */}
          <div className="relative shrink-0">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by model name or ID (e.g. llama, cohere, flint)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-background border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs & Count Header */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs shrink-0">
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50">
              <button
                type="button"
                onClick={() => setFreeOnly(true)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  freeOnly
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                100% Free ({totalFreeCount})
              </button>

              <button
                type="button"
                onClick={() => setFreeOnly(false)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  !freeOnly
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Models ({totalCount})
              </button>
            </div>

            <span className="text-[11px] text-muted-foreground font-medium">
              {filteredModels.length} {filteredModels.length === 1 ? 'model' : 'models'}
            </span>
          </div>

          {/* Scrollable Model List */}
          <div
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="overflow-y-auto max-h-[290px] pr-1 space-y-2 overscroll-contain divide-y divide-border/20"
          >
            {/* 1. Dynamic Free Router Section */}
            {routerModel && (
              <div className="pb-1.5">
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-2 py-1">
                  Dynamic Free Router
                </div>
                <div
                  data-model-item
                  role="option"
                  aria-selected={selectedModelId === routerModel.id}
                  onClick={() => handleSelect(routerModel.id)}
                  className={`group p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    selectedModelId === routerModel.id
                      ? 'bg-primary/10 border-primary/40 text-foreground'
                      : highlightedIndex === 0
                      ? 'bg-muted/80 border-border text-foreground'
                      : 'bg-muted/20 hover:bg-muted/60 border-border/60 text-foreground'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="font-semibold text-xs text-foreground">
                        {routerModel.name}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        ROUTER
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        FREE
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Routes automatically to an available free model across OpenRouter. OpenRouter may select different compatible free models across requests.
                    </p>
                  </div>

                  <div className="shrink-0 mt-0.5">
                    {selectedModelId === routerModel.id ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Individual Model Items */}
            <div className="pt-1.5 space-y-1">
              {routerModel && individualModels.length > 0 && (
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-2 py-1">
                  Individual Models ({individualModels.length})
                </div>
              )}

              {individualModels.map((model) => {
                const formatted = formatOpenRouterModel(model)
                const isSelected = selectedModelId === model.id
                const globalIndex = selectableItems.findIndex((m) => m.id === model.id)
                const isHighlighted = highlightedIndex === globalIndex

                return (
                  <div
                    key={model.id}
                    data-model-item
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(model.id)}
                    className={`px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs ${
                      isSelected
                        ? 'bg-primary/10 text-foreground font-medium'
                        : isHighlighted
                        ? 'bg-muted/80 text-foreground'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate text-foreground">
                          {formatted.primaryName}
                        </span>
                        {model.is_free ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            FREE
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                            PAID
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 truncate mt-0.5">
                        <span>{formatted.secondaryText}</span>
                        {formatted.contextText && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px]">{formatted.contextText}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                )
              })}

              {selectableItems.length === 0 && (
                <div className="text-center py-8 px-4 space-y-2">
                  <Cpu className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-medium text-foreground">
                    No models found matching &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {freeOnly
                      ? 'Try switching to "All Models" or adjusting your search term.'
                      : 'Try adjusting your search query.'}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-xs px-3 py-1 bg-muted hover:bg-muted/80 rounded-md text-foreground font-medium transition-colors"
                      >
                        Clear search
                      </button>
                    )}
                    {freeOnly && (
                      <button
                        type="button"
                        onClick={() => setFreeOnly(false)}
                        className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity"
                      >
                        View All Models
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Info */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground px-1 shrink-0">
            <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
            <span className="font-mono truncate max-w-[150px]">{selectedModelId}</span>
          </div>
        </div>
      )}

      {/* Advisory when paid model is chosen */}
      {selectedModel && !selectedModel.is_free && (
        <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            Notice: &ldquo;{selectedDisplay.primaryName}&rdquo; is a paid model ({selectedModel.pricing_label}). Inference will consume paid OpenRouter credits.
          </span>
        </div>
      )}

      {/* Free Router Explanation when openrouter/free is chosen */}
      {selectedModelId === 'openrouter/free' && (
        <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
          <span>
            Dynamic Free Router active: OpenRouter will select an available compatible free model for each request. The specific model used is reported in execution traces.
          </span>
        </div>
      )}
    </div>
  )
}
