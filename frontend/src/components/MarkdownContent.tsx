'use client'

import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownContentProps {
  content: string
}

function preprocessMarkdown(text: string): string {
  if (!text) return ''

  // 1. Ensure tables have blank lines before and after so GFM parses them properly
  const lines = text.split('\n')
  const processedLines: string[] = []
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isTableRow = /^\s*\|(.+)\|\s*$/.test(line)

    if (isTableRow && !inTable) {
      inTable = true
      // ensure blank line before table
      if (processedLines.length > 0 && processedLines[processedLines.length - 1].trim() !== '') {
        processedLines.push('')
      }
    } else if (!isTableRow && inTable) {
      inTable = false
      // ensure blank line after table
      if (line.trim() !== '') {
        processedLines.push('')
      }
    }
    processedLines.push(line)
  }

  let formatted = processedLines.join('\n')

  // 2. Preprocess LaTeX block formulas: $$ ... $$ or \[ ... \]
  formatted = formatted.replace(/(\$\$|\\\[)([\s\S]*?)(\$\$|\\\])/g, (_match, _open, math) => {
    const cleaned = math
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\\approx/g, '≈')
      .replace(/\\le/g, '≤')
      .replace(/\\ge/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\pm/g, '±')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\left|\\right/g, '')
      .replace(/\\\\/g, '\n')
      .replace(/\\[a-zA-Z]+/g, '')
      .trim()

    return `\n\n\`\`\`math\n${cleaned}\n\`\`\`\n\n`
  })

  // 3. Preprocess inline \( ... \) formulas
  formatted = formatted.replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => {
    return math
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\\approx/g, '≈')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\left|\\right/g, '')
      .trim()
  })

  return formatted
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const processed = useMemo(() => preprocessMarkdown(content), [content])

  return (
    <div className="max-w-none space-y-3 leading-relaxed text-xs sm:text-[13px] text-[#24211D] dark:text-[#F2EFE8] break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-lg font-serif font-bold mt-4 mb-2 text-[#1A1A1E] dark:text-[#F2EFE8] border-b border-[#EAE5DA] dark:border-[#38352D] pb-1.5" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-base font-serif font-semibold mt-3.5 mb-1.5 text-[#1A1A1E] dark:text-[#F2EFE8]" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-sm font-semibold mt-2.5 mb-1 text-[#1A1A1E] dark:text-[#F2EFE8]" {...props} />
          ),
          h4: ({ ...props }) => (
            <h4 className="text-xs font-semibold mt-2 mb-1 text-[#1A1A1E] dark:text-[#DFC492] uppercase tracking-wider" {...props} />
          ),
          p: ({ ...props }) => <p className="mb-2 leading-relaxed last:mb-0 text-[#24211D] dark:text-[#E6E3DB]" {...props} />,
          ul: ({ ...props }) => <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-[#24211D] dark:text-[#E6E3DB]" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-[#24211D] dark:text-[#E6E3DB]" {...props} />,
          li: ({ ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-3 border-[#B89355] dark:border-[#C7A66A] pl-3.5 py-1 italic my-2.5 text-[#635D52] dark:text-[#C2BEB4] bg-[#FAF8F5]/60 dark:bg-[#25241F]/80 rounded-r-lg" {...props} />
          ),
          code: ({ className, children, ...props }) => {
            const isMath = className === 'language-math'
            if (isMath) {
              return (
                <div className="my-3 px-4 py-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1D1C19] border border-[#E6E1D4] dark:border-[#38352D] text-center font-mono text-xs sm:text-sm tracking-wide text-[#1A1A1E] dark:text-[#F2EFE8] shadow-2xs overflow-x-auto">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A8478] dark:text-[#A8A398] block mb-1">
                    Mathematical Formulation
                  </span>
                  <div className="font-semibold py-1 select-all">{children}</div>
                </div>
              )
            }

            const isBlock = Boolean(className) || (typeof children === 'string' && children.includes('\n'))
            if (isBlock) {
              return (
                <pre className="bg-[#17171F] dark:bg-[#191916] text-[#F0EDE6] dark:text-[#F2EFE8] p-3.5 rounded-xl overflow-x-auto text-xs my-2.5 font-mono border border-[#2B2B38] dark:border-[#38352D] shadow-2xs">
                  <code {...props}>{children}</code>
                </pre>
              )
            }
            return (
              <code className="bg-[#F2EFE8] dark:bg-[#292823] text-[#876F43] dark:text-[#DFC492] px-1.5 py-0.5 rounded font-mono text-[11.5px] border border-[#E5DFD4] dark:border-[#403D35]" {...props}>
                {children}
              </code>
            )
          },
          table: ({ ...props }) => (
            <div className="my-3.5 w-full overflow-x-auto rounded-xl border border-[#E2DDD0] dark:border-[#38352D] shadow-2xs bg-white dark:bg-[#1D1C19]">
              <table className="w-full text-left text-xs border-collapse" {...props} />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-[#F8F5EE] dark:bg-[#22211E] font-semibold border-b border-[#E2DDD0] dark:border-[#38352D] text-[#1A1A1E] dark:text-[#F2EFE8]" {...props} />
          ),
          tbody: ({ ...props }) => (
            <tbody className="divide-y divide-[#EAE5DA] dark:divide-[#38352D] text-[#24211D] dark:text-[#E6E3DB]" {...props} />
          ),
          tr: ({ ...props }) => (
            <tr className="hover:bg-[#FAF8F5]/80 dark:hover:bg-[#25241F]/80 transition-colors" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="px-3.5 py-2.5 font-bold text-[#1A1A1E] dark:text-[#F2EFE8]" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="px-3.5 py-2.5 align-top leading-normal" {...props} />
          ),
          hr: ({ ...props }) => (
            <hr className="my-3.5 border-[#E8E3D8] dark:border-[#38352D]" {...props} />
          ),
          a: ({ ...props }) => (
            <a className="text-[#B89355] dark:text-[#C7A66A] font-medium underline hover:text-[#9A7840] dark:hover:text-[#DFC492] transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
