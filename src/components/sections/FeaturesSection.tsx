import { Container } from '../ui/Container'
import { SectionHeading } from '../ui/SectionHeading'
import { FeatureBlock } from './FeatureBlock'
import { features } from '../../data/features'

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <Container>
        <SectionHeading title="셀러에게 필요한 모든 것, 한 곳에서" />

        <div className="space-y-20 lg:space-y-28">
          {features.map((feature, index) => (
            <FeatureBlock
              key={index}
              feature={feature}
              reversed={index % 2 === 1}
            />
          ))}
        </div>
      </Container>
    </section>
  )
}
