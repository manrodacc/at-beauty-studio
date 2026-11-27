import { createClient } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { Button, DataList, Failure, Field, Modal, PageTitle, Skeleton } from '@/components/ui'
import { formValues, requiredText, useOperation, validate } from '@/features/operations'
import { AppError, obtener } from '@/lib/errors'
import { rpc } from '@/lib/rpc'
import { supabase } from '@/lib/supabase'
import type { BloqueHorario, Colaboradora, Role } from '@/types/database'
import { readScheduleTime, ScheduleTime } from './ScheduleTime'

const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const roles = { admin: 'Administración', colaboradora: 'Colaboradora', cliente: 'Cliente' }
const opt = z.string().trim().max(150).transform(value => value || undefined)
const staffSchema = z.object({
  nombres: requiredText, apellidos: opt, correo: z.email('Ingresa un correo válido.'),
  password: z.string().optional().transform(value => value?.trim() || undefined),
  telefono: z.string().trim().regex(/^(?:\+?[\d ()-]{7,18})?$/, 'Escribe un teléfono válido.').transform(value => value || undefined),
  especialidad: opt, estado: z.enum(['on']).optional().transform(Boolean),
})

export function Colaboradoras() {
  const [edit, setEdit] = useState<Colaboradora | 'new' | null>(null)
  const query = useQuery({ queryKey: ['colaboradoras'], queryFn: async () => obtener(await supabase.from('colaboradoras').select('*').order('nombres')) ?? [] })
  return <><PageTitle title="Colaboradoras" description="Asigna servicios, horarios y acceso al equipo." action={<Button onClick={() => setEdit('new')}><Plus size={17}/> Agregar colaboradora</Button>}/>
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : <section className="panel"><DataList rows={query.data} rowKey={row => row.id} columns={[
      { label: 'Nombre', render: row => row.nombres + ' ' + (row.apellidos ?? '') }, { label: 'Especialidad', render: row => row.especialidad || '—' },
      { label: 'Estado', render: row => row.estado ? 'Activa' : 'Inactiva' }, { label: 'Acciones', render: row => <Button variant="outline" onClick={() => setEdit(row)}>Editar</Button> },
    ]}/></section>}
    <Modal title={edit === 'new' ? 'Agregar colaboradora' : 'Editar colaboradora'} open={!!edit} onOpenChange={open => { if (!open) setEdit(null) }}>
      {edit && <ColaboradoraForm staff={edit === 'new' ? undefined : edit} close={() => setEdit(null)}/>}
    </Modal>
  </>
}

function ColaboradoraForm({ staff, close }: { staff?: Colaboradora; close: () => void }) {
  const query = useQuery({
    queryKey: ['colaboradoras', 'formulario', staff?.id],
    queryFn: async () => {
      const [services, assigned, schedule, profile] = await Promise.all([
        supabase.from('servicios').select('id,nombre,estado').order('nombre'),
        staff ? supabase.from('colaboradora_servicio').select('id_servicio').eq('id_colaboradora', staff.id) : Promise.resolve({ data: [], error: null }),
        staff ? supabase.from('horario_colaboradora').select('dia_semana,hora_inicio,hora_fin').eq('id_colaboradora', staff.id).order('dia_semana').order('hora_inicio') : Promise.resolve({ data: [], error: null }),
        staff?.id_usuario ? supabase.from('profiles').select('correo').eq('id', staff.id_usuario).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ])
      return { services: obtener(services) ?? [], assigned: (obtener(assigned) ?? []).map(row => row.id_servicio), schedule: obtener(schedule) ?? [], correo: obtener(profile)?.correo ?? '' }
    },
  })
  if (query.isPending) return <Skeleton/>
  if (query.isError) return <Failure error={query.error} retry={() => void query.refetch()}/>
  return <TeamFields staff={staff} close={close} {...query.data}/>
}

function TeamFields({ staff, close, services, assigned, schedule, correo }: { staff?: Colaboradora; close: () => void; services: { id: number; nombre: string; estado: boolean }[]; assigned: number[]; schedule: BloqueHorario[]; correo: string }) {
  const [ids, setIds] = useState(assigned)
  const [blocks, setBlocks] = useState(schedule.map((block, index) => ({ key: index, ...block })))
  const [nextId, setNextId] = useState(schedule.length)
  const update = (key: number, values: Partial<BloqueHorario>) => setBlocks(current => current.map(block => block.key === key ? { ...block, ...values } : block))
  const save = useOperation(async (input: Record<string, FormDataEntryValue>) => {
    const values = validate(staffSchema, input)
    const horarios = blocks.map(block => ({
      dia_semana: block.dia_semana,
      hora_inicio: readScheduleTime(input, 'entrada-' + block.key, block.hora_inicio),
      hora_fin: readScheduleTime(input, 'salida-' + block.key, block.hora_fin),
    }))
    if (horarios.some(block => !block.hora_inicio || !block.hora_fin || block.hora_inicio.slice(0, 5) >= block.hora_fin.slice(0, 5))) throw new AppError('horario_invalido', 'La salida de cada bloque debe ser posterior a la entrada.')
    const overlaps = horarios.some((a, i) => horarios.some((b, j) => j > i && a.dia_semana === b.dia_semana && a.hora_inicio.slice(0, 5) < b.hora_fin.slice(0, 5) && b.hora_inicio.slice(0, 5) < a.hora_fin.slice(0, 5)))
    if (overlaps) throw new AppError('horario_invalido', 'Hay bloques que se cruzan en el mismo día.')

    if (staff?.id_usuario) {
      return rpc('admin_guardar_colaboradora', {
        p_usuario: staff.id_usuario, p_nombres: values.nombres, p_apellidos: values.apellidos, p_telefono: values.telefono,
        p_especialidad: values.especialidad, p_servicios: ids, p_horarios: horarios, p_estado: values.estado,
      })
    }
    if (staff) throw new AppError('ficha_sin_cuenta', 'Esta ficha no tiene cuenta vinculada. Vincula la cuenta existente en Supabase para editarla sin duplicar su ficha.')

    if (!values.password || values.password.length < 6) {
      throw new AppError('password_corta', 'Ingresa una contraseña de al menos 6 caracteres para la colaboradora.')
    }

    // Comprobar si el usuario ya existe en perfiles
    const existing = await supabase.from('profiles').select('id,rol').ilike('correo', values.correo).maybeSingle()
    if (existing.error) throw new AppError('consulta_fallida', 'No pudimos verificar si el correo ya existe.')
    if (existing.data?.rol === 'admin') throw new AppError('rol_admin', 'Este correo pertenece a una cuenta de administración.')

    let userId = existing.data?.id
    if (!userId) {
      // Crear cuenta directamente con email y password sin afectar la sesión de la administradora
      const authClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const signUpRes = await authClient.auth.signUp({
        email: values.correo,
        password: values.password,
        options: {
          data: { nombres: values.nombres, apellidos: values.apellidos ?? '', telefono: values.telefono ?? '' },
        },
      })
      if (signUpRes.error) {
        if (signUpRes.error.message.includes('already registered')) {
          const reCheck = await supabase.from('profiles').select('id,rol').ilike('correo', values.correo).maybeSingle()
          if (!reCheck.data) throw new AppError('registro_fallido', 'El correo ya está registrado en la plataforma.')
          userId = reCheck.data.id
        } else {
          throw new AppError('registro_fallido', signUpRes.error.message)
        }
      } else if (signUpRes.data.user) {
        userId = signUpRes.data.user.id
      }
    }

    if (!userId) throw new AppError('usuario_no_creado', 'No se pudo generar el usuario para la colaboradora.')

    return rpc('admin_guardar_colaboradora', {
      p_usuario: userId,
      p_nombres: values.nombres,
      p_apellidos: values.apellidos,
      p_telefono: values.telefono,
      p_especialidad: values.especialidad,
      p_servicios: ids,
      p_horarios: horarios,
      p_estado: values.estado,
    })
  }, staff?.id_usuario ? 'Colaboradora actualizada' : 'Colaboradora guardada', ['colaboradoras', 'colaboradoras-servicio', 'horarios', 'asistencia', 'reportes', 'usuarios', 'clientes'], close)
  return <form className="form-stack" onSubmit={event => { event.preventDefault(); if (!save.isPending) save.mutate(formValues(event.currentTarget)) }}>
    {staff && !staff.id_usuario && <p className="notice">Esta ficha aún no tiene una cuenta vinculada.</p>}
    <div className="form-row"><Field label="Nombres"><input name="nombres" defaultValue={staff?.nombres} required/></Field><Field label="Apellidos"><input name="apellidos" defaultValue={staff?.apellidos ?? ''}/></Field></div>
    <Field label="Correo electrónico"><input type="email" name="correo" defaultValue={correo} readOnly={!!staff?.id_usuario} required/></Field>
    {!staff && <Field label="Contraseña de acceso"><input type="password" name="password" minLength={6} placeholder="Mínimo 6 caracteres" required/></Field>}
    <div className="form-row"><Field label="Teléfono"><input type="tel" name="telefono" defaultValue={staff?.telefono ?? ''}/></Field><Field label="Especialidad"><input name="especialidad" defaultValue={staff?.especialidad ?? ''}/></Field></div>
    <fieldset className="form-stack"><legend>Servicios asignados</legend>
      {services.length ? <div className="check-grid">{services.map(service => <label key={service.id} className="check-field"><input type="checkbox" checked={ids.includes(service.id)} onChange={event => setIds(current => event.target.checked ? [...current, service.id] : current.filter(id => id !== service.id))}/>{service.nombre}{!service.estado && ' (inactivo)'}</label>)}</div> : <p className="muted">Aún no hay servicios registrados.</p>}
    </fieldset>
    <fieldset className="form-stack"><legend>Horario semanal</legend>
      {blocks.map(block => <div className="schedule-row" key={block.key}>
        <Field label="Día"><select value={block.dia_semana} onChange={event => update(block.key, { dia_semana: Number(event.target.value) })}>{weekdays.map((day, index) => <option value={index + 1} key={day}>{day}</option>)}</select></Field>
        <Button variant="ghost" aria-label={'Quitar bloque del ' + weekdays[block.dia_semana - 1]} onClick={() => setBlocks(list => list.filter(item => item.key !== block.key))}>Quitar</Button>
        <ScheduleTime label="Entrada" name={'entrada-' + block.key} defaultValue={block.hora_inicio}/>
        <ScheduleTime label="Salida" name={'salida-' + block.key} defaultValue={block.hora_fin}/>
      </div>)}
      <Button variant="outline" onClick={() => {
        setBlocks(current => [...current, { key: nextId, dia_semana: 1, hora_inicio: '', hora_fin: '' }])
        setNextId(value => value + 1)
      }}>Agregar bloque</Button>
    </fieldset>
    <label className="check-field"><input name="estado" type="checkbox" defaultChecked={staff?.estado ?? true}/> Colaboradora activa</label>
    {save.error && <Failure error={save.error}/>}<Button type="submit" disabled={save.isPending}>{staff?.id_usuario ? 'Guardar cambios' : 'Guardar colaboradora'}</Button>
  </form>
}

const settings = {
  horas_min_cancelacion: 'Anticipación mínima para cancelar (horas)',
  intervalo_agenda_min: 'Intervalo de la agenda (minutos)',
  tolerancia_tardanza_min: 'Tolerancia de tardanza (minutos)',
}

export function Configuracion() {
  const [roleEdit, setRoleEdit] = useState<{ id: string; nombre: string; rol: Role } | null>(null)
  const config = useQuery({ queryKey: ['configuracion'], queryFn: async () => obtener(await supabase.from('configuracion').select('*').order('clave')) ?? [] })
  const users = useQuery({ queryKey: ['usuarios'], queryFn: async () => obtener(await supabase.from('profiles').select('id,nombres,apellidos,correo,rol,estado').order('nombres')) ?? [] })
  const update = useOperation(async ({ clave, valor, minimo }: { clave: string; valor: FormDataEntryValue | undefined; minimo: number }) => {
    const next = validate(z.coerce.number().int().min(minimo).max(1440), valor)
    return obtener(await supabase.from('configuracion').update({ valor: String(next) }).eq('clave', clave))
  }, 'Configuración guardada', ['configuracion', 'citas', 'horarios'])
  return <><PageTitle title="Configuración" description="Administra las reglas del estudio y los permisos de acceso."/>
    <section className="panel form-stack"><h2 className="panel-heading">Reglas del estudio</h2>
      {config.isPending ? <Skeleton/> : config.isError ? <Failure error={config.error} retry={() => void config.refetch()}/> : config.data.filter(row => Object.hasOwn(settings, row.clave)).map(row => <form key={row.clave} className="form-row align-end" onSubmit={event => {
        event.preventDefault()
        if (!update.isPending) update.mutate({ clave: row.clave, valor: formValues(event.currentTarget).valor, minimo: row.clave === 'intervalo_agenda_min' ? 1 : 0 })
      }}><Field label={settings[row.clave as keyof typeof settings]}><input type="number" name="valor" min={row.clave === 'intervalo_agenda_min' ? 1 : 0} max="1440" defaultValue={row.valor} required/></Field>
      <Button variant="outline" type="submit" disabled={update.isPending}>Guardar</Button></form>)}
      {update.error && <Failure error={update.error}/>}
    </section>
    <section className="panel"><h2 className="panel-heading">Usuarios y roles</h2>
      {users.isPending ? <Skeleton/> : users.isError ? <Failure error={users.error} retry={() => void users.refetch()}/> : <DataList rows={users.data} rowKey={row => row.id} columns={[
        { label: 'Nombre', render: row => [row.nombres, row.apellidos].filter(Boolean).join(' ') }, { label: 'Correo', render: row => row.correo || '—' },
        { label: 'Rol', render: row => roles[row.rol] }, { label: 'Acciones', render: row => <Button variant="outline" onClick={() => setRoleEdit({ id: row.id, nombre: row.nombres, rol: row.rol })}>Cambiar rol</Button> },
      ]}/>}
    </section>
    <Modal title="Cambiar rol" open={!!roleEdit} onOpenChange={open => { if (!open) setRoleEdit(null) }}>{roleEdit && <RoleForm user={roleEdit} close={() => setRoleEdit(null)}/>}</Modal>
  </>
}

function RoleForm({ user, close }: { user: { id: string; nombre: string; rol: Role }; close: () => void }) {
  const mutation = useOperation(async (input: FormDataEntryValue | undefined) => rpc('admin_cambiar_rol', { p_usuario: user.id, p_rol: validate(z.enum(['admin', 'colaboradora', 'cliente']), input) }), 'Rol actualizado', ['usuarios', 'colaboradoras', 'clientes'], close)
  return <form className="form-stack" onSubmit={event => { event.preventDefault(); if (!mutation.isPending) mutation.mutate(formValues(event.currentTarget).rol) }}>
    <p>{user.nombre}</p><Field label="Rol"><select name="rol" defaultValue={user.rol}>{Object.entries(roles).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
    {mutation.error && <Failure error={mutation.error}/>}<Button type="submit" disabled={mutation.isPending}>Confirmar cambio de rol</Button>
  </form>
}
