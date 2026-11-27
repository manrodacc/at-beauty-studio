import { test as base, expect } from './catalogo.fixture'
import type { CategoriaProducto, Producto, Role } from '../src/types/database'

type Inventory = {
  categories: CategoriaProducto[]
  products: Producto[]
  requests: { table: string; method: string; body: Record<string, unknown> | null; params: URLSearchParams }[]
  failNextWrite: string | null
  signIn: (role: Role) => Promise<void>
}

const test = base.extend<{ inventory: Inventory }>({
  inventory: async ({ page, catalog }, use) => {
    let role: Role | null = null
    const inventory: Inventory = {
      categories: [
        { id: 1, nombre: 'Insumos de uñas', descripcion: 'Productos para manicura', orden: 1, estado: true },
        { id: 2, nombre: 'Material desechable', descripcion: null, orden: 2, estado: true },
        { id: 3, nombre: 'Archivada', descripcion: null, orden: 3, estado: false },
      ],
      products: [
        { id: 1, nombre: 'Gel rosado', id_categoria: 1, unidad: 'ml', stock_actual: 3, stock_minimo: 5, costo_unitario: 10, estado: true },
        { id: 2, nombre: 'Guantes', id_categoria: 2, unidad: 'par', stock_actual: 20, stock_minimo: 10, costo_unitario: 2, estado: true },
        { id: 3, nombre: 'Producto oculto', id_categoria: 3, unidad: 'unidad', stock_actual: 1, stock_minimo: 1, costo_unitario: 1, estado: false },
      ],
      requests: [],
      failNextWrite: null,
      signIn: async next => { role = next; await catalog.signIn(next) },
    }
    const handler = async (route: import('@playwright/test').Route) => {
      const request = route.request()
      const url = new URL(request.url())
      const table = url.pathname.split('/').at(-1)!
      const method = request.method()
      const params = url.searchParams
      const body = request.postDataJSON() as Record<string, unknown> | null
      inventory.requests.push({ table, method, params, body })
      const send = (data: unknown, status = 200) => route.fulfill({ status, json: data })
      if (role !== 'admin' && role !== 'colaboradora') return send({ code: '42501', message: 'permission denied' }, 403)
      if (table === 'productos' && (params.get('select')?.split(',').includes('categoria') || body && 'categoria' in body)) return send({ code: '42703', message: 'productos.categoria no existe' }, 400)
      const rows = table === 'categorias_producto' ? inventory.categories : inventory.products
      if (method !== 'GET') {
        if (role !== 'admin') return send({ code: '42501', message: 'permission denied' }, 403)
        if (inventory.failNextWrite) {
          const code = inventory.failNextWrite
          inventory.failNextWrite = null
          return send({ code, message: 'constraint violation', hint: 'detalle de la base' }, 409)
        }
        if (table === 'categorias_producto' && body?.nombre && inventory.categories.some(row => row.nombre.toLowerCase() === String(body.nombre).toLowerCase() && 'eq.' + row.id !== params.get('id'))) return send({ code: '23505', message: 'duplicate key' }, 409)
        if (method === 'POST') {
          const row = { ...(table === 'productos' ? { stock_actual: 0 } : {}), ...body, id: Math.max(0, ...rows.map(row => row.id)) + 1 }
          if (table === 'productos') inventory.products.push(row as Producto)
          else inventory.categories.push(row as CategoriaProducto)
          return send(row)
        }
        const row = rows.find(row => 'eq.' + row.id === params.get('id'))
        if (row) Object.assign(row, body)
        return send(row)
      }
      if (table === 'categorias_producto') return send([...inventory.categories].sort((a, b) => a.orden - b.orden || a.id - b.id))
      return send(inventory.products.map(product => ({ ...product, categorias_producto: { nombre: inventory.categories.find(category => category.id === product.id_categoria)?.nombre } })))
    }
    await page.route('**/rest/v1/categorias_producto?**', handler)
    await page.route('**/rest/v1/productos?**', handler)
    await use(inventory)
  },
})

test('inventario: admin crea categoría, asigna producto y desactiva conservando sus productos', async ({ page, inventory }) => {
  await inventory.signIn('admin')
  await page.goto('/admin/inventario')
  await page.getByRole('button', { name: 'Categorías de producto', exact: true }).click()
  const manager = page.getByRole('region', { name: 'Categorías de producto', exact: true })
  await expect(manager.getByRole('cell', { name: 'Archivada', exact: true })).toBeVisible()
  await manager.getByRole('button', { name: 'Nueva categoría de producto', exact: true }).click()
  const categoryModal = page.getByRole('dialog', { name: 'Nueva categoría de producto', exact: true })
  await categoryModal.getByLabel('Nombre', { exact: true }).fill('Cuidado capilar')
  await categoryModal.getByLabel('Descripción', { exact: true }).fill('Productos del estudio')
  await categoryModal.getByRole('button', { name: 'Guardar categoría de producto' }).click()
  await expect(categoryModal).toHaveCount(0)
  const category = inventory.categories.find(row => row.nombre === 'Cuidado capilar')!
  await page.getByRole('button', { name: 'Nuevo producto', exact: true }).click()
  const productModal = page.getByRole('dialog', { name: 'Nuevo producto', exact: true })
  await productModal.getByLabel('Nombre', { exact: true }).fill('Champú')
  await productModal.getByRole('combobox', { name: 'Categoría de producto', exact: true }).selectOption(String(category.id))
  await expect(productModal.getByRole('option', { name: 'Mirada', exact: true })).toHaveCount(0)
  await productModal.getByLabel('Unidad', { exact: true }).fill('ml')
  await productModal.getByLabel('Stock mínimo', { exact: true }).fill('5')
  await productModal.getByLabel('Costo unitario en soles', { exact: true }).fill('12.50')
  await productModal.getByRole('button', { name: 'Guardar producto' }).click()
  await expect(productModal).toHaveCount(0)
  const insert = inventory.requests.find(request => request.table === 'productos' && request.method === 'POST')!
  expect(insert.body).toMatchObject({ nombre: 'Champú', id_categoria: category.id })
  expect(insert.body).not.toHaveProperty('categoria')
  await page.getByRole('combobox', { name: 'Filtrar por categoría de producto' }).selectOption(String(category.id))
  await expect(page.locator('.stock-card')).toHaveCount(1)
  await expect(page.locator('.stock-card')).toContainText('Cuidado capilar')
  const row = manager.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Cuidado capilar', exact: true }) })
  await row.getByRole('button', { name: 'Desactivar', exact: true }).click()
  await expect(row.getByRole('cell', { name: 'Inactiva', exact: true })).toBeVisible()
  await expect(page.locator('.stock-card')).toContainText('Champú')
  await page.reload()
  await page.getByRole('button', { name: 'Categorías de producto', exact: true }).click()
  await expect(manager.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Cuidado capilar', exact: true }) })).toContainText('Inactiva')
  expect(inventory.requests.some(request => request.method === 'DELETE')).toBe(false)
})

test('inventario: editar y reactivar categoría actualiza el nombre en los productos', async ({ page, inventory }) => {
  await inventory.signIn('admin')
  await page.goto('/admin/inventario')
  await page.getByRole('button', { name: 'Categorías de producto', exact: true }).click()
  const manager = page.getByRole('region', { name: 'Categorías de producto', exact: true })
  await manager.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Insumos de uñas', exact: true }) }).getByRole('button', { name: 'Editar', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Editar categoría de producto' })
  await modal.getByLabel('Nombre', { exact: true }).fill('Manicura')
  await modal.getByRole('textbox', { name: 'Descripción', exact: true }).fill('')
  await modal.getByRole('button', { name: 'Guardar categoría de producto' }).click()
  await expect(page.locator('.stock-card').filter({ has: page.getByRole('heading', { name: 'Gel rosado', exact: true }) })).toContainText('Manicura')
  await manager.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Archivada', exact: true }) }).getByRole('button', { name: 'Activar', exact: true }).click()
  await expect(manager.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Archivada', exact: true }) })).toContainText('Activa')
  expect(inventory.categories[0].descripcion).toBeNull()
})

test('inventario: las flechas guardan el orden incluso con valores repetidos', async ({ page, inventory }) => {
  inventory.categories[1].orden = 1
  await inventory.signIn('admin')
  await page.goto('/admin/inventario')
  await page.getByRole('button', { name: 'Categorías de producto', exact: true }).click()
  await page.getByRole('button', { name: 'Subir Material desechable' }).click()
  const manager = page.getByRole('region', { name: 'Categorías de producto', exact: true })
  await expect(manager.locator('tbody tr').first()).toContainText('Material desechable')
  await expect(page.getByRole('button', { name: 'Subir Material desechable' })).toBeDisabled()
  await page.reload()
  await page.getByRole('button', { name: 'Categorías de producto', exact: true }).click()
  await expect(manager.locator('tbody tr').first()).toContainText('Material desechable')
  expect(inventory.requests.filter(request => request.method === 'PATCH').every(request => Object.keys(request.body!).join() === 'orden')).toBe(true)
})

test('inventario: colaboradora ve y filtra categorías sin controles de edición', async ({ page, inventory }) => {
  await inventory.signIn('colaboradora')
  await page.goto('/app/inventario')
  await expect(page.locator('.stock-card')).toHaveCount(2)
  await expect(page.locator('.stock-card').first()).toContainText('Insumos de uñas')
  await page.getByRole('combobox', { name: 'Filtrar por categoría de producto' }).selectOption('2')
  await expect(page.locator('.stock-card')).toHaveCount(1)
  await expect(page.locator('.stock-card')).toContainText('Guantes')
  await expect(page.getByRole('button', { name: /Editar|Nuevo producto|Categorías de producto|Registrar entrada|Desactivar|Activar/ })).toHaveCount(0)
  expect(inventory.requests.every(request => request.method === 'GET')).toBe(true)
  expect(inventory.requests.find(request => request.table === 'productos')?.params.get('select')).toBe('*,categorias_producto(nombre)')
})

test('inventario: clienta no accede al panel ni solicita categorías de producto', async ({ page, inventory }) => {
  await inventory.signIn('cliente')
  await page.goto('/admin/inventario')
  await expect(page).toHaveURL(/\/app\/inicio$/)
  await expect(page.getByRole('button', { name: 'Categorías de producto', exact: true })).toHaveCount(0)
  expect(inventory.requests).toHaveLength(0)
})

test('inventario: la landing pública no lee categorías de producto', async ({ page, inventory }) => {
  await page.goto('/')
  await expect(page.locator('.ed-tab')).toHaveText(['Manos', 'Mirada'])
  expect(inventory.requests).toHaveLength(0)
})

for (const [code, message] of [
  ['23505', 'Ya existe una categoría con ese nombre.'],
  ['23503', 'Esa categoría tiene productos. Desactívala en lugar de borrarla.'],
]) {
  test(`inventario: error ${code} muestra el mensaje de categorías de producto`, async ({ page, inventory }) => {
    await inventory.signIn('admin')
    await page.goto('/admin/inventario')
    await page.getByRole('button', { name: 'Categorías de producto', exact: true }).click()
    await page.getByRole('button', { name: 'Nueva categoría de producto', exact: true }).click()
    const modal = page.getByRole('dialog', { name: 'Nueva categoría de producto' })
    await modal.getByLabel('Nombre', { exact: true }).fill('Prueba')
    inventory.failNextWrite = code
    await modal.getByRole('button', { name: 'Guardar categoría de producto' }).click()
    await expect(modal.getByRole('alert')).toHaveText(message)
    await expect(modal).toBeVisible()
  })
}
