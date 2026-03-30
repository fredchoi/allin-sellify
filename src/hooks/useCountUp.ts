import { useState, useEffect, useRef, useCallback } from 'react'

interface UseCountUpOptions {
  end: number
  duration?: number
  decimal?: number
  enabled?: boolean
}

export function useCountUp({
  end,
  duration = 2000,
  decimal = 0,
  enabled = false,
}: UseCountUpOptions) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  const animate = useCallback(() => {
    const start = performance.now()

    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(eased * end)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)
  }, [end, duration])

  useEffect(() => {
    if (enabled) {
      animate()
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [enabled, animate])

  const display = decimal > 0 ? value.toFixed(decimal) : Math.round(value).toString()

  return display
}
