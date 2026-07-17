-- Nexus Vendor Onboarding Platform - Database Schema
-- Version: 1.0 (SQLite version)

-- -----------------------------------------------------
-- Core System Tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    department_id INTEGER,
    role_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- -----------------------------------------------------
-- Vendor Lifecycle Tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS vendor_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitationId TEXT UNIQUE,
    companyName TEXT NOT NULL,
    contactPerson TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT,
    token TEXT NOT NULL UNIQUE,
    temp_password TEXT,
    invited_by INTEGER NULL,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Opened', 'Completed', 'Expired', 'Cancelled')),
    expires_at DATETIME NOT NULL,
    opened_at DATETIME NULL,
    submitted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invited_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vendor_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id INTEGER UNIQUE,
    application_number TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
    current_approval_stage TEXT DEFAULT 'PROCUREMENT' CHECK(current_approval_stage IN ('PROCUREMENT', 'FINANCE', 'COMPLIANCE', 'MANAGEMENT', 'COMPLETED')),
    submitted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invitation_id) REFERENCES vendor_invitations(id)
);

CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_code TEXT UNIQUE NOT NULL,
    application_id INTEGER NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT,
    industry TEXT,
    gst_number TEXT,
    pan_number TEXT,
    status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive', 'Suspended', 'Blacklisted')),
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES vendor_applications(id)
);

CREATE TABLE IF NOT EXISTS vendor_company_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL UNIQUE,
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    entity_type TEXT NOT NULL,
    date_of_incorporation DATE NOT NULL,
    website TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_business_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL UNIQUE,
    industry_category TEXT NOT NULL,
    primary_products TEXT,
    service_regions TEXT,
    gst_number TEXT NOT NULL,
    pan_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_financial_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL UNIQUE,
    bank_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    currency TEXT DEFAULT 'INR',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    contact_type TEXT NOT NULL CHECK(contact_type IN ('PRIMARY', 'FINANCE', 'TECHNICAL', 'OTHER')),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    job_title TEXT,
    is_primary BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Document Management Tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS document_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN DEFAULT 0,
    requires_expiry_date BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    document_type_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    expiry_date DATE NULL,
    status TEXT DEFAULT 'PENDING_VERIFICATION' CHECK(status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'EXPIRED')),
    verified_by INTEGER NULL,
    verified_at DATETIME NULL,
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (document_type_id) REFERENCES document_types(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- -----------------------------------------------------
-- Workflow and Audit Tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS approval_workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    stage TEXT NOT NULL CHECK(stage IN ('PROCUREMENT', 'FINANCE', 'COMPLIANCE', 'MANAGEMENT')),
    reviewer_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
    comments TEXT,
    action_taken_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    old_values TEXT, -- JSON stored as TEXT in SQLite
    new_values TEXT, -- JSON stored as TEXT in SQLite
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS erp_sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SUCCESS', 'FAILED')),
    odoo_vendor_id TEXT,
    error_message TEXT,
    sync_payload TEXT, -- JSON stored as TEXT
    last_sync_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES vendor_applications(id)
);
