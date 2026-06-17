import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Colaboradores from './pages/Colaboradores'
import Programacion from './pages/Programacion'
import Recargos from './pages/Recargos'
import Siglas from './pages/admin/Siglas'
import Colores from './pages/admin/Colores'
import Convenciones from './pages/admin/Convenciones'
import ServiciosCargos from './pages/admin/ServiciosCargos'
import Festivos from './pages/admin/Festivos'
// (EnConstruccion ya no se usa: todos los módulos están implementados)

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
              <Route path="programacion" element={<Programacion />} />
              <Route path="recargos" element={<Recargos />} />
              <Route path="siglas" element={<Siglas />} />
              <Route path="colores" element={<Colores />} />
              <Route path="convenciones" element={<Convenciones />} />
              <Route path="servicios" element={<ServiciosCargos />} />
              <Route path="festivos" element={<Festivos />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Protegido>
      </BrowserRouter>
    </AuthProvider>
  )
}
