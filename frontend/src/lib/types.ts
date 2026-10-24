export interface User {
  id: string
  email: string
  is_active: boolean
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface Agent {
  id: string
  workspace_id: string
  name: string
  description: string
  personality?: string | null
  purpose?: string | null
  provider: string
  model_name: string
  allow_fallback: boolean
  fallback_provider?: string | null
  fallback_model?: string | null
  tools?: Record<string, unknown> | null
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface CredentialInfo {
  key_prefix: string
  key_suffix: string
  masked: string
  is_valid: boolean
  last_verified_at?: string | null
  base_url?: string | null
}

export interface ProviderInfo {
  id: string
  display_name?: string
  configured: boolean
  globally_configured?: boolean
  user_configured?: boolean
  requires_key?: boolean
  models: string[]
  official_key_url?: string | null
  credential?: CredentialInfo | null
}


export interface OpenRouterModelInfo {
  id: string
  name: string
  description?: string
  context_length?: number
  is_free: boolean
  tier?: 'free' | 'paid'
  pricing_label?: string
  prompt_price?: number
  completion_price?: number
}

export interface RoutingMatch {
  agent_id: string
  agent_name: string
  score: number
  selected: boolean
  threshold?: number | null
  reason: string
}

export interface RoutingDecision {
  routing_mode: string
  selected_agent_id?: string | null
  selected_agent_name?: string | null
  intent: string
  domain: string
  confidence_score: number
  selection_reason: string
  candidate_scores?: RoutingMatch[]
  routing_strategy: string
  needs_clarification: boolean
  is_fallback: boolean
  routing_latency_ms: number
}

export interface ExecutionEvent {
  node: string
  status: string
  timestamp: string
  provider?: string
  model?: string
  latency_ms?: number
  error?: string | null
}

export interface SearchSource {
  title: string
  content: string
  url: string
}

export interface Execution {
  id: string
  workspace_id: string
  agent_id?: string | null
  conversation_id?: string | null
  input_text: string
  output_text?: string | null
  status: 'PENDING' | 'ROUTING' | 'RETRIEVING' | 'GENERATING' | 'COMPLETED' | 'FAILED'
  routing_mode?: string
  routing_decisions?: {
    mode?: string
    decision?: RoutingDecision
    matches?: RoutingMatch[]
    model_selection?: {
      provider?: string
      model?: string
      is_free_tier?: boolean
      verification_status?: string
      selection_reason?: string
      fallback_candidates?: [string, string][]
    }
    request?: Record<string, unknown>
  } | null
  retrieved_context?: { query?: string; source_count?: number } | null
  requested_provider?: string | null
  requested_model?: string | null
  actual_provider?: string | null
  actual_model?: string | null
  fallback_used: boolean
  search_status?: string | null
  search_sources?: SearchSource[] | null
  node_events?: ExecutionEvent[] | null
  error_category?: string | null
  error_message?: string | null
  latency_ms?: number | null
  created_at: string
  started_at?: string | null
  completed_at?: string | null
}

export interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  failed?: boolean
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'agent'
  content: string
  created_at: string
}

export interface Conversation {
  id: string
  workspace_id: string
  agent_id?: string | null
  title: string
  created_at: string
  updated_at?: string
  messages?: Message[]
}

