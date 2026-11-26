import { useQuery } from '@tanstack/react-query'
import { obtener } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

export const categorias = ['Pestañas', 'Uñas', 'Cejas', 'Cuidado facial', 'Depilación'] as const
export const photoPath = (id: number) => 'servicios/' + id
export const servicePhoto = (id: number) => supabase.storage.from('catalogo').getPublicUrl(photoPath(id)).data.publicUrl
export function useCatalogo() {
  return useQuery({ queryKey: ['catalogo'], queryFn: async () => obtener(await supabase.from('servicios').select('id,nombre,categoria,descripcion,precio,duracion_min,estado').eq('estado', true).order('nombre')) ?? [] })
}
