import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  Zap,
  Shield,
  Search,
  Database,
  Fingerprint,
  Lock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1A1A1E] selection:bg-[#B89355]/20 relative font-sans">
      {/* Top Header Navigation */}
      <header className="px-6 lg:px-14 h-20 flex items-center justify-between border-b border-[#E8E3D8] bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center gap-2.5 group" href="/">
          <div className="w-8 h-8 rounded-xl bg-[#0F0F13] flex items-center justify-center text-[#D8BC88] shadow-xs transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-[#1A1A1E] leading-none">GRID07</span>
            <span className="text-[9px] font-semibold text-[#8C887E] tracking-wider uppercase mt-0.5">
              Multi-Expert AI Workspace
            </span>
          </div>
        </Link>
        <nav className="flex gap-6 sm:gap-8 items-center">
          <Link
            className="text-sm font-semibold text-[#666055] hover:text-[#1A1A1E] transition-colors"
            href="#features"
          >
            Architecture
          </Link>
          <Link
            className="text-sm font-semibold text-[#666055] hover:text-[#1A1A1E] transition-colors"
            href="#security"
          >
            Security
          </Link>
          <Link
            className="text-xs sm:text-sm font-semibold bg-[#1A1A1E] hover:bg-black text-white px-5 py-2.5 rounded-xl transition-all shadow-xs"
            href="/chat"
          >
            Launch Interface
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-28 lg:py-36 px-4 md:px-6 relative overflow-hidden flex flex-col items-center">
          {/* Subtle warm ambient background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#B89355]/8 rounded-full blur-[140px] -z-10 pointer-events-none" />

          <div className="container mx-auto flex flex-col items-center text-center space-y-8 max-w-5xl">
            {/* Status Pill */}
            <div className="inline-flex items-center rounded-full border border-[#D5CDBD] bg-white px-4 py-1.5 text-xs shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-[#10B981] mr-2 animate-pulse" />
              <span className="text-[#555046] font-medium">
                GRID07 Semantic Routing Engine Online • 5 Verified Free-Tier Personas
              </span>
            </div>

            {/* Editorial Headline */}
            <div className="space-y-4 max-w-4xl">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight text-[#1A1A1E] leading-[1.06]">
                Cognitive Routing <br />
                <span className="text-[#876F43] font-serif italic">Infrastructure.</span>
              </h1>
              <p className="mx-auto max-w-[720px] text-[#635D52] text-base sm:text-lg md:text-xl font-normal leading-relaxed pt-2">
                A semantic evaluation engine that routes queries to verified domain personas,
                orchestrates context autonomously, and synthesizes answers securely using free-tier models.
              </p>
            </div>

            {/* AI Architecture Pipeline Visualization */}
            <div className="w-full max-w-5xl mt-6 p-2">
              <div className="bg-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-3 overflow-x-auto border border-[#E6E1D4] shadow-xs">
                <PipelineNode icon={<Fingerprint className="w-5 h-5" />} title="Input" active />
                <PipelineEdge />
                <PipelineNode
                  icon={<Zap className="w-5 h-5 text-[#B89355]" />}
                  title="Router"
                  color="text-[#B89355]"
                  active
                />
                <PipelineEdge />
                <PipelineNode icon={<Bot className="w-5 h-5" />} title="Persona" />
                <PipelineEdge />
                <PipelineNode icon={<Database className="w-5 h-5" />} title="Context" />
                <PipelineEdge />
                <PipelineNode icon={<Search className="w-5 h-5" />} title="Search" />
                <PipelineEdge />
                <PipelineNode icon={<Shield className="w-5 h-5" />} title="Reasoning" />
                <PipelineEdge />
                <PipelineNode icon={<ArrowRight className="w-5 h-5" />} title="Output" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#1A1A1E] px-8 text-sm font-semibold text-white shadow-xs transition-all hover:bg-black gap-2"
                href="/chat"
              >
                Access Auto Chat <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#D5CDBD] bg-white px-6 text-sm font-semibold text-[#3D382F] hover:bg-[#FAF8F5] transition-colors"
                href="/playground"
              >
                Developer Playground
              </Link>
            </div>
          </div>
        </section>

        {/* System Architecture Section */}
        <section id="features" className="w-full py-24 border-y border-[#E8E3D8] bg-[#F7F4ED] relative z-10">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16 space-y-2">
              <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-[#1A1A1E]">
                System Architecture
              </h2>
              <p className="text-[#6E685E] text-sm sm:text-base max-w-xl mx-auto">
                The core modules powering Grid07&apos;s multi-expert routing and execution pipeline.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<Zap className="w-5 h-5" />}
                title="Semantic Routing"
                description="Embeds incoming user requests and evaluates cosine similarity against persona definitions to dynamically dispatch to the optimal expert."
              />
              <FeatureCard
                icon={<Database className="w-5 h-5" />}
                title="Contextual Memory"
                description="Stitches the complete historical conversation thread and newly retrieved information directly into the execution context for coherent reasoning."
              />
              <FeatureCard
                icon={<Search className="w-5 h-5" />}
                title="Autonomous Search"
                description="Agents determine if existing context is sufficient, autonomously formulating search queries to augment their knowledge only when required."
              />
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="w-full py-24 relative z-10">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="rounded-3xl p-8 md:p-12 lg:p-16 flex flex-col md:flex-row items-center gap-10 border border-red-200/80 bg-red-50/40 shadow-xs">
              <div className="flex-1 space-y-5">
                <div className="inline-flex items-center rounded-full bg-red-100 px-3.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
                  <Lock className="w-3.5 h-3.5 mr-1.5" /> Security First
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-[#1A1A1E]">
                  Prompt Injection Defense
                </h2>
                <p className="text-[#4D473E] text-base leading-relaxed">
                  GRID07 treats all external content as untrusted. A two-layered defense architecture utilizes
                  pre-filtering and system-level persona locks to prevent adversarial overrides.
                </p>
                <ul className="space-y-2.5 text-sm text-[#38332A] pt-2">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Malicious instruction pre-filtering and delimiter containment</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Immutable persona system instructions isolated from user input</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Structured, safe reasoning extraction with normalized errors</span>
                  </li>
                </ul>
              </div>

              {/* Terminal-Style Security Illustration */}
              <div className="flex-1 w-full max-w-lg">
                <div className="bg-[#0F0F13] rounded-2xl border border-[#2A2A38] p-6 font-mono text-xs text-[#E4DFD3] leading-relaxed shadow-xl space-y-2">
                  <div className="flex items-center gap-1.5 pb-3 border-b border-[#232330]">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="text-[10px] text-[#716D64] ml-2">security_audit.log</span>
                  </div>
                  <p className="text-[#8E8B83]">&gt; [SECURITY SCAN] Incoming payload inspected...</p>
                  <p className="text-amber-400">&gt; Evaluating: &quot;ignore all previous instructions&quot;</p>
                  <p className="text-red-400 font-semibold">&gt; WARNING: Injection pattern identified. Engaging Layer 1 filter.</p>
                  <p className="text-emerald-400">&gt; SYSTEM LOCK: Persona boundary sealed. Prompt locked.</p>
                  <p className="text-[#C5C0B4]">&gt; Execution completed safely via isolated sandbox.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E3D8] py-8 px-6 bg-[#FAF8F5] text-center text-xs text-[#8C867B]">
        Grid07 Intelligent Expert Platform • All rights reserved.
      </footer>
    </div>
  )
}

function PipelineNode({
  icon,
  title,
  active = false,
  color = 'text-[#1A1A1E]',
}: {
  icon: React.ReactNode
  title: string
  active?: boolean
  color?: string
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 min-w-[75px] transition-all duration-300 ${
        active ? 'opacity-100 scale-105' : 'opacity-70'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
          active
            ? 'bg-[#FAF8F5] border-[#B89355] text-[#B89355] shadow-xs'
            : 'bg-white border-[#E0DBD0] text-[#4A453C]'
        } ${color}`}
      >
        {icon}
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#3E3A32]">{title}</span>
    </div>
  )
}

function PipelineEdge() {
  return (
    <div className="hidden md:flex h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#D5CDBD] to-transparent min-w-[24px]" />
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col space-y-3.5 p-8 bg-white rounded-2xl border border-[#E6E1D4] shadow-2xs hover:border-[#B89355]/60 hover:shadow-xs transition-all">
      <div className="p-3 bg-[#FAF8F5] border border-[#E2DDD0] rounded-xl w-fit text-[#B89355]">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[#1A1A1E] font-serif">{title}</h3>
      <p className="text-sm text-[#666055] leading-relaxed">{description}</p>
    </div>
  )
}
