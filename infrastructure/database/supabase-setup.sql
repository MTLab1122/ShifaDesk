-- ============================================================================
-- MatabAI (ShifaDesk) - Database Baseline SQL Extension Setup
-- ============================================================================
-- Enables standard PostgreSQL extensions needed for UUID generation,
-- cryptographic operations, and full text search.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Set timezone to Asia/Karachi (Default clinic operations timezone)
SET timezone = 'Asia/Karachi';
