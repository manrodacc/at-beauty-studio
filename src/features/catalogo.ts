import { queryOptions, useQuery } from '@tanstack/react-query'
import { obtener } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

export const photoPath = (id: number) => 'servicios/' + id
export const servicePhoto = (id: number) => supabase.storage.from('catalogo').getPublicUrl(photoPath(id)).data.publicUrl

const catalogoOptions = queryOptions({
  queryKey: ['catalogo'],
  queryFn: async () => {
    const rows = obtener(await supabase.from('categorias_servicio')
      .select('id, nombre, descripcion, imagen_url, orden, servicios(id, nombre, precio, duracion_min)')
      // El catálogo público también puede abrirse con una sesión de admin.
      .eq('estado', true).eq('servicios.estado', true)
      .order('orden').order('id').order('nombre', { referencedTable: 'servicios' })) ?? []
    return rows.filter(category => category.servicios.length > 0)
  },
})

export function useCatalogoCategorias() {
  return useQuery(catalogoOptions)
}

export function useCatalogo() {
  return useQuery({ ...catalogoOptions, select: categories => categories.flatMap(category => category.servicios) })
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias', 'admin'],
    queryFn: async () => obtener(await supabase.from('categorias_servicio').select('*').order('orden').order('id')) ?? [],
  })
}
