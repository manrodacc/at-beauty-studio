import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Check, Clock3, Package, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Button, DataList, Empty, Failure, Field, Modal, PageTitle, Skeleton } from '@/components/ui'
import { CancelarCita, CitaCard, pendiente, useCitas } from '@/features/citas'
import { useCatalogo } from '@/features/catalogo'
import { currencyAmount, formValues, numericId, optionalText, pagoMethods, quantity, requiredText, useOperation, validate } from '@/features/operations'
import { AppError, obtener } from '@/lib/errors'
import { fechaLimaISO, formatFecha, formatFechaHora, formatHora, horaRegistro, sumarDias } from '@/lib/fechas'
import { rpc } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'
import { formatSoles } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import type { Cita, MetodoPago, Producto } from '@/types/database.generated'
import { BookingForm } from '@/pages/cliente/Booking'

type StaffPage = 'agenda' | 'atencion' | 'pagos' | 'asistencia' | 'inventario'
const reportsKeys = ['citas', 'atenciones', 'pagos', 'productos', 'caja', 'reportes', 'resumen']

export default function Staff({ page, admin }: { page: StaffPage; admin?: boolean }) {
  if (page === 'agenda') return <Agenda/>
  if (page === 'atencion') return <Atencion/>
  if (page === 'pagos') return <Pagos admin={admin}/>
  if (page === 'asistencia') return <Asistencia admin={admin}/>
  return <Inventario admin={admin}/>
}

function Agenda() {
  const [week, setWeek] = useState(false)
  const today = fechaLimaISO()
  const query = useCitas(today, week ? sumarDias(today, 6) : today)
  const [cancel, setCancel] = useState<Cita | null>(null)
  const [change, setChange] = useState<Cita | null>(null)
  return <><PageTitle title="Mi agenda" description="Consulta tus citas y registra las atenciones del estudio." action={<Button asChild><Link to="/app/atencion/nueva">Atención sin cita</Link></Button>}/>
    <div className="segmented"><Button variant="ghost" aria-pressed={!week} onClick={() => setWeek(false)}>Hoy</Button><Button variant="ghost" aria-pressed={week} onClick={() => setWeek(true)}>Próximos 7 días</Button></div>
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : !query.data.length ? <section className="panel"><Empty title="No tienes citas para este período"/></section> :
      <div className="appointment-grid">{query.data.map(cita => <CitaCard cita={cita} key={cita.id}><p className="muted">{cita.cliente}</p>{pendiente(cita) && <div className="button-row">
        <Button asChild><Link to={'/app/atencion/' + cita.id}>Registrar atención</Link></Button><Button variant="outline" onClick={() => setChange(cita)}>Reprogramar</Button><Button variant="ghost" onClick={() => setCancel(cita)}>Cancelar</Button>
      </div>}</CitaCard>)}</div>}
    <CancelarCita cita={cancel} close={() => setCancel(null)}/>
    <Modal title="Reprogramar cita" open={!!change} onOpenChange={open => { if (!open) setChange(null) }}>{change && <BookingForm admin cita={change} onDone={() => setChange(null)}/>}</Modal>
  </>
}

const attentionSchema = z.object({
  cliente: z.string().optional(), servicio: z.string().optional(), colaboradora: z.string().optional(),
  duracion: z.coerce.number().int().positive('Indica una duración mayor que cero.').max(1440),
  total: currencyAmount, observaciones: optionalText,
})
const useProductos = () => useQuery({ queryKey: ['productos'], queryFn: async () => obtener(await supabase.from('productos').select('*').order('nombre')) ?? [] })

function Atencion() {
  const { cita: routeId } = useParams()
  const walkIn = routeId === 'nueva'
  const { profile } = useAuth()
  const admin = profile?.rol === 'admin'
  const area = admin ? '/admin' : '/app'
  const navigate = useNavigate()
  const products = useProductos()
  const catalog = useCatalogo()
  const details = useQuery({
    queryKey: ['citas', 'atencion', routeId], enabled: !walkIn && /^\d+$/.test(routeId ?? ''),
    queryFn: async () => obtener(await supabase.from('citas_detalle').select('*').eq('id', Number(routeId)).maybeSingle()),
  })
  const clients = useQuery({
    queryKey: ['clientes', 'atencion'], enabled: walkIn,
    queryFn: async () => obtener(await supabase.from('clientes').select('id,nombres,apellidos').order('nombres')) ?? [],
  })
  const [service, setService] = useState(0)
  const staff = useQuery({
    queryKey: ['colaboradoras-servicio', service], enabled: walkIn && admin && !!service,
    queryFn: () => rpc('colaboradoras_para_servicio', { p_servicio: service }),
  })
  const [product, setProduct] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [amount, setAmount] = useState('1')
  const [items, setItems] = useState<{ id_producto: number; cantidad: number }[]>([])
  const [inputError, setInputError] = useState<unknown>(null)
  const selectedService = catalog.data?.find(item => item.id === service)
  const mutation = useOperation(async (input: Record<string, FormDataEntryValue>) => {
    const values = validate(attentionSchema, input)
    return rpc('registrar_atencion', {
      p_cita: walkIn ? undefined : details.data!.id,
      p_cliente: walkIn ? validate(numericId, values.cliente) : undefined,
      p_servicio: walkIn ? validate(numericId, values.servicio) : undefined,
      p_colaboradora: walkIn && admin ? validate(numericId, values.colaboradora) : undefined,
      p_duracion_real_min: values.duracion, p_total: values.total, p_productos: items, p_observaciones: values.observaciones,
    })
  }, 'Atención registrada', reportsKeys, () => navigate(area + '/pagos'))

  function addProduct() {
    try {
      const id = validate(numericId, product)
      const count = validate(quantity.refine(value => value > 0, 'Indica una cantidad mayor que cero.'), amount)
      setItems(current => {
        const existing = current.find(item => item.id_producto === id)
        return existing ? current.map(item => item.id_producto === id ? { ...item, cantidad: Number((item.cantidad + count).toFixed(3)) } : item) : [...current, { id_producto: id, cantidad: count }]
      })
      setProduct(''); setAmount('1'); setInputError(null)
    } catch (error) { setInputError(error) }
  }

  const error = products.error || (walkIn ? clients.error || catalog.error || staff.error : details.error)
  if (error) return <Failure error={error} retry={() => {
    void products.refetch()
    if (walkIn) { void clients.refetch(); void catalog.refetch(); if (admin && service) void staff.refetch() }
    else void details.refetch()
  }}/>
  if (products.isPending || (walkIn ? clients.isPending || catalog.isPending : details.isLoading)) return <Skeleton/>
  if (!walkIn && (!details.data || !pendiente(details.data))) return <><PageTitle title="Registrar atención"/><Empty title="Esta cita ya no está disponible para atención"><Button asChild variant="outline"><Link to={area + (admin ? '/citas' : '/agenda')}>Volver a las citas</Link></Button></Empty></>

  return <><PageTitle title={walkIn ? 'Atención sin cita' : 'Registrar atención'} description={details.data ? details.data.cliente + ' · ' + details.data.servicio + ' · ' + formatFechaHora(details.data.inicio) : 'Elige a la clienta y registra el servicio realizado.'}/>
    <form className="panel form-stack" onSubmit={event => { event.preventDefault(); if (!mutation.isPending) mutation.mutate(formValues(event.currentTarget)) }}>
      {walkIn && <div className="form-row">
        <Field label="Clienta"><select name="cliente" required><option value="">Selecciona</option>{clients.data?.map(item => <option value={item.id} key={item.id}>{item.nombres} {item.apellidos}</option>)}</select></Field>
        <Field label="Servicio"><select name="servicio" required value={service || ''} onChange={event => setService(Number(event.target.value))}><option value="">Selecciona</option>{catalog.data?.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></Field>
        {admin && <Field label="Colaboradora"><select name="colaboradora" required key={service}><option value="">Selecciona</option>{staff.data?.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></Field>}
      </div>}
      <div className="form-row" key={service || details.data?.id}>
        <Field label="Duración real (min)"><input name="duracion" type="number" min="1" max="1440" defaultValue={details.data?.duracion_min ?? selectedService?.duracion_min} required/></Field>
        <Field label="Total en soles"><input name="total" type="number" min="0" step=".01" defaultValue={details.data?.precio ?? selectedService?.precio} required/></Field>
      </div>
      <section className="form-stack"><h2 className="panel-heading">Productos utilizados</h2>
        <Field label="Buscar producto"><input type="search" value={productSearch} onChange={event => setProductSearch(event.target.value)}/></Field>
        <div className="form-row align-end">
          <Field label="Producto"><select value={product} onChange={event => setProduct(event.target.value)}><option value="">Selecciona</option>{products.data?.filter(item => item.estado && (String(item.id) === product || item.nombre.toLowerCase().includes(productSearch.trim().toLowerCase()))).map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.stock_actual} {item.unidad}</option>)}</select></Field>
          <Field label="Cantidad"><input type="number" min=".001" step=".001" value={amount} onChange={event => setAmount(event.target.value)}/></Field>
          <Button variant="outline" onClick={addProduct}>Agregar producto</Button>
        </div>
        {inputError !== null && <Failure error={inputError}/>}
        {!!items.length && <ul className="line-list">{items.map(item => <li key={item.id_producto}><span>{products.data?.find(product => product.id === item.id_producto)?.nombre} · {item.cantidad}</span><Button variant="ghost" onClick={() => setItems(current => current.filter(product => product.id_producto !== item.id_producto))}>Quitar</Button></li>)}</ul>}
      </section>
      <Field label="Observaciones (opcional)"><textarea name="observaciones" maxLength={400}/></Field>
      {mutation.error && <Failure error={mutation.error}/>}
      <Button type="submit" disabled={mutation.isPending}>Registrar atención</Button>
    </form></>
}

const paySchema = z.object({ atencion: numericId, metodo: z.enum(['efectivo', 'tarjeta', 'transferencia', 'yape_plin']), monto: currencyAmount.refine(value => value > 0, 'Ingresa un monto mayor que cero.'), comprobante: optionalText })

function Pagos({ admin }: { admin?: boolean }) {
  const [entry, setEntry] = useState(false)
  const [fecha, setFecha] = useState('')
  const [method, setMethod] = useState('')
  const [staff, setStaff] = useState('')
  const [attention, setAttention] = useState('')
  const [mode, setMode] = useState<MetodoPago>('efectivo')
  const [amount, setAmount] = useState('')
  const [cash, setCash] = useState('')
  const query = useQuery({
    queryKey: ['pagos', 'gestion', admin],
    queryFn: async () => {
      const [pay, attention, people, services, clients] = await Promise.all([
        supabase.from('pagos').select('*').order('fecha_hora', { ascending: false }),
        supabase.from('atenciones').select('*').order('fecha_hora', { ascending: false }),
        admin ? supabase.from('colaboradoras').select('id,nombres,apellidos') : Promise.resolve({ data: [], error: null }),
        supabase.from('servicios').select('id,nombre'),
        supabase.from('clientes').select('id,nombres,apellidos'),
      ])
      const payments = obtener(pay) ?? []
      const sums = new Map<number, number>()
      for (const item of payments) sums.set(item.id_atencion, (sums.get(item.id_atencion) ?? 0) + Number(item.monto))
      return {
        payments, atenciones: new Map((obtener(attention) ?? []).map(row => [row.id, row])),
        people: obtener(people) ?? [], services: new Map((obtener(services) ?? []).map(row => [row.id, row.nombre])),
        clients: new Map((obtener(clients) ?? []).map(row => [row.id, [row.nombres, row.apellidos].filter(Boolean).join(' ')])), sums,
      }
    },
  })
  const mutation = useOperation(async (input: Record<string, FormDataEntryValue>) => {
    const values = validate(paySchema, input)
    return rpc('registrar_pago', { p_atencion: values.atencion, p_metodo: values.metodo, p_monto: values.monto, p_comprobante: values.comprobante })
  }, 'Pago registrado', reportsKeys, () => setEntry(false))
  const rows = (query.data?.payments ?? []).filter(row => (!fecha || row.fecha === fecha) && (!method || row.metodo_pago === method) && (!staff || String(query.data?.atenciones.get(row.id_atencion)?.id_colaboradora) === staff))
  const balance = (id: number) => Math.round(((query.data?.atenciones.get(id)?.total ?? 0) - (query.data?.sums.get(id) ?? 0)) * 100) / 100
  const pending = [...(query.data?.atenciones.values() ?? [])].filter(row => balance(row.id) > 0)
  const change = Math.max(0, Number(cash) - Number(amount))
  return <><PageTitle title="Pagos" description="Consulta los pagos y registra abonos a una atención." action={<Button onClick={() => { mutation.reset(); setAttention(''); setAmount(''); setCash(''); setMode('efectivo'); setEntry(true) }}>Registrar pago</Button>}/>
    <div className="panel form-row"><Field label="Fecha"><input type="date" value={fecha} onChange={event => setFecha(event.target.value)}/></Field>
      <Field label="Método"><select value={method} onChange={event => setMethod(event.target.value)}><option value="">Todos</option>{Object.entries(pagoMethods).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></Field>
      {admin && <Field label="Colaboradora"><select value={staff} onChange={event => setStaff(event.target.value)}><option value="">Todas</option>{query.data?.people.map(item => <option value={item.id} key={item.id}>{item.nombres} {item.apellidos}</option>)}</select></Field>}
    </div>
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : <section className="panel"><DataList rows={rows} rowKey={row => row.id} columns={[
      { label: 'Fecha', render: row => formatFechaHora(row.fecha_hora) }, { label: 'Atención', render: row => '#' + row.id_atencion },
      { label: 'Método', render: row => pagoMethods[row.metodo_pago] }, { label: 'Monto', render: row => formatSoles(row.monto) },
      { label: 'Comprobante', render: row => row.comprobante || '—' },
    ]}/></section>}
    <Modal title="Registrar pago" open={entry} onOpenChange={setEntry}>
      {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : !pending.length ? <Empty title="No hay atenciones con saldo pendiente"/> : <form className="form-stack" onSubmit={event => { event.preventDefault(); if (!mutation.isPending) mutation.mutate({ ...formValues(event.currentTarget), metodo: mode }) }}>
        <Field label="Atención"><select value={attention} name="atencion" required onChange={event => { setAttention(event.target.value); setAmount(balance(Number(event.target.value)).toFixed(2)); setCash('') }}><option value="">Selecciona</option>{pending.map(row => <option value={row.id} key={row.id}>#{row.id} · {query.data.clients.get(row.id_cliente) || 'Clienta'} · {query.data.services.get(row.id_servicio) || 'Servicio'} · {formatSoles(balance(row.id))}</option>)}</select></Field>
        {attention && <p className="notice">Saldo pendiente {formatSoles(balance(Number(attention)))}</p>}
        <div className="segmented" aria-label="Método de pago">{Object.entries(pagoMethods).map(([id, name]) => <Button variant="ghost" aria-pressed={mode === id} key={id} onClick={() => setMode(id as MetodoPago)}>{name}</Button>)}</div>
        <Field label="Monto del pago"><input type="number" name="monto" required min=".01" step=".01" value={amount} onChange={event => setAmount(event.target.value)}/></Field>
        {mode === 'efectivo' && <Field label="Efectivo recibido (opcional)"><input type="number" min="0" step=".01" value={cash} onChange={event => setCash(event.target.value)}/></Field>}
        {mode === 'efectivo' && !!cash && <p>Vuelto <strong>{formatSoles(change)}</strong></p>}
        <Field label="Comprobante (opcional)"><input name="comprobante" maxLength={150}/></Field>{mutation.error && <Failure error={mutation.error}/>}<Button type="submit" disabled={mutation.isPending}>Guardar pago</Button>
      </form>}
    </Modal>
  </>
}

function Asistencia({ admin }: { admin?: boolean }) {
  const [now, setNow] = useState(() => new Date())
  const [date, setDate] = useState(fechaLimaISO)
  const [selected, setSelected] = useState('')
  const today = fechaLimaISO(now)
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer) }, [])
  const query = useQuery({
    queryKey: ['asistencia', date, admin],
    queryFn: async () => {
      const [rows, people] = await Promise.all([
        supabase.from('asistencias').select('*').eq('fecha', date).order('hora_ingreso'),
        admin ? supabase.from('colaboradoras').select('id,nombres,apellidos,estado').order('nombres') : Promise.resolve({ data: [], error: null }),
      ])
      return { rows: obtener(rows) ?? [], people: obtener(people) ?? [] }
    },
  })
  const active = date === today ? query.data?.rows.find(row => admin ? String(row.id_colaboradora) === selected : true) : undefined
  const mutation = useOperation(async (action: 'marcar_ingreso' | 'marcar_salida') => rpc(action, { p_colaboradora: admin ? validate(numericId, selected) : undefined }), 'Asistencia registrada', ['asistencia', 'reportes', 'resumen'])
  return <><PageTitle title="Asistencia" description={admin ? 'Consulta ingresos, salidas y tardanzas del equipo.' : 'Registra tu ingreso y salida.'}/>
    <section className="panel attendance-panel"><div><span className="soft-icon"><Clock3 size={23}/></span><h2>{formatHora(now.toISOString())}</h2><p>{formatFecha(today)} · Hora de Lima</p></div>
      <div className="form-stack">{admin && <Field label="Colaboradora"><select value={selected} onChange={event => setSelected(event.target.value)}><option value="">Selecciona</option>{query.data?.people.filter(row => row.estado).map(row => <option value={row.id} key={row.id}>{row.nombres} {row.apellidos}</option>)}</select></Field>}
        <Button disabled={date !== today || query.isPending || query.isError || mutation.isPending || (admin && !selected) || !!active?.hora_salida} onClick={() => mutation.mutate(active?.hora_ingreso ? 'marcar_salida' : 'marcar_ingreso')}>{active?.hora_salida ? 'Jornada finalizada' : active?.hora_ingreso ? 'Registrar salida' : 'Registrar ingreso'}</Button>
        {active && <span className="muted"><Check size={16}/> {active.tardanza_min > 0 ? 'Tardanza: ' + active.tardanza_min + ' min' : 'A tiempo'}</span>}
      </div>
    </section>
    {mutation.error && <Failure error={mutation.error}/>}
    <section className="panel form-stack"><Field label="Fecha de asistencia"><input type="date" value={date} max={today} onChange={event => { if (event.target.value) setDate(event.target.value) }}/></Field>
      {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : <DataList rows={query.data.rows} rowKey={row => row.id} columns={[
        ...(admin ? [{ label: 'Colaboradora', render: (row: typeof query.data.rows[number]) => {
          const person = query.data.people.find(person => person.id === row.id_colaboradora)
          return person ? [person.nombres, person.apellidos].filter(Boolean).join(' ') : 'Colaboradora ' + row.id_colaboradora
        } }] : []),
        { label: 'Ingreso', render: row => horaRegistro(row.hora_ingreso, row.fecha) },
        { label: 'Salida', render: row => horaRegistro(row.hora_salida, row.fecha) },
        { label: 'Horas trabajadas', render: row => row.horas_trabajadas === null ? '—' : row.horas_trabajadas + ' h' },
        { label: 'Tardanza', render: row => row.tardanza_min + ' min' },
        { label: 'Turno', render: row => row.turno || '—' },
      ]}/>}
    </section>
  </>
}

const productSchema = z.object({ nombre: requiredText, categoria: requiredText, unidad: requiredText, stock_minimo: quantity, costo_unitario: currencyAmount, estado: z.enum(['on']).optional().transform(Boolean) })
const stockSchema = z.object({ cantidad: quantity.refine(value => value > 0, 'Indica una cantidad mayor que cero.'), motivo: optionalText })

function Inventario({ admin }: { admin?: boolean }) {
  const query = useProductos()
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<Producto | 'new' | null>(null)
  const [stock, setStock] = useState<Producto | null>(null)
  const rows = (query.data ?? []).filter(row => (admin || row.estado) && [row.nombre, row.categoria].some(value => value.toLowerCase().includes(search.trim().toLowerCase())))
  return <><PageTitle title="Inventario" description="Consulta las existencias y los productos bajo el mínimo." action={admin && <Button onClick={() => setEdit('new')}><Plus size={17}/> Nuevo producto</Button>}/>
    <section className="panel"><Field label="Buscar productos"><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre o categoría"/></Field></section>
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : !rows.length ? <section className="panel"><Empty title="No hay productos para mostrar"/></section> :
      <div className="appointment-grid">{rows.map(row => <article className="panel stock-card" key={row.id}>
        <div className="appointment-heading"><span className="soft-icon"><Package size={21}/></span><span className={'status-badge ' + (!row.estado ? 'cancelada' : row.stock_actual < row.stock_minimo ? 'pendiente' : 'confirmada')}>{!row.estado ? 'Inactivo' : row.stock_actual < row.stock_minimo ? 'Stock bajo' : 'Disponible'}</span></div>
        <h2>{row.nombre}</h2><p className="muted">{row.categoria}</p>
        <meter aria-label={'Stock de ' + row.nombre} min={0} max={Math.max(row.stock_minimo * 2, row.stock_actual, 1)} low={row.stock_minimo} optimum={Math.max(row.stock_minimo * 2, row.stock_actual, 1)} value={row.stock_actual}/>
        <p><strong>{row.stock_actual} {row.unidad}</strong> <span className="muted">· Mín. {row.stock_minimo}</span></p>
        {admin && <div className="button-row"><Button variant="outline" onClick={() => setEdit(row)}>Editar</Button><Button variant="ghost" disabled={!row.estado} onClick={() => setStock(row)}>Registrar entrada</Button></div>}
      </article>)}</div>}
    <Modal title={edit === 'new' ? 'Nuevo producto' : 'Editar producto'} open={!!edit} onOpenChange={open => { if (!open) setEdit(null) }}>{edit && <ProductForm item={edit === 'new' ? undefined : edit} close={() => setEdit(null)}/>}</Modal>
    <Modal title="Registrar entrada" open={!!stock} onOpenChange={open => { if (!open) setStock(null) }}>{stock && <StockForm item={stock} close={() => setStock(null)}/>}</Modal>
  </>
}

function ProductForm({ item, close }: { item?: Producto; close: () => void }) {
  const mutation = useOperation(async (input: Record<string, FormDataEntryValue>) => {
    const values = validate(productSchema, input)
    return obtener(await (item ? supabase.from('productos').update(values).eq('id', item.id) : supabase.from('productos').insert(values)))
  }, 'Producto guardado', reportsKeys, close)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!mutation.isPending) mutation.mutate(formValues(event.currentTarget)) }
  return <form className="form-stack" onSubmit={submit}>
    <Field label="Nombre"><input name="nombre" required defaultValue={item?.nombre}/></Field>
    <div className="form-row"><Field label="Categoría"><input name="categoria" required defaultValue={item?.categoria}/></Field><Field label="Unidad"><input name="unidad" required defaultValue={item?.unidad}/></Field></div>
    <div className="form-row"><Field label="Stock mínimo"><input name="stock_minimo" type="number" min="0" step=".001" required defaultValue={item?.stock_minimo ?? 0}/></Field><Field label="Costo unitario en soles"><input name="costo_unitario" type="number" min="0" step=".01" required defaultValue={item?.costo_unitario ?? 0}/></Field></div>
    <label className="check-field"><input name="estado" type="checkbox" defaultChecked={item?.estado ?? true}/> Producto activo</label>
    {mutation.error && <Failure error={mutation.error}/>}<Button disabled={mutation.isPending} type="submit">Guardar producto</Button>
  </form>
}

function StockForm({ item, close }: { item: Producto; close: () => void }) {
  const { profile } = useAuth()
  const mutation = useOperation(async (input: Record<string, FormDataEntryValue>) => {
    const values = validate(stockSchema, input)
    if (!profile) throw new AppError('no_autenticado', 'Inicia sesión de nuevo.')
    return obtener(await supabase.from('movimientos_inventario').insert({ id_producto: item.id, tipo: 'entrada', cantidad: values.cantidad, motivo: values.motivo, id_usuario: profile.id }))
  }, 'Entrada registrada', reportsKeys, close)
  return <form className="form-stack" onSubmit={event => { event.preventDefault(); if (!mutation.isPending) mutation.mutate(formValues(event.currentTarget)) }}>
    <p>{item.nombre} · Stock actual {item.stock_actual} {item.unidad}</p>
    <Field label="Cantidad"><input name="cantidad" type="number" min=".001" step=".001" required/></Field>
    <Field label="Motivo (opcional)"><textarea name="motivo" maxLength={400}/></Field>
    {mutation.error && <Failure error={mutation.error}/>}<Button type="submit" disabled={mutation.isPending}>Confirmar entrada</Button>
  </form>
}
