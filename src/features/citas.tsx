import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Clock3, UserRound } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button, Failure, Field, Modal } from '@/components/ui'
import { mensajeError, obtener } from '@/lib/errors'
import { formatFechaHora, restante, tiempoRestante } from '@/lib/fechas'
import { rpc } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'
import type { Cita } from '@/types/database'
import { esCita } from '@/types/database'

export const useCitas = (desde?: string, hasta?: string) => useQuery({
  queryKey: ['citas', desde, hasta],
  queryFn: async () => {
    let query = supabase.from('citas_detalle').select('*').order('inicio', { ascending: true })
    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)
    return (obtener(await query) ?? []).filter(esCita)
  },
})

export const pendiente = (cita: Cita) => cita.estado === 'confirmada' || cita.estado === 'pendiente'

export function StatusCita({ estado }: { estado: Cita['estado'] }) {
  return <span className={'status-badge ' + estado}>{({ confirmada: 'Confirmada', pendiente: 'Pendiente', realizada: 'Realizada', cancelada: 'Cancelada' })[estado]}</span>
}

export function Countdown({ inicio }: { inicio: string }) {
  const [now, setNow] = useState(Date.now)
  const reduce = useReducedMotion()
  const { dias, horas, minutos, segundos } = restante(inicio, now)
  useEffect(() => {
    if (segundos === 0) return
    const step = segundos < 3600 ? 1000 : 30_000
    const timer = window.setTimeout(() => setNow(Date.now()), step)
    return () => window.clearTimeout(timer)
  }, [segundos, now])
  return <div className={'countdown' + (segundos < 86400 ? ' countdown-warm' : '')}>
    <p><Clock3 size={16}/>{segundos ? 'Faltan ' + tiempoRestante(inicio, now) : tiempoRestante(inicio, now)}</p>
    <div aria-hidden>{([[dias, 'Días'], [horas, 'Horas'], [minutos, 'Min']] as const).map(([value, label]) => <span key={label}>
      <AnimatePresence initial={false} mode="popLayout"><motion.strong key={value} initial={reduce ? false : { opacity: 0, rotateX: -35, y: -4 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ duration: 0.17 }}>{String(value).padStart(2, '0')}</motion.strong></AnimatePresence>
      <small>{label}</small>
    </span>)}</div>
  </div>
}

export function CitaCard({ cita, countdown, children }: { cita: Cita; countdown?: boolean; children?: ReactNode }) {
  return <article className="panel appointment-card">
    <div className="appointment-heading"><div><p className="eyebrow">{cita.categoria}</p><h2>{cita.servicio}</h2></div><StatusCita estado={cita.estado}/></div>
    <div className="appointment-details"><span><CalendarDays size={17}/>{formatFechaHora(cita.inicio)}</span><span><UserRound size={17}/>{cita.colaboradora || 'Por asignar'}</span></div>
    {countdown && <Countdown inicio={cita.inicio}/>}
    {children}
  </article>
}

export function CancelarCita({ cita, close }: { cita: Cita | null; close: () => void }) {
  return <Modal title="Cancelar cita" open={!!cita} onOpenChange={open => { if (!open) close() }}>{cita && <CancelarForm cita={cita} close={close}/>}</Modal>
}

function CancelarForm({ cita, close }: { cita: Cita; close: () => void }) {
  const [motivo, setMotivo] = useState('')
  const cache = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => rpc('cancelar_cita', { p_cita: cita.id, p_motivo: motivo.trim() || undefined }),
    onSuccess: () => {
      toast.success('Cita cancelada')
      void cache.invalidateQueries({ queryKey: ['citas'] })
      void cache.invalidateQueries({ queryKey: ['horarios'] })
      close()
    },
    onError: error => toast.error(mensajeError(error)),
  })
  return <form className="form-stack" onSubmit={event => { event.preventDefault(); if (!mutation.isPending) mutation.mutate() }}>
    <p>{cita.servicio} · {formatFechaHora(cita.inicio)}</p>
    <Field label="Motivo (opcional)"><textarea value={motivo} maxLength={400} onChange={event => setMotivo(event.target.value)}/></Field>
    {mutation.error && <Failure error={mutation.error}/>}
    <div className="button-row"><Button variant="outline" onClick={close} disabled={mutation.isPending}>Mantener cita</Button><Button type="submit" disabled={mutation.isPending}>Confirmar cancelación</Button></div>
  </form>
}
