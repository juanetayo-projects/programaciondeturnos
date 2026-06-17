# Programación de Turnos

Aplicación para construir el cuadro mensual de turnos de enfermería por servicio y cargo,
y liquidar automáticamente los recargos de nómina (HDO/HNO/HDF/HNF) según el calendario
de festivos de Colombia.

## Stack
- React + Vite + TypeScript + TailwindCSS
- Supabase (Postgres, Auth, RLS, Edge Functions)
- Resend (notificaciones por correo)
- ECharts (mapa de calor) · ExcelJS / pdfmake (exportaciones)

## Roles
- **Administrador**: CRUD de siglas, colores, servicios, cargos, mapeo de convenciones y festivos.
- **Coordinador**: construye/edita la programación de su servicio; ve recargos (solo lectura).
- **Nómina**: ve toda la programación (solo lectura) y gestiona la liquidación de recargos.

## Desarrollo
```bash
npm install
cp .env.example .env.local   # completar credenciales Supabase
npm run dev
```

## Base de datos
Migraciones en `supabase/migrations`. Para aplicarlas a un proyecto remoto:
```bash
supabase link --project-ref <ref>
supabase db push
```

## Despliegue
Automático en GitHub Pages vía `.github/workflows/deploy.yml` al hacer push a `main`.
Definir en el repo los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
