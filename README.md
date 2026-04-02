# ⚽ Catamarca 2026

App de gestión del viaje al torneo de Catamarca. Next.js 14 + Supabase + Zustand.

## Setup

### 1. Instalar dependencias
```bash
npm install
```

### 2. Variables de entorno
Renombrá `.env.example` a `.env.local` y completá con tus credenciales de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://vfhrpydvlknskmizsfsg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Correr en desarrollo
```bash
npm run dev
```
Abrí [http://localhost:3000](http://localhost:3000)

### 4. Deploy en Vercel

1. Subí el proyecto a GitHub
2. Importalo en [vercel.com](https://vercel.com)
3. Agregá las variables de entorno en Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy automático en cada push a `main`

## Tablas Supabase requeridas

```sql
-- jugadores, pagos, habitaciones, hab_ocupantes, indumentaria, caja
-- (ya existentes en tu proyecto Supabase)
```

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Zustand** — estado global
- **Supabase** — base de datos + auth
- **Vercel** — hosting

## Login

El acceso está protegido con Supabase Auth. Para crear un usuario admin:
1. Ir a Supabase → Authentication → Users → Add user
2. Ingresar email y password
3. Ese email/password es el que usás en la pantalla de login de la app
