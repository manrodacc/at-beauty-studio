import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Check } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Popover } from 'radix-ui'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, Empty, Failure, PageTitle, Skeleton } from '@/components/ui'
import { obtener, mensajeError } from '@/lib/errors'
import { formatFechaHora } from '@/lib/fechas'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import type { Notificacion } from '@/types/database.generated'

const keyFor = (id: string) => ['notificaciones', id]

export function useNotificaciones() {
  const { profile } = useAuth()
  const id = profile?.id ?? ''
  const cache = useQueryClient()
  const key = keyFor(id)
  const list = useQuery({
    queryKey: key, enabled: !!id,
    queryFn: async () => obtener(await supabase.from('notificaciones').select('*').eq('id_usuario', id).order('created_at', { ascending: false }).limit(30)) ?? [],
  })
  const count = useQuery({
    queryKey: [...key, 'no-leidas'], enabled: !!id,
    queryFn: async () => {
      const result = await supabase.from('notificaciones').select('id', { head: true, count: 'exact' }).eq('id_usuario', id).eq('leida', false)
      obtener(result)
      return result.count ?? 0
    },
  })
  const read = useMutation({
    mutationFn: async (notificationId: number) => obtener(await supabase.from('notificaciones').update({ leida: true }).eq('id_usuario', id).eq('id', notificationId)),
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
    onError: error => toast.error(mensajeError(error)),
  })
  return { list, count, read, id }
}

export function NotificationBell() {
  const { list, count, read, id } = useNotificaciones()
  const cache = useQueryClient()
  const { profile } = useAuth()
  const [pulse, setPulse] = useState(0)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!id) return
    const channel = supabase.channel('notificaciones:' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: 'id_usuario=eq.' + id }, event => {
        const alert = event.new as Notificacion
        void cache.invalidateQueries({ queryKey: keyFor(id) })
        toast(alert.titulo, { description: alert.mensaje })
        setPulse(value => value + 1)
      }).subscribe(status => {
        if (status === 'SUBSCRIBED') void cache.invalidateQueries({ queryKey: keyFor(id) })
      })
    return () => { void supabase.removeChannel(channel) }
  }, [id, cache])

  return <Popover.Root><Popover.Trigger asChild><Button variant="ghost" className="icon-button notification-trigger" aria-label={'Notificaciones' + (count.data ? ', ' + count.data + ' sin leer' : '')}>
    <motion.span key={pulse} animate={pulse && !reduce ? { rotate: [0, -14, 13, 0] } : { rotate: 0 }} transition={{ duration: 0.2 }}><Bell size={21}/></motion.span>
    {!!count.data && <span className="notification-count">{count.data > 99 ? '99+' : count.data}</span>}
  </Button></Popover.Trigger><Popover.Portal><Popover.Content className="notification-popover" sideOffset={10} align="end">
    <h2>Notificaciones</h2>
    {list.isPending ? <Skeleton/> : list.isError ? <Failure error={list.error} retry={() => void list.refetch()}/> : <NotificationList data={list.data.slice(0, profile?.rol === 'admin' ? 30 : 6)} onRead={read.mutate}/>}
    {profile?.rol !== 'admin' && <Popover.Close asChild><Button asChild variant="ghost"><Link to="/app/notificaciones">Ver todas</Link></Button></Popover.Close>}
  </Popover.Content></Popover.Portal></Popover.Root>
}

function NotificationList({ data, onRead }: { data: Notificacion[]; onRead: (id: number) => void }) {
  if (!data.length) return <Empty title="Aún no tienes notificaciones"/>
  return <ul className="notification-list">{data.map(item => <li key={item.id}>
    <div><strong>{item.titulo}</strong><p>{item.mensaje}</p><small>{formatFechaHora(item.created_at)}</small></div>
    {!item.leida && <Button variant="ghost" className="icon-button" aria-label={'Marcar como leída: ' + item.titulo} onClick={() => onRead(item.id)}><Check size={18}/></Button>}
  </li>)}</ul>
}

export function NotificacionesPage() {
  const { list, read } = useNotificaciones()
  return <><PageTitle title="Notificaciones"/>{list.isPending ? <Skeleton/> : list.isError ? <Failure error={list.error} retry={() => void list.refetch()}/> : <section className="panel"><NotificationList data={list.data} onRead={read.mutate}/></section>}</>
}
