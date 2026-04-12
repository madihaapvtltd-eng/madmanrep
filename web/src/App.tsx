import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Assets } from './pages/Assets'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/assets" replace />} />
          <Route path="assets" element={<Assets />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
