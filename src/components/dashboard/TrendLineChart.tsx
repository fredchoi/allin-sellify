import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { TrendStat } from '../../types/keyword'

interface Props {
  stats: TrendStat[]
  height?: number
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function TrendLineChart({ stats, height = 220 }: Props) {
  if (stats.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-400 text-sm"
        style={{ height }}
      >
        트렌드 데이터 없음
      </div>
    )
  }

  const data = stats.map((s) => ({
    date: formatDate(s.date),
    opp: s.opp_score !== null ? Math.round(s.opp_score * 100) : null,
    sv: s.search_volume,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="opp"
          orientation="left"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}`}
          width={32}
        />
        <YAxis
          yAxisId="sv"
          orientation="right"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
          width={40}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
          }}
          formatter={(value, name) => {
            const v = Number(value)
            if (name === 'OPP') return [`${v}점`, 'OPP 스코어']
            return [v.toLocaleString(), '검색량']
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Line
          yAxisId="opp"
          type="monotone"
          dataKey="opp"
          name="OPP"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
        <Line
          yAxisId="sv"
          type="monotone"
          dataKey="sv"
          name="검색량"
          stroke="#16a34a"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
