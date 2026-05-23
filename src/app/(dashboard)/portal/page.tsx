'use client'

import { motion } from 'framer-motion'
import { Globe, CheckCircle2, Upload, RefreshCw, CreditCard, Lock } from 'lucide-react'

const features = [
  { icon: CheckCircle2, label: 'Track project progress', color: '#10b981' },
  { icon: Upload,       label: 'Upload files & assets',  color: '#6366f1' },
  { icon: RefreshCw,   label: 'Request revisions',       color: '#f59e0b' },
  { icon: CreditCard,  label: 'Track payments',           color: '#8b5cf6' },
]

export default function PortalPage() {
  return (
    <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[calc(100vh-120px)] animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-10 text-center w-full relative overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#e63946] opacity-[0.06] rounded-full blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[rgba(230,57,70,0.1)] border border-[rgba(230,57,70,0.2)] flex items-center justify-center mx-auto mb-6">
          <Globe size={28} className="text-[#e63946]" />
        </div>

        {/* Badge */}
        <span className="badge badge-planning mb-4 inline-flex items-center gap-1.5">
          <Lock size={9} /> Coming Soon
        </span>

        <h1 className="text-2xl font-bold text-white mb-3">Client Portal</h1>
        <p className="text-[#555] text-[13px] leading-relaxed mb-8 max-w-md mx-auto">
          Give your clients a dedicated space to track project progress, upload files, 
          request revisions, and view invoices — all in one premium experience.
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {features.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-left"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: color + '15' }}
              >
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-[12px] text-[#888]">{label}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[#444]">
          This feature is planned for the next release. Contact us to be notified.
        </p>
      </motion.div>
    </div>
  )
}
