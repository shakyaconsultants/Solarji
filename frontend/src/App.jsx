import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/website/Home'
import QuotationGenerator from './pages/website/QuotationGenerator'
import RegisterComplaint from './pages/website/RegisterComplaint'
import Login from './pages/auth/Login'

const CRMDashboard = lazy(() => import('./pages/crm/CRMDashboard'))
const Leads = lazy(() => import('./pages/crm/Leads'))
const NewLead = lazy(() => import('./pages/crm/NewLead'))
const LeadDetail = lazy(() => import('./pages/crm/LeadDetail'))
const Users = lazy(() => import('./pages/crm/Users'))
const Team = lazy(() => import('./pages/crm/Team'))
const Complaints = lazy(() => import('./pages/crm/Complaints'))
const StockDashboard = lazy(() => import('./pages/stock/StockDashboard'))
const StockItems = lazy(() => import('./pages/stock/StockItems'))
const VoucherForm = lazy(() => import('./pages/stock/VoucherForm'))
const VoucherList = lazy(() => import('./pages/stock/VoucherList'))
const VoucherPreview = lazy(() => import('./pages/stock/VoucherPreview'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-solar-500" />
    </div>
  )
}

function LazyPage({ children, ...routeProps }) {
  return (
    <ProtectedRoute {...routeProps}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#111111',
            borderRadius: '14px',
            fontSize: '13.5px',
            fontWeight: '600',
            border: '1.5px solid #f0f0f0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            padding: '12px 16px',
            maxWidth: '340px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
          error:   { iconTheme: { primary: '#f43f5e', secondary: '#ffffff' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quotation" element={<QuotationGenerator />} />
        <Route path="/complaint" element={<RegisterComplaint />} />
        <Route path="/login" element={<Login />} />
        <Route path="/crm" element={<LazyPage><CRMDashboard /></LazyPage>} />
        <Route path="/crm/leads" element={<LazyPage><Leads /></LazyPage>} />
        <Route path="/crm/leads/new" element={<LazyPage><NewLead /></LazyPage>} />
        <Route path="/crm/leads/:id" element={<LazyPage><LeadDetail /></LazyPage>} />
        <Route path="/crm/users" element={<LazyPage adminOnly><Users /></LazyPage>} />
        <Route path="/crm/team" element={<LazyPage teamView><Team /></LazyPage>} />
        <Route path="/crm/complaints" element={<LazyPage complaintsOnly><Complaints /></LazyPage>} />
        <Route path="/stock" element={<LazyPage stockOnly><StockDashboard /></LazyPage>} />
        <Route path="/stock/items" element={<LazyPage stockOnly><StockItems /></LazyPage>} />
        <Route path="/stock/voucher/add" element={<LazyPage stockOnly><VoucherForm type="ADD" /></LazyPage>} />
        <Route path="/stock/voucher/sell" element={<LazyPage stockOnly><VoucherForm type="SELL" /></LazyPage>} />
        <Route path="/stock/vouchers" element={<LazyPage stockOnly><VoucherList /></LazyPage>} />
        <Route path="/stock/vouchers/:id/preview" element={<LazyPage stockOnly><VoucherPreview /></LazyPage>} />
        <Route path="/admin" element={<LazyPage adminOnly><AdminDashboard /></LazyPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
