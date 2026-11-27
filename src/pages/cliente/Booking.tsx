import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Sparkles, UserRound } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, Empty, Failure, Field, PageTitle, Skeleton } from '@/components/ui'
import { Countdown } from '@/features/citas'
import { useCatalogoCategorias } from '@/features/catalogo'
import { useClientes } from '@/features/clientes'
import { AppError, codigoError, mensajeError, obtener } from '@/lib/errors'
import { fechaLimaISO, formatFecha, formatFechaHora, formatHora, sumarDias } from '@/lib/fechas'
import { rpc } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'
import { duracion, formatSoles } from '@/lib/utils'
import type { Cita } from '@/types/database'

const labels = ['Servicio', 'Especialista', 'Fecha', 'Hora', 'Confirmar']

export default function Booking() {
  const [params] = useSearchParams()
  return <><PageTitle title="Reserva tu cita" description="Elige cómo quieres que te atendamos."/><BookingForm initialService={Number(params.get('servicio')) || undefined}/></>
}

export function BookingForm({ initialService, cita, admin, onDone }: { initialService?: number; cita?: Cita; admin?: boolean; onDone?: () => void }) {
  const catalog = useCatalogoCategorias()
  const citaService = useQuery({
    queryKey: ['servicio-cita', cita?.id], enabled: !!cita,
    queryFn: async () => {
      const reference = obtener(await supabase.from('citas').select('id_servicio').eq('id', cita!.id).maybeSingle())
      if (!reference) {
        const matches = obtener(await supabase.from('servicios').select('*').eq('nombre', cita!.servicio)) ?? []
        if (matches.length === 1) return matches[0]
        throw new AppError('servicio_no_disponible', 'No pudimos identificar el servicio de esta cita.')
      }
      return obtener(await supabase.from('servicios').select('*').eq('id', reference.id_servicio).single())
    },
  })
  const clients = useClientes(!!admin && !cita)
  const [client, setClient] = useState<number>()
  const [selected, setSelected] = useState(initialService)
  const [staff, setStaff] = useState<number>()
  const [day, setDay] = useState<string>()
  const [weekOffset, setWeekOffset] = useState(0)
  const [time, setTime] = useState<string>()
  const [step, setStep] = useState(cita ? 1 : 0)
  const [direction, setDirection] = useState(1)
  const [confirmed, setConfirmed] = useState(false)
  const cache = useQueryClient()
  const reduce = useReducedMotion()
  const service = cita ? citaService.data : catalog.data?.flatMap(category => category.servicios).find(item => item.id === selected)
  const today = fechaLimaISO()
  const days = Array.from({ length: 7 }, (_, i) => sumarDias(today, weekOffset * 7 + i))

  const staffList = useQuery({
    queryKey: ['colaboradoras-servicio', service?.id], enabled: !!service && step >= 1,
    queryFn: () => rpc('colaboradoras_para_servicio', { p_servicio: service!.id }),
  })
  const slots = useQueries({ queries: days.map(date => ({
    queryKey: ['horarios', service?.id, date, staff, cita?.id],
    enabled: !!service && step >= 2,
    queryFn: () => rpc('horarios_disponibles', { p_servicio: service!.id, p_fecha: date, p_colaboradora: staff, p_excluir_cita: cita?.id }),
    staleTime: 25_000,
  })) })
  const daySlots = day ? slots[days.indexOf(day)] : undefined
  const availableTimes = [...new Set(daySlots?.data?.map(slot => slot.inicio) ?? [])].sort()
  const staffName = staffList.data?.find(person => person.id === staff)?.nombre || 'Cualquiera disponible'
  const move = (next: number) => { setDirection(next >= step ? 1 : -1); setStep(next) }
  const submit = useMutation({
    mutationFn: async () => {
      if (!service || !time) throw new AppError('datos_incompletos', 'Elige un servicio y una hora.')
      if (cita) return rpc('reprogramar_cita', { p_cita: cita.id, p_nuevo_inicio: time, p_colaboradora: staff })
      return rpc('agendar_cita', { p_servicio: service.id, p_inicio: time, p_colaboradora: staff, p_cliente: client })
    },
    onSuccess: () => {
      setConfirmed(true)
      void cache.invalidateQueries({ queryKey: ['citas'] })
      void cache.invalidateQueries({ queryKey: ['horarios'] })
      if (!reduce && !admin) {
        void import('canvas-confetti').then(({ default: confetti }) => confetti({
          particleCount: navigator.hardwareConcurrency <= 4 ? 30 : 65,
          spread: 72, origin: { y: 0.67 }, colors: ['#DE4A8E', '#FAC4DE', '#EBD3B3', '#DDD0F2'], disableForReducedMotion: true,
        })).catch(() => undefined)
        navigator.vibrate?.(30)
      }
    },
    onError: error => {
      toast.error(mensajeError(error))
      if (codigoError(error) === 'horario_no_disponible') {
        setTime(undefined); move(3)
        void cache.invalidateQueries({ queryKey: ['horarios'] })
      }
    },
  })

  if (confirmed && time) return <section className="panel booking-success">
    <motion.span className="success-mark" initial={reduce ? false : { scale: 0.65, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Check size={32}/></motion.span>
    <h2>{cita ? 'Tu cita fue reprogramada' : 'Tu cita está confirmada'}</h2><p>{service?.nombre} · {formatFechaHora(time)}</p>
    {!admin && <Countdown inicio={time}/>}
    {onDone ? <Button onClick={onDone}>Listo</Button> : <Button asChild><Link to="/app/mis-citas">Ver mis citas</Link></Button>}
  </section>

  if (cita && citaService.isError) return <Failure error={citaService.error} retry={() => void citaService.refetch()}/>
  const stepContent = [
    <div className="form-stack" key="servicios">
      <h2>Elige un servicio</h2>
      {admin && !cita && (clients.isError ? <Failure error={clients.error} retry={() => void clients.refetch()}/> : <Field label="Clienta"><select value={client ?? ''} onChange={event => setClient(Number(event.target.value) || undefined)}><option value="">Selecciona una clienta</option>{clients.data?.map(item => <option value={item.id} key={item.id}>{item.nombres} {item.apellidos}</option>)}</select></Field>)}
      {catalog.isPending ? <Skeleton/> : catalog.isError ? <Failure error={catalog.error} retry={() => void catalog.refetch()}/> : catalog.data.length ? catalog.data.map(category => <section className="booking-group" key={category.id}><h3>{category.nombre}</h3>{category.descripcion && <p className="muted">{category.descripcion}</p>}<div className="choice-grid">{category.servicios.map(item => <button key={item.id} type="button" className="selection-card" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setStaff(undefined); setDay(undefined); setTime(undefined) }}><span className="choice-content"><strong>{item.nombre}</strong><small>{duracion(item.duracion_min)} · {formatSoles(item.precio)}</small></span>{selected === item.id && <Check size={20}/>}</button>)}</div></section>) : <Empty title="Aún no hay servicios disponibles"><p>Vuelve más adelante para consultar el catálogo.</p></Empty>}
    </div>,
    <div className="form-stack" key="equipo"><h2>¿Quién te atenderá?</h2>
      {staffList.isPending || citaService.isLoading ? <Skeleton/> : staffList.isError ? <Failure error={staffList.error} retry={() => void staffList.refetch()}/> : <div className="choice-grid">
        {[{ id: undefined, nombre: 'Cualquiera disponible', especialidad: 'Te asignaremos una especialista.' }, ...(staffList.data ?? [])].map(person => <button className="selection-card" type="button" key={person.id ?? 'any'} aria-pressed={staff === person.id} onClick={() => { setStaff(person.id); setDay(undefined); setTime(undefined) }}>
          <span className="soft-icon">{person.id ? <UserRound size={21}/> : <Sparkles size={21}/>}</span><span className="choice-content"><strong>{person.nombre}</strong>{person.especialidad && <small>{person.especialidad}</small>}</span>{staff === person.id && <Check size={18}/>}
        </button>)}
      </div>}
    </div>,
    <div className="form-stack" key="dias"><h2>Elige una fecha</h2><div className="calendar-heading">
      <Button variant="outline" className="icon-button" aria-label="Semana anterior" disabled={weekOffset === 0} onClick={() => { setWeekOffset(weekOffset - 1); setDay(undefined); setTime(undefined) }}><ChevronLeft size={18}/></Button>
      <strong>{formatFecha(days[0])} – {formatFecha(days[6])}</strong>
      <Button variant="outline" className="icon-button" aria-label="Semana siguiente" onClick={() => { setWeekOffset(weekOffset + 1); setDay(undefined); setTime(undefined) }}><ChevronRight size={18}/></Button>
    </div><div className="calendar-days">
      {days.map((date, index) => {
        const slot = slots[index]
        const hasTimes = !!slot.data?.length
        return <button type="button" key={date} aria-label={formatFecha(date) + (hasTimes ? ', con disponibilidad' : '')} aria-pressed={day === date} disabled={!hasTimes} onClick={() => { setDay(date); setTime(undefined) }}><span>{formatFecha(date).split(/[ ,]/)[0]}</span><strong>{Number(date.slice(-2))}</strong><span className={hasTimes ? 'availability-dot' : ''}/></button>
      })}
    </div>
    {slots.some(slot => slot.isError) ? <Failure error={slots.find(slot => slot.isError)?.error} retry={() => { for (const slot of slots) if (slot.isError) void slot.refetch() }}/> : slots.some(slot => slot.isPending) ? <p role="status">Consultando disponibilidad…</p> : slots.every(slot => !slot.data?.length) && <p>No hay horarios en estos días. Prueba otra semana.</p>}
    </div>,
    <div className="form-stack" key="horas"><h2>Elige una hora</h2>{day && <p>{formatFecha(day)} · Hora de Lima</p>}
      {daySlots?.isPending ? <Skeleton/> : daySlots?.isError ? <Failure error={daySlots.error} retry={() => void daySlots.refetch()}/> : availableTimes.length ? <div className="time-grid">{availableTimes.map(value => <button className="selection-card" key={value} type="button" aria-pressed={time === value} onClick={() => { setTime(value); submit.reset() }}>{formatHora(value)}</button>)}</div> : <Empty title="No quedan horas para esta fecha"><Button variant="outline" onClick={() => move(2)}>Elegir otra fecha</Button></Empty>}
    </div>,
    <div className="form-stack" key="confirmar"><h2>Confirma los datos</h2><div className="booking-ticket">
      <div><span>Servicio</span><strong>{service?.nombre}</strong></div><div><span>Especialista</span><strong>{staffName}</strong></div><div><span><CalendarDays size={16}/> Fecha y hora</span><strong>{time && formatFechaHora(time)}</strong></div><div><span><Clock3 size={16}/> Duración</span><strong>{service && duracion(service.duracion_min)}</strong></div><div><span>Total</span><strong>{service && formatSoles(service.precio)}</strong></div>
    </div>{submit.error && <Failure error={submit.error}/>}</div>,
  ]
  const canAdvance = [!!service && (!admin || !!client), staffList.isSuccess, !!day && !!daySlots?.data?.length, !!time && availableTimes.includes(time), !!time][step]

  return <section className={onDone ? 'booking-flow' : 'panel booking-flow'}>
    <ol className="booking-steps" aria-label="Pasos de la reserva">{labels.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={index <= step ? 'done' : ''}><span>{index < step ? <Check size={14}/> : index + 1}</span><small>{label}</small></li>)}</ol>
    <div className="booking-progress" role="progressbar" aria-label="Progreso de reserva" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step + 1}><motion.span animate={{ scaleX: (step + 1) / labels.length }}/></div>
    <AnimatePresence initial={false} mode="wait"><motion.div key={step} initial={reduce ? { opacity: 0 } : { opacity: 0, x: 17 * direction }} animate={{ opacity: 1, x: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, x: -17 * direction }} transition={{ duration: 0.16 }}>{stepContent[step]}</motion.div></AnimatePresence>
    <div className="booking-actions">
      {step > (cita ? 1 : 0) && <Button variant="outline" disabled={submit.isPending} onClick={() => move(step - 1)}>Anterior</Button>}
      <Button disabled={!canAdvance || submit.isPending} onClick={() => step === 4 ? submit.mutate() : move(step + 1)}>{step === 4 ? submit.isPending ? 'Confirmando…' : cita ? 'Confirmar cambio' : 'Confirmar reserva' : 'Continuar'}</Button>
    </div>
  </section>
}
