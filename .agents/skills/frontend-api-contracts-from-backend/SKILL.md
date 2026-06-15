---
name: frontend-api-contracts-from-backend
description: Generate or update frontend-facing API contract documents by reading backend code first. Use this whenever the user asks for API contracts, frontend service contracts, endpoint documentation for FE, or wants docs generated from NestJS or controller code, even if they only say "viết contract", "document API", "generate service docs", or ask for one service at a time.
---

# Frontend API Contracts From Backend

Create API contract documents for frontend teams by deriving them from the current backend implementation, not from guesses.

This skill is for architecture-first, documentation-driven repositories where backend code is the immediate source for route behavior and the generated output should help frontend developers integrate safely.

## What this skill produces

Produce one Markdown contract file per backend service unless the user asks for another packaging shape.

Default output location:

- `docs/api-contracts/<plane>/<service-name>.md`

If the repository already has a stronger convention, follow it instead.

## Core rules

1. Read repo guidance first.
2. Read backend bootstrap and controllers before writing anything.
3. Read DTOs and serializer or envelope helpers before describing payloads.
4. Distinguish confirmed behavior from inference.
5. Do not invent business fields that are not supported by code.
6. Do not describe persistence schemas as API contracts.
7. Call out deprecated or risky endpoints explicitly.
8. Preserve service boundaries from architecture docs.

## Required context order

Read only the files you need, in this order:

1. `AGENTS.md`
2. `CONTRACTS.md`
3. relevant `docs/*` files if service naming or ownership is unclear
4. target service `main.ts` or bootstrap file to find:
   - global prefix
   - Swagger path
   - request ID or correlation middleware
   - validation behavior
5. all HTTP controllers in the target service
6. DTOs used by those controllers
7. envelope serializers, problem-details helpers, or response mappers
8. selected use cases or DTO/view mappers only when response shape is otherwise ambiguous

## How to map the backend to a frontend contract

For each service:

1. Identify the service name and base path.
2. Group endpoints by controller or capability.
3. Record for each endpoint:
   - method
   - full path
   - whether auth is required
   - guards or permission requirements when visible
   - path params
   - query params
   - request body fields
   - validation constraints visible in DTOs
   - response envelope shape
   - representative success example
   - important error cases
4. Note inconsistencies with repo standards.
5. Add frontend consumption notes where they reduce integration risk.

## Confirmed vs inferred behavior

Use this discipline consistently:

- **Confirmed**: directly visible in controller, DTO, bootstrap, serializer, or concrete return DTO
- **Inferred**: derived from use-case names, mapper names, or partial return-type evidence

When a field or response shape is inferred, say so plainly. Prefer wording like:

- "Current code confirms..."
- "Frontend should expect..."
- "Representative response..."
- "The exact nested shape is owned by the use case and should be treated as a service read model."

## Recommended file structure

Use this structure unless the repo already has a better one:

```md
# <Service> API Contract
## Scope
## Service Basics
## Transport and Header Rules
## Response Behavior or Envelope
## Domain Enums Used By Current API
## Endpoints
## Error Contract
## Frontend Notes
```

## Writing guidance

- Be concrete and implementation-aware.
- Optimize for frontend integration speed.
- Prefer examples over vague prose.
- Keep examples small but realistic.
- If a service does not use the shared success envelope, state that clearly.
- If a route is public today but looks security-sensitive, document current behavior without pretending it is protected.
- If a compatibility endpoint is deprecated, say "Do not build new flows on top of this endpoint."

## Endpoint example pattern

~~~md
### `POST /api/v1/auth/login`

- Auth: none
- Purpose: authenticate a user and create a session

Request body:

```json
{
  "email": "admin@example.com",
  "password": "Admin@123456"
}
```

Response shape:

```json
{
  "user": {},
  "tokens": {
    "accessToken": "jwt",
    "refreshToken": "token",
    "sessionId": "session-id"
  }
}
```
~~~

## Review checklist before finishing

Before you stop, verify:

1. Every current controller route is covered.
2. Base path matches bootstrap configuration.
3. Auth and permission notes match visible guards and decorators.
4. DTO field names and optionality are accurate.
5. The contract does not claim fields that the code does not show.
6. Deprecated endpoints are labeled.
7. Response envelope behavior is called out accurately.
8. Output paths follow repo conventions.

## When the user wants many services

If the user asks for contracts for multiple services:

- create one file per service
- keep shared terminology consistent
- use the same section order across files
- call out when one service uses raw responses and another uses envelopes

## When the backend is incomplete

If some controllers exist but response models are unclear:

- document the endpoint anyway
- mark response shape as partial or representative
- point to the exact code source used
- avoid blocking unless the ambiguity would create a dangerous contract

## Output style

The final document should feel like a frontend integration reference, not an internal backend diary.

Good:

- concise headers
- concrete JSON examples
- direct integration notes

Avoid:

- long architectural essays inside the contract file
- repeating DTO decorator syntax verbatim
- pretending inferred shapes are guaranteed
