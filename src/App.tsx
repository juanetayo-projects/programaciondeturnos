const LOGO = `${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`

export default function App() {
  return (
    <div className="min-h-full">
      <header className="bg-brand text-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <img src={LOGO} alt="Clínica" className="h-9 w-auto" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">Programación de Turnos</h1>
            <p className="text-xs text-brand-100">Cuadro de turnos · Liquidación de recargos</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <h2 className="text-xl font-semibold text-brand">Proyecto inicializado ✅</h2>
          <p className="mt-2 text-sm text-gray-600">
            Scaffold listo. Próximos pasos: conectar Supabase, autenticación y módulos
            (colaboradores, programación, recargos).
          </p>
        </div>
      </main>
    </div>
  )
}
