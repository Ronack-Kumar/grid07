import Link from 'next/link'
import { ArrowRight, Bot, Zap, Shield, Search, Database, Fingerprint, Lock } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30 relative">
      <div className="absolute inset-0 grid-bg -z-10" />
      
      <header className="px-6 lg:px-14 h-20 flex items-center border-b border-white/5 glass sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2 group" href="#">
          <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">GRID07</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-white transition-colors text-muted-foreground" href="#features">
            Architecture
          </Link>
          <Link className="text-sm font-medium hover:text-white transition-colors text-muted-foreground" href="#security">
            Security
          </Link>
          <Link 
            className="text-sm font-medium bg-white text-black px-4 py-2 rounded-md hover:bg-white/90 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
            href="/login"
          >
            Launch Interface
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-24 md:py-32 lg:py-48 px-4 md:px-6 relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
          
          <div className="container mx-auto flex flex-col items-center text-center space-y-12">
            <div className="space-y-6 max-w-4xl">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm mb-4 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                <span className="text-white font-medium">GRID07 Engine Online</span>
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40">
                Cognitive Routing <br/> Infrastructure
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-2xl/relaxed">
                A semantic evaluation engine that routes requests to specialized personas, gathers context autonomously, and synthesizes output securely.
              </p>
            </div>

            {/* AI Architecture Visualization */}
            <div className="w-full max-w-5xl mt-12 p-1">
              <div className="glass-card rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-4 overflow-x-auto">
                <PipelineNode icon={<Fingerprint />} title="Input" active />
                <PipelineEdge />
                <PipelineNode icon={<Zap />} title="Router" color="text-route-active" active />
                <PipelineEdge />
                <PipelineNode icon={<Bot />} title="Persona" />
                <PipelineEdge />
                <PipelineNode icon={<Database />} title="Context" />
                <PipelineEdge />
                <PipelineNode icon={<Search />} title="Search" />
                <PipelineEdge />
                <PipelineNode icon={<Shield />} title="Reasoning" />
                <PipelineEdge />
                <PipelineNode icon={<ArrowRight />} title="Output" />
              </div>
            </div>

            <div className="space-x-4 mt-8">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-md bg-white px-8 text-sm font-medium text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-105 gap-2"
                href="/login"
              >
                Access System <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-24 border-y border-white/5 bg-black/40 backdrop-blur-sm relative z-10">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">System Architecture</h2>
              <p className="mt-4 text-muted-foreground">The core components powering GRID07</p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
              <FeatureCard 
                icon={<Zap />}
                title="Semantic Routing"
                description="Embeds incoming requests and evaluates cosine similarity against persona definitions to dynamically select the optimal processing route."
              />
              <FeatureCard 
                icon={<Database />}
                title="Contextual Memory"
                description="Stitches the complete historical thread and newly retrieved information directly into the context window for coherent, long-term reasoning."
              />
              <FeatureCard 
                icon={<Search />}
                title="Autonomous Search"
                description="Agents determine if their existing context is sufficient, autonomously formulating search queries to augment their knowledge only when necessary."
              />
            </div>
          </div>
        </section>

        <section id="security" className="w-full py-24 relative z-10">
          <div className="container mx-auto px-4 md:px-6">
            <div className="glass-card rounded-3xl p-8 md:p-12 lg:p-16 flex flex-col md:flex-row items-center gap-12 border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-500 border border-red-500/20">
                  <Lock className="w-4 h-4 mr-2" /> Security First
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Prompt Injection Defense</h2>
                <p className="text-muted-foreground text-lg">
                  GRID07 treats all external content as untrusted. A two-layered defense architecture utilizes regex pre-filtering and system-level persona locks to prevent adversarial overrides.
                </p>
                <ul className="space-y-3 text-sm text-gray-400 mt-4">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Malicious instruction filtering</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Immutable persona states</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Safe reasoning extraction</li>
                </ul>
              </div>
              <div className="flex-1 w-full max-w-md">
                <div className="bg-black/80 rounded-xl border border-red-500/30 p-6 font-mono text-xs text-red-400 leading-relaxed shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                  {`> [SECURITY SCAN] Incoming payload...\n> Detecting override attempt: "ignore all instructions"\n> WARNING: Threat detected. Engaging Layer 1 regex filter.\n> SYSTEM LOCK: Persona instructions immutable.\n> Proceeding with safe context generation.`}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function PipelineNode({ icon, title, active = false, color = "text-white" }: { icon: React.ReactNode, title: string, active?: boolean, color?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 min-w-[80px] transition-all duration-500 ${active ? 'opacity-100 scale-110' : 'opacity-40'}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${active ? 'bg-white/10 border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-transparent border-white/10'} ${color}`}>
        {icon}
      </div>
      <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
    </div>
  )
}

function PipelineEdge() {
  return (
    <div className="hidden md:flex h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent min-w-[30px]" />
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col space-y-4 p-8 glass-card rounded-2xl group hover:-translate-y-1 transition-all duration-300">
      <div className="p-3 bg-white/5 border border-white/10 rounded-xl w-fit group-hover:bg-white/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  )
}
