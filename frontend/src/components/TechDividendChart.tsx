'use client'

import { ChevronDown } from 'lucide-react'

export function TechDividendChart() {
  const timeRange = '5Y'

  // Data points representing 2020 -> 2025 normalized performance
  // Tech Dividend Portfolio (outperforming) vs S&P 500
  const points = [
    { year: '2020', tech: 20, sp500: 20 },
    { year: '2021', tech: 48, sp500: 38 },
    { year: '2022', tech: 75, sp500: 55 },
    { year: '2023', tech: 110, sp500: 80 },
    { year: '2024', tech: 155, sp500: 108 },
    { year: '2025', tech: 185, sp500: 128 },
  ]

  // Map to SVG coordinates (width: 320, height: 130)
  const width = 310
  const height = 120
  const paddingX = 25
  const paddingY = 15

  const getX = (idx: number) => paddingX + (idx / (points.length - 1)) * (width - 2 * paddingX)
  const getY = (val: number) => height - paddingY - (val / 200) * (height - 2 * paddingY)

  // Build SVG path strings
  const techPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.tech)}`).join(' ')
  const spPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.sp500)}`).join(' ')
  const techArea = `${techPath} L ${getX(points.length - 1)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`

  return (
    <div className="bg-[#FAF8F4] border border-[#E8E2D5] rounded-xl p-3.5 my-2 shadow-2xs font-sans text-[#1A1A1E] select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#EBE5D8]/80">
        <h4 className="text-xs font-bold text-[#1A1A1E] tracking-tight">
          Tech Dividend Portfolio vs S&P 500
        </h4>
        <button className="flex items-center gap-1 text-[11px] font-semibold text-[#666157] bg-[#EFECE3] hover:bg-[#E5E1D6] px-2 py-0.5 rounded-md transition-colors">
          <span>{timeRange}</span>
          <ChevronDown className="w-3 h-3 text-[#787368]" />
        </button>
      </div>

      {/* Legend & Current Badges */}
      <div className="flex items-center justify-between text-[11px] pt-2 pb-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="text-[#555047] font-medium text-[11px]">Tech Dividend Portfolio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8E8A80]" />
            <span className="text-[#78746B] font-medium text-[11px]">S&P 500</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative pt-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="techGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid horizontal lines */}
          {[50, 100, 150, 200].map((level) => (
            <g key={level}>
              <line
                x1={paddingX}
                y1={getY(level)}
                x2={width - paddingX}
                y2={getY(level)}
                stroke="#E5E0D4"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <text
                x={paddingX - 4}
                y={getY(level) + 3}
                fill="#9C978D"
                fontSize="8"
                textAnchor="end"
                fontFamily="sans-serif"
              >
                {level}
              </text>
            </g>
          ))}

          {/* Fill Area for Tech Dividend */}
          <path d={techArea} fill="url(#techGradient)" />

          {/* S&P 500 Line */}
          <path d={spPath} fill="none" stroke="#9E9A90" strokeWidth="1.8" strokeDasharray="3 3" />

          {/* Tech Dividend Line */}
          <path d={techPath} fill="none" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />

          {/* End badged point for Tech Dividend */}
          <circle
            cx={getX(points.length - 1)}
            cy={getY(points[points.length - 1].tech)}
            r="3.5"
            fill="#10B981"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />

          {/* Year Labels */}
          {points.map((p, i) => (
            <text
              key={p.year}
              x={getX(i)}
              y={height - 2}
              fill="#9C978D"
              fontSize="8"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              {p.year}
            </text>
          ))}
        </svg>

        {/* Floating return pill tags on top right of lines */}
        <div className="absolute right-2 top-2 flex flex-col gap-1 items-end pointer-events-none">
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#10B981] text-white shadow-2xs font-mono">
            +62.4%
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#9E9A90] text-white shadow-2xs font-mono">
            +28.1%
          </span>
        </div>
      </div>

      {/* Bottom KPI Triad */}
      <div className="grid grid-cols-3 pt-2.5 mt-1 border-t border-[#E8E2D5] text-left">
        <div>
          <span className="text-[10px] text-[#7A756B] block">Volatility</span>
          <span className="text-xs font-bold text-[#1A1A1E]">18.6%</span>
        </div>
        <div>
          <span className="text-[10px] text-[#7A756B] block">Dividend Yield</span>
          <span className="text-xs font-bold text-[#1A1A1E]">2.4%</span>
        </div>
        <div>
          <span className="text-[10px] text-[#7A756B] block">Total Return (5Y)</span>
          <span className="text-xs font-bold text-[#10B981]">+62.4%</span>
        </div>
      </div>
    </div>
  )
}
