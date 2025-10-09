-- Create database (run this separately if needed)
-- CREATE DATABASE email_tracker;

-- Email logs table with all the new fields
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    type VARCHAR(20) DEFAULT 'Communication',
    sender_name VARCHAR(255),
    attachment_count INTEGER DEFAULT 0,
    attachment_names TEXT[],
    attachment_paths TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Index for better query performance
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sender_name ON email_logs(sender_name);

CREATE TABLE IF NOT EXISTS document_logs (
  id SERIAL PRIMARY KEY,
  sender_name VARCHAR NOT NULL,
  doc_type VARCHAR NOT NULL,
  document_subject VARCHAR NOT NULL,
  direction VARCHAR NOT NULL,
  remarks TEXT,
  attachment_count INTEGER DEFAULT 0,
  attachment_names TEXT[],
  attachment_paths TEXT[],
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);