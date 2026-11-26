import { Link } from 'react-router-dom'

export function Logo({ to = '/' }: { to?: string }) {
  return <Link className="brand" to={to}><img src="/marca.svg" width="43" height="43" alt=""/><span><strong>AT Beauty Studio</strong><small>PESTAÑAS & BELLEZA</small></span></Link>
}
