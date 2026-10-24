'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simulate recovery email dispatch with accessible feedback
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1000)
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email associated with your Grid07 account and we'll send you recovery instructions"
    >
      {submitted ? (
        <div className="py-4 text-center space-y-4 animate-auth-reveal">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-[#F2EFE8]">
              Recovery Email Dispatched
            </h3>
            <p className="text-xs text-[#A8A398] leading-relaxed max-w-sm mx-auto">
              If an account exists for <strong className="text-[#F2EFE8]">{email}</strong>, you will receive password reset instructions shortly.
            </p>
          </div>

          <div className="pt-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#C7A66A] hover:text-[#DFC492] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to sign in</span>
            </Link>
          </div>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium leading-relaxed"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="reset-email"
              className="block text-xs font-medium text-[#C2BEB4] mb-1.5 tracking-wide"
            >
              Account Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736E65] group-focus-within:text-[#DFC492] transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@grid07.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0F1015] border border-white/10 text-sm text-[#F2EFE8] placeholder-[#635D52] focus:outline-none focus:border-[#C7A66A] focus:ring-2 focus:ring-[#C7A66A]/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-[#0E0F13] bg-gradient-to-r from-[#B89355] via-[#C7A66A] to-[#A88243] hover:from-[#C7A66A] hover:to-[#B89355] focus:outline-none focus:ring-2 focus:ring-[#C7A66A] focus:ring-offset-2 focus:ring-offset-[#121319] disabled:opacity-50 shadow-lg shadow-[#C7A66A]/20 transition-all duration-200 active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Instructions...</span>
              </>
            ) : (
              <span>Send Recovery Instructions</span>
            )}
          </button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-[#8C867B] hover:text-[#C7A66A] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
