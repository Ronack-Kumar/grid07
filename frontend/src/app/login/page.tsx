'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { getApiErrorMessage } from '@/lib/errors'
import { AuthLayout } from '@/components/auth/AuthLayout'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const setToken = useAuthStore((state) => state.setToken)
  const setUser = useAuthStore((state) => state.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('username', email.trim())
      formData.append('password', password)

      const res = await api.post('/auth/login', formData)
      setToken(res.data.access_token)

      // Optionally record remember me preference in localStorage
      if (rememberMe) {
        localStorage.setItem('grid07_remember_user', email.trim())
      } else {
        localStorage.removeItem('grid07_remember_user')
      }

      const userRes = await api.get('/auth/me')
      setUser(userRes.data)

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Invalid email or password. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to dispatch and monitor your autonomous agent swarm"
    >
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
            htmlFor="login-email"
            className="block text-xs font-medium text-[#C2BEB4] mb-1.5 tracking-wide"
          >
            Email Address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736E65] group-focus-within:text-[#DFC492] transition-colors">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="login-email"
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

        {/* Password Field with Show/Hide Toggle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-[#C2BEB4] tracking-wide"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-medium text-[#C7A66A] hover:text-[#DFC492] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736E65] group-focus-within:text-[#DFC492] transition-colors">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
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
        </div>

        {/* Remember Me Option */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-[#0F1015] text-[#C7A66A] focus:ring-[#C7A66A]/30 focus:ring-offset-0 focus:outline-none cursor-pointer"
            />
            <span className="text-xs text-[#A8A398] group-hover:text-[#F2EFE8] transition-colors select-none">
              Remember this device
            </span>
          </label>
        </div>

        {/* Primary Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-[#0E0F13] bg-gradient-to-r from-[#B89355] via-[#C7A66A] to-[#A88243] hover:from-[#C7A66A] hover:to-[#B89355] focus:outline-none focus:ring-2 focus:ring-[#C7A66A] focus:ring-offset-2 focus:ring-offset-[#121319] disabled:opacity-50 shadow-lg shadow-[#C7A66A]/20 transition-all duration-200 active:scale-[0.99] cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Grid07</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Sign Up Link */}
        <p className="text-center text-xs text-[#8C867B] pt-3">
          Don&apos;t have an account yet?{' '}
          <Link
            href="/register"
            className="font-semibold text-[#C7A66A] hover:text-[#DFC492] transition-colors underline-offset-4 hover:underline"
          >
            Create account
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
