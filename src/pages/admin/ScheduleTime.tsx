const hours = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

export function ScheduleTime({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  const [hour, minute] = defaultValue.split(':')
  const hour12 = hour ? String(Number(hour) % 12 || 12).padStart(2, '0') : ''
  const period = hour ? (Number(hour) % 24 < 12 ? 'AM' : 'PM') : ''

  return <fieldset className="schedule-time">
    <legend>{label}</legend>
    <div className="schedule-time-parts">
      <label className="field"><span>Hora</span>
        <select name={name + '-hour'} defaultValue={hour12} required>
          <option value="" disabled>—</option>
          {hours.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label className="field"><span>Minuto</span>
        <select name={name + '-minute'} defaultValue={minute ?? ''} required>
          <option value="" disabled>—</option>
          {minutes.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label className="field"><span>Período</span>
        <select name={name + '-period'} defaultValue={period} required>
          <option value="" disabled>AM/PM</option>
          <option>AM</option><option>PM</option>
        </select>
      </label>
    </div>
  </fieldset>
}

export function readScheduleTime(form: Record<string, FormDataEntryValue>, name: string, previous: string) {
  const hour = form[name + '-hour']
  const minute = form[name + '-minute']
  const period = form[name + '-period']
  if (!hour || !minute || (period !== 'AM' && period !== 'PM')) return ''
  const hour24 = Number(hour) % 12 + (period === 'PM' ? 12 : 0)
  const time = String(hour24).padStart(2, '0') + ':' + minute
  // Keep the original database precision if the displayed time was left unchanged.
  const [previousHour, previousMinute] = previous.split(':')
  return Number(previousHour) % 24 === hour24 && previousMinute === minute ? previous : time
}
