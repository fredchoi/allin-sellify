import { Container } from '../ui/Container'
import { SectionHeading } from '../ui/SectionHeading'
import { AnimateOnScroll } from '../ui/AnimateOnScroll'
import { Accordion } from '../ui/Accordion'
import { faqItems } from '../../data/faq'

export function FAQSection() {
  return (
    <section id="faq" className="bg-surface py-20 lg:py-28">
      <Container>
        <SectionHeading title="자주 묻는 질문" />
        <AnimateOnScroll>
          <div className="mx-auto max-w-3xl">
            <Accordion items={faqItems} />
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  )
}
