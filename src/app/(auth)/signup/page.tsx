'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Zap, Mail, Lock, User } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Account created! Welcome to Prayush Studios.')
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#e63946] opacity-[0.04] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[400px] z-10"
      >
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-[#e63946] flex items-center justify-center shadow-[0_0_30px_rgba(230,57,70,0.4)]">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-[15px]">Prayush Studios</div>
            <div className="text-[#555] text-[11px]">Agency OS</div>
          </div>
        </div>

        <div className="glass-card p-8 sm:p-10 border border-[rgba(255,255,255,0.05)] shadow-2xl">
          <h1 className="text-xl font-bold text-white mb-2 tracking-tight">Create account</h1>
          <p className="text-gray-400 text-[14px] mb-8">Join your team workspace</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-gray-300">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-base pl-10 h-11 text-[14px]"
                  placeholder="Prayush Sharma"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[13px] font-semibold text-gray-300">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-base pl-10 h-11 text-[14px]"
                  placeholder="you@prayushstudios.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[13px] font-semibold text-gray-300">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-base pl-10 h-11 text-[14px]"
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center h-11 text-[14px] font-bold shadow-lg shadow-red-500/20"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>

          <p className="text-center text-[13.5px] text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#e63946] hover:text-[#ff6b6b] font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
