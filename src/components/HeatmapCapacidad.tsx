import ReactECharts from 'echarts-for-react'

const CATS = [
  { cat: 'dia', label: 'Día' },
  { cat: 'manana', label: 'Mañana M8' },
  { cat: 'tarde', label: 'Tarde T8' },
  { cat: 'noche', label: 'Noche' },
  { cat: 'noche8', label: 'N8' },
] as const

interface Dia { fecha: string; dia: number; esFes: boolean }

export default function HeatmapCapacidad({ dias, contar }: {
  dias: Dia[]
  contar: (fecha: string, cat: 'dia' | 'manana' | 'tarde' | 'noche' | 'noche8') => number
}) {
  const data: [number, number, number][] = []
  let max = 1
  dias.forEach((d, x) => {
    CATS.forEach((c, y) => {
      const v = contar(d.fecha, c.cat)
      if (v > max) max = v
      data.push([x, y, v])
    })
  })

  const option = {
    tooltip: {
      formatter: (p: { value: [number, number, number] }) =>
        `${dias[p.value[0]]?.dia} · ${CATS[p.value[1]].label}: <b>${p.value[2]}</b>`,
    },
    grid: { left: 70, right: 16, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: dias.map(d => d.dia),
      splitArea: { show: true },
      axisLabel: { fontSize: 10, color: '#6b7280' },
    },
    yAxis: { type: 'category', data: CATS.map(c => c.label), axisLabel: { fontSize: 11 } },
    visualMap: {
      min: 0, max, calculable: true, orient: 'horizontal', left: 'center', bottom: -4, itemHeight: 80,
      inRange: { color: ['#EAF0FA', '#16468E', '#0D2D6B'] },
    },
    series: [{
      type: 'heatmap', data,
      label: { show: true, fontSize: 9, formatter: (p: { value: [number, number, number] }) => p.value[2] || '' },
      emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.3)' } },
    }],
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h3 className="mb-2 font-semibold text-brand">Mapa de calor — capacidad por turno y día</h3>
      <ReactECharts option={option} style={{ height: 260 }} notMerge />
    </div>
  )
}
