-- En el editor de Supabase, selecciona y ejecuta cada INSERT por separado.
insert into public.servicios (nombre, categoria, descripcion, precio, duracion_min, estado)
select c.nombre, c.categoria, c.descripcion, c.precio, c.duracion_min, true
from (values
    ('Lifting de pestañas', 'Pestañas', 'Realce de tus pestañas naturales con una curvatura definida.', 60.00, 60),
    ('Extensiones clásicas de pestañas', 'Pestañas', 'Aplicación pelo a pelo para alargar y definir la mirada con un acabado natural.', 100.00, 105),
    ('Manicure en gel', 'Uñas', 'Preparación de uñas, cuidado de cutículas y esmaltado en gel en un tono a elección.', 45.00, 60),
    ('Pedicure clásica', 'Uñas', 'Cuidado básico de uñas de los pies, limado y esmaltado tradicional.', 45.00, 50),
    ('Diseño y perfilado de cejas', 'Cejas', 'Diseño de cejas según tus facciones y retiro del vello fuera del contorno.', 20.00, 30),
    ('Laminado de cejas', 'Cejas', 'Moldeado y peinado de las cejas para conseguir una forma más definida.', 50.00, 45),
    ('Limpieza facial básica', 'Cuidado facial', 'Limpieza suave del rostro con mascarilla e hidratación final.', 70.00, 60),
    ('Facial hidratante', 'Cuidado facial', 'Limpieza, mascarilla hidratante y cuidado final del rostro.', 85.00, 60),
    ('Depilación de bozo', 'Depilación', 'Depilación con cera en la zona del labio superior.', 12.00, 15),
    ('Depilación de axilas', 'Depilación', 'Depilación con cera en ambas axilas.', 25.00, 25)
) as c(nombre, categoria, descripcion, precio, duracion_min)
where not exists (
  select 1 from public.servicios s where lower(btrim(s.nombre)) = lower(c.nombre)
)
on conflict do nothing
returning nombre, categoria, precio, duracion_min;

insert into public.productos (nombre, categoria, unidad, stock_minimo, costo_unitario, estado)
select i.nombre, i.categoria, i.unidad, i.stock_minimo, 0, true
from (values
    ('Pestañas para extensiones clásicas', 'Pestañas', 'bandeja', 2),
    ('Adhesivo para extensiones de pestañas', 'Pestañas', 'frasco', 2),
    ('Kit de lifting de pestañas', 'Pestañas', 'kit', 1),
    ('Parches para contorno de ojos', 'Pestañas', 'par', 10),
    ('Base para esmaltado en gel', 'Uñas', 'frasco', 2),
    ('Brillo sellador para gel', 'Uñas', 'frasco', 2),
    ('Limas desechables', 'Uñas', 'unidad', 10),
    ('Kit de laminado de cejas', 'Cejas', 'kit', 1),
    ('Limpiador facial suave', 'Cuidado facial', 'frasco', 2),
    ('Mascarillas faciales hidratantes', 'Cuidado facial', 'sobre', 5),
    ('Cera depilatoria', 'Depilación', 'bolsa', 2),
    ('Espátulas desechables para cera', 'Depilación', 'unidad', 20)
) as i(nombre, categoria, unidad, stock_minimo)
where not exists (
  select 1 from public.productos p where lower(btrim(p.nombre)) = lower(i.nombre)
)
on conflict do nothing
returning nombre, categoria, unidad, stock_actual, stock_minimo;
