import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import Invitations from './pages/Invitations'
import VendorLogin from './pages/VendorLogin'
import Settings from './pages/Settings'

import DocumentsDashboard from './features/documents/pages/DocumentsDashboard';
import VendorDocumentsList from './features/documents/pages/VendorDocumentsList';
import VendorDocumentDetails from './features/documents/pages/VendorDocumentDetails';
import PODocumentsList from './features/documents/pages/PODocumentsList';
import PODocumentDetails from './features/documents/pages/PODocumentDetails';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/vendor-login" element={<VendorLogin />} />
        <Route path="/register/:token" element={<Register />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="invitations" element={<Invitations />} />
          <Route path="applications" element={<div className="p-6">Applications Placeholder</div>} />
          
          <Route path="documents">
            <Route index element={<DocumentsDashboard />} />
            <Route path="vendors" element={<VendorDocumentsList />} />
            <Route path="vendors/:id" element={<VendorDocumentDetails />} />
            <Route path="purchase-orders" element={<PODocumentsList />} />
            <Route path="purchase-orders/:id" element={<PODocumentDetails />} />
          </Route>
          
          <Route path="reports" element={<div className="p-6">Reports Placeholder</div>} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
