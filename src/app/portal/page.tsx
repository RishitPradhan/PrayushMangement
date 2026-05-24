'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Globe, ArrowRight, ShieldAlert, ArrowLeft } from 'lucide-react'

export default function PortalGatewayPage() {
  const [tokenInput, setTokenInput] = useState('')
  const router = useRouter()

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault()
    let token = tokenInput.trim()

    // Smart-extract token if a full URL was pasted
    if (token.includes('/portal/')) {
      const parts = token.split('/portal/')
      token = parts[parts.length - 1]
    }

    if (token) {
      router.push(`/portal/${token}`)
    }
  }

  return (
    <div className="max-w-md mx-auto flex items-center justify-center min-h-[calc(100vh-120px)] animate-fade-in px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-10 text-center w-full relative overflow-hidden"
      >
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors flex items-center gap-1.5 text-[11px] font-medium"
        >
          <ArrowLeft size={12} /> Back
        </button>

        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#e63946] opacity-[0.06] rounded-full blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[rgba(230,57,70,0.1)] border border-[rgba(230,57,70,0.2)] flex items-center justify-center mx-auto mb-6 text-[#e63946]">
          <Globe size={28} />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Client Portal Access</h1>
        <p className="text-[#888] text-[13px] leading-relaxed mb-8 max-w-sm mx-auto">
          Please enter your unique client access token below, or click a magic link provided by Prayush Studios to log in.
        </p>

        {/* Form */}
        <form onSubmit={handleGo} className="space-y-4 mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Paste access token or magic link..."
              className="input-base text-left font-mono tracking-wide"
              style={{ paddingRight: '48px', paddingLeft: '16px' }}
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              required
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#e63946] hover:text-[#ff4d5a] p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </form>

        {/* Tip */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-left">
          <ShieldAlert size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#aaa] leading-normal">
            <strong>Agency Team Tip:</strong> Go to the <a href="/clients" className="text-[#a855f7] hover:underline font-semibold">Clients</a> tab to generate, copy, and share portal access links for your clients.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
