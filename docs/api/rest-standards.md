# REST API Standards & Contracts

## Resource Naming Conventions
- Plural nouns for resource collections: `/api/v1/patients`, `/api/v1/clinics`, `/api/v1/appointments`.
- Specific resource identifiers in URL parameters: `/api/v1/patients/:id`.
- Sub-resources: `/api/v1/clinics/:clinicId/doctors`.

## HTTP Status Codes
- `200 OK`: Successful read or update.
- `201 Created`: Successful creation.
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Authenticated user lacks permission or tenant access.
- `404 Not Found`: Resource does not exist.
- `409 Conflict`: Business constraint violation (e.g. double booking).
- `500 Internal Server Error`: Unhandled application exception.
