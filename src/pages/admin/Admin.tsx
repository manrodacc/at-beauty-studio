import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock3, CreditCard, Package, Plus } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button, DataList, Empty, Failure, Field, Modal, PageTitle, Skeleton } from '@/components/ui'
import { CancelarCita, StatusCita, pendiente, useCitas } from '@/features/citas'
import { photoPath, useCategorias } from '@/features/catalogo'
import { ClientForm, useClientes } from '@/features/clientes'
import { currencyAmount, formValues, numericId, optionalText, requiredText, useOperation, validate } from '@/features/operations'
import { obtener } from '@/lib/errors'
import { fechaLimaISO, formatFecha, formatFechaHora } from '@/lib/fechas'
import { rpc } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'
import { duracion, formatSoles } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import type { Cita, Cliente, Servicio } from '@/types/database'
import { BookingForm } from '@/pages/cliente/Booking'
import { Colaboradoras, Configuracion } from './People'
import { Categorias } from './Categorias'

const ReportOverview = lazy(() => import('./Reports').then(module => ({ default: module.ReportOverview })))

type Page = 'inicio' | 'citas' | 'clientes' | 'colaboradoras' | 'categorias' | 'servicios' | 'caja' | 'configuracion'
const keys = ['caja', 'resumen', 'pagos', 'reportes']

export default function Admin({ page }: { page: Page }) {
  if (page === 'inicio') return <Inicio/>
  if (page === 'citas') return <Citas/>
  if (page === 'clientes') return <Clientes/>
  if (page === 'colaboradoras') return <Colaboradoras/>
  if (page === 'categorias') return <Categorias/>
  if (page === 'servicios') return <Servicios/>
  if (page === 'caja') return <Caja/>
  return <Configuracion/>
}

function Inicio() {
  const day = fechaLimaISO()
  const stats = useQuery({
    queryKey: ['resumen', day],
    queryFn: async () => {
      const [appointments, payments, products, attendance] = await Promise.all([
        supabase.from('citas_detalle').select('id,estado').eq('fecha', day),
        supabase.from('pagos').select('monto').eq('fecha', day),
        supabase.from('productos').select('id,stock_actual,stock_minimo').eq('estado', true),
        supabase.from('asistencias').select('id').eq('fecha', day).gt('tardanza_min', 0),
      ])
      return {
        citas: (obtener(appointments) ?? []).filter(row => row.estado !== 'cancelada').length,
        ingresos: (obtener(payments) ?? []).reduce((sum, row) => sum + Number(row.monto), 0),
        stock: (obtener(products) ?? []).filter(row => row.stock_actual < row.stock_minimo).length,
        tardanzas: (obtener(attendance) ?? []).length,
      }
    },
  })
  return <><PageTitle title="Resumen del estudio" description={formatFecha(day) + ' · Hora de Lima'} action={<Button asChild><Link to="/admin/citas">Gestionar citas</Link></Button>}/>
    {stats.isPending ? <Skeleton/> : stats.isError ? <Failure error={stats.error} retry={() => void stats.refetch()}/> : <div className="stats-grid">
      {[
        { icon: CalendarDays, name: 'Citas de hoy', value: stats.data.citas, url: '/admin/citas' },
        { icon: CreditCard, name: 'Ingresos de hoy', value: formatSoles(stats.data.ingresos), url: '/admin/pagos' },
        { icon: Package, name: 'Productos bajo mínimo', value: stats.data.stock, url: '/admin/inventario' },
        { icon: Clock3, name: 'Tardanzas de hoy', value: stats.data.tardanzas, url: '/admin/asistencia' },
      ].map(({ icon: Icon, name, value, url }) => <Link className="panel stat" to={url} key={name}><span className="soft-icon"><Icon size={20}/></span><span>{name}</span><strong>{value}</strong></Link>)}
    </div>}
    <Suspense fallback={<Skeleton/>}><ReportOverview/></Suspense>
  </>
}

function Citas() {
  const [fecha, setFecha] = useState('')
  const [status, setStatus] = useState('')
  const [staff, setStaff] = useState('')
  const [cancel, setCancel] = useState<Cita | null>(null)
  const [change, setChange] = useState<Cita | null>(null)
  const [create, setCreate] = useState(false)
  const query = useCitas(fecha || undefined, fecha || undefined)
  const rows = (query.data ?? []).filter(row => (!status || row.estado === status) && (!staff || row.colaboradora === staff))
  const people = [...new Set((query.data ?? []).map(row => row.colaboradora).filter(Boolean))]
  return <><PageTitle title="Citas" description="Supervisa la agenda y las reservas del estudio." action={<div className="button-row"><Button asChild variant="outline"><Link to="/admin/atencion/nueva">Atención sin cita</Link></Button><Button onClick={() => setCreate(true)}><Plus size={17}/> Nueva cita</Button></div>}/>
    <section className="panel form-row">
      <Field label="Fecha">
        <div className="button-row">
          <input type="date" value={fecha} onChange={event => setFecha(event.target.value)}/>
          {fecha && <Button variant="ghost" type="button" onClick={() => setFecha('')}>Ver todas</Button>}
          {!fecha && <Button variant="outline" type="button" onClick={() => setFecha(fechaLimaISO())}>Hoy</Button>}
        </div>
      </Field>
      <Field label="Estado"><select value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos</option><option value="confirmada">Confirmada</option><option value="pendiente">Pendiente</option><option value="realizada">Realizada</option><option value="cancelada">Cancelada</option></select></Field>
      <Field label="Colaboradora"><select value={staff} onChange={event => setStaff(event.target.value)}><option value="">Todas</option>{people.map(person => <option key={person}>{person}</option>)}</select></Field>
    </section>
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : <section className="panel"><DataList rows={rows} rowKey={row => row.id} columns={[
      { label: 'Fecha y hora', render: row => formatFechaHora(row.inicio) }, { label: 'Clienta', render: row => row.cliente }, { label: 'Servicio', render: row => row.servicio },
      { label: 'Colaboradora', render: row => row.colaboradora }, { label: 'Estado', render: row => <StatusCita estado={row.estado}/> },
      { label: 'Acciones', render: row => pendiente(row) && <div className="button-row"><Button asChild variant="outline"><Link to={'/admin/atencion/' + row.id}>Atender</Link></Button><Button variant="ghost" onClick={() => setChange(row)}>Reprogramar</Button><Button variant="ghost" onClick={() => setCancel(row)}>Cancelar</Button></div> },
    ]}/></section>}
    <Modal title="Nueva cita" open={create} onOpenChange={setCreate}>{create && <BookingForm admin onDone={() => setCreate(false)}/>}</Modal>
    <Modal title="Reprogramar cita" open={!!change} onOpenChange={open => { if (!open) setChange(null) }}>{change && <BookingForm cita={change} admin onDone={() => setChange(null)}/>}</Modal>
    <CancelarCita cita={cancel} close={() => setCancel(null)}/>
  </>
}

function Clientes() {
  const [filter, setFilter] = useState('')
  const [view, setView] = useState<Cliente | null>(null)
  const [create, setCreate] = useState(false)
  const query = useClientes()
  const rows = (query.data ?? []).filter(row => [row.nombres, row.apellidos, row.correo, row.telefono].some(value => value?.toLowerCase().includes(filter.trim().toLowerCase())))
  return <><PageTitle title="Clientes" description="Consulta las fichas y registra clientas que llegan al estudio." action={<Button onClick={() => setCreate(true)}><Plus size={17}/> Nueva clienta</Button>}/>
    <section className="panel form-stack"><Field label="Buscar clienta"><input type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Nombre, correo o teléfono"/></Field>
      {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : <DataList rows={rows} rowKey={row => row.id} columns={[
        { label: 'Nombre', render: row => row.nombres + ' ' + (row.apellidos ?? '') }, { label: 'Correo', render: row => row.correo || '—' }, { label: 'Teléfono', render: row => row.telefono || '—' },
        { label: 'Cuenta', render: row => row.id_usuario ? 'Vinculada' : 'Sin cuenta' }, { label: 'Ficha', render: row => <Button variant="outline" onClick={() => setView(row)}>Ver ficha</Button> },
      ]}/>}
    </section>
    <Modal title="Nueva clienta" open={create} onOpenChange={setCreate}>{create && <ClientForm close={() => setCreate(false)}/>}</Modal>
    <Modal title="Ficha de la clienta" open={!!view} onOpenChange={open => { if (!open) setView(null) }}>{view && <ClientDetail client={view}/>}</Modal>
  </>
}

function ClientDetail({ client }: { client: Cliente }) {
  const query = useQuery({
    queryKey: ['atenciones', 'clienta', client.id],
    queryFn: async () => obtener(await supabase.from('atenciones').select('*').eq('id_cliente', client.id).order('fecha_hora', { ascending: false })) ?? [],
  })
  return <div className="form-stack"><h3 className="panel-heading">{client.nombres} {client.apellidos}</h3>
    <dl className="booking-ticket"><div><dt>Correo</dt><dd>{client.correo || '—'}</dd></div><div><dt>Teléfono</dt><dd>{client.telefono || '—'}</dd></div><div><dt>Registro</dt><dd>{formatFecha(client.fecha_registro)}</dd></div></dl>
    <h3>Atenciones</h3>{query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error}/> : <DataList rows={query.data} rowKey={row => row.id} columns={[{ label: 'Fecha', render: row => formatFechaHora(row.fecha_hora) }, { label: 'Total', render: row => formatSoles(row.total) }]}/>}
  </div>
}

const serviceSchema = z.object({
  nombre: requiredText, id_categoria: numericId, descripcion: optionalText,
  precio: currencyAmount, duracion_min: z.coerce.number().int().positive('Indica una duración válida.').max(1440),
  estado: z.enum(['on']).optional().transform(Boolean),
})
const storage = supabase.storage.from('catalogo')

function Servicios() {
  const [edit, setEdit] = useState<Servicio | 'new' | null>(null)
  const [category, setCategory] = useState('')
  const categories = useCategorias()
  const query = useQuery({ queryKey: ['servicios', 'admin'], queryFn: async () => obtener(await supabase.from('servicios').select('*, categorias_servicio(nombre)').order('nombre')) ?? [] })
  const rows = (query.data ?? []).filter(row => !category || row.id_categoria === Number(category))
  return <><PageTitle title="Servicios" description="Administra el catálogo público, las tarifas y la duración." action={<Button onClick={() => setEdit('new')}><Plus size={17}/> Nuevo servicio</Button>}/>
    <section className="panel"><Field label="Filtrar por categoría"><select value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas las categorías</option>{categories.data?.map(item => <option key={item.id} value={item.id}>{item.nombre}{!item.estado && ' (inactiva)'}</option>)}</select></Field>{categories.isError && <Failure error={categories.error} retry={() => void categories.refetch()}/>}</section>
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : <section className="panel"><DataList rows={rows} rowKey={row => row.id} columns={[
      { label: 'Servicio', render: row => row.nombre }, { label: 'Categoría', render: row => row.categorias_servicio?.nombre ?? '—' }, { label: 'Duración', render: row => duracion(row.duracion_min) },
      { label: 'Precio', render: row => formatSoles(row.precio) }, { label: 'Estado', render: row => row.estado ? 'Publicado' : 'Oculto' },
      { label: 'Acciones', render: row => <Button variant="outline" onClick={() => setEdit(row)}>Editar</Button> },
    ]}/></section>}
    <Modal title={edit === 'new' ? 'Nuevo servicio' : 'Editar servicio'} open={!!edit} onOpenChange={open => { if (!open) setEdit(null) }}>{edit && <ServiceForm service={edit === 'new' ? undefined : edit} close={() => setEdit(null)}/>}</Modal>
  </>
}

function ServiceForm({ service, close }: { service?: Servicio; close: () => void }) {
  const categories = useCategorias()
  const [selected, setSelected] = useState<Servicio | undefined>(service)
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const save = useOperation(async (input: Record<string, FormDataEntryValue>) => {
    const values = validate(serviceSchema, input)
    const changes = { ...values, descripcion: values.descripcion ?? null }
    const row = obtener(await (selected ? supabase.from('servicios').update(changes).eq('id', selected.id) : supabase.from('servicios').insert(changes)).select('*').single())
    if (row) setSelected(row)
  }, 'Servicio guardado', ['servicios', 'catalogo', 'categorias', 'reportes', 'resumen'], selected ? close : undefined)
  const photo = useOperation(async (image: File) => {
    if (!selected) return
    const valid = validate(z.file().max(3_000_000, 'La foto debe pesar menos de 3 MB.').mime(['image/webp', 'image/jpeg', 'image/png', 'image/avif'], 'Usa una imagen WebP, JPG, PNG o AVIF.'), image)
    return obtener(await storage.upload(photoPath(selected.id), valid, { upsert: true, contentType: valid.type, cacheControl: '60' }))
  }, 'Foto actualizada', ['catalogo'], () => {
    if (fileInput.current) fileInput.current.value = ''
    setFile(null)
  })
  return <div className="form-stack">
    <form className="form-stack" onSubmit={event => { event.preventDefault(); if (!save.isPending) save.mutate(formValues(event.currentTarget)) }}>
      <div className="form-row"><Field label="Nombre"><input name="nombre" required defaultValue={selected?.nombre}/></Field><Field label="Categoría"><select name="id_categoria" required disabled={!categories.isSuccess} defaultValue={selected?.id_categoria ?? ''}><option value="">Selecciona una categoría</option>{categories.data?.map(item => <option key={item.id} value={item.id}>{item.nombre}{!item.estado && ' (inactiva)'}</option>)}</select></Field></div>
      {categories.isPending ? <p role="status">Cargando categorías…</p> : categories.isError ? <Failure error={categories.error} retry={() => void categories.refetch()}/> : !categories.data.length && <p>Crea primero una categoría en <Link to="/admin/categorias">Categorías</Link>.</p>}
      <Field label="Descripción"><textarea name="descripcion" defaultValue={selected?.descripcion ?? ''} maxLength={400}/></Field>
      <div className="form-row"><Field label="Precio en soles"><input type="number" name="precio" min="0" step=".01" required defaultValue={selected?.precio}/></Field><Field label="Duración en minutos"><input type="number" name="duracion_min" min="1" max="1440" required defaultValue={selected?.duracion_min}/></Field></div>
      <label className="check-field"><input type="checkbox" name="estado" defaultChecked={selected?.estado ?? true}/> Mostrar en el catálogo</label>
      {save.error && <Failure error={save.error}/>}<Button type="submit" disabled={save.isPending || !categories.data?.length}>Guardar servicio</Button>
    </form>
    {selected && <div className="form-stack"><Field label="Foto del servicio"><input ref={fileInput} disabled={photo.isPending} type="file" accept="image/webp,image/jpeg,image/png,image/avif" onChange={event => { photo.reset(); setFile(event.target.files?.[0] ?? null) }}/></Field>
      {photo.error && <Failure error={photo.error}/>}<Button variant="outline" disabled={!file || photo.isPending} onClick={() => { if (file) photo.mutate(file) }}>Subir foto</Button></div>}
  </div>
}

const closeSchema = z.object({ monto_contado: currencyAmount, observaciones: optionalText })
const expenseSchema = z.object({ concepto: requiredText, monto: currencyAmount.refine(value => value > 0, 'Ingresa un monto mayor que cero.') })
function Caja() {
  const { profile } = useAuth()
  const today = fechaLimaISO()
  const [date, setDate] = useState(today)
  const [active, setActive] = useState<'egreso' | 'cierre' | null>(null)
  const query = useQuery({
    queryKey: ['caja', date],
    queryFn: async () => {
      const [p, e, c] = await Promise.all([
        supabase.from('pagos').select('monto').eq('fecha', date),
        supabase.from('egresos').select('*').eq('fecha', date).order('id', { ascending: false }),
        supabase.from('cierres_caja').select('*').eq('fecha', date).maybeSingle(),
      ])
      const payments = obtener(p) ?? []
      const expenses = obtener(e) ?? []
      const cierre = obtener(c)
      const ingresos = cierre?.total_ingresos ?? payments.reduce((sum, item) => sum + Number(item.monto), 0)
      const egresos = cierre?.total_egresos ?? expenses.reduce((sum, item) => sum + Number(item.monto), 0)
      return { expenses, cierre, ingresos, egresos, expected: cierre?.monto_esperado ?? ingresos - egresos }
    },
  })
  const closed = query.data?.cierre
  const close = () => setActive(null)
  const expense = useOperation(async (input: Record<string, FormDataEntryValue>) => obtener(await supabase.from('egresos').insert({ ...validate(expenseSchema, input), fecha: date, registrado_por: profile!.id })), 'Egreso registrado', keys, close)
  const closeCash = useOperation(async (input: Record<string, FormDataEntryValue>) => {
    const values = validate(closeSchema, input)
    return rpc('cerrar_caja', { p_monto_contado: values.monto_contado, p_observaciones: values.observaciones, p_fecha: date })
  }, 'Caja cerrada', keys, close)

  return <><PageTitle title="Caja" description="Consolida ingresos, egresos y el importe contado."/>
    <section className="panel form-row align-end"><Field label="Fecha de caja"><input type="date" value={date} max={today} onChange={event => { if (event.target.value) setDate(event.target.value) }}/></Field>
      <div className="button-row"><Button variant="outline" disabled={!query.isSuccess || !!closed} onClick={() => { expense.reset(); setActive('egreso') }}>Registrar egreso</Button><Button disabled={!query.isSuccess || !!closed} onClick={() => { closeCash.reset(); setActive('cierre') }}>Cerrar caja</Button></div>
    </section>
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : <>
      <div className="stats-grid">{[['Ingresos', query.data.ingresos], ['Egresos', query.data.egresos], ['Monto esperado', query.data.expected], ...(closed ? [['Diferencia', closed.diferencia], ['Monto contado', closed.monto_contado]] : [])].map(([label, value]) => <div className="panel stat" key={label}><span>{label}</span><strong>{formatSoles(Number(value))}</strong></div>)}</div>
      {closed && <div className={'notice ' + (Number(closed.diferencia) ? 'notice-warn' : '')}>{Number(closed.diferencia) ? 'Caja cerrada con diferencia de ' + formatSoles(closed.diferencia ?? 0) : 'Caja cerrada sin diferencia.'} {closed.observaciones}</div>}
      <section className="panel"><h2 className="panel-heading">Egresos registrados</h2>{!query.data.expenses.length ? <Empty title="No hay egresos en esta fecha"/> : <DataList rows={query.data.expenses} rowKey={row => row.id} columns={[{ label: 'Concepto', render: row => row.concepto }, { label: 'Monto', render: row => formatSoles(row.monto) }]}/>}</section>
    </>}
    <Modal title={active === 'egreso' ? 'Registrar egreso' : 'Cerrar caja'} open={!!active} onOpenChange={open => { if (!open) close() }}>
      {active && <form className="form-stack" onSubmit={event => {
        event.preventDefault()
        const mutation = active === 'egreso' ? expense : closeCash
        if (!mutation.isPending && !closed) mutation.mutate(formValues(event.currentTarget))
      }}>
        {active === 'egreso' ? <><Field label="Concepto"><input name="concepto" required/></Field><Field label="Monto en soles"><input name="monto" type="number" min=".01" step=".01" required/></Field></> : <>
          <p>Monto esperado para {formatFecha(date)} <strong>{formatSoles(query.data?.expected ?? 0)}</strong></p>
          <Field label="Monto contado en soles"><input name="monto_contado" type="number" min="0" step=".01" required/></Field>
          <Field label="Observaciones (opcional)"><textarea name="observaciones" maxLength={400}/></Field>
        </>}
        {(active === 'egreso' ? expense.error : closeCash.error) && <Failure error={active === 'egreso' ? expense.error : closeCash.error}/>}
        <Button type="submit" disabled={expense.isPending || closeCash.isPending || !!closed}>{active === 'egreso' ? 'Guardar egreso' : 'Confirmar cierre'}</Button>
      </form>}
    </Modal>
  </>
}
