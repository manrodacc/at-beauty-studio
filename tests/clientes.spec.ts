import { test as base, expect } from './catalogo.fixture'
import type { Cliente, Profile } from '../src/types/database'

type Directory = {
  clients: Cliente[]
  profiles: Profile[]
  writes: { table: string; body: Record<string, unknown> }[]
  insertError: string | null
}

const test = base.extend<{ directory: Directory }>({
  directory: async ({ page, catalog }, use) => {
    void catalog // Instalar las rutas base antes de las de este flujo.
    const ownId = '00000000-0000-4000-8000-000000000001'
    const clientId = '00000000-0000-4000-8000-000000000002'
    const staffId = '00000000-0000-4000-8000-000000000003'
    const profile = (id: string, nombres: string, rol: Profile['rol']): Profile => ({ id, nombres, apellidos: 'Prueba', rol, estado: true, correo: nombres.toLowerCase() + '@example.test', telefono: null, created_at: '2026-01-01T00:00:00Z' })
    const client = (id: number, id_usuario: string | null, nombres: string, telefono: string): Cliente => ({ id, id_usuario, nombres, apellidos: 'Prueba', correo: null, telefono, fecha_registro: '2026-01-01T00:00:00Z' })
    const directory: Directory = {
      profiles: [profile(ownId, 'Administración', 'admin'), profile(clientId, 'Ana', 'cliente'), profile(staffId, 'Rosa', 'colaboradora')],
      clients: [client(1, clientId, 'Ana', '987654321'), client(2, null, 'María', '912345678'), client(3, ownId, 'Administración', '933333333'), client(4, staffId, 'Rosa', '944444444')],
      writes: [],
      insertError: null,
    }
    await page.route('**/rest/v1/profiles?**', route => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('id') === 'eq.' + ownId) return route.fallback()
      return route.fulfill({ json: directory.profiles })
    })
    await page.route('**/rest/v1/clientes?**', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (request.method() === 'POST') {
        const body = request.postDataJSON()
        directory.writes.push({ table: 'clientes', body })
        if (directory.insertError) return route.fulfill({ status: 409, json: { code: directory.insertError, message: 'duplicate key' } })
        const row = { ...client(Math.max(...directory.clients.map(client => client.id)) + 1, null, '', ''), ...body }
        directory.clients.push(row)
        return route.fulfill({ json: row })
      }
      const rows = [...directory.clients].sort((a, b) => a.nombres.localeCompare(b.nombres))
      return route.fulfill({ json: url.searchParams.get('select')?.includes('profiles(') ? rows.map(client => ({ ...client, profiles: directory.profiles.find(profile => profile.id === client.id_usuario) ?? null })) : rows })
    })
    await page.route('**/rest/v1/rpc/admin_cambiar_rol', route => {
      const body = route.request().postDataJSON()
      directory.writes.push({ table: 'admin_cambiar_rol', body })
      const profile = directory.profiles.find(profile => profile.id === body.p_usuario)!
      profile.rol = body.p_rol
      return route.fulfill({ json: null })
    })
    await page.route('**/rest/v1/rpc/registrar_atencion', route => {
      directory.writes.push({ table: 'registrar_atencion', body: route.request().postDataJSON() })
      return route.fulfill({ json: { id: 1 } })
    })
    await use(directory)
  },
})

test('clientes: cambiar el rol actualiza la lista y conserva la ficha histórica', async ({ page, catalog, directory }) => {
  await catalog.signIn('admin')
  await page.goto('/admin/clientes')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.getByRole('cell', { name: 'Ana Prueba', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'María Prueba', exact: true })).toBeVisible()
  for (const role of ['colaboradora', 'cliente']) {
    await page.getByRole('link', { name: 'Configuración', exact: true }).click()
    await page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Ana Prueba', exact: true }) }).getByRole('button', { name: 'Cambiar rol' }).click()
    await page.getByRole('dialog').getByRole('combobox', { name: 'Rol', exact: true }).selectOption(role)
    await page.getByRole('button', { name: 'Confirmar cambio de rol' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('link', { name: 'Clientes', exact: true }).click()
    await expect(page.locator('tbody tr')).toHaveCount(role === 'cliente' ? 2 : 1)
    expect(directory.clients.some(client => client.id === 1)).toBe(true)
  }
})

test('atención sin cita: buscar por nombre o teléfono y elegir una clienta existente', async ({ page, catalog, directory }) => {
  await catalog.signIn('colaboradora')
  await page.goto('/app/atencion/nueva')
  const search = page.getByRole('searchbox', { name: 'Buscar clienta', exact: true })
  await search.fill('maria')
  const listbox = page.getByRole('listbox', { name: 'Resultados de clientas', exact: true })
  await expect(listbox.getByRole('option')).toHaveCount(1)
  await listbox.getByRole('option', { name: /María Prueba/ }).click()
  await expect(page.locator('input[name="cliente"]')).toHaveValue('2')
  await page.getByRole('button', { name: 'Cambiar', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Buscar clienta', exact: true }).fill('987654321')
  await expect(listbox.getByRole('option')).toHaveCount(1)
  await listbox.getByRole('option', { name: /Ana Prueba/ }).click()
  await expect(page.locator('input[name="cliente"]')).toHaveValue('1')
  expect(directory.writes).toHaveLength(0)
})

for (const admin of [false, true]) {
  test(`atención sin cita: ${admin ? 'admin' : 'colaboradora'} crea y selecciona clienta sin perder los datos`, async ({ page, catalog, directory }) => {
    await catalog.signIn(admin ? 'admin' : 'colaboradora')
    await page.goto(admin ? '/admin/atencion/nueva' : '/app/atencion/nueva')
    await page.getByRole('combobox', { name: 'Servicio', exact: true }).selectOption('2')
    await page.getByLabel('Total en soles', { exact: true }).fill('55')
    await page.getByLabel('Observaciones (opcional)', { exact: true }).fill('Atención presencial')
    await page.getByRole('searchbox', { name: 'Buscar clienta', exact: true }).fill('Lucía Nueva')
    await expect(page.getByRole('status').filter({ hasText: 'No encontramos clientas' })).toBeVisible()
    await page.getByRole('button', { name: 'Nueva clienta', exact: true }).click()
    const modal = page.getByRole('dialog', { name: 'Nueva clienta' })
    await modal.getByLabel('Nombres', { exact: true }).fill('Lucía')
    await modal.getByLabel('Apellidos', { exact: true }).fill('Nueva')
    await modal.getByLabel('Teléfono (opcional)', { exact: true }).fill('955555555')
    await modal.getByRole('button', { name: 'Guardar clienta', exact: true }).click()
    await expect(modal).toHaveCount(0)
    const created = directory.clients.find(client => client.nombres === 'Lucía')!
    await expect(page.locator('input[name="cliente"]')).toHaveValue(String(created.id))
    await expect(page.getByRole('status').filter({ hasText: 'Lucía Nueva' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Servicio', exact: true })).toHaveValue('2')
    await expect(page.getByLabel('Total en soles', { exact: true })).toHaveValue('55')
    await expect(page.getByLabel('Observaciones (opcional)', { exact: true })).toHaveValue('Atención presencial')
    expect(directory.writes.filter(write => write.table === 'registrar_atencion')).toHaveLength(0)
    if (!admin) {
      await page.getByRole('button', { name: 'Registrar atención', exact: true }).click()
      await expect(page).toHaveURL(/\/app\/pagos$/)
      expect(directory.writes.find(write => write.table === 'registrar_atencion')?.body).toMatchObject({ p_cliente: created.id, p_servicio: 2, p_total: 55 })
    }
    expect(created.id_usuario).toBeNull()
  })
}

test('atención sin cita: un alta duplicada muestra un error y no envía la atención', async ({ page, catalog, directory }) => {
  await catalog.signIn('colaboradora')
  directory.insertError = '23505'
  await page.goto('/app/atencion/nueva')
  await page.getByRole('button', { name: 'Nueva clienta', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Nueva clienta' })
  await modal.getByLabel('Nombres', { exact: true }).fill('Ana')
  await modal.getByLabel('Apellidos', { exact: true }).fill('Prueba')
  await modal.getByRole('button', { name: 'Guardar clienta', exact: true }).click()
  await expect(modal.getByRole('alert')).toContainText('Ya existe una clienta con esos datos.')
  await expect(modal).toBeVisible()
  expect(directory.clients).toHaveLength(4)
  expect(directory.writes.some(write => write.table === 'registrar_atencion')).toBe(false)
})

test('móvil: el panel de edición permite hacer scroll hasta el botón final', async ({ page, catalog }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await catalog.signIn('admin')
  await page.route('**/rest/v1/colaboradoras?**', route => route.fulfill({ json: [{ id: 1, id_usuario: '00000000-0000-4000-8000-000000000003', nombres: 'Rosa', apellidos: 'Prueba', telefono: '944444444', especialidad: 'Pestañas', estado: true, correo: null, fecha_registro: '2026-01-01T00:00:00Z' }] }))
  await page.route('**/rest/v1/colaboradora_servicio?**', route => route.fulfill({ json: [] }))
  await page.route('**/rest/v1/horario_colaboradora?**', route => route.fulfill({ json: [{ dia_semana: 1, hora_inicio: '09:00:00', hora_fin: '18:00:00' }] }))
  await page.route('**/rest/v1/profiles?**', route => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('id') === 'eq.00000000-0000-4000-8000-000000000003') {
      return route.fulfill({ json: { correo: 'rosa@example.test' } })
    }
    return route.fallback()
  })
  await page.goto('/admin/colaboradoras')
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  const drawer = page.locator('.drawer-sheet')
  await expect(drawer).toBeVisible()
  await expect(drawer).toHaveCSS('touch-action', 'pan-y')
  const body = drawer.locator('.modal-body')
  await expect(body).toHaveCSS('overflow-y', 'auto')
  await expect(body).toHaveCSS('touch-action', 'pan-y')
  const saveButton = drawer.getByRole('button', { name: 'Guardar cambios', exact: true })
  await saveButton.scrollIntoViewIfNeeded()
  await expect(saveButton).toBeInViewport()
})
