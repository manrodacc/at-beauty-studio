import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { Button, DataList, Failure, Field, Modal, Skeleton } from '@/components/ui'
import { useCategoriasProducto } from '@/features/inventario'
import { formValues, requiredText, useOperation, validate } from '@/features/operations'
import { obtener } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import type { CategoriaProducto } from '@/types/database'

const keys = ['categorias-producto', 'productos', 'reportes', 'resumen']
const schema = z.object({
  nombre: requiredText,
  descripcion: z.string().trim().max(400, 'Usa como máximo 400 caracteres.').transform(value => value || null),
  orden: z.coerce.number().int().nonnegative('Indica un orden mayor o igual a cero.').max(2_147_483_647),
  estado: z.enum(['on']).optional().transform(Boolean),
})

export function CategoriasProducto() {
  const { profile } = useAuth()
  return profile?.rol === 'admin' ? <GestionCategoriasProducto/> : null
}

function GestionCategoriasProducto() {
  const query = useCategoriasProducto()
  const cache = useQueryClient()
  const [edit, setEdit] = useState<CategoriaProducto | 'new' | null>(null)
  const rows = query.data ?? []
  const toggle = useOperation(async (category: CategoriaProducto) => obtener(await supabase.from('categorias_producto')
    .update({ estado: !category.estado }).eq('id', category.id).select('id').single(), 'productos'), 'Estado de la categoría actualizado', keys)
  const reorder = useOperation(async ({ id, direction }: { id: number; direction: -1 | 1 }) => {
    const ordered = [...rows]
    const index = ordered.findIndex(category => category.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    const neighbor = ordered[target]
    ordered[target] = ordered[index]
    ordered[index] = neighbor
    try {
      for (const [position, category] of ordered.entries()) {
        const orden = position + 1
        if (category.orden !== orden) obtener(await supabase.from('categorias_producto').update({ orden }).eq('id', category.id).select('id').single(), 'productos')
      }
    } finally {
      // Mostrar el orden real incluso si una actualización intermedia falla.
      await Promise.all(keys.map(key => cache.invalidateQueries({ queryKey: [key] })))
    }
  }, 'Orden actualizado', keys)
  const busy = toggle.isPending || reorder.isPending
  return <section className="panel form-stack" id="categorias-producto" aria-label="Categorías de producto">
    <div className="button-row"><h2 className="panel-heading">Categorías de producto</h2><Button disabled={busy || !query.isSuccess} onClick={() => setEdit('new')}><Plus size={17}/> Nueva categoría de producto</Button></div>
    <p className="muted">Desactivar una categoría conserva sus productos en el inventario.</p>
    {toggle.error && <Failure error={toggle.error}/>} {reorder.error && <Failure error={reorder.error}/>}
    {query.isPending ? <Skeleton/> : query.isError ? <Failure error={query.error} retry={() => void query.refetch()}/> : <DataList rows={rows} rowKey={row => row.id} columns={[
      { label: 'Nombre', render: row => row.nombre },
      { label: 'Descripción', render: row => row.descripcion || '—' },
      { label: 'Estado', render: row => row.estado ? 'Activa' : 'Inactiva' },
      { label: 'Orden', render: row => <div className="button-row"><span>{row.orden}</span><Button variant="outline" aria-label={'Subir ' + row.nombre} disabled={busy || rows[0]?.id === row.id} onClick={() => reorder.mutate({ id: row.id, direction: -1 })}><ArrowUp size={16}/></Button><Button variant="outline" aria-label={'Bajar ' + row.nombre} disabled={busy || rows.at(-1)?.id === row.id} onClick={() => reorder.mutate({ id: row.id, direction: 1 })}><ArrowDown size={16}/></Button></div> },
      { label: 'Acciones', render: row => <div className="button-row"><Button variant="outline" disabled={busy} onClick={() => setEdit(row)}>Editar</Button><Button variant="ghost" disabled={busy} onClick={() => toggle.mutate(row)}>{row.estado ? 'Desactivar' : 'Activar'}</Button></div> },
    ]}/>}
    <Modal title={edit === 'new' ? 'Nueva categoría de producto' : 'Editar categoría de producto'} open={!!edit} onOpenChange={open => { if (!open) setEdit(null) }}>
      {edit && <CategoryForm category={edit === 'new' ? undefined : edit} nextOrder={Math.max(0, ...rows.map(row => row.orden)) + 1} close={() => setEdit(null)}/>}
    </Modal>
  </section>
}

function CategoryForm({ category, nextOrder, close }: { category?: CategoriaProducto; nextOrder: number; close: () => void }) {
  const save = useOperation(async (input: Record<string, FormDataEntryValue>) => {
    const values = validate(schema, input)
    return obtener(await (category ? supabase.from('categorias_producto').update(values).eq('id', category.id) : supabase.from('categorias_producto').insert(values)).select('id').single(), 'productos')
  }, 'Categoría de producto guardada', keys, close)
  return <form className="form-stack" onSubmit={event => { event.preventDefault(); if (!save.isPending) save.mutate(formValues(event.currentTarget)) }}>
    <Field label="Nombre"><input name="nombre" required maxLength={150} defaultValue={category?.nombre}/></Field>
    <Field label="Descripción"><textarea name="descripcion" maxLength={400} defaultValue={category?.descripcion ?? ''}/></Field>
    <Field label="Orden"><input name="orden" type="number" required min="0" max="2147483647" step="1" defaultValue={category?.orden ?? nextOrder}/></Field>
    <label className="check-field"><input name="estado" type="checkbox" defaultChecked={category?.estado ?? true}/> Categoría activa</label>
    {save.error && <Failure error={save.error}/>}<Button type="submit" disabled={save.isPending}>Guardar categoría de producto</Button>
  </form>
}
