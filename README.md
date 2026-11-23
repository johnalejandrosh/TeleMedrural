# TeleMed Rural · MVP

Panel web de **telemedicina diferida** (no interactiva) para zonas rurales sin conectividad.
Los promotores de salud registran fichas clínicas en una app móvil que funciona sin señal; al
recuperar la cobertura, la app las sincroniza con esta plataforma. Aquí el personal de salud:

- recibe los **casos sincronizados** en una bandeja ordenada por prioridad;
- consulta la **ficha clínica**: identificación, motivo, síntomas, antecedentes y signos vitales;
- ve el **pre-triaje NEWS2** (Royal College of Physicians, 2017) con el puntaje de cada parámetro;
- registra **observaciones médicas** y la conducta a seguir, y marca el caso como revisado;
- y la administración gestiona **usuarios, roles, permisos y dispositivos** de la app.

Monolito Next.js 16 (App Router, Cache Components) + CoreUI 5 + Prisma 7 sobre PostgreSQL.
Todas las tablas viven en el esquema `telemedicina` (variable `DB_SHEMA`).

## Puesta en marcha

```bash
cp .env.example .env        # credenciales de PostgreSQL, DB_SHEMA=telemedicina
npm install
npm run db:deploy           # crea el esquema y las tablas
npm run db:seed             # permisos, roles, administrador y datos de demostración
npm run dev                 # http://localhost:3000
```

Cuentas de demostración (contraseña `demo1234`):

| Correo | Rol |
| --- | --- |
| dra.rojas@ejemplo.co | Profesional de salud (revisa casos) |
| enf.beltran@ejemplo.co | Profesional de salud |
| promotor@ejemplo.co | Promotor de salud (ve sus casos; usa la API) |
| coordinacion@ejemplo.co | Coordinador (casos, pacientes, sincronización) |
| admin@telemedrural.co | Administrador (acceso total) |

`pendiente@ejemplo.co` es una solicitud de registro sin aprobar (cuenta inactiva).

## Módulos

| Ruta | Para qué |
| --- | --- |
| `/dashboard` | Resumen: pendientes por riesgo, recibidos hoy, revisados, tiempo a la revisión, casos por día. |
| `/dashboard/casos` | Bandeja: pendientes primero, el de mayor riesgo arriba y, a igual riesgo, el que más espera. |
| `/dashboard/casos/[id]` | Ficha clínica, NEWS2 por parámetro, trazabilidad (campo → sincronización → revisión) y observaciones. |
| `/dashboard/pacientes` | Pacientes y su historial de atenciones y signos vitales. |
| `/dashboard/news2` | Tabla de referencia de la escala y calculadora. |
| `/dashboard/sincronizacion` | Bitácora de lotes recibidos y dispositivos (revocación de tokens). |
| `/dashboard/api` | Documentación de la API para la app móvil. |
| `/dashboard/usuarios`, `roles`, `permisos` | Administración de acceso (de la plantilla). |

El registro público (`/register`) crea cuentas **inactivas** de profesional o promotor: un
administrador las activa en «Usuarios» después de verificar los datos.

## API para la app móvil (`/api/v1`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/auth/token` | Inicia sesión y entrega un token Bearer (90 días). Requiere el permiso `cases.sync`. |
| `DELETE` | `/auth/token` | Revoca el token actual. |
| `POST` | `/casos` | Lote de hasta 100 casos. Respuesta por caso: `created`, `duplicate` o `rejected`. |
| `GET` | `/casos?desde=ISO` | Casos propios actualizados, con estado y observaciones (retroalimentación al promotor). |
| `GET` | `/catalogos` | Síntomas, antecedentes, tipos de documento, conductas y municipios (público). |

- **Idempotencia:** cada caso trae un `clientId` generado en el teléfono; reenviar un lote no duplica nada.
- **Validación por caso:** rangos fisiológicos, fechas y catálogos (`lib/validation/sync.ts`).
- **NEWS2 en el servidor:** se recalcula con `lib/med/news2.ts`; el valor de la app se guarda para detectar diferencias.

## Estructura

```
app/(auth)                 inicio de sesión y solicitud de acceso
app/(dashboard)/dashboard  páginas del panel (Server Components + Suspense)
app/api/v1                 API REST de la app móvil
components/med             bandeja, ficha, signos vitales, NEWS2, observaciones
lib/med                    NEWS2, catálogos y formatos (compartidos cliente/servidor)
lib/server                 DAL (sesión y permisos), consultas, API tokens, ingesta de lotes
prisma/schema.prisma       usuarios/roles, pacientes, casos, observaciones, lotes y tokens
styles/                    tema "Clínica" sobre CoreUI (_med.scss, _app-tokens.scss, _themes.scss)
```

> NEWS2 es una herramienta de apoyo: no está validada en menores de 16 años ni en gestantes,
> y no reemplaza el criterio clínico. La ficha lo advierte cuando aplica.
