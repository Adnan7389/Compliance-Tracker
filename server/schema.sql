-- ================================
-- Compliance Tracker Schema
-- ================================

-- Drop in reverse order (dependencies)
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS compliance_tasks CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (owners + staff in one)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','staff')),
  business_id INT,
  created_at TIMESTAMP DEFAULT now()
);

-- Businesses
CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Add FK after both tables exist
ALTER TABLE users
  ADD CONSTRAINT fk_business
  FOREIGN KEY (business_id) REFERENCES businesses(id);

-- Compliance Tasks
CREATE TABLE compliance_tasks (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id),
  assigned_to INT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('license','tax','safety','other')),
  due_date DATE NOT NULL,
  recurrence TEXT CHECK (recurrence IN ('none','monthly','yearly')) DEFAULT 'none',
  status TEXT CHECK (status IN ('pending','completed')) DEFAULT 'pending',
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP NULL
);

-- Indexes
CREATE INDEX idx_tasks_business_due ON compliance_tasks (business_id, due_date);
CREATE INDEX idx_tasks_assigned ON compliance_tasks (assigned_to);

-- Documents
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES compliance_tasks(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for better performance
CREATE INDEX idx_documents_task_id ON documents(task_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);