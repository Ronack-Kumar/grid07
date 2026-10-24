'use client'

import React, { useEffect, useState } from 'react'
import {
  Compass,
  Code2,
  Database,
  Sparkles,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react'

interface AgentDef {
  id: string
  name: string
  role: string
  detail: string
  accent: string
  accentBorder: string
  accentGlow: string
  accentText: string
  iconBg: string
  icon: React.ElementType
  x: number
  y: number
  pathId: string
  pathD: string
  floatClass: string
  activeTask: string
}

const AGENTS: AgentDef[] = [
  {
    id: 'research',
    name: 'Research Agent',
    role: 'Exa & Tavily Search',
    detail: 'Fact Verification',
    accent: '#10B981',
    accentBorder: 'border-emerald-500/50',
    accentGlow: 'rgba(16, 185, 129, 0.35)',
    accentText: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15 text-emerald-400',
    icon: Compass,
    x: 105,
    y: 75,
    pathId: 'path-research',
    pathD: 'M 280 180 C 205 180, 160 125, 105 75',
    floatClass: 'animate-agent-1',
    activeTask: 'Exa Neural Query',
  },
  {
    id: 'coding',
    name: 'Coding Agent',
    role: 'Syntax & Execution',
    detail: 'Python · TS Specialist',
    accent: '#38BDF8',
    accentBorder: 'border-sky-400/50',
    accentGlow: 'rgba(56, 189, 248, 0.35)',
    accentText: 'text-sky-400',
    iconBg: 'bg-sky-500/15 text-sky-400',
    icon: Code2,
    x: 455,
    y: 75,
    pathId: 'path-coding',
    pathD: 'M 280 180 C 355 180, 400 125, 455 75',
    floatClass: 'animate-agent-2',
    activeTask: 'AST Code Synth',
  },
  {
    id: 'data',
    name: 'Data Agent',
    role: 'Postgres & Vector Memory',
    detail: 'Embeddings Retrieval',
    accent: '#A78BFA',
    accentBorder: 'border-purple-400/50',
    accentGlow: 'rgba(167, 139, 250, 0.35)',
    accentText: 'text-purple-400',
    iconBg: 'bg-purple-500/15 text-purple-400',
    icon: Database,
    x: 105,
    y: 285,
    pathId: 'path-data',
    pathD: 'M 280 180 C 205 180, 160 235, 105 285',
    floatClass: 'animate-agent-3',
    activeTask: 'Vector Memory Sync',
  },
  {
    id: 'custom',
    name: 'Custom Persona',
    role: 'Domain Expert',
    detail: 'Fine-tuned Prompt',
    accent: '#F59E0B',
    accentBorder: 'border-amber-400/50',
    accentGlow: 'rgba(245, 158, 11, 0.35)',
    accentText: 'text-amber-400',
    iconBg: 'bg-amber-500/15 text-amber-400',
    icon: Sparkles,
    x: 455,
    y: 285,
    pathId: 'path-custom',
    pathD: 'M 280 180 C 355 180, 400 235, 455 285',
    floatClass: 'animate-agent-4',
    activeTask: 'Semantic Persona Tone',
  },
]

export function ConnectedAgentNetwork() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [packetStep, setPacketStep] = useState(0)

  // Organic workflow cycling between agents every 3.4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Pause updates if document is hidden to conserve GPU/CPU
      if (document.hidden) return

      setActiveIdx((prev) => (prev + 1) % AGENTS.length)
      setPacketStep((prev) => prev + 1)
    }, 3400)

    return () => clearInterval(interval)
  }, [])

  const currentActiveAgent = AGENTS[activeIdx]

  return (
    <div className="relative w-full max-w-[560px] mx-auto select-none">
      {/* Ambient background bloom directly centered on orchestrator */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[90px] pointer-events-none opacity-40 transition-colors duration-1000"
        style={{
          background: `radial-gradient(circle, ${currentActiveAgent.accentGlow} 0%, rgba(199, 166, 106, 0.15) 45%, transparent 70%)`,
        }}
      />

      {/* SVG Canvas for High-Precision Curved Connections and Flowing Light Packets */}
      <div className="relative w-full aspect-[560/360]">
        <svg
          viewBox="0 0 560 360"
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        >
          <defs>
            {/* Soft Glow Filter for Active Path */}
            <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient definition for active connection */}
            <linearGradient id="active-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C7A66A" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#DFC492" stopOpacity="1" />
              <stop offset="100%" stopColor={currentActiveAgent.accent} stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* 1. Base Graphite Inactive Lines */}
          {AGENTS.map((agent, i) => (
            <path
              key={`base-${agent.id}`}
              id={agent.pathId}
              d={agent.pathD}
              fill="none"
              stroke={i === activeIdx ? 'rgba(199, 166, 106, 0.45)' : 'rgba(255, 255, 255, 0.08)'}
              strokeWidth={i === activeIdx ? '2' : '1.5'}
              strokeDasharray={i === activeIdx ? '6 6' : 'none'}
              className={i === activeIdx ? 'animate-dash-flow' : ''}
              style={{ transition: 'stroke 0.8s ease, stroke-width 0.8s ease' }}
            />
          ))}

          {/* 2. Active Illuminated Highway with Glow */}
          <path
            key={`active-${currentActiveAgent.id}-${packetStep}`}
            d={currentActiveAgent.pathD}
            fill="none"
            stroke="url(#active-line-gradient)"
            strokeWidth="2.5"
            filter="url(#gold-glow)"
            className="opacity-90 transition-all duration-700"
          />

          {/* 3. Continuously Flowing Light Packets */}
          {AGENTS.map((agent, i) => {
            const isActive = i === activeIdx
            return (
              <g key={`packets-${agent.id}`}>
                {/* Main Traveling Packet from Center to Agent */}
                <circle r={isActive ? '4' : '2.5'} fill={isActive ? '#FFFFFF' : '#C7A66A'} opacity={isActive ? '1' : '0.45'}>
                  <animateMotion
                    path={agent.pathD}
                    dur={isActive ? '2.2s' : '4.5s'}
                    repeatCount="indefinite"
                    keyPoints="0;1"
                    keyTimes="0;1"
                  />
                </circle>

                {/* Secondary Return Echo Packet from Agent to Center */}
                <circle r="2" fill={isActive ? currentActiveAgent.accent : 'rgba(255,255,255,0.4)'} opacity={isActive ? '0.75' : '0.2'}>
                  <animateMotion
                    path={agent.pathD}
                    dur={isActive ? '2.8s' : '5.5s'}
                    repeatCount="indefinite"
                    keyPoints="1;0"
                    keyTimes="0;1"
                    begin="0.9s"
                  />
                </circle>
              </g>
            )
          })}
        </svg>

        {/* =========================================================================
            CENTRAL ORCHESTRATION NODE (Grid07 Core)
            ========================================================================= */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-default"
          style={{ width: '150px' }}
        >
          {/* Concentric Expanding Radar Pings */}
          <div className="absolute inset-0 -m-3 rounded-full border border-[#C7A66A]/30 animate-radar-ping pointer-events-none" />
          <div className="absolute inset-0 -m-6 rounded-full border border-[#DFC492]/20 animate-radar-ping pointer-events-none" style={{ animationDelay: '1.2s' }} />

          {/* Central Core Emblem */}
          <div className="relative group">
            <div className="w-16 h-16 rounded-2xl bg-[#14151B] border border-[#C7A66A]/60 flex items-center justify-center shadow-xl shadow-black/80 animate-gold-pulse relative z-10 transition-transform duration-300 group-hover:scale-105">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#201D17] to-[#121318] border border-[#C7A66A]/40 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-[#DFC492]" />
              </div>

              {/* Online Pulse Status Pip */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#10B981] border-2 border-[#14151B]" />
              </span>
            </div>
          </div>

          {/* Core Labels & Live Routing Ticker */}
          <div className="mt-3 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1A1A22] border border-white/10 text-[10px] font-semibold text-[#F2EFE8] tracking-wider uppercase">
              <Layers className="w-2.5 h-2.5 text-[#C7A66A]" />
              Grid07 Core
            </div>
            <div className="text-[11px] font-medium text-[#C2BEB4] mt-1 flex items-center justify-center gap-1">
              <span>Task Dispatch</span>
              <ArrowRight className="w-2.5 h-2.5 text-[#C7A66A] animate-pulse" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            PERIPHERAL CONNECTED AGENT CARDS
            ========================================================================= */}
        {AGENTS.map((agent, i) => {
          const isActive = i === activeIdx
          const IconComponent = agent.icon

          // Compute absolute positioning classes based on coordinate layout
          const isLeft = agent.x < 280
          const isTop = agent.y < 180

          return (
            <div
              key={agent.id}
              className={`absolute z-10 ${agent.floatClass} transition-all duration-700`}
              style={{
                left: isLeft ? '0%' : 'auto',
                right: !isLeft ? '0%' : 'auto',
                top: isTop ? '2%' : 'auto',
                bottom: !isTop ? '4%' : 'auto',
                width: '180px',
              }}
            >
              <div
                className={`p-3 rounded-xl bg-[#121319]/90 backdrop-blur-md border transition-all duration-500 shadow-lg ${
                  isActive
                    ? `${agent.accentBorder} shadow-2xl scale-[1.03]`
                    : 'border-white/10 shadow-black/50 hover:border-white/20'
                }`}
                style={{
                  boxShadow: isActive ? `0 0 20px -3px ${agent.accentGlow}` : undefined,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      agent.iconBg
                    } ${isActive ? 'scale-110' : ''}`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-[#F2EFE8] truncate">
                        {agent.name}
                      </h4>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#A8A398] truncate mt-0.5">
                      {agent.role}
                    </p>
                  </div>
                </div>

                {/* Status Indicator Bar */}
                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[9px]">
                  <span className="text-[#8C867B]">{agent.detail}</span>
                  <span
                    className={`font-mono font-medium ${
                      isActive ? agent.accentText : 'text-[#635D52]'
                    }`}
                  >
                    {isActive ? agent.activeTask : 'Standby'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Network Live Activity Status Footer */}
      <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg bg-[#14151C]/75 border border-white/5 text-[11px] text-[#A8A398]">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Active Swarm: <strong className="text-[#F2EFE8]">4 Autonomous Agents</strong></span>
        </div>
        <div className="font-mono text-[10px] text-[#C7A66A]">
          Intelligent Routing · 0ms Drop
        </div>
      </div>
    </div>
  )
}
