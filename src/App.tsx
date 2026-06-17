import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Colaboradores from './pages/Colaboradores'
import EnConstruccion from './pages/EnConstruccion'

function Protegido({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-brand">Cargando…</div>
  if (!session) return <Login />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Protegido>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="colaboradores" element={<Colaboradores />} />
              <Route path="programacion" element={<EnConstruccion titulo="Programación de turnos" />} />
              <Route path="recargos" element={<EnConstruccion titulo="Liquidación de recargos" />} />
              <Route path="siglas" element={<EnConstruccion titulo="Catálogo de siglas" />} />
              <Route path="colores" element={<EnConstruccion titulo="Reglas de color" />} />
              <Route path="convenciones" element={<EnConstruccion titulo="Convenciones de recargo" />} />
              <Route path="servicios" element={<EnConstruccion titulo="Servicios y cargos" />} />
              <Route path="festivos" element={<EnConstruccion titulo="Festivos" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Protegido>
      </BrowserRouter>
    </AuthProvider>
  )
}
