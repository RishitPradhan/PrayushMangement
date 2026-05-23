'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const mockData = [
  { month: 'Jan', completed: 4, started: 6 },
  { month: 'Feb', completed: 7, started: 9 },
  { month: 'Mar', completed: 5, started: 8 },
  { month: 'Apr', completed: 11, started: 13 },
  { month: 'May', completed: 9, started: 11 },
  { month: 'Jun', completed: 14, started: 16 },
]

export function ProjectChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={mockData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
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
