import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import type { Rol } from '../lib/types'

const LOGO = `${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`

interface Item { to: string; label: string; roles: Rol[] }

const NAV: Item[] = [
  { to: '/', label: 'Inicio', roles: ['admin', 'coordinador', 'nomina'] },
  { to: '/programacion', label: 'Programación', roles: ['admin', 'coordinador', 'nomina'] },
  { to: '/colaboradores', label: 'Colaboradores', roles: ['admin', 'coordinador'] },
  { to: '/recargos', label: 'Recargos', roles: ['admin', 'coordinador', 'nomina'] },
  { to: '/siglas', label: 'Catálogo de siglas', roles: ['admin'] },
  { to: '/colores', label: 'Reglas de color', roles: ['admin'] },
  { to: '/convenciones', label: 'Convenciones', roles: ['admin'] },
  { to: '/servicios', label: 'Servicios y cargos', roles: ['admin'] },
  { to: '/festivos', label: 'Festivos', roles: ['admin'] },
]

const ROL_LABEL: Record<Rol, string> = { admin: 'Administrador', coordinador: 'Coordinador', nomina: 'Nómina' }

export default function Layout() {
  const { perfil, signOut } = useAuth()
  const rol = perfil?.rol ?? 'coordinador'
  const items = NAV.filter(i => i.roles.includes(rol))

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-brand text-white flex flex-col">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
          <img src={LOGO} alt="Clínica" className="h-8 w-auto" />
          <span className="text-sm font-semibold leading-tight">Programación<br />de Turnos</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {items.map(i => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-white/15 font-medium' : 'hover:bg-white/10'}`}>
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/10 text-xs">
          <p className="font-medium truncate">{perfil?.nombre}</p>
          <p className="text-brand-100">{ROL_LABEL[rol]}</p>
          <button onClick={signOut} className="mt-2 text-brand-100 hover:text-white underline">Cerrar sesión</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
