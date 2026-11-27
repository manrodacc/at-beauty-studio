import { useQuery } from '@tanstack/react-query'
import { obtener } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

export function useProductos() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['productos', profile?.id, profile?.rol],
    enabled: profile?.rol === 'admin' || profile?.rol === 'colaboradora',
    queryFn: async () => obtener(await supabase.from('productos').select('*, categorias_producto(nombre)').order('nombre'), 'productos') ?? [],
  })
}

export function useCategoriasProducto() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['categorias-producto', profile?.id, profile?.rol],
    enabled: profile?.rol === 'admin' || profile?.rol === 'colaboradora',
    queryFn: async () => obtener(await supabase.from('categorias_producto').select('*').order('orden').order('id'), 'productos') ?? [],
  })
}
