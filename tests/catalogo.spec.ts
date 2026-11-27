import { test, expect } from './catalogo.fixture'

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 390, height: 667 }]) {
  test(`carrusel con scroll: carga asíncrona y recorrido completo en ${viewport.width}x${viewport.height}`, async ({ page, catalog }) => {
    await page.setViewportSize(viewport)
    catalog.categories[0].nombre = 'Cuidado facial'
    catalog.categories[0].descripcion = 'Limpieza facial e hidratación para cuidar tu piel y disfrutar de un momento de bienestar.'
    catalog.services.push({ id: 5, id_categoria: 3, nombre: 'Nuevo cuidado', descripcion: null, precio: 30, duracion_min: 30, estado: true })
    let releaseCatalog!: () => void
    const catalogReady = new Promise<void>(resolve => { releaseCatalog = resolve })
    await page.route('**/rest/v1/categorias_servicio?**', async route => {
      await catalogReady
      await route.fallback()
    })
    await page.goto('/')
    await expect(page.locator('.ed-sc-slide')).toHaveCount(0)
    releaseCatalog()
    await expect(page.locator('.ed-sc-slide')).toHaveCount(3)
    const gallery = page.locator('.ed-scroll-carousel-outer')
    const scrollToProgress = async (progress: number) => {
      await gallery.evaluate((element, progress) => {
        const bounds = element.getBoundingClientRect()
        window.scrollTo(0, window.scrollY + bounds.top + (bounds.height - window.innerHeight) * progress)
      }, progress)
    }
    const expectImageInsideFrame = async (index: number) => {
      const slide = page.locator('.ed-sc-slide').nth(index)
      await expect.poll(async () => slide.evaluate(element => {
        const frame = element.querySelector('.ed-sc-img-wrap')!.getBoundingClientRect()
        const image = element.querySelector('img')!.getBoundingClientRect()
        return image.left >= frame.left && image.right <= frame.right && frame.width < window.innerWidth * .85 && frame.height < window.innerHeight * .6
      })).toBe(true)
      await expect(slide.locator('img')).toHaveCSS('object-fit', 'contain')
      const button = await slide.getByRole('button', { name: /^Reservar/ }).boundingBox()
      expect(button!.y).toBeGreaterThan(72)
      expect(button!.y + button!.height).toBeLessThan(viewport.height - 40)
    }
    await scrollToProgress(1)
    await expect(page.locator('.ed-sc-counter em')).toHaveText('03')
    await expect.poll(async () => Math.abs((await page.locator('.ed-sc-slide').last().boundingBox())!.x)).toBeLessThan(5)
    await expect.poll(async () => Math.abs((await page.locator('.ed-scroll-carousel-sticky').boundingBox())!.y)).toBeLessThan(2)
    await expectImageInsideFrame(2)
    await scrollToProgress(0.5)
    await expect(page.locator('.ed-sc-counter em')).toHaveText('02')
    await expect.poll(async () => Math.abs((await page.locator('.ed-sc-slide').nth(1).boundingBox())!.x)).toBeLessThan(5)
    await expectImageInsideFrame(1)
    await page.screenshot({ path: test.info().outputPath('carousel.png') })
    await scrollToProgress(0)
    await expect(page.locator('.ed-sc-counter em')).toHaveText('01')
    await expect.poll(async () => Math.abs((await page.locator('.ed-sc-slide').first().boundingBox())!.x)).toBeLessThan(5)
    await expectImageInsideFrame(0)
  })

  test(`reserva pública: categoría, servicio y cuenta en ${viewport.width}x${viewport.height}`, async ({ page, catalog }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const gallery = page.locator('.ed-scroll-carousel-outer')
    await expect(page.locator('.ed-sc-slide')).toHaveCount(2)
    await gallery.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      window.scrollTo(0, window.scrollY + bounds.top + bounds.height - window.innerHeight)
    })
    await expect(page.locator('.ed-sc-counter em')).toHaveText('02')
    await page.locator('.ed-sc-slide').last().getByRole('button', { name: 'Reservar Mirada', exact: true }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('.ed-tab[aria-pressed=true]')).toHaveText('Mirada')
    await expect(page.locator('.ed-catalog-slide[aria-label=Mirada]')).not.toHaveAttribute('inert')
    await page.getByRole('link', { name: 'Reservar Lifting', exact: true }).click()
    await expect(page).toHaveURL(/\/registro\?servicio=1$/)
    await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible()
    await page.reload()
    if (viewport.width < 720) {
      await page.getByRole('link', { name: 'Ingresa', exact: true }).click()
      await expect(page).toHaveURL(/\/login\?servicio=1$/)
    } else {
      await page.getByLabel('Nombres', { exact: true }).fill('Ana')
      await page.getByLabel('Apellidos', { exact: true }).fill('Prueba')
    }
    await page.getByLabel('Correo electrónico', { exact: true }).fill('test@example.test')
    await page.getByLabel('Contraseña', { exact: true }).fill('Prueba12345')
    await page.getByRole('button', { name: viewport.width < 720 ? 'Ingresar' : 'Crear cuenta', exact: true }).click()
    await expect(page).toHaveURL(/\/app\/agendar\?servicio=1$/)
    await expect(page.getByRole('button', { name: /Lifting/ })).toHaveAttribute('aria-pressed', 'true')
    expect(catalog.requests.some(request => request.table === 'categorias_servicio' && request.method !== 'GET')).toBe(false)
  })
}

test('landing: catálogo agrupado, ordenado y sin categorías vacías u ocultas', async ({ page, catalog }) => {
  await page.goto('/')
  await expect(page.locator('.ed-tab')).toHaveText(['Manos', 'Mirada'])
  await page.locator('.ed-tab').filter({ hasText: 'Mirada' }).click()
  const slide = page.locator('.ed-catalog-slide[aria-label="Mirada"]')
  await expect(slide.getByRole('heading', { name: 'Lifting' })).toBeVisible()
  await expect(slide.getByText('Cuida tu mirada.')).toBeVisible()
  await expect(page.locator('.ed-sc-slide')).toHaveCount(2)
  const request = catalog.requests.find(request => request.table === 'categorias_servicio')!
  expect(request.params.get('select')).toBe('id,nombre,descripcion,imagen_url,orden,servicios(id,nombre,precio,duracion_min)')
  expect(request.params.get('order')).toBe('orden.asc,id.asc')
  expect(request.params.get('estado')).toBe('eq.true')
  expect(request.params.get('servicios.estado')).toBe('eq.true')
})

test('agendamiento: servicios por categoría y selección inicial por ID', async ({ page, catalog }) => {
  await catalog.signIn('cliente')
  await page.goto('/app/agendar?servicio=1')
  await expect(page.locator('.booking-group h3')).toHaveText(['Manos', 'Mirada'])
  await expect(page.getByRole('button', { name: /Lifting/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /Servicio oculto|Servicio archivado/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled()
})

test('admin: crea categoría, asigna servicio y desactiva sin perder visibilidad interna', async ({ page, catalog }) => {
  await catalog.signIn('admin')
  await page.goto('/admin/categorias')
  await expect(page.getByRole('cell', { name: 'Archivada', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nueva categoría' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Bienestar')
  await page.getByLabel('Descripción', { exact: true }).fill('Un momento para ti.')
  await page.getByLabel('URL de imagen').fill('https://example.test/bienestar.webp')
  await page.getByRole('button', { name: 'Guardar categoría' }).click()
  await expect(page.getByRole('cell', { name: 'Bienestar', exact: true })).toBeVisible()
  const category = catalog.categories.find(row => row.nombre === 'Bienestar')!

  await page.getByRole('link', { name: 'Servicios', exact: true }).click()
  await page.getByRole('button', { name: 'Nuevo servicio' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Masaje')
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption(String(category.id))
  await page.getByLabel('Precio en soles').fill('120')
  await page.getByLabel('Duración en minutos').fill('45')
  await page.getByRole('button', { name: 'Guardar servicio' }).click()
  await expect(page.getByLabel('Foto del servicio')).toBeVisible()
  const insert = catalog.requests.find(request => request.table === 'servicios' && request.method === 'POST')!
  expect(insert.body).toMatchObject({ id_categoria: category.id, nombre: 'Masaje', precio: 120, duracion_min: 45 })
  expect(insert.body).not.toHaveProperty('categoria')
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await page.getByRole('combobox', { name: 'Filtrar por categoría', exact: true }).selectOption(String(category.id))
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr')).toContainText('Bienestar')

  await page.goto('/')
  await expect(page.locator('.ed-tab')).toContainText(['Manos', 'Mirada', 'Bienestar'])
  await page.goto('/admin/categorias')
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Bienestar', exact: true }) })
  await row.getByRole('button', { name: 'Desactivar' }).click()
  await expect(row.getByRole('cell', { name: 'Inactiva', exact: true })).toBeVisible()
  await page.goto('/')
  await expect(page.locator('.ed-tab')).toHaveText(['Manos', 'Mirada'])
  // Incluso la landing abierta por el admin respeta los filtros públicos.
  expect(catalog.categories.find(row => row.id === category.id)?.estado).toBe(false)
  expect(catalog.requests.some(request => request.method === 'DELETE')).toBe(false)
})

test('admin: edita, limpia campos opcionales y reactiva categorías', async ({ page, catalog }) => {
  await catalog.signIn('admin')
  await page.goto('/admin/categorias')
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Archivada', exact: true }) })
  await row.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Recuperada')
  await page.getByRole('button', { name: 'Guardar categoría' }).click()
  const updated = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Recuperada', exact: true }) })
  await updated.getByRole('button', { name: 'Activar', exact: true }).click()
  await expect(updated.getByRole('cell', { name: 'Activa', exact: true })).toBeVisible()
  expect(catalog.categories.find(row => row.id === 4)).toMatchObject({ nombre: 'Recuperada', descripcion: null, imagen_url: null, estado: true })
})

test('admin: flechas guardan el orden incluso con valores iniciales repetidos', async ({ page, catalog }) => {
  catalog.categories[0].orden = 1
  await catalog.signIn('admin')
  await page.goto('/admin/categorias')
  await page.getByRole('button', { name: 'Subir Manos', exact: true }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Manos')
  await expect(page.getByRole('button', { name: 'Subir Manos', exact: true })).toBeDisabled()
  await page.reload()
  await expect(page.locator('tbody tr').first()).toContainText('Manos')
  expect(catalog.requests.filter(request => request.method === 'PATCH').every(request => Object.keys(request.body!).join() === 'orden')).toBe(true)
})

for (const [code, message] of [
  ['23505', 'Ya existe una categoría con ese nombre.'],
  ['23503', 'Esa categoría tiene servicios. Desactívala en lugar de borrarla.'],
]) {
  test(`admin: muestra el mensaje del error ${code}`, async ({ page, catalog }) => {
    await catalog.signIn('admin')
    await page.goto('/admin/categorias')
    await page.getByRole('button', { name: 'Nueva categoría' }).click()
    await page.getByLabel('Nombre', { exact: true }).fill('Prueba de error')
    catalog.failNextWrite = code
    await page.getByRole('button', { name: 'Guardar categoría' }).click()
    await expect(page.getByRole('alert')).toContainText(message)
    await expect(page.getByRole('dialog')).toBeVisible()
  })
}

test('clienta: no accede a crear categorías ni emite escrituras', async ({ page, catalog }) => {
  await catalog.signIn('cliente')
  await page.goto('/admin/categorias')
  await expect(page).toHaveURL(/\/app\/inicio$/)
  await expect(page.getByRole('button', { name: 'Nueva categoría' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Categorías', exact: true })).toHaveCount(0)
  expect(catalog.requests.some(request => request.table === 'categorias_servicio' && request.method === 'POST')).toBe(false)
})
