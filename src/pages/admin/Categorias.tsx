import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { Button, DataList, Failure, Field, Modal, PageTitle, Skeleton } from '@/components/ui'
import { useCategorias } from '@/features/catalogo'
import { formValues, requiredText, useOperation, validate } from '@/features/operations'
import { obtener } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { CategoriaServicio } from '@/types/database'

const keys = ['categorias', 'servicios', 'catalogo']
const categorySchema = z.object({
  nombre: requiredText,
  descripcion: z.string().trim().max(400, 'Usa como máximo 400 caracteres.').transform(value => value || null),
  imagen_url: z.union([z.literal(''), z.url('Escribe una URL de imagen válida.').refine(value => /^https?:\/\//i.test(value), 'Usa una URL HTTP o HTTPS.')]).transform(value => value || null),
  orden: z.coerce.number().int().nonnegative('Indica un orden mayor o igual a cero.').max(2_147_483_647),
  estado: z.enum(['on']).optional().transform(Boolean),
})

export function Categorias() {
  const query = useCategorias()
  const cache = useQueryClient()
  const [edit, setEdit] = useState<CategoriaServicio | 'new' | null>(null)
  const toggle = useOperation(async (category: CategoriaServicio) => obtener(await supabase.from('categorias_servicio')
    .update({ estado: !category.estado }).eq('id', category.id).select('id').single()), 'Estado de la categoría actualizado', keys)
  const reorder = useOperation(async ({ category, direction }: { category: CategoriaServicio; direction: -1 | 1 }) => {
    const rows = [...(query.data ?? [])]
    const index = rows.findIndex(row => row.id === category.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= rows.length) return
    const neighbor = rows[target]
    rows[target] = rows[index]
    rows[index] = neighbor
    try {
      // Normalizar también resuelve órdenes repetidos sin modificar otros campos.
      for (const [position, row] of rows.entries()) {
        const orden = position + 1
        if (row.orden !== orden) obtener(await supabase.from('categorias_servicio').update({ orden }).eq('id', row.id).select('id').single())
      }
    } finally {
      // Si falla una actualización, volver a mostrar el orden realmente guardado.
      await Promise.all(keys.map(key => cache.invalidateQueries({ queryKey: [key] })))
    }
  }, 'Orden actualizado', keys)
  const busy = toggle.isPending || reorder.isPending
  const rows = query.data ?? []
  return <>
    <PageTitle title="Categorías" description="Organiza el catálogo. Las categorías inactivas siguen visibles aquí y se ocultan al público." action={<Button disabled={busy} onClick={() => setEdit('new')}><Plus size={17}/> Nueva categoría</Button>}/>
    {toggle.error && <Failure error={toggle.error}/>} {reorder.error && <Failure error={reorder.error}/>}
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : <section className="panel"><DataList rows={rows} rowKey={row => row.id} columns={[
      { label: 'Nombre', render: row => row.nombre },
      { label: 'Descripción', render: row => row.descripcion || '—' },
      { label: 'Imagen', render: row => row.imagen_url ? <a href={row.imagen_url} target="_blank" rel="noreferrer">Ver imagen</a> : '—' },
      { label: 'Estado', render: row => row.estado ? 'Activa' : 'Inactiva' },
      { label: 'Orden', render: row => <div className="button-row"><span>{row.orden}</span><Button variant="outline" aria-label={'Subir ' + row.nombre} disabled={busy || rows[0]?.id === row.id} onClick={() => reorder.mutate({ category: row, direction: -1 })}><ArrowUp size={16}/></Button><Button variant="outline" aria-label={'Bajar ' + row.nombre} disabled={busy || rows.at(-1)?.id === row.id} onClick={() => reorder.mutate({ category: row, direction: 1 })}><ArrowDown size={16}/></Button></div> },
      { label: 'Acciones', render: row => <div className="button-row"><Button variant="outline" disabled={busy} onClick={() => setEdit(row)}>Editar</Button><Button variant="ghost" disabled={busy} onClick={() => toggle.mutate(row)}>{row.estado ? 'Desactivar' : 'Activar'}</Button></div> },
    ]}/></section>}
    <Modal title={edit === 'new' ? 'Nueva categoría' : 'Editar categoría'} open={!!edit} onOpenChange={open => { if (!open) setEdit(null) }}>
      {edit && <CategoryForm category={edit === 'new' ? undefined : edit} nextOrder={Math.max(0, ...rows.map(row => row.orden)) + 1} close={() => setEdit(null)}/>}
    </Modal>
  </>
}

function CategoryForm({ category, nextOrder, close }: { category?: CategoriaServicio; nextOrder: number; close: () => void }) {
  const save = useOperation(async (input: Record<string, FormDataEntryValue>) => {
    const values = validate(categorySchema, input)
    return obtener(await (category ? supabase.from('categorias_servicio').update(values).eq('id', category.id) : supabase.from('categorias_servicio').insert(values)).select('id').single())
  }, 'Categoría guardada', keys, close)
  return <form className="form-stack" onSubmit={event => { event.preventDefault(); if (!save.isPending) save.mutate(formValues(event.currentTarget)) }}>
    <Field label="Nombre"><input name="nombre" required maxLength={150} defaultValue={category?.nombre}/></Field>
    <Field label="Descripción"><textarea name="descripcion" maxLength={400} defaultValue={category?.descripcion ?? ''}/></Field>
    <Field label="URL de imagen"><input name="imagen_url" type="url" placeholder="https://…" defaultValue={category?.imagen_url ?? ''}/></Field>
    <Field label="Orden"><input name="orden" type="number" required min="0" max="2147483647" step="1" defaultValue={category?.orden ?? nextOrder}/></Field>
    <label className="check-field"><input name="estado" type="checkbox" defaultChecked={category?.estado ?? true}/> Categoría activa</label>
    {save.error && <Failure error={save.error}/>}<Button type="submit" disabled={save.isPending}>Guardar categoría</Button>
  </form>
}
