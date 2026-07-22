import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../contexts/AuthContext'
import AdminLayout from '../layouts/AdminLayout/AdminLayout'
import PortalLayout from '../layouts/PortalLayout/PortalLayout'
import Dashboard from '../features/dashboard/pages/Dashboard'
import VendorDashboard from '../features/dashboard/pages/VendorDashboard'
import Register from '../pages/Register'
import VendorLogin from '../pages/VendorLogin'
import InvoiceLogin from '../pages/InvoiceLogin'
import AdminLogin from '../pages/AdminLogin'
import ChangePassword from '../pages/ChangePassword'
import Invitations from '../pages/Invitations'
import Success from '../pages/Success'

import VendorList from '../pages/VendorList'
import VendorProfile from '../pages/VendorProfile'
import Settings from '../pages/Settings'
import PurchaseOrderList from '../features/purchase-orders/pages/PurchaseOrderList'
import InvoiceSubmissionWizard from '../features/invoices/pages/InvoiceSubmissionWizard'
import VendorInvoiceList from '../features/invoices/pages/VendorInvoiceList'
import AdminInvoiceList from '../features/invoices/pages/AdminInvoiceList'
import AdminPaymentsList from '../features/payments/pages/AdminPaymentsList'

import DocumentsDashboard from '../features/documents/pages/DocumentsDashboard'
import VendorDocumentsList from '../features/documents/pages/VendorDocumentsList'
import VendorDocumentDetails from '../features/documents/pages/VendorDocumentDetails'
import PODocumentsList from '../features/documents/pages/PODocumentsList'
import PODocumentDetails from '../features/documents/pages/PODocumentDetails'

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <AuthProvider>
        <Routes>
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/vendor-login" element={<VendorLogin />} />
        <Route path="/portal-login" element={<InvoiceLogin />} />
        <Route path="/portal-login/change-password" element={<ChangePassword />} />
        <Route path="/register/:token" element={<Register />} />
        <Route path="/success" element={<Success />} />
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="invitations" element={<Invitations />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="vendors/:id" element={<VendorProfile />} />
          <Route path="applications" element={<div className="p-6">Applications Placeholder</div>} />
          
          <Route path="documents">
            <Route index element={<DocumentsDashboard />} />
            <Route path="vendors" element={<VendorDocumentsList />} />
            <Route path="vendors/:id" element={<VendorDocumentDetails />} />
            <Route path="purchase-orders" element={<PODocumentsList />} />
            <Route path="purchase-orders/:id" element={<PODocumentDetails />} />
          </Route>

          <Route path="purchase-orders" element={<PurchaseOrderList />} />
          <Route path="invoices" element={<AdminInvoiceList />} />
          <Route path="payments" element={<AdminPaymentsList />} />
          <Route path="reports" element={<div className="p-6">Reports Placeholder</div>} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<VendorDashboard />} />
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="purchase-orders" element={<PurchaseOrderList />} />
          <Route path="invoices" element={<VendorInvoiceList />} />
          <Route path="invoices/new" element={<InvoiceSubmissionWizard />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
