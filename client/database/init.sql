-- Add status tracking columns to email_logs table
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS current_direction VARCHAR(10),
ADD COLUMN IF NOT EXISTS current_status_remarks TEXT,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status_updated_by VARCHAR,
ADD COLUMN IF NOT EXISTS forwarded_to TEXT,
ADD COLUMN IF NOT EXISTS cof TEXT,
ADD COLUMN IF NOT EXISTS current_forwarded_to TEXT,
ADD COLUMN IF NOT EXISTS current_cof TEXT;

-- Add status tracking columns to document_logs table
ALTER TABLE document_logs 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS current_direction VARCHAR(10),
ADD COLUMN IF NOT EXISTS current_status_remarks TEXT,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status_updated_by VARCHAR,
ADD COLUMN IF NOT EXISTS forwarded_to TEXT,
ADD COLUMN IF NOT EXISTS cof TEXT,
ADD COLUMN IF NOT EXISTS current_forwarded_to TEXT,
ADD COLUMN IF NOT EXISTS current_cof TEXT;

-- Create status_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS status_history (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL,
    record_type VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL,
    direction VARCHAR(10),
    remarks TEXT,
    created_by VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    forwarded_to TEXT,
    cof TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_status_history_record ON status_history(record_id, record_type);
CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_tracking ON email_logs(tracking_number);
CREATE INDEX IF NOT EXISTS idx_document_logs_tracking ON document_logs(tracking_number);
CREATE INDEX IF NOT EXISTS idx_email_logs_current_status ON email_logs(current_status);
CREATE INDEX IF NOT EXISTS idx_document_logs_current_status ON document_logs(current_status);