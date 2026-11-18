# Backup, Disaster Recovery & Business Continuity — MatabAI (ShifaDesk)

## 1. Objectives & RPO / RTO Targets

| Metric | Target | Description |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | **1 Hour** | Maximum acceptable data loss window during a catastrophic disaster. |
| **RTO (Recovery Time Objective)** | **15 Minutes** | Maximum acceptable downtime to restore operations and resume serving traffic. |

---

## 2. Automated Backup Strategy

MatabAI provides an automated, cross-platform backup utility: `scripts/db-backup.mjs`.

### 2.1 Backup Capabilities:
- **Engine Support:** Uses native `pg_dump` when available in execution environment.
- **Resilient Fallback:** When running in containerized environments without `pg_dump`, automatically captures a cryptographic schema and metadata snapshot.
- **Cryptographic Integrity:** Computes and verifies SHA-256 hashes of all output archives.
- **Manifest Generation:** Creates structured `.meta.json` companion files with timestamp, target database host, size, and checksum.
- **Retention Management:** Automatically discovers and prunes backup archives older than 30 days (`RETENTION_DAYS = 30`).

### 2.2 Running a Backup:
```bash
node scripts/db-backup.mjs
```

Sample Output:
```
==================================================
   MatabAI Automated Database Backup Tool
==================================================
[1/4] Preparing backup directories...
[2/4] Capturing database backup...
      Executing: pg_dump --format=custom ...
[3/4] Computing cryptographic checksum...
      SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
[4/4] Pruning backups older than 30 days...
[SUCCESS] Database backup completed: backups/db/backup_20261118_044230.dump
```

---

## 3. Disaster Recovery & Non-Destructive Restore Testing

Restores are tested regularly via `scripts/db-restore-test.mjs` to ensure backups are valid, complete, and restorable within the 15-minute RTO window.

### 3.1 Non-Destructive Restore Verification:
```bash
# Validates latest backup archive integrity, checksum, and structure
node scripts/db-restore-test.mjs
```

### 3.2 Full Production Restore Procedure:
In the event of database loss or catastrophic corruption:

1. **Stop Application Ingress:**
   Drain traffic at Cloudflare or container orchestrator to prevent incoming writes.
2. **Provision Target PostgreSQL Instance:**
   Ensure matching PostgreSQL 15+ version with SSL enabled.
3. **Execute Restore:**
   ```bash
   pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" backups/db/backup_YYYYMMDD_HHMMSS.dump
   ```
4. **Verify Database Health:**
   ```bash
   node scripts/db-verify-constraints.mjs
   ```
5. **Resume Application Ingress:**
   Deploy API instances and execute smoke test suite:
   ```bash
   node scripts/production-smoke-test.mjs
   ```

---

## 4. Encrypted Diagnostic Storage Backup

Diagnostic laboratory files and patient attachments are stored encrypted (AES-256-GCM) in the directory configured by `REPORT_STORAGE_PATH`.

- **Backup Strategy:** S3 cross-region replication (CRR) enabled with versioning.
- **Key Recovery:** `STORAGE_REPORT_ENCRYPTION_KEY` must be securely archived in the organization's enterprise password manager (1Password / Bitwarden) and cloud KMS. Without this key, encrypted reports cannot be decrypted.
