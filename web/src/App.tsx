import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuthStore } from './stores/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assets from './pages/assets'
import NewAssetPage from './pages/assets/NewAssetPage'
import { AssetDetailPage } from './pages/assets/AssetDetailPage'
import WorkOrders from './pages/WorkOrders'
import NewWorkOrder from './pages/NewWorkOrder'
import PreventiveMaintenance from './pages/PreventiveMaintenance'
import PartsInventory from './pages/PartsInventory'
import Users from './pages/Users'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function App() {
  const { user, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/assets/new" element={<NewAssetPage />} />
        <Route path="/assets/:id" element={<AssetDetailPage />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/work-orders/new" element={<NewWorkOrder />} />
        <Route path="/preventive-maintenance" element={<PreventiveMaintenance />} />
        <Route path="/parts-inventory" element={<PartsInventory />} />
        <Route path="/users" element={<Users />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
