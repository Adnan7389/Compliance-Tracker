CREATE TABLE IF NOT EXISTS task_history (
  id SERIAL PRIMARY KEY,
  task_id INT NOT NULL REFERENCES compliance_tasks(id) ON DELETE CASCADE,
  completed_by INT NOT NULL REFERENCES users(id),
  completed_at TIMESTAMP DEFAULT now(),
  previous_due_date DATE,
  next_due_date DATE
);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
