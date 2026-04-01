import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { DashboardLayout } from './components/layout/DashboardLayout'
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
import { DashboardHome } from './pages/DashboardHome'
import { KeywordDashboard } from './pages/KeywordDashboard'
import { ProductsDashboard } from './pages/ProductsDashboard'
import { SettlementsDashboard } from './pages/SettlementsDashboard'
import { InventoryPage } from './pages/InventoryPage'
import { OrdersPage } from './pages/OrdersPage'
import { ContentDashboard } from './pages/ContentDashboard'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'

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
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="keywords" element={<KeywordDashboard />} />
              <Route path="products" element={<ProductsDashboard />} />
              <Route path="settlements" element={<SettlementsDashboard />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="content" element={<ContentDashboard />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
