import { obtener } from './errors'
import { supabase } from './supabase'
import type { Database } from '@/types/database.generated'

type Functions = Database['public']['Functions']

export async function rpc<Name extends keyof Functions>(name: Name, args: Functions[Name]['Args']) {
  return obtener(await supabase.rpc(name, args))
}
