import { useState } from 'react'
import { ChevronDown } from '../icons'
import { cn } from '../../lib/utils'

interface AccordionItem {
  question: string
  answer: string
}

interface AccordionProps {
  items: AccordionItem[]
  className?: string
}

export function Accordion({ items, className }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className={cn('divide-y divide-slate-200', className)}>
      {items.map((item, index) => (
        <div key={index}>
          <button
            onClick={() => toggle(index)}
            className="flex w-full items-center justify-between py-5 text-left cursor-pointer"
          >
            <span className="text-lg font-semibold text-slate-900 pr-4">
              {item.question}
            </span>
            <ChevronDown
              className={cn(
                'h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300',
                openIndex === index && 'rotate-180'
              )}
            />
          </button>
          <div
            className={cn(
              'overflow-hidden transition-all duration-300',
              openIndex === index ? 'max-h-96 pb-5' : 'max-h-0'
            )}
          >
            <p className="text-slate-600 leading-relaxed">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
