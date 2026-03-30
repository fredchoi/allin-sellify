import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { HeroSection } from './components/sections/HeroSection'
import { PainPointsSection } from './components/sections/PainPointsSection'
import { PipelineSection } from './components/sections/PipelineSection'
import { FeaturesSection } from './components/sections/FeaturesSection'
import { MetricsSection } from './components/sections/MetricsSection'
import { BeforeAfterSection } from './components/sections/BeforeAfterSection'
import { PricingSection } from './components/sections/PricingSection'
import { TestimonialsSection } from './components/sections/TestimonialsSection'
import { FAQSection } from './components/sections/FAQSection'
import { FinalCTASection } from './components/sections/FinalCTASection'
import { SignupSection } from './components/sections/SignupSection'
import { KeywordDashboard } from './pages/KeywordDashboard'
import { ProductsDashboard } from './pages/ProductsDashboard'

function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <PainPointsSection />
        <PipelineSection />
        <FeaturesSection />
        <MetricsSection />
        <BeforeAfterSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <SignupSection />
        <FinalCTASection />
      </main>
      <Footer />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard/keywords" element={<KeywordDashboard />} />
        <Route path="/dashboard/products" element={<ProductsDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
