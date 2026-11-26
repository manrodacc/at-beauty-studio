import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values))
}

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
export const formatSoles = (value: number) => money.format(value).replace(/\s+/g, ' ')
export function duracion(minutos: number) {
  const horas = Math.floor(minutos / 60)
  return horas ? [horas + ' h', minutos % 60 ? minutos % 60 + ' min' : ''].filter(Boolean).join(' ') : minutos + ' min'
}
