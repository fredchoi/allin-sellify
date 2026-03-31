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
import { SettlementsDashboard } from './pages/SettlementsDashboard'
import { InventoryPage } from './pages/InventoryPage'
import { OrdersPage } from './pages/OrdersPage'
import { ContentDashboard } from './pages/ContentDashboard'

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
        <Route path="/dashboard/settlements" element={<SettlementsDashboard />} />
        <Route path="/dashboard/inventory" element={<InventoryPage />} />
        <Route path="/dashboard/orders" element={<OrdersPage />} />
        <Route path="/dashboard/content" element={<ContentDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
