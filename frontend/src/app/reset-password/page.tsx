'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle2, Loader2, Lock, ArrowRight } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    // Simulate password update with clear feedback
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 1800)
    }, 1000)
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Choose a secure password for your Grid07 orchestrator account"
    >
      {success ? (
        <div className="py-6 text-center space-y-3 animate-auth-reveal">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#F2EFE8]">
            Password Updated Successfully!
          </h3>
          <p className="text-xs text-[#A8A398]">
            Redirecting to sign-in terminal...
          </p>
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

          {/* New Password */}
          <div>
            <label
              htmlFor="new-password"
              className="block text-xs font-medium text-[#C2BEB4] mb-1.5 tracking-wide"
            >
              New Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736E65] group-focus-within:text-[#DFC492] transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="new-password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-xs font-medium text-[#C2BEB4] mb-1.5 tracking-wide"
            >
              Confirm Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736E65] group-focus-within:text-[#DFC492] transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="confirm-password"
                name="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-[#8C867B] pt-2">
            Remembered your credentials?{' '}
            <Link
              href="/login"
              className="font-semibold text-[#C7A66A] hover:text-[#DFC492] transition-colors"
            >
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
