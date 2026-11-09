# Healthcare Compliance: HIPAA & GDPR Foundations

## Technical Safeguards
1. **Encryption in Transit**: All communications require TLS 1.3 (or 1.2 minimum). Plain HTTP is rejected.
2. **Encryption at Rest**: PostgreSQL database storage is encrypted using AES-256.
3. **Audit Logging**: `AuditModule` records every read, mutation, and export of electronic health records with timestamp, actor ID, and IP address.
4. **Data Minimization**: API endpoints return only the fields requested by specific user roles.
