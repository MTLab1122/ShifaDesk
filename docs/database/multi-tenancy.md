# Multi-Tenancy Architecture

## Tenant Hierarchy
1. **Tenant (Organization)**: Represents an independent clinic business entity, polyclinic owner, or hospital system.
2. **Clinic (Branch/Facility)**: An operational physical location belonging to a tenant.
3. **Users**: Doctors, staff, and administrators mapped to specific clinics within a tenant.

## Security Policies
- Row-Level Security (RLS) policies in PostgreSQL automatically filter queries by `tenant_id`.
- Tenant context is extracted from JWT claims on every incoming API request and injected into NestJS execution context.
