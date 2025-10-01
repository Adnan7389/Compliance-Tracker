import { TaskModel } from '../models/taskModel.js';

export const taskController = {
  // Create task - owner only
  async createTask(req, res) {
    try {
      const { 
        title, 
        description, 
        category, 
        due_date, 
        recurrence, 
        assigned_to 
      } = req.body;

      // Validate staff assignment
      const validStaff = await TaskModel.validateStaffAssignment(
        assigned_to, 
        req.user.businessId
      );

      if (!validStaff) {
        return res.status(400).json({
          message: 'Invalid staff assignment - staff must belong to your business'
        });
      }

      const task = await TaskModel.createTask({
        business_id: req.user.businessId,
        assigned_to,
        title,
        description,
        category,
        due_date,
        recurrence,
        created_by: req.user.id
      });

      res.status(201).json({
        message: 'Task created successfully',
        task
      });

    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({
        message: 'Failed to create task'
      });
    }
  },

  // Get tasks - role-based access
  async getTasks(req, res) {
    try {
      const { status, overdue, assigned_to } = req.query;
      const filters = { status, overdue, assigned_to };

      let tasks;
      
      if (req.user.role === 'owner') {
        tasks = await TaskModel.getTasksForOwner(req.user.businessId, filters);
      } else {
        // Staff can only see their own tasks
        tasks = await TaskModel.getTasksForStaff(req.user.id, filters);
        
        // Staff cannot filter by assigned_to (security)
        if (filters.assigned_to && filters.assigned_to != req.user.id) {
          return res.status(403).json({
            message: 'Staff can only view their own tasks'
          });
        }
      }

      res.json({
        message: 'Tasks retrieved successfully',
        tasks,
        count: tasks.length
      });

    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({
        message: 'Failed to retrieve tasks'
      });
    }
  },

  // Get single task
  async getTask(req, res) {
    try {
      const task = await TaskModel.getTaskById(req.params.id, req.user.businessId);
      
      if (!task) {
        return res.status(404).json({
          message: 'Task not found'
        });
      }

      // Staff can only access their assigned tasks
      if (req.user.role === 'staff' && task.assigned_to !== req.user.id) {
        return res.status(403).json({
          message: 'Access denied - you can only view tasks assigned to you'
        });
      }

      res.json({
        message: 'Task retrieved successfully',
        task
      });

    } catch (error) {
      console.error('Get task error:', error);
      res.status(500).json({
        message: 'Failed to retrieve task'
      });
    }
  },

  // Update task - role-based field validation
  async updateTask(req, res) {
    try {
      const taskId = req.params.id;
      const updates = req.body;

      // Get current task to validate ownership
      const currentTask = await TaskModel.getTaskById(taskId, req.user.businessId);
      
      if (!currentTask) {
        return res.status(404).json({
          message: 'Task not found'
        });
      }

      // Staff can only update their own tasks
      if (req.user.role === 'staff' && currentTask.assigned_to !== req.user.id) {
        return res.status(403).json({
          message: 'Access denied - you can only update tasks assigned to you'
        });
      }

      // Define allowed fields based on role
      let allowedFields;
      if (req.user.role === 'owner') {
        allowedFields = ['title', 'description', 'category', 'due_date', 'recurrence', 'assigned_to', 'status', 'completed_at'];
        
        // Validate new staff assignment if changing
        if (updates.assigned_to && updates.assigned_to !== currentTask.assigned_to) {
          const validStaff = await TaskModel.validateStaffAssignment(
            updates.assigned_to, 
            req.user.businessId
          );
          if (!validStaff) {
            return res.status(400).json({
              message: 'Invalid staff assignment'
            });
          }
        }
      } else {
        // Staff can only update status and completion
        allowedFields = ['status', 'completed_at'];
        
        // Validate status transitions for staff
        if (updates.status && !['in_progress', 'completed'].includes(updates.status)) {
          return res.status(400).json({
            message: 'Staff can only set status to "in_progress" or "completed"'
          });
        }
      }

      const updatedTask = await TaskModel.updateTask(taskId, updates, allowedFields);

      res.json({
        message: 'Task updated successfully',
        task: updatedTask
      });

    } catch (error) {
      console.error('Update task error:', error);
      
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({
          message: 'No valid fields provided for update'
        });
      }

      res.status(500).json({
        message: 'Failed to update task'
      });
    }
  },

  // Delete task - owner only
  async deleteTask(req, res) {
    try {
      const taskId = req.params.id;

      const deletedTask = await TaskModel.deleteTask(taskId, req.user.businessId);
      
      if (!deletedTask) {
        return res.status(404).json({
          message: 'Task not found'
        });
      }

      res.json({
        message: 'Task deleted successfully'
      });

    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({
        message: 'Failed to delete task'
      });
    }
  }
};