import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout/AdminLayout'
import Dashboard from '../features/dashboard/pages/Dashboard'
import Register from '../pages/Register'
import VendorLogin from '../pages/VendorLogin'
import Invitations from '../pages/Invitations'
import Success from '../pages/Success'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/vendor-login" element={<VendorLogin />} />
        <Route path="/register/:token" element={<Register />} />
        <Route path="/success" element={<Success />} />
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="invitations" element={<Invitations />} />
          <Route path="applications" element={<div className="p-6">Applications Placeholder</div>} />
          <Route path="documents" element={<div className="p-6">Documents Placeholder</div>} />
          <Route path="reports" element={<div className="p-6">Reports Placeholder</div>} />
          <Route path="settings" element={<div className="p-6">Settings Placeholder</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
