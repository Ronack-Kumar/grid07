'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/errors'
import { AuthLayout } from '@/components/auth/AuthLayout'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      setLoading(false)
      return
    }

    try {
      await api.post('/auth/register', { email: email.trim(), password })
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create your account. Please try again.'))
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Start orchestrating multi-expert AI swarms and autonomous tools in minutes"
    >
      {success ? (
        <div className="py-6 text-center space-y-3 animate-auth-reveal">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#F2EFE8]">
            Account Created Successfully!
          </h3>
          <p className="text-xs text-[#A8A398]">
            Redirecting to sign-in terminal...
          </p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium leading-relaxed flex items-start gap-2.5 animate-auth-reveal"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label
              htmlFor="register-email"
              className="block text-xs font-medium text-[#C2BEB4] mb-1.5 tracking-wide"
            >
              Work Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736E65] group-focus-within:text-[#DFC492] transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0F1015] border border-white/10 text-sm text-[#F2EFE8] placeholder-[#635D52] focus:outline-none focus:border-[#C7A66A] focus:ring-2 focus:ring-[#C7A66A]/20 transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="register-password"
              className="block text-xs font-medium text-[#C2BEB4] mb-1.5 tracking-wide"
            >
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736E65] group-focus-within:text-[#DFC492] transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#0F1015] border border-white/10 text-sm text-[#F2EFE8] placeholder-[#635D52] focus:outline-none focus:border-[#C7A66A] focus:ring-2 focus:ring-[#C7A66A]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#736E65] hover:text-[#F2EFE8] focus:outline-none focus-visible:text-[#DFC492] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#8C867B] mt-1.5">
              Include letters, numbers, and symbols for high security.
            </p>
          </div>

          {/* Terms Agreement Note */}
          <p className="text-[11px] text-[#736E65] leading-relaxed pt-1">
            By creating an account, you agree to Grid07&apos;s{' '}
            <span className="text-[#A8A398] underline cursor-pointer">Terms of Service</span> and{' '}
            <span className="text-[#A8A398] underline cursor-pointer">Privacy Policy</span>.
          </p>

          {/* Primary Create Account Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-[#0E0F13] bg-gradient-to-r from-[#B89355] via-[#C7A66A] to-[#A88243] hover:from-[#C7A66A] hover:to-[#B89355] focus:outline-none focus:ring-2 focus:ring-[#C7A66A] focus:ring-offset-2 focus:ring-offset-[#121319] disabled:opacity-50 shadow-lg shadow-[#C7A66A]/20 transition-all duration-200 active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Agent Swarm Account...</span>
              </>
            ) : (
              <>
                <span>Create Grid07 Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Sign In Link */}
          <p className="text-center text-xs text-[#8C867B] pt-3">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-[#C7A66A] hover:text-[#DFC492] transition-colors underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
