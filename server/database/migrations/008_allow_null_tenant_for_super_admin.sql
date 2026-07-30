-- Migration 008: Allow NULL tenant_id in users table for SUPER_ADMIN
-- This ensures that global users like SUPER_ADMIN are not forced to belong to a specific tenant.
ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;
