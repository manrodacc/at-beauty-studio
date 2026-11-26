import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { AppError, mensajeError } from '@/lib/errors'

export const currencyAmount = z.string().trim().regex(/^\d{1,6}(?:[.,]\d{1,2})?$/, 'Escribe un monto válido.').transform(value => Number(value.replace(',', '.')))
export const quantity = z.string().trim().regex(/^\d{1,8}(?:[.,]\d{1,3})?$/, 'Escribe una cantidad válida.').transform(value => Number(value.replace(',', '.')))
export const optionalText = z.string().trim().max(400, 'Usa como máximo 400 caracteres.').transform(value => value || undefined)
export const requiredText = z.string().trim().min(1, 'Completa este campo.').max(150, 'Usa como máximo 150 caracteres.')
export const numericId = z.coerce.number().int().positive('Selecciona una opción.')
export const pagoMethods = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', yape_plin: 'Yape / Plin' } as const

export function formValues(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form))
}

export function validate<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input)
  if (!result.success) throw new AppError('datos_incompletos', result.error.issues[0]?.message ?? 'Revisa los datos del formulario.')
  return result.data
}

export function useOperation<T>(mutationFn: (input: T) => Promise<unknown>, message: string, keys: string[], onDone?: () => void) {
  const cache = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all(keys.map(key => cache.invalidateQueries({ queryKey: [key] })))
      toast.success(message)
      onDone?.()
    },
    onError: error => toast.error(mensajeError(error)),
  })
}
