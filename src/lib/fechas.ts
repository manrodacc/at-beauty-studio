const zone = 'America/Lima'
const dateFormatter = new Intl.DateTimeFormat('es-PE', { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short' })
const timeFormatter = new Intl.DateTimeFormat('es-PE', { timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: true })
const isoFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
export const fechaLimaISO = (date = new Date()) => isoFormatter.format(date)
const asDate = (value: string) => new Date(value.length === 10 ? value + 'T12:00:00-05:00' : value)
export const formatFecha = (value: string) => dateFormatter.format(asDate(value))
export const formatHora = (value: string) => timeFormatter.format(asDate(value))
export const formatFechaHora = (value: string) => formatFecha(value) + ' · ' + formatHora(value)
export const horaRegistro = (value: string | null, fecha: string) => value ? formatHora(value.includes('T') || value.includes(' ') ? value : fecha + 'T' + value.slice(0, 8) + '-05:00') : '—'
export function sumarDias(fecha: string, dias: number) {
  const date = asDate(fecha)
  date.setUTCDate(date.getUTCDate() + dias)
  return fechaLimaISO(date)
}
export function restante(inicio: string, ahora = Date.now()) {
  const segundos = Math.max(0, Math.ceil((Date.parse(inicio) - ahora) / 1000))
  return { segundos, dias: Math.floor(segundos / 86400), horas: Math.floor(segundos / 3600) % 24, minutos: Math.floor(segundos / 60) % 60 }
}
export function tiempoRestante(inicio: string, ahora = Date.now()) {
  const { segundos, dias, horas, minutos } = restante(inicio, ahora)
  if (!segundos) return 'Es la hora de tu cita'
  if (dias) return dias + (dias === 1 ? ' día' : ' días') + (horas ? ' y ' + horas + (horas === 1 ? ' hora' : ' horas') : '')
  if (horas) return horas + (horas === 1 ? ' hora' : ' horas') + (minutos ? ' y ' + minutos + ' min' : '')
  return minutos ? minutos + ' min' : 'menos de 1 min'
}
