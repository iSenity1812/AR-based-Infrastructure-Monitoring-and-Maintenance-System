# AR-IMMS Mobile

React Native field workspace dedicated to maintenance technicians.

## Run

```bash
cd mobile
pnpm install
pnpm start
```

Default API targets are defined in `app.json`:

- Identity service: `http://localhost:3001/api/v1`
- Incident workflow service: `http://localhost:4004/api/v1`

For physical devices, replace `localhost` with the machine LAN IP through Expo config or environment handling before running.

## Current Screens

- Technician login with persisted identity-service session
- Workload overview with ticket KPIs, team pulse, incident context, and charts
- Technician ticket queue with incident, urgency, waiting, and search filters
- Ticket detail with acknowledge, completion, comments, evidence, and incident context
- Completed-work history and technician profile
- Center WebAR action that opens the configured browser experience directly
- Persisted light and dark appearance modes

## Folder Layout

- `app/`: Expo Router routes
- `src/api/`: service clients
- `src/auth/`: session state and role permission helpers
- `src/components/`: shared mobile UI primitives
- `src/features/`: future feature modules can live here when workflows grow
- `src/theme/`: AR-IMMS visual tokens
- `src/types/`: API and domain types
