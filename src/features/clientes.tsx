import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button, Failure, Field, Modal } from '@/components/ui'
import { formValues, requiredText, validate } from '@/features/operations'
import { AppError, mensajeError, obtener } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import type { Cliente } from '@/types/database'

export function useClientes(enabled = true) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['clientes', 'directorio', profile?.id, profile?.rol],
    enabled: enabled && !!profile,
    queryFn: async () => {
      if (profile?.rol === 'admin') {
        const rows = obtener(await supabase.from('clientes').select('*, profiles(rol)').order('nombres')) ?? []
        // Conservar las fichas para el historial; listar solo cuentas de clientas
        // y fichas de atención presencial que todavía no tienen una cuenta.
        return rows.filter(row => !row.id_usuario || row.profiles?.rol === 'cliente').map(({ profiles: _profile, ...row }) => row)
      }
      // El personal puede leer clientes, pero RLS no expone perfiles ajenos.
      return obtener(await supabase.from('clientes').select('*').order('nombres')) ?? []
    },
  })
}

const clientSchema = z.object({
  nombres: requiredText,
  apellidos: requiredText,
  correo: z.union([z.literal(''), z.email('Escribe un correo válido.')]).transform(value => value || null),
  telefono: z.string().trim().regex(/^(?:\+?[\d ()-]{7,18})?$/, 'Escribe un teléfono válido.').transform(value => value || null),
})

export function ClientForm({ close, onCreated }: { close: () => void; onCreated?: (client: Cliente) => void }) {
  const cache = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (input: Record<string, FormDataEntryValue>) => {
      const result = await supabase.from('clientes').insert(validate(clientSchema, input)).select('*').single()
      if (result.error?.code === '23505') throw new AppError('cliente_existente', 'Ya existe una clienta con esos datos. Búscala y selecciónala.')
      const client = obtener(result)
      if (!client) throw new AppError('cliente_no_guardada', 'No se pudo recuperar la clienta registrada. Inténtalo de nuevo.')
      return client
    },
    onSuccess: async client => {
      await cache.invalidateQueries({ queryKey: ['clientes'] })
      toast.success('Clienta registrada')
      onCreated?.(client)
      close()
    },
    onError: error => toast.error(mensajeError(error)),
  })
  return <form className="form-stack" onSubmit={event => {
    event.preventDefault()
    // El diálogo también se usa dentro de la atención: guardar la clienta no
    // debe enviar el formulario principal a través del portal del modal.
    event.stopPropagation()
    if (!mutation.isPending) mutation.mutate(formValues(event.currentTarget))
  }}>
    <div className="form-row"><Field label="Nombres"><input name="nombres" required maxLength={150}/></Field><Field label="Apellidos"><input name="apellidos" required maxLength={150}/></Field></div>
    <Field label="Correo (opcional)"><input name="correo" type="email"/></Field>
    <Field label="Teléfono (opcional)"><input name="telefono" type="tel"/></Field>
    {mutation.error && <Failure error={mutation.error}/>}<Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar clienta'}</Button>
  </form>
}

const normalizar = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function ClientPicker({ clients, value, onChange, disabled }: { clients: Cliente[]; value: number | undefined; onChange: (id: number | undefined) => void; disabled?: boolean }) {
  const [search, setSearch] = useState('')
  const [create, setCreate] = useState(false)
  const term = normalizar(search)
  const matches = clients.filter(client => normalizar([client.nombres, client.apellidos, client.correo, client.telefono].filter(Boolean).join(' ')).includes(term))
  const selected = clients.find(client => client.id === value)
  const options = selected && !matches.some(client => client.id === selected.id) ? [selected, ...matches] : matches
  return <section className="form-stack" aria-label="Seleccionar clienta">
    <div className="form-row align-end">
      <Field label="Buscar clienta"><input type="search" value={search} disabled={disabled} placeholder="Nombre, apellido, correo o teléfono" onChange={event => { setSearch(event.target.value); onChange(undefined) }}/></Field>
      <Button variant="outline" disabled={disabled} onClick={() => setCreate(true)}><Plus size={17}/> Nueva clienta</Button>
    </div>
    {!matches.length && <p role="status">No encontramos clientas con esa búsqueda. Puedes registrar una nueva clienta.</p>}
    <Field label="Clienta"><select name="cliente" required value={value ?? ''} disabled={disabled} onChange={event => onChange(Number(event.target.value) || undefined)}><option value="">Selecciona una clienta</option>{options.map(client => <option value={client.id} key={client.id}>{client.nombres} {client.apellidos}{client.telefono ? ' · ' + client.telefono : ''}</option>)}</select></Field>
    <Modal title="Nueva clienta" open={create} onOpenChange={setCreate}>{create && <ClientForm close={() => setCreate(false)} onCreated={client => { setSearch(''); onChange(client.id) }}/>}</Modal>
  </section>
}
