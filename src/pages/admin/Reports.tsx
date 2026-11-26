import { useQuery } from '@tanstack/react-query'
import { useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, DataList, Empty, Failure, PageTitle, Skeleton } from '@/components/ui'
import { pagoMethods } from '@/features/operations'
import { obtener } from '@/lib/errors'
import { fechaLimaISO, formatFecha, sumarDias } from '@/lib/fechas'
import { supabase } from '@/lib/supabase'
import { formatSoles } from '@/lib/utils'

function add<K>(map: Map<K, number>, key: K, value: number) {
  map.set(key, (map.get(key) ?? 0) + value)
}

function useReports(period: number, overview = false) {
  const today = fechaLimaISO()
  const since = sumarDias(today, 1 - period)
  return useQuery({
    queryKey: ['reportes', since, today, overview],
    queryFn: async () => {
      const [payments, appointments, attendance, products, people] = await Promise.all([
        supabase.from('pagos').select('fecha,metodo_pago,monto').gte('fecha', since).lte('fecha', today),
        overview ? Promise.resolve({ data: [], error: null }) : supabase.from('citas_detalle').select('servicio,estado').gte('fecha', since).lte('fecha', today),
        overview ? Promise.resolve({ data: [], error: null }) : supabase.from('asistencias').select('id_colaboradora,horas_trabajadas').gte('fecha', since).lte('fecha', today),
        overview ? Promise.resolve({ data: [], error: null }) : supabase.from('productos').select('id,nombre,stock_actual,stock_minimo,unidad').eq('estado', true),
        overview ? Promise.resolve({ data: [], error: null }) : supabase.from('colaboradoras').select('id,nombres,apellidos'),
      ])
      const sales = new Map<string, number>()
      const methods = new Map<string, number>()
      const services = new Map<string, number>()
      const hours = new Map<number, number>()
      for (const row of obtener(payments) ?? []) { add(sales, row.fecha, Number(row.monto)); add(methods, pagoMethods[row.metodo_pago], Number(row.monto)) }
      for (const row of obtener(appointments) ?? []) if (row.estado !== 'cancelada') add(services, row.servicio, 1)
      for (const row of obtener(attendance) ?? []) add(hours, row.id_colaboradora, Number(row.horas_trabajadas ?? 0))
      const names = new Map((obtener(people) ?? []).map(row => [row.id, [row.nombres, row.apellidos].filter(Boolean).join(' ')]))
      return {
        daily: Array.from({ length: period }, (_, index) => { const day = sumarDias(since, index); return { name: formatFecha(day), value: sales.get(day) ?? 0 } }),
        methods: [...methods].map(([name, value]) => ({ name, value })),
        services: [...services].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value })),
        hours: [...hours].map(([id, value]) => ({ id, name: names.get(id) ?? 'Colaboradora ' + id, value })),
        stock: (obtener(products) ?? []).filter(row => row.stock_actual < row.stock_minimo),
      }
    },
  })
}

type Metric = { name: string; value: number }
function Chart({ title, data, money }: { title: string; data: Metric[]; money?: boolean }) {
  const reduce = useReducedMotion()
  return <section className="panel chart-panel"><h2 className="panel-heading">{title}</h2>
    {data.some(item => item.value > 0) ? <>
      <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f1dbe8"/>
        <XAxis dataKey="name" tick={{ fill: '#6b2a5c', fontSize: 12 }} minTickGap={25} tickLine={false} axisLine={false}/>
        <YAxis tick={{ fill: '#6b2a5c', fontSize: 12 }} tickLine={false} axisLine={false} width={42}/>
        <Tooltip formatter={value => [money ? formatSoles(Number(value)) : Number(value).toLocaleString('es-PE'), title]}/>
        <Bar dataKey="value" fill="#c2337a" radius={[6, 6, 0, 0]} isAnimationActive={!reduce} animationDuration={200}/>
      </BarChart></ResponsiveContainer></div>
      <details className="chart-data"><summary>Ver datos de la gráfica</summary><DataList rows={data} rowKey={row => row.name} columns={[{ label: 'Concepto', render: row => row.name }, { label: title, render: row => money ? formatSoles(row.value) : row.value }]}/></details>
    </> : <Empty title="Sin datos para este período"/>}
  </section>
}

export function ReportOverview() {
  const query = useReports(7, true)
  if (query.isPending) return <Skeleton/>
  if (query.isError) return <Failure error={query.error} retry={() => void query.refetch()}/>
  return <Chart title="Ingresos de los últimos 7 días" data={query.data.daily} money/>
}

export default function Reports() {
  const [period, setPeriod] = useState(7)
  const query = useReports(period)
  return <><PageTitle title="Reportes" description="Consulta ventas, demanda de servicios, horas de trabajo y existencias."/>
    <div className="segmented" aria-label="Período">{[7, 14, 30].map(days => <Button key={days} variant="ghost" aria-pressed={period === days} onClick={() => setPeriod(days)}>{days} días</Button>)}</div>
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : <>
      <Chart title="Ventas por día" data={query.data.daily} money/>
      <div className="appointment-grid"><Chart title="Métodos de pago" data={query.data.methods} money/><Chart title="Servicios más solicitados" data={query.data.services}/></div>
      <section className="panel"><h2 className="panel-heading">Horas trabajadas</h2><DataList rows={query.data.hours} rowKey={row => row.id} columns={[
        { label: 'Colaboradora', render: row => row.name }, { label: 'Horas', render: row => row.value.toLocaleString('es-PE', { maximumFractionDigits: 2 }) + ' h' },
      ]}/></section>
      <section className="panel"><h2 className="panel-heading">Productos bajo el mínimo</h2><DataList rows={query.data.stock} rowKey={row => row.id} columns={[
        { label: 'Producto', render: row => row.nombre }, { label: 'Stock', render: row => row.stock_actual + ' ' + row.unidad }, { label: 'Mínimo', render: row => row.stock_minimo },
      ]}/></section>
    </>}
  </>
}
