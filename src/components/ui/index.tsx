import { CircleAlert, Sparkles, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useId, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import { Button } from './button'
import { mensajeError } from '@/lib/errors'
export { Button } from './button'

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{error && <small role="alert">{error}</small>}</label>
}

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <header className="page-title"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>
}

export function Skeleton() {
  return <div className="skeleton-list" role="status" aria-label="Cargando"><div/><div/><div/></div>
}

export function Empty({ title = 'Aún no hay resultados', children }: { title?: string; children?: ReactNode }) {
  return <div className="empty-state"><Sparkles aria-hidden/><h2>{title}</h2>{children}</div>
}

export function Failure({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="inline-error" role="alert"><CircleAlert aria-hidden/><span>{mensajeError(error)}</span>{retry && <Button onClick={retry} variant="outline">Reintentar</Button>}</div>
}

export function Modal({ title, open, onOpenChange, children }: { title: string; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  const id = useId()
  const mobile = window.matchMedia('(max-width: 639px)').matches
  if (mobile) return <Drawer.Root open={open} onOpenChange={onOpenChange} handleOnly>
    <Drawer.Portal><Drawer.Overlay className="modal-overlay"/><Drawer.Content className="drawer-sheet" aria-describedby={undefined}>
      <div className="modal-header">
        <Drawer.Handle className="drawer-handle"/>
        <Drawer.Title className="modal-title">{title}</Drawer.Title>
        <Drawer.Close asChild><Button variant="ghost" className="modal-close" aria-label="Cerrar"><X/></Button></Drawer.Close>
      </div>
      <div className="modal-body">{children}</div>
    </Drawer.Content></Drawer.Portal>
  </Drawer.Root>
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className="modal-overlay"/><Dialog.Content className="modal-sheet" aria-labelledby={id} aria-describedby={undefined}>
      <div className="modal-header">
        <Dialog.Title id={id} className="modal-title">{title}</Dialog.Title>
        <Dialog.Close asChild><Button variant="ghost" className="modal-close" aria-label="Cerrar"><X/></Button></Dialog.Close>
      </div>
      <div className="modal-body">{children}</div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
}

export function DataList<T>({ rows, columns, rowKey }: { rows: T[]; columns: { label: string; render: (row: T) => ReactNode }[]; rowKey: (row: T) => string | number }) {
  if (!rows.length) return <Empty/>
  return <div className="data-table"><table><thead><tr>{columns.map(col => <th scope="col" key={col.label}>{col.label}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={rowKey(row)}>{columns.map(col => <td key={col.label} data-label={col.label}>{col.render(row)}</td>)}</tr>)}</tbody>
  </table></div>
}
