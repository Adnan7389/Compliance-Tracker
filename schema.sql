-- ================================
-- Compliance Tracker Schema
-- ================================



-- Users table (owners + staff in one)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','staff')),
  business_id INT,
  created_at TIMESTAMP DEFAULT now()
);

-- Businesses
CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Add FK after both tables exist
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS fk_business;
ALTER TABLE users
  ADD CONSTRAINT fk_business
  FOREIGN KEY (business_id) REFERENCES businesses(id);

-- Compliance Tasks
CREATE TABLE IF NOT EXISTS compliance_tasks (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  assigned_to INT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('license','tax','safety','other')),
  due_date DATE NOT NULL,
  recurrence TEXT CHECK (recurrence IN ('none','monthly','yearly')) DEFAULT 'none',
  status TEXT CHECK (status IN ('pending','in_progress','completed')) DEFAULT 'pending',
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_business_due ON compliance_tasks (business_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON compliance_tasks (assigned_to);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES compliance_tasks(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now()
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- ===============================
-- Token Blacklist for JWT Logout
-- ===============================
CREATE TABLE IF NOT EXISTS blacklisted_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_expires ON blacklisted_tokens(expires_at);

-- ===============================
-- Triggers for updated_at
-- ===============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_compliance_tasks_updated_at ON compliance_tasks;
CREATE TRIGGER update_compliance_tasks_updated_at
  BEFORE UPDATE ON compliance_tasks
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();