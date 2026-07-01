# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ConectaSalud** (package name `insumos-medicos-venezuela`) is a React SPA that connects
medical staff who need supplies with collection centers (centros de acopio), foundations,
and volunteers in Venezuela. Medical staff report needed supplies; acopios/foundations/
volunteers claim and track delivery. The UI is entirely in Spanish — keep all user-facing
copy in Spanish.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # Production build to dist/
npm run preview   # Preview the production build
```

There is **no test suite, linter, or type checker** configured. `type: module`, plain JSX
(no TypeScript). Node global `import.meta.env` supplies config.

### Required environment variables (`.env`, gitignored)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Both are read in `src/supabaseClient.js`. Without them the app renders but Supabase calls fail.

## Architecture

Single-page React 18 app, `react-router-dom` v7, deployed on Vercel (SPA rewrite in
`vercel.json` sends all routes to `index.html`). All backend logic lives in **Supabase
Postgres functions (RPCs)** — this frontend has almost no business logic of its own; it
calls RPCs and renders results. There is no ORM and no REST layer; the client uses
`supabase.rpc(...)` and direct `supabase.from('necesidades')` queries.

### Auth & roles (critical to understand)

There is **no Supabase Auth / JWT session**. Auth is custom: login calls the
`login_unificado_telefono` RPC (phone + access code), and the returned profile object is
stored in `localStorage` and mirrored in React state in `src/App.jsx`. Each role has its own
localStorage key (`K_MEDICO`, `K_ACOPIO`, `K_ADMIN`, `K_FUNDACION`, `K_MASTER`,
`K_SUBADMIN`). `limpiarSesiones()` clears all keys on every login so only one role is active
at a time. Admin uses a separate legacy RPC `login_medico_o_admin`.

The six roles, and the props threaded down from `App.jsx`:

| Role | Cred prop | Capabilities |
|------|-----------|--------------|
| `medico` | `medicoCreds` | Reports needs (`/reportar`), advances status only for its own hospital |
| `acopio` | `acopioCreds` | Claims and advances any need |
| `fundacion` | `fundacionCreds` | Requests donations (`/solicitar`), claims/advances |
| `subadmin` | `subadminCreds` | Like master minus user management |
| `master` | `masterCreds` | Full admin: `/master` panel, manage users/hospitals/acopios/announcements |
| `admin` | `adminCreds` | Legacy admin panel (`/admin`) |

**Role-specific RPCs are duplicated per role.** Actions like advancing status exist as
`avanzar_estado_medico`, `avanzar_estado_acopio`, `avanzar_estado_fundacion`,
`avanzar_estado_master`, `avanzar_estado_subadmin`. The frontend branches on which cred is
present (see `NeedItem.jsx` `avanzar()`/`retroceder()`) and calls the matching RPC with that
role's credentials. When adding a capability, expect to wire it for each role that needs it.

### Data model (`necesidades` table)

The core table. Each row is **one supply item**. A multi-item report shares a `lote_id`
(UUID generated client-side in `NeedForm.jsx`); `NeedsList.jsx` groups rows by `lote_id ||
id` and renders single items via `NeedItem` and groups via `Needrequestgroup`. Key columns:
`insumo`, `cantidad`, `hospital`, `servicio`, `urgencia`, `estado_cobertura`,
`receptor_telefono`(_2), `contacto`, `creado_por`, `cubierto_por`, `transportista_nombre/
_telefono`, `deshabilitada`, `ubicacion_espontanea`, `creado_en`.

**Realtime:** `NeedsList.jsx` subscribes to `postgres_changes` on `necesidades` and reloads
the full list on any change — no optimistic updates.

### Coverage state machine (`estado_cobertura`)

`pendiente → en_proceso → lista_para_salir → enviada → recibida`

Advancing to `lista_para_salir` requires transporter name + phone; the final `recibida`
step accepts a note. Both forward (`avanzar_estado_*`) and backward (`retroceder_estado_*`)
transitions are role-specific RPCs. Labels and transitions are defined at the top of
`NeedItem.jsx` (`STATUS_LABEL`, `SIGUIENTE_LABEL`).

### Urgency levels

`urgente` (no queda) → `alta` → `mediana` → `baja`. Defined in `NeedForm.jsx` /
`NeedItem.jsx`.

### Routes (`src/App.jsx`)

`/` needs list · `/reportar` medico report form · `/solicitar` foundation donation form ·
`/login` · `/register` (self-registration via `registrar_unificado`) · `/admin` legacy
admin · `/master` master panel · `/info` help · `/comida` food tab (currently unlinked in
nav). Route guards are inline `Navigate` redirects based on which cred is present.

## Conventions

- Codebase is in **Spanish** — variable names, RPC names, and all UI copy. Follow this.
- Special hospital sentinel `'Puestos de salud espontáneos'` (`HOSPITAL_ESPONTANEO` in
  `NeedForm.jsx`) unlocks a free-text location field (`ubicacion_espontanea`).
- Venezuelan phone prefixes are hardcoded (`PREFIJOS`); phone inputs strip non-digits, force
  7 digits, and block paste.
- Global user CLAUDE.md prefers TypeScript `I`-prefixed interfaces and no `any`, but this
  project is plain JSX with no types — match the existing style here rather than introducing
  TypeScript.
