# AR-IMMS Mobile

React Native mobile workspace for incident and ticket workflows.

## Run

```bash
cd mobile
pnpm install
pnpm start
```

Default API targets are defined in `app.json`:

- Identity service: `http://localhost:3001/api/v1`
- Incident workflow service: `http://localhost:4003/api/v1`

For physical devices, replace `localhost` with the machine LAN IP through Expo config or environment handling before running.

## Current Screens

- Login with identity-service token handling
- Role-aware operations home
- Ticket list, create ticket, detail, assignment, acknowledge, comments, evidence upload
- Incident list and incident detail

## Folder Layout

- `app/`: Expo Router routes
- `src/api/`: service clients
- `src/auth/`: session state and role permission helpers
- `src/components/`: shared mobile UI primitives
- `src/features/`: future feature modules can live here when workflows grow
- `src/theme/`: AR-IMMS visual tokens
- `src/types/`: API and domain types
