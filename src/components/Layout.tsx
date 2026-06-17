import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import type { Rol } from '../lib/types'

const LOGO = `${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`

interface Item { to: string; label: string; roles: Rol[] }

// Ítems operativos (nivel superior)
const TOP: Item[] = [
  { to: '/', label: 'Inicio', roles: ['admin', 'coordinador', 'nomina'] },
  { to: '/programacion', label: 'Programación', roles: ['admin', 'coordinador', 'nomina'] },
  { to: '/colaboradores', label: 'Colaboradores', roles: ['coordinador'] },
  { to: '/recargos', label: 'Recargos', roles: ['admin', 'coordinador', 'nomina'] },
]

// CRUD y configuraciones, agrupados en "Administración" (solo admin)
const ADMIN: Item[] = [
  { to: '/usuarios', label: 'Usuarios', roles: ['admin'] },
  { to: '/colaboradores', label: 'Colaboradores', roles: ['admin'] },
  { to: '/servicios', label: 'Servicios y cargos', roles: ['admin'] },
  { to: '/siglas', label: 'Catálogo de siglas', roles: ['admin'] },
  { to: '/colores', label: 'Reglas de color', roles: ['admin'] },
  { to: '/convenciones', label: 'Convenciones', roles: ['admin'] },
  { to: '/festivos', label: 'Festivos', roles: ['admin'] },
]

const ROL_LABEL: Record<Rol, string> = { admin: 'Administrador', coordinador: 'Coordinador', nomina: 'Nómina' }

const linkCls = (isActive: boolean, sub = false) =>
  `block rounded-lg px-3 py-2 text-sm transition ${sub ? 'pl-7 ' : ''}${isActive ? 'bg-white/15 font-medium' : 'hover:bg-white/10'}`

export default function Layout() {
  const { perfil, signOut } = useAuth()
  const location = useLocation()
  const rol = perfil?.rol ?? 'coordinador'
  const top = TOP.filter(i => i.roles.includes(rol))
  const esAdmin = rol === 'admin'
  const adminActivo = ADMIN.some(i => location.pathname === i.to)
  const [abierto, setAbierto] = useState(adminActivo)

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-brand text-white flex flex-col">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
          <img src={LOGO} alt="Clínica" className="h-8 w-auto" />
          <span className="text-sm font-semibold leading-tight">Programación<br />de Turnos</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {top.map(i => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => linkCls(isActive)}>
              {i.label}
            </NavLink>
          ))}

          {esAdmin && (
            <div className="pt-1">
              <button onClick={() => setAbierto(a => !a)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${adminActivo ? 'bg-white/10 font-medium' : 'hover:bg-white/10'}`}>
                <span>Administración</span>
                <svg className={`h-4 w-4 transition-transform ${abierto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {abierto && (
                <div className="mt-1 space-y-1 border-l border-white/15 ml-3">
                  {ADMIN.map(i => (
                    <NavLink key={i.to} to={i.to} className={({ isActive }) => linkCls(isActive, true)}>
                      {i.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
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
