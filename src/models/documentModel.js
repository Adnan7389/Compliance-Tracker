import {pool} from '../config/db.js';

export const DocumentModel = {
  // Create document record
  async createDocument(documentData) {
    const { task_id, file_url, filename, uploaded_by, file_size, mime_type } = documentData;
    
    const query = `
      INSERT INTO documents (task_id, file_url, filename, uploaded_by, file_size, mime_type) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      task_id,
      file_url,
      filename,
      uploaded_by,
      file_size,
      mime_type
    ]);
    
    return result.rows[0];
  },

  // Get document with security context
  async getDocumentById(documentId) {
    const query = `
      SELECT 
        d.*,
        t.business_id,
        t.assigned_to,
        u.name as uploaded_by_name
      FROM documents d
      JOIN compliance_tasks t ON d.task_id = t.id
      JOIN users u ON d.uploaded_by = u.id
      WHERE d.id = $1
    `;
    
    const result = await pool.query(query, [documentId]);
    return result.rows[0];
  },

  // Get documents for a task
  async getDocumentsByTask(taskId, businessId) {
    const query = `
      SELECT 
        d.*,
        u.name as uploaded_by_name
      FROM documents d
      JOIN compliance_tasks t ON d.task_id = t.id
      JOIN users u ON d.uploaded_by = u.id
      WHERE d.task_id = $1 AND t.business_id = $2
      ORDER BY d.created_at DESC
    `;
    
    const result = await pool.query(query, [taskId, businessId]);
    return result.rows;
  },

  // Delete document
  async deleteDocument(documentId, businessId) {
    const query = `
      DELETE FROM documents d
      USING compliance_tasks t
      WHERE d.id = $1 AND d.task_id = t.id AND t.business_id = $2
      RETURNING d.*
    `;
    
    const result = await pool.query(query, [documentId, businessId]);
    return result.rows[0];
  },

  // Check if user can access document
  async canUserAccessDocument(documentId, userId, userRole, businessId) {
    const document = await this.getDocumentById(documentId);
    
    if (!document) {
      return { canAccess: false, document: null };
    }

    let canAccess = false;
    
    if (userRole === 'owner' && document.business_id === businessId) {
      canAccess = true;
    } else if (userRole === 'staff' && document.assigned_to === userId) {
      canAccess = true;
    } else if (document.uploaded_by === userId) {
      canAccess = true; // Uploader can always access
    }

    return { canAccess, document };
  }
};