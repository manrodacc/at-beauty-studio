import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ClipboardList, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button, DataList, Empty, Failure, Field, Modal, PageTitle, Skeleton } from '@/components/ui'
import { CancelarCita, CitaCard, pendiente, useCitas } from '@/features/citas'
import { useCatalogo } from '@/features/catalogo'
import { obtener } from '@/lib/errors'
import { formatFechaHora } from '@/lib/fechas'
import { supabase } from '@/lib/supabase'
import { duracion, formatSoles } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import type { Cita } from '@/types/database.generated'
import { BookingForm } from './Booking'

export default function Client({ page }: { page: 'inicio' | 'citas' | 'historial' | 'perfil' }) {
  if (page === 'inicio') return <Inicio/>
  if (page === 'citas') return <MisCitas/>
  if (page === 'historial') return <Historial/>
  return <Perfil/>
}

function Inicio() {
  const { profile } = useAuth()
  const citas = useCitas()
  const catalog = useCatalogo()
  const next = citas.data?.find(cita => pendiente(cita) && Date.parse(cita.inicio) > Date.now())
  return <><PageTitle title={'Hola, ' + (profile?.nombres.split(' ')[0] || 'bienvenida')} description="Consulta tu próxima cita o reserva otro servicio." action={<Button asChild><Link to="/app/agendar"><CalendarDays size={18}/> Agendar cita</Link></Button>}/>
    {citas.isPending ? <Skeleton/> : citas.isError ? <Failure error={citas.error} retry={() => void citas.refetch()}/> : next ? <CitaCard cita={next} countdown><Button asChild variant="outline"><Link to="/app/mis-citas">Gestionar mi cita</Link></Button></CitaCard> : <section className="panel"><Empty title="Aún no tienes una próxima cita"><Button asChild><Link to="/app/agendar">Reservar mi primera cita</Link></Button></Empty></section>}
    <div className="quick-links"><Button asChild variant="outline"><Link to="/app/mis-citas"><CalendarDays size={17}/> Mis citas</Link></Button><Button asChild variant="outline"><Link to="/app/historial"><ClipboardList size={17}/> Mi historial</Link></Button></div>
    {catalog.isPending ? <Skeleton/> : catalog.isError ? <Failure error={catalog.error} retry={() => void catalog.refetch()}/> : !!catalog.data.length && <section className="panel"><h2 className="panel-heading">Explora otros servicios</h2><div className="choice-grid">{catalog.data.slice(0, 3).map(item => <Link to={'/app/agendar?servicio=' + item.id} className="selection-card" key={item.id}><Sparkles size={19}/><span className="choice-content"><strong>{item.nombre}</strong><small>{duracion(item.duracion_min)} · {formatSoles(item.precio)}</small></span></Link>)}</div></section>}
  </>
}

function MisCitas() {
  const query = useCitas()
  const [tab, setTab] = useState<'proximas' | 'historial'>('proximas')
  const [cancel, setCancel] = useState<Cita | null>(null)
  const [reschedule, setReschedule] = useState<Cita | null>(null)
  const rows = (query.data ?? []).filter(item => (pendiente(item) && Date.parse(item.inicio) > Date.now()) === (tab === 'proximas'))
  return <><PageTitle title="Mis citas" action={<Button asChild><Link to="/app/agendar">Agendar cita</Link></Button>}/>
    <div className="segmented" aria-label="Filtrar citas">
      <Button variant="ghost" aria-pressed={tab === 'proximas'} onClick={() => setTab('proximas')}>Próximas</Button>
      <Button variant="ghost" aria-pressed={tab === 'historial'} onClick={() => setTab('historial')}>Historial</Button>
    </div>
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : !rows.length ? <section className="panel"><Empty title={tab === 'proximas' ? 'Aún no tienes una próxima cita' : 'Aún no tienes citas en el historial'}>{tab === 'proximas' && <Button asChild><Link to="/app/agendar">Reservar una cita</Link></Button>}</Empty></section> :
      <div className="appointment-grid">{(tab === 'historial' ? [...rows].reverse() : rows).map(cita => {
        const canChange = cita.puede_cancelar && Date.parse(cita.limite_cancelacion) >= Date.now()
        return <CitaCard key={cita.id} cita={cita} countdown={tab === 'proximas'}>{tab === 'proximas' && <>
          <div className="button-row"><Button variant="outline" disabled={!canChange} onClick={() => setReschedule(cita)}>Reprogramar</Button><Button variant="ghost" disabled={!canChange} onClick={() => setCancel(cita)}>Cancelar</Button></div>
          {!canChange && <p className="muted">El plazo para cambiar esta cita terminó{cita.limite_cancelacion ? ' el ' + formatFechaHora(cita.limite_cancelacion) : ''}. Comunícate con el estudio si necesitas ayuda.</p>}
        </>}</CitaCard>
      })}</div>}
    <CancelarCita cita={cancel} close={() => setCancel(null)}/>
    <Modal title="Reprogramar cita" open={!!reschedule} onOpenChange={open => { if (!open) setReschedule(null) }}>
      {reschedule && <BookingForm cita={reschedule} onDone={() => setReschedule(null)}/>}
    </Modal>
  </>
}

const methods = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', yape_plin: 'Yape / Plin' }

function Historial() {
  const history = useQuery({
    queryKey: ['historial'],
    queryFn: async () => {
      const [a, p, s] = await Promise.all([
        supabase.from('atenciones').select('*').order('fecha_hora', { ascending: false }),
        supabase.from('pagos').select('*').order('fecha_hora', { ascending: false }),
        supabase.from('servicios').select('id,nombre'),
      ])
      const services = new Map((obtener(s) ?? []).map(item => [item.id, item.nombre]))
      return { atenciones: obtener(a) ?? [], pagos: obtener(p) ?? [], services }
    },
  })
  return <><PageTitle title="Mi historial" description="Consulta los servicios que recibiste y los pagos registrados."/>
    {history.isPending ? <Skeleton/> : history.isError ? <Failure error={history.error} retry={() => void history.refetch()}/> : <>
      <section className="panel"><h2 className="panel-heading">Atenciones</h2><DataList rows={history.data.atenciones} rowKey={item => item.id} columns={[
        { label: 'Servicio', render: item => history.data.services.get(item.id_servicio) ?? 'Servicio ' + item.id_servicio },
        { label: 'Fecha', render: item => formatFechaHora(item.fecha_hora) }, { label: 'Total', render: item => formatSoles(item.total) },
      ]}/></section>
      <section className="panel"><h2 className="panel-heading">Pagos</h2><DataList rows={history.data.pagos} rowKey={item => item.id} columns={[
        { label: 'Fecha', render: item => formatFechaHora(item.fecha_hora) }, { label: 'Método', render: item => methods[item.metodo_pago] }, { label: 'Monto', render: item => formatSoles(item.monto) },
      ]}/></section>
    </>}
  </>
}

const profileSchema = z.object({
  nombres: z.string().trim().min(1, 'Escribe tus nombres.').max(100),
  apellidos: z.string().trim().min(1, 'Escribe tus apellidos.').max(100),
  telefono: z.string().trim().regex(/^(?:\+?[\d ()-]{7,18})?$/, 'Escribe un teléfono válido.'),
})
function Perfil() {
  const { profile, refreshProfile } = useAuth()
  const cache = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileSchema>) => {
      const changes = { ...values, telefono: values.telefono || null }
      obtener(await supabase.from('profiles').update(changes).eq('id', profile!.id))
      obtener(await supabase.from('clientes').update(changes).eq('id_usuario', profile!.id))
    },
    onSuccess: () => { toast.success('Perfil actualizado'); refreshProfile(); void cache.invalidateQueries({ queryKey: ['clientes'] }) },
  })
  const [validation, setValidation] = useState<Partial<Record<keyof z.infer<typeof profileSchema>, string>>>({})
  return <><PageTitle title="Mi perfil" description="Actualiza los datos de contacto de tu cuenta."/>
    <form className="panel form-stack form-narrow" onSubmit={event => {
      event.preventDefault()
      const result = profileSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)))
      if (!result.success) { setValidation(Object.fromEntries(result.error.issues.map(issue => [issue.path[0], issue.message]))); return }
      setValidation({}); if (!mutation.isPending) mutation.mutate(result.data)
    }}>
      <Field label="Nombres" error={validation.nombres}><input name="nombres" autoComplete="given-name" defaultValue={profile?.nombres}/></Field>
      <Field label="Apellidos" error={validation.apellidos}><input name="apellidos" autoComplete="family-name" defaultValue={profile?.apellidos ?? ''}/></Field>
      <Field label="Teléfono" error={validation.telefono}><input name="telefono" type="tel" autoComplete="tel" defaultValue={profile?.telefono ?? ''}/></Field>
      <Field label="Correo electrónico"><input value={profile?.correo ?? ''} type="email" readOnly/></Field>
      {mutation.error && <Failure error={mutation.error}/>}
      <Button type="submit" disabled={mutation.isPending}>Guardar cambios</Button>
    </form></>
}
