-- =============================================================================
-- Aura SaaS — Database Initialisation Script
-- =============================================================================
-- This script is run ONCE by the GitHub Actions pipeline after RDS is created.
-- It creates tenant schemas, tables, and seed admin users.
--
-- Run via: psql -h <rds-endpoint> -U crm_app_user -d crm_db -f db_init.sql
-- (The pipeline does this through an SSH tunnel to EC2)
-- =============================================================================

-- -------------------------------------------------------------------------
-- TENANT A SCHEMA
-- -------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS tenant_a;

SET search_path TO tenant_a;

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     VARCHAR(255),
    role          VARCHAR(50) DEFAULT 'user',
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255),
    phone      VARCHAR(20),
    company    VARCHAR(255),
    status     VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(20),
    role        VARCHAR(100),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Seed admin user for Tenant A
-- Password: Admin@123 (bcrypt hash — change this in production!)
INSERT INTO users (email, password_hash, full_name, role) VALUES (
    'admin@tenant-a.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Tenant A Admin',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- -------------------------------------------------------------------------
-- TENANT B SCHEMA
-- -------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS tenant_b;

SET search_path TO tenant_b;

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     VARCHAR(255),
    role          VARCHAR(50) DEFAULT 'user',
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255),
    phone      VARCHAR(20),
    company    VARCHAR(255),
    status     VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(20),
    role        VARCHAR(100),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Seed admin user for Tenant B
INSERT INTO users (email, password_hash, full_name, role) VALUES (
    'admin@tenant-b.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Tenant B Admin',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- -------------------------------------------------------------------------
-- Verify setup
-- -------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE 'DB init complete — schemas: tenant_a, tenant_b';
    RAISE NOTICE 'Tables created: users, customers, contacts (in each schema)';
    RAISE NOTICE 'Seed admin users inserted';
END $$;
