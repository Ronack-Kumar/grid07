'use client'

import React, { useMemo } from 'react'

export function AnimatedBackground() {
  // Generate deterministic, lightweight ambient particles to avoid hydration mismatches
  const particles = useMemo(() => {
    return [
      { id: 1, left: '12%', top: '75%', size: 3, delay: '0s', duration: '11s', color: 'bg-[#C7A66A]/40' },
      { id: 2, left: '22%', top: '65%', size: 2, delay: '2.5s', duration: '9s', color: 'bg-white/30' },
      { id: 3, left: '38%', top: '80%', size: 4, delay: '4.2s', duration: '13s', color: 'bg-[#C7A66A]/35' },
      { id: 4, left: '48%', top: '70%', size: 2.5, delay: '1.2s', duration: '10s', color: 'bg-[#38BDF8]/40' },
      { id: 5, left: '60%', top: '85%', size: 3, delay: '5.8s', duration: '12s', color: 'bg-white/25' },
      { id: 6, left: '72%', top: '78%', size: 2, delay: '3.1s', duration: '9.5s', color: 'bg-[#C7A66A]/40' },
      { id: 7, left: '84%', top: '68%', size: 3.5, delay: '6.4s', duration: '14s', color: 'bg-[#A78BFA]/35' },
      { id: 8, left: '92%', top: '82%', size: 2, delay: '1.9s', duration: '10.5s', color: 'bg-white/30' },
      { id: 9, left: '18%', top: '45%', size: 3, delay: '3.8s', duration: '12.5s', color: 'bg-[#34D399]/35' },
      { id: 10, left: '32%', top: '35%', size: 2, delay: '7.1s', duration: '11.5s', color: 'bg-[#C7A66A]/45' },
      { id: 11, left: '65%', top: '40%', size: 3, delay: '2.2s', duration: '13.2s', color: 'bg-white/20' },
      { id: 12, left: '80%', top: '30%', size: 2.5, delay: '5.0s', duration: '10.8s', color: 'bg-[#C7A66A]/30' },
    ]
  }, [])

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0 bg-[#090A0D]"
    >
      {/* Layer 1: Ambient Drifting Light Fields */}
      <div className="absolute inset-0">
        {/* Soft Warm Gold/Amber Bloom (Orchestrator region) */}
        <div
          className="absolute -top-[10%] left-[5%] w-[680px] h-[680px] rounded-full blur-[130px] opacity-60 animate-ambient-1 mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, rgba(199, 166, 106, 0.22) 0%, rgba(154, 120, 64, 0.08) 50%, transparent 75%)',
          }}
        />

        {/* Deep Indigo/Slate Field (Mid depth) */}
        <div
          className="absolute top-[25%] right-[10%] w-[640px] h-[640px] rounded-full blur-[140px] opacity-45 animate-ambient-2 mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, rgba(79, 70, 229, 0.04) 50%, transparent 75%)',
          }}
        />

        {/* Emerald/Cyan Agent Glow (Bottom Left) */}
        <div
          className="absolute -bottom-[15%] left-[20%] w-[580px] h-[580px] rounded-full blur-[125px] opacity-40 animate-ambient-3 mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(52, 211, 153, 0.05) 50%, transparent 75%)',
          }}
        />
      </div>

      {/* Layer 2: 3D Perspective Plane with Graphite Grid Lines */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-45"
        style={{
          perspective: '1000px',
        }}
      >
        <div
          className="w-[200vw] h-[200vh] -top-[30vh] absolute"
          style={{
            transform: 'rotateX(58deg) translateZ(0)',
            transformOrigin: '50% 20%',
          }}
        >
          {/* Animated scrolling grid texture */}
          <div
            className="w-full h-full animate-grid-travel"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255, 255, 255, 0.065) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.065) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
        </div>
      </div>

      {/* Layer 3: Subtle Flat Architectural Cross Grid Lines */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px',
        }}
      />

      {/* Layer 4: Vignette and Gradient Masks for Seamless Depth */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 45%, transparent 20%, rgba(9, 10, 13, 0.7) 65%, #090A0D 100%)',
        }}
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#090A0D] to-transparent opacity-90" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#090A0D] to-transparent opacity-95" />

      {/* Layer 5: Sparse Floating Star/Light Particles */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`absolute rounded-full animate-particle-drift ${p.color}`}
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
              animationDuration: p.duration,
              boxShadow: '0 0 8px currentColor',
            }}
          />
        ))}
      </div>
    </div>
  )
}
