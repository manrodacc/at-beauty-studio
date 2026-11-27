import { expect, test as base } from '@playwright/test'
import { loadEnv } from 'vite'
import type { CategoriaServicio, Role, Servicio } from '../src/types/database'

type RequestLog = { table: string; method: string; body: Record<string, unknown> | null; params: URLSearchParams }
type CatalogFixture = {
  categories: CategoriaServicio[]
  services: Servicio[]
  requests: RequestLog[]
  failNextWrite: string | null
  signIn: (role: Role) => Promise<void>
}

// Todas las solicitudes a Supabase se interceptan; estas pruebas nunca escriben
// en el proyecto real ni crean cuentas de prueba.
export const test = base.extend<{ catalog: CatalogFixture }>({
  catalog: async ({ page }, use) => {
    const env = loadEnv('development', process.cwd(), 'VITE_')
    const storageKey = `sb-${new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`
    let role: Role | null = null
    const userId = '00000000-0000-4000-8000-000000000001'
    const catalog: CatalogFixture = {
      categories: [
        { id: 1, nombre: 'Mirada', descripcion: 'Cuida tu mirada.', imagen_url: null, orden: 2, estado: true },
        { id: 2, nombre: 'Manos', descripcion: null, imagen_url: null, orden: 1, estado: true },
        { id: 3, nombre: 'Sin servicios', descripcion: null, imagen_url: null, orden: 3, estado: true },
        { id: 4, nombre: 'Archivada', descripcion: null, imagen_url: null, orden: 4, estado: false },
        { id: 5, nombre: 'Solo servicios ocultos', descripcion: null, imagen_url: null, orden: 5, estado: true },
      ],
      services: [
        { id: 1, id_categoria: 1, nombre: 'Lifting', descripcion: null, precio: 90, duracion_min: 60, estado: true },
        { id: 2, id_categoria: 2, nombre: 'Manicura', descripcion: null, precio: 40, duracion_min: 30, estado: true },
        { id: 3, id_categoria: 4, nombre: 'Servicio archivado', descripcion: null, precio: 20, duracion_min: 30, estado: true },
        { id: 4, id_categoria: 5, nombre: 'Servicio oculto', descripcion: null, precio: 20, duracion_min: 30, estado: false },
      ],
      requests: [],
      failNextWrite: null,
      signIn: async nextRole => {
        role = nextRole
        await page.addInitScript(({ userId, storageKey }) => {
          const payload = { sub: userId, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }
          const token = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + btoa(JSON.stringify(payload)) + '.test'
          localStorage.setItem(storageKey, JSON.stringify({ access_token: token, refresh_token: 'test', expires_in: 3600, expires_at: payload.exp, token_type: 'bearer', user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'test@example.test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } }))
        }, { userId, storageKey })
      },
    }
    await page.route('**/auth/v1/**', route => {
      if (route.request().method() === 'POST' && /\/(signup|token)/.test(route.request().url())) {
        role = 'cliente'
        const expires = Math.floor(Date.now() / 1000) + 3600
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
        const payload = Buffer.from(JSON.stringify({ sub: userId, role: 'authenticated', aud: 'authenticated', exp: expires })).toString('base64url')
        return route.fulfill({ json: {
          access_token: `${header}.${payload}.test`, refresh_token: 'test', token_type: 'bearer', expires_in: 3600, expires_at: expires,
          user: { id: userId, email: 'test@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString(), identities: [{ id: userId }] },
        } })
      }
      return route.fulfill({ json: { user: { id: userId } } })
    })
    await page.route('**/storage/v1/**', route => route.fulfill({ status: 404, body: '' }))
    await page.routeWebSocket('**/realtime/v1/**', socket => socket.close())
    await page.route('**/rest/v1/**', async route => {
      const request = route.request()
      const url = new URL(request.url())
      const method = request.method()
      const table = url.pathname.split('/').at(-1)!
      const body = request.postDataJSON() as Record<string, unknown> | null
      const params = url.searchParams
      catalog.requests.push({ table, method, body, params })
      const send = async (data: unknown, status = 200) => route.fulfill({ status, json: data, headers: { 'content-range': '0-0/0' } })
      if (params.get('select')?.split(',').includes('categoria') && table === 'servicios') {
        return send({ code: '42703', message: 'servicios.categoria no existe' }, 400)
      }
      if (table === 'profiles') return send({ id: userId, nombres: 'Prueba', apellidos: 'Catálogo', correo: 'test@example.test', telefono: null, estado: true, rol: role, created_at: new Date().toISOString() })
      if (table === 'categorias_servicio' || table === 'servicios') {
        const rows = table === 'categorias_servicio' ? catalog.categories : catalog.services
        if (method === 'POST' || method === 'PATCH') {
          if (role !== 'admin') return send({ code: '42501', message: 'permission denied' }, 403)
          if (catalog.failNextWrite) {
            const code = catalog.failNextWrite
            catalog.failNextWrite = null
            return send({ code, message: 'constraint violation', hint: 'database detail' }, 409)
          }
          if (table === 'categorias_servicio' && body?.nombre && catalog.categories.some(row => row.nombre.toLowerCase() === String(body.nombre).toLowerCase() && 'eq.' + row.id !== params.get('id'))) {
            return send({ code: '23505', message: 'duplicate key' }, 409)
          }
          const row = method === 'POST' ? { id: Math.max(0, ...rows.map(row => row.id)) + 1, ...body } : rows.find(row => 'eq.' + row.id === params.get('id'))
          if (method === 'POST') {
            if (table === 'categorias_servicio') catalog.categories.push(row as CategoriaServicio)
            else catalog.services.push(row as Servicio)
          } else if (row) Object.assign(row, body)
          return send(row)
        }
        let visible = rows.filter(row => (role === 'admin' || row.estado) && (!params.has('id') || 'eq.' + row.id === params.get('id')))
        if (params.get('estado') === 'eq.true') visible = visible.filter(row => row.estado)
        if (table === 'categorias_servicio') {
          const categories = (visible as CategoriaServicio[]).sort((a, b) => a.orden - b.orden || a.id - b.id)
          return send(params.get('select')?.includes('servicios(') ? categories.map(category => ({ ...category, servicios: catalog.services.filter(service => service.id_categoria === category.id && (params.get('servicios.estado') !== 'eq.true' || service.estado)) })) : categories)
        }
        return send((visible as Servicio[]).map(service => ({ ...service, categorias_servicio: { nombre: catalog.categories.find(category => category.id === service.id_categoria)?.nombre } })))
      }
      return send([])
    })
    await use(catalog)
  },
})

export { expect }
