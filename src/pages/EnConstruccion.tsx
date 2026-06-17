import { PageHeader } from '../components/ui'

export default function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <div>
      <PageHeader title={titulo} />
      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-black/5 text-gray-500">
        Módulo en construcción.
      </div>
    </div>
  )
}
