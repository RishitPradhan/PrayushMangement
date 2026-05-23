'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ProjectChartProps {
  data: { month: string; started: number; completed: number }[]
}

export function ProjectChart({ data }: ProjectChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="yellowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: '#121216',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '13px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
          }}
        />
        <Area
          type="monotone"
          dataKey="started"
          stroke="#eab308"
          strokeWidth={2}
          fill="url(#yellowGrad)"
          name="Started"
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="#a855f7"
          strokeWidth={2}
          fill="url(#purpleGrad)"
          name="Completed"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
