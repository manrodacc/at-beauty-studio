import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCheck } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const [create, setCreate] = useState(false)
  const containerRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const term = normalizar(search)
  const matches = clients.filter(client => normalizar([client.nombres, client.apellidos, client.correo, client.telefono].filter(Boolean).join(' ')).includes(term))
  const selected = clients.find(client => client.id === value)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function selectClient(client: Cliente) {
    onChange(client.id)
    setSearch('')
    setOpen(false)
  }

  function clearSelection() {
    onChange(undefined)
    setSearch('')
    setOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return <section ref={containerRef} className="form-stack client-picker" aria-label="Seleccionar clienta">
    <input type="hidden" name="cliente" value={value ?? ''}/>
    {selected ? (
      <div className="client-selected-card" role="status">
        <div className="client-selected-info">
          <span className="soft-icon" aria-hidden><UserCheck size={18}/></span>
          <div>
            <span className="client-selected-kicker">Clienta seleccionada</span>
            <strong>{selected.nombres} {selected.apellidos}</strong>
            {(selected.telefono || selected.correo) && (
              <small>{[selected.telefono, selected.correo].filter(Boolean).join(' · ')}</small>
            )}
          </div>
        </div>
        <Button type="button" variant="outline" disabled={disabled} onClick={clearSelection}>Cambiar</Button>
      </div>
    ) : (
      <div className="client-search-box">
        <div className="form-row align-end">
          <Field label="Buscar clienta">
            <input
              ref={inputRef}
              type="search"
              value={search}
              disabled={disabled}
              autoComplete="off"
              aria-expanded={open}
              aria-controls={listId}
              placeholder="Escribe nombre, apellido, correo o teléfono..."
              onFocus={() => setOpen(true)}
              onKeyDown={event => {
                if (event.key === 'Escape') setOpen(false)
                if (event.key === 'Enter' && open && matches.length === 1) {
                  event.preventDefault()
                  selectClient(matches[0])
                }
              }}
              onChange={event => {
                setSearch(event.target.value)
                setOpen(true)
              }}
            />
          </Field>
          <Button type="button" variant="outline" disabled={disabled} onClick={() => setCreate(true)}><Plus size={17}/> Nueva clienta</Button>
        </div>
        {(open || term.length > 0) && (
          <div id={listId} className="client-suggestions" role="listbox" aria-label="Resultados de clientas">
            {matches.length ? (
              <>
                <span className="client-suggestions-hint">
                  {term ? `Resultados (${matches.length})` : `Clientas registradas (${matches.length})`}
                </span>
                {matches.slice(0, 12).map(client => (
                  <button
                    key={client.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="client-suggestion-item"
                    onClick={() => selectClient(client)}
                  >
                    <div>
                      <strong>{client.nombres} {client.apellidos}</strong>
                      {(client.telefono || client.correo) && (
                        <small>{[client.telefono, client.correo].filter(Boolean).join(' · ')}</small>
                      )}
                    </div>
                    <span>Elegir</span>
                  </button>
                ))}
              </>
            ) : (
              <div className="client-suggestions-empty" role="status">
                <p>No encontramos clientas con esa búsqueda. Puedes registrar una nueva clienta.</p>
                <Button type="button" variant="outline" disabled={disabled} onClick={() => setCreate(true)}>
                  <Plus size={16}/> Registrar nueva clienta
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    )}
    <Modal title="Nueva clienta" open={create} onOpenChange={setCreate}>{create && <ClientForm close={() => setCreate(false)} onCreated={client => { setSearch(''); setOpen(false); onChange(client.id) }}/>}</Modal>
  </section>
}
