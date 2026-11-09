# MatabAI API Conventions

## 1. Base URL & Versioning

All API routes follow strict URI path versioning:

```text
https://api.matabai.com/api/v1
```

- **Global Prefix**: `/api/v1`
- **Interactive Documentation**: `/api/docs` (OpenAPI Swagger)
- **Health Check Endpoint**: `/api/v1/health`

---

## 2. Standard Success Response Envelope

All API endpoints wrap data using the standardized `ApiResponse<T>` contract:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "id": "c1f7b99c-851e-4cb8-9b51-75e114f7d456",
    "name": "Al-Shifa Clinic"
  },
  "timestamp": "2026-11-09T10:45:00.000Z"
}
```

---

## 3. Standard Error Response Envelope

When an error occurs, the server responds with a consistent `ApiErrorResponse` structure. Internal server stacks are never exposed in production.

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "phone must be a valid Pakistani or E.164 phone number"
  ],
  "errorCode": "VALIDATION_FAILED",
  "timestamp": "2026-11-09T10:45:00.000Z",
  "path": "/api/v1/patients"
}
```

---

## 4. Pagination Standard

Endpoints returning collections accept query parameters and respond with standard metadata:

### Request Query
```text
GET /api/v1/appointments?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

### Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 150,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "timestamp": "2026-11-09T10:45:00.000Z"
}
```

---

## 5. Health Check Endpoint Specification

### `GET /api/v1/health`
Checks system availability, database connectivity, and node process memory.

**Success Response (HTTP 200)**:
```json
{
  "status": "healthy",
  "service": "matabai-api",
  "version": "0.1.0",
  "environment": "development",
  "timestamp": "2026-11-09T10:45:00.000Z",
  "uptimeSeconds": 1420,
  "checks": {
    "database": {
      "status": "up",
      "latencyMs": 4
    },
    "memory": {
      "status": "up",
      "message": "42MB / 64MB"
    }
  }
}
```
