import { cn } from '../../lib/utils'
import { getOppGrade, getOppGradeColor, getOppBarColor } from '../../types/keyword'

interface Props {
  score: number | null
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function OppScoreBar({ score, showLabel = true, size = 'md' }: Props) {
  const grade = getOppGrade(score)
  const gradeColor = getOppGradeColor(grade)
  const barColor = getOppBarColor(grade)
  const pct = score !== null ? Math.round(score * 100) : 0

  return (
    <div className="flex items-center gap-2 min-w-0">
      {showLabel && (
        <span
          className={cn(
            'shrink-0 inline-flex items-center justify-center rounded border font-bold',
            size === 'sm' ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm',
            gradeColor
          )}
        >
          {grade}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'w-full rounded-full bg-slate-100',
            size === 'sm' ? 'h-1.5' : 'h-2'
          )}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 tabular-nums text-slate-600 font-medium',
          size === 'sm' ? 'text-xs w-8 text-right' : 'text-sm w-10 text-right'
        )}
      >
        {score !== null ? pct : '—'}
      </span>
    </div>
  )
}
