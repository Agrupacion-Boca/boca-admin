# BBB Admin — Panel de administración

Panel privado para gestionar registros, noticias y encuestas de Boca Boca Boca.

## 1. Instalación local (para probarlo antes de subirlo)

```bash
npm install
cp .env.local.example .env.local
```

Editá `.env.local` y pegá tu `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la misma anon key que ya usa el sitio público, la encontrás en Supabase → Settings → API).

```bash
npm run dev
```

Abrí http://localhost:3000 — te debería mandar a `/login`.

## 2. Subir a Vercel

1. Subí esta carpeta a un repo de GitHub (o arrastrala directo si usás Vercel CLI)
2. En Vercel: **New Project** → importá el repo
3. En **Environment Variables**, agregá:
   - `NEXT_PUBLIC_SUPABASE_URL` → `https://jovyigkgtcllsjvlddjt.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → tu anon key
4. Deploy

Esto te va a quedar en una URL nueva tipo `boca-admin.vercel.app` — **completamente separada** del sitio público (`boca-mvp.vercel.app`).

## 3. Cómo entra la gente

Solo pueden entrar las personas que:
1. Tengan un usuario creado en Supabase → Authentication → Users
2. Estén cargadas en la tabla `admins` (ver `supabase-admin-setup.sql`)

No hay registro público a este panel — si alguien no está en `admins`, aunque tenga login válido, no ve nada (la seguridad real está en las políticas RLS de Supabase, no en el código de Next.js).

## 4. Estructura

- `/login` — pantalla de acceso
- `/admin/registros` — ver, buscar, filtrar y exportar a CSV los socios registrados
- `/admin/noticias` — crear, editar, publicar/despublicar y borrar noticias
- `/admin/encuestas` — crear encuestas con opciones, cerrarlas/reabrirlas, ver resultados en vivo

## 5. Pendiente para más adelante

- Las noticias y encuestas están armadas del lado del admin, pero **el sitio público (`BOCA-MVP.html`) todavía no las muestra** — eso es un paso aparte: agregar esas secciones al HTML público, leyendo con la anon key (ya están las policies de lectura pública puestas para `noticias.publicado = true` y `encuestas.activa = true`).
- Gestión de roles distintos entre personas del equipo (hoy todos los que están en `admins` tienen los mismos permisos sobre todo).
