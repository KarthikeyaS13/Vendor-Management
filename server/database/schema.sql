-- Nexus Vendor Onboarding Platform - Database Schema
-- Version: 2.0 (PostgreSQL version)

-- -----------------------------------------------------
-- Core System Tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER,
    username TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    department_id INTEGER,
    role TEXT NOT NULL DEFAULT 'VENDOR',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Vendor Lifecycle Tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS vendor_invitations (
    id SERIAL PRIMARY KEY,
    invitationId TEXT UNIQUE,
    companyName TEXT NOT NULL,
    contactPerson TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT,
    token TEXT NOT NULL UNIQUE,
    temp_password TEXT,
    invited_by INTEGER NULL,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Opened', 'Completed', 'Expired', 'Cancelled')),
    expires_at TIMESTAMP NOT NULL,
    opened_at TIMESTAMP NULL,
    submitted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_applications (
    id SERIAL PRIMARY KEY,
    invitation_id INTEGER UNIQUE,
    application_number TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
    current_approval_stage TEXT DEFAULT 'PROCUREMENT' CHECK(current_approval_stage IN ('PROCUREMENT', 'FINANCE', 'COMPLIANCE', 'MANAGEMENT', 'COMPLETED')),
    submitted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
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
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_company_profiles (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL UNIQUE,
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    entity_type TEXT NOT NULL,
    date_of_incorporation DATE NOT NULL,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    contact_person TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_business_profiles (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL UNIQUE,
    industry_category TEXT NOT NULL,
    vendor_type TEXT,
    primary_products TEXT,
    service_regions TEXT,
    gst_number TEXT NOT NULL,
    pan_number TEXT NOT NULL,
    pf_registration TEXT,
    esi_registration TEXT,
    labour_registration TEXT,
    it_filing TEXT,
    gst_filing TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_financial_profiles (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL UNIQUE,
    bank_name TEXT NOT NULL,
    bank_branch TEXT,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT,
    ifsc_code TEXT NOT NULL,
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_contacts (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL,
    contact_type TEXT NOT NULL CHECK(contact_type IN ('PRIMARY', 'FINANCE', 'TECHNICAL', 'OTHER')),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    job_title TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Document Management Tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS document_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    requires_expiry_date BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_documents (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL,
    document_type_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    expiry_date DATE NULL,
    status TEXT DEFAULT 'PENDING_VERIFICATION' CHECK(status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'EXPIRED')),
    verified_by INTEGER NULL,
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Workflow and Audit Tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS approval_workflows (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL,
    stage TEXT NOT NULL CHECK(stage IN ('PROCUREMENT', 'FINANCE', 'COMPLIANCE', 'MANAGEMENT')),
    reviewer_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
    comments TEXT,
    action_taken_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp_sync_logs (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SUCCESS', 'FAILED')),
    odoo_vendor_id TEXT,
    error_message TEXT,
    sync_payload TEXT,
    last_sync_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_users (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'VENDOR',
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number TEXT UNIQUE,
    po_date DATE,
    company_name TEXT,
    company_address TEXT,
    company_gstin TEXT,
    vendor_id INTEGER,
    vendor_name TEXT,
    vendor_address TEXT,
    vendor_gstin TEXT,
    vendor_pan TEXT,
    delivery_same_as_company BOOLEAN DEFAULT TRUE,
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_state TEXT,
    delivery_pincode TEXT,
    delivery_contact_person TEXT,
    delivery_phone TEXT,
    terms_and_conditions TEXT,
    total_amount REAL,
    status TEXT DEFAULT 'Draft' CHECK(status IN ('Draft', 'Submitted', 'Approved', 'Rejected', 'Issued')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    particulars TEXT NOT NULL,
    quantity REAL NOT NULL,
    rate REAL NOT NULL,
    value REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    delivery_challan_reference TEXT,
    purchase_order_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    gst_total REAL NOT NULL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Under Review', 'Approved', 'Rejected', 'Clarification_Requested', 'Ready for Payment', 'Payment Processing', 'Paid', 'Closed')),
    invoice_file TEXT,
    payment_reference TEXT,
    payment_mode TEXT,
    bank_name TEXT,
    payment_date DATE,
    due_date DATE,
    remarks TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL,
    purchase_order_item_id INTEGER NOT NULL,
    ordered_quantity REAL NOT NULL,
    supplied_quantity REAL NOT NULL,
    rate REAL NOT NULL,
    gst_rate REAL NOT NULL,
    hsn_code TEXT NOT NULL,
    tax_amount REAL NOT NULL,
    line_total REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Foreign Key Constraints (Added after tables are created)
-- -----------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor;
ALTER TABLE users ADD CONSTRAINT fk_users_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id);
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_dept;
ALTER TABLE users ADD CONSTRAINT fk_users_dept FOREIGN KEY (department_id) REFERENCES departments(id);
ALTER TABLE vendor_invitations DROP CONSTRAINT IF EXISTS fk_vi_invited_by;
ALTER TABLE vendor_invitations ADD CONSTRAINT fk_vi_invited_by FOREIGN KEY (invited_by) REFERENCES users(id);
ALTER TABLE vendor_applications DROP CONSTRAINT IF EXISTS fk_va_invitation;
ALTER TABLE vendor_applications ADD CONSTRAINT fk_va_invitation FOREIGN KEY (invitation_id) REFERENCES vendor_invitations(id);
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS fk_v_application;
ALTER TABLE vendors ADD CONSTRAINT fk_v_application FOREIGN KEY (application_id) REFERENCES vendor_applications(id);
ALTER TABLE vendor_company_profiles DROP CONSTRAINT IF EXISTS fk_vcp_application;
ALTER TABLE vendor_company_profiles ADD CONSTRAINT fk_vcp_application FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE;
ALTER TABLE vendor_business_profiles DROP CONSTRAINT IF EXISTS fk_vbp_application;
ALTER TABLE vendor_business_profiles ADD CONSTRAINT fk_vbp_application FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE;
ALTER TABLE vendor_financial_profiles DROP CONSTRAINT IF EXISTS fk_vfp_application;
ALTER TABLE vendor_financial_profiles ADD CONSTRAINT fk_vfp_application FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE;
ALTER TABLE vendor_contacts DROP CONSTRAINT IF EXISTS fk_vc_application;
ALTER TABLE vendor_contacts ADD CONSTRAINT fk_vc_application FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE;
ALTER TABLE vendor_documents DROP CONSTRAINT IF EXISTS fk_vd_application;
ALTER TABLE vendor_documents ADD CONSTRAINT fk_vd_application FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE;
ALTER TABLE vendor_documents DROP CONSTRAINT IF EXISTS fk_vd_doc_type;
ALTER TABLE vendor_documents ADD CONSTRAINT fk_vd_doc_type FOREIGN KEY (document_type_id) REFERENCES document_types(id);
ALTER TABLE vendor_documents DROP CONSTRAINT IF EXISTS fk_vd_verified_by;
ALTER TABLE vendor_documents ADD CONSTRAINT fk_vd_verified_by FOREIGN KEY (verified_by) REFERENCES users(id);
ALTER TABLE approval_workflows DROP CONSTRAINT IF EXISTS fk_aw_application;
ALTER TABLE approval_workflows ADD CONSTRAINT fk_aw_application FOREIGN KEY (application_id) REFERENCES vendor_applications(id) ON DELETE CASCADE;
ALTER TABLE approval_workflows DROP CONSTRAINT IF EXISTS fk_aw_reviewer;
ALTER TABLE approval_workflows ADD CONSTRAINT fk_aw_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id);
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fk_al_user;
ALTER TABLE audit_logs ADD CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE erp_sync_logs DROP CONSTRAINT IF EXISTS fk_esl_application;
ALTER TABLE erp_sync_logs ADD CONSTRAINT fk_esl_application FOREIGN KEY (application_id) REFERENCES vendor_applications(id);
ALTER TABLE vendor_users DROP CONSTRAINT IF EXISTS fk_vu_vendor;
ALTER TABLE vendor_users ADD CONSTRAINT fk_vu_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS fk_po_vendor;
ALTER TABLE purchase_orders ADD CONSTRAINT fk_po_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id);
ALTER TABLE purchase_order_items DROP CONSTRAINT IF EXISTS fk_poi_po;
ALTER TABLE purchase_order_items ADD CONSTRAINT fk_poi_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE purchase_invoices DROP CONSTRAINT IF EXISTS fk_pi_po;
ALTER TABLE purchase_invoices ADD CONSTRAINT fk_pi_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE purchase_invoices DROP CONSTRAINT IF EXISTS fk_pi_vendor;
ALTER TABLE purchase_invoices ADD CONSTRAINT fk_pi_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
ALTER TABLE purchase_invoice_items DROP CONSTRAINT IF EXISTS fk_pii_invoice;
ALTER TABLE purchase_invoice_items ADD CONSTRAINT fk_pii_invoice FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE;
ALTER TABLE purchase_invoice_items DROP CONSTRAINT IF EXISTS fk_pii_po_item;
ALTER TABLE purchase_invoice_items ADD CONSTRAINT fk_pii_po_item FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id) ON DELETE CASCADE;

-- -----------------------------------------------------
-- Centralized Documents View
-- -----------------------------------------------------

CREATE OR REPLACE VIEW documents AS
SELECT 
  'VENDOR_DOC_' || vd.id as id,
  'Vendor' as entity_type,
  v.id as entity_id, 
  dt.name as document_type,
  vd.file_name as file_name,
  vd.file_name as original_name,
  vd.file_path as file_path,
  vd.mime_type as mime_type,
  'Vendor' as uploaded_by,
  vd.created_at as uploaded_at
FROM vendor_documents vd
JOIN document_types dt ON vd.document_type_id = dt.id
JOIN vendors v ON vd.application_id = v.application_id

UNION ALL

SELECT 
  'INVOICE_' || pi.id as id,
  'PurchaseOrder' as entity_type,
  pi.purchase_order_id as entity_id,
  'Vendor Invoice' as document_type,
  pi.invoice_number || ' - Invoice' as file_name,
  pi.invoice_number || '.pdf' as original_name,
  pi.invoice_file as file_path,
  'application/pdf' as mime_type,
  'Vendor' as uploaded_by,
  pi.created_at as uploaded_at
FROM purchase_invoices pi
WHERE pi.invoice_file IS NOT NULL;
