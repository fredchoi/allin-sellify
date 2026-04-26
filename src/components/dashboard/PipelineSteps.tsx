import { Check } from '../icons'

interface PipelineStepsProps {
  currentStep: 1 | 2 | 3 | 4
  completedSteps: number[]
}

const STEPS = [
  { number: 1, label: '수집' },
  { number: 2, label: 'AI 가공' },
  { number: 3, label: '편집' },
  { number: 4, label: '등록' },
] as const

export function PipelineSteps({ currentStep, completedSteps }: PipelineStepsProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
      {/* Horizontal layout (desktop) */}
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.includes(step.number)
          const isCurrent = currentStep === step.number
          const isLast = idx === STEPS.length - 1

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-sm font-medium whitespace-nowrap ${
                    isCompleted
                      ? 'text-green-600'
                      : isCurrent
                        ? 'text-blue-600'
                        : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 mx-4">
                  <div
                    className={`h-0.5 rounded-full transition-colors ${
                      isCompleted ? 'bg-green-300' : 'bg-slate-200'
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Vertical layout (mobile) */}
      <div className="flex sm:hidden flex-col gap-3">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.includes(step.number)
          const isCurrent = currentStep === step.number
          const isLast = idx === STEPS.length - 1

          return (
            <div key={step.number} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    step.number
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 h-4 mt-1 rounded-full ${
                      isCompleted ? 'bg-green-300' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-sm font-medium pt-0.5 ${
                  isCompleted
                    ? 'text-green-600'
                    : isCurrent
                      ? 'text-blue-600'
                      : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
