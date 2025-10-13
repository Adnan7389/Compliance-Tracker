import fs from 'fs';
import path from 'path';
import { DocumentModel } from '../models/documentModel.js';

export const documentController = {
  // Upload document to task
  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'No file uploaded'
        });
      }

      const taskId = req.params.id;
      const userId = req.user.id;
      const task = req.task; // from ensureTaskBelongsToBusiness

      // Verify user has permission to upload to this task
      // (owner or assigned staff can upload)
      const isOwner = req.user.role === 'owner';
      const isAssignedStaff = req.user.role === 'staff' && task.assigned_to === userId;

      if (!isOwner && !isAssignedStaff) {
        // Clean up uploaded file if no permission
        fs.unlinkSync(req.file.path);
        return res.status(403).json({
          message: 'No permission to upload to this task'
        });
      }

      // Create document record
      const document = await DocumentModel.createDocument({
        task_id: taskId,
        file_url: req.file.path, // Store relative path
        filename: req.file.originalname,
        uploaded_by: userId,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      });

      res.status(201).json({
        message: 'File uploaded successfully',
        document: {
          id: document.id,
          filename: document.filename,
          file_size: document.file_size,
          mime_type: document.mime_type,
          uploaded_by: document.uploaded_by_name,
          created_at: document.created_at
        }
      });

    } catch (error) {
      console.error('Upload document error:', error);
      
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (error.message.includes('File type')) {
        return res.status(400).json({
          message: error.message
        });
      }

      res.status(500).json({
        message: 'Failed to upload document'
      });
    }
  },

  // Download document
  async downloadDocument(req, res) {
    try {
      const documentId = req.params.id;
      const { canAccess, document } = await DocumentModel.canUserAccessDocument(
        documentId,
        req.user.id,
        req.user.role,
        req.user.businessId
      );

      if (!canAccess || !document) {
        return res.status(404).json({
          message: 'Document not found or access denied'
        });
      }

      // Secure file path resolution
      const filePath = path.resolve(document.file_url);
      
      // Additional security: ensure file is within uploads directory
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).json({
          message: 'Invalid file path'
        });
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          message: 'File not found on server'
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
      res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');

      // Stream file to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Download document error:', error);
      res.status(500).json({
        message: 'Failed to download document'
      });
    }
  },

  // Get task documents
  async getTaskDocuments(req, res) {
    try {
      const taskId = req.params.id;
      const businessId = req.user.businessId;

      const documents = await DocumentModel.getDocumentsByTask(taskId, businessId);

      res.json({
        message: 'Documents retrieved successfully',
        documents: documents.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          uploaded_by: doc.uploaded_by_name,
          created_at: doc.created_at
        }))
      });

    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({
        message: 'Failed to retrieve documents'
      });
    }
  },

  // Delete document
  async deleteDocument(req, res) {
    try {
      const documentId = req.params.id;
      const businessId = req.user.businessId;

      // Only owner or uploader can delete
      const document = await DocumentModel.getDocumentById(documentId);
      
      if (!document || document.business_id !== businessId) {
        return res.status(404).json({
          message: 'Document not found'
        });
      }

      if (req.user.role !== 'owner' && document.uploaded_by !== req.user.id) {
        return res.status(403).json({
          message: 'Only owner or uploader can delete documents'
        });
      }

      // Delete file from filesystem
      if (fs.existsSync(document.file_url)) {
        fs.unlinkSync(document.file_url);
      }

      // Delete record from database
      await DocumentModel.deleteDocument(documentId, businessId);

      res.json({
        message: 'Document deleted successfully'
      });

    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({
        message: 'Failed to delete document'
      });
    }
  }
};