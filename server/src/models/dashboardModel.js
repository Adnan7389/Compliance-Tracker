import pool from '../db.js';

export const DashboardModel = {
  // Get owner dashboard statistics
  async getOwnerDashboard(businessId) {
    const query = `
      SELECT
        -- Task counts by status
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_tasks,
        COUNT(*) as total_tasks,
        
        -- Overdue tasks (pending + past due date)
        COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND due_date < CURRENT_DATE) as overdue_tasks,
        
        -- Tasks due this week
        COUNT(*) FILTER (WHERE due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')) as due_this_week,
        
        -- Staff statistics
        COUNT(DISTINCT assigned_to) FILTER (WHERE assigned_to IS NOT NULL) as active_staff_with_tasks,
        
        -- Completion rate
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0)
        ), 2) as completion_rate,
        
        -- Average tasks per staff
        ROUND(
          COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT assigned_to) FILTER (WHERE assigned_to IS NOT NULL), 0)
        , 2) as avg_tasks_per_staff
        
      FROM compliance_tasks
      WHERE business_id = $1
    `;
    
    const result = await pool.query(query, [businessId]);
    return result.rows[0];
  },

  // Get staff dashboard statistics
  async getStaffDashboard(staffId) {
    const query = `
      SELECT
        -- Task counts by status
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_tasks,
        COUNT(*) as total_tasks,
        
        -- Overdue tasks
        COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND due_date < CURRENT_DATE) as overdue_tasks,
        
        -- Tasks due this week
        COUNT(*) FILTER (WHERE due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')) as due_this_week,
        
        -- Completion rate
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0)
        ), 2) as completion_rate,
        
        -- Days until next due task
        MIN(due_date) FILTER (WHERE status IN ('pending', 'in_progress')) as next_due_date
        
      FROM compliance_tasks
      WHERE assigned_to = $1
    `;
    
    const result = await pool.query(query, [staffId]);
    return result.rows[0];
  },

  // Get recent activity (last 7 days)
  async getRecentActivity(businessId, userId, role) {
    let query, params;
    
    if (role === 'owner') {
      query = `
        SELECT 
          'task_created' as type,
          t.title,
          t.created_at as timestamp,
          creator.name as created_by,
          assignee.name as assigned_to_name,
          NULL as old_status,
          NULL as new_status
        FROM compliance_tasks t
        JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
        WHERE t.business_id = $1 AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'task_updated' as type,
          t.title,
          t.updated_at as timestamp,
          updater.name as created_by,
          assignee.name as assigned_to_name,
          NULL as old_status,
          t.status as new_status
        FROM compliance_tasks t
        JOIN users updater ON t.created_by = updater.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
        WHERE t.business_id = $1 AND t.updated_at >= CURRENT_DATE - INTERVAL '7 days' AND t.updated_at != t.created_at
        
        UNION ALL
        
        SELECT 
          'document_uploaded' as type,
          t.title,
          d.created_at as timestamp,
          uploader.name as created_by,
          assignee.name as assigned_to_name,
          NULL as old_status,
          NULL as new_status
        FROM documents d
        JOIN compliance_tasks t ON d.task_id = t.id
        JOIN users uploader ON d.uploaded_by = uploader.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
        WHERE t.business_id = $1 AND d.created_at >= CURRENT_DATE - INTERVAL '7 days'
        
        ORDER BY timestamp DESC
        LIMIT 20
      `;
      params = [businessId];
    } else {
      // Staff sees only their activity
      query = `
        SELECT 
          'task_created' as type,
          t.title,
          t.created_at as timestamp,
          creator.name as created_by,
          assignee.name as assigned_to_name,
          NULL as old_status,
          NULL as new_status
        FROM compliance_tasks t
        JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
        WHERE t.assigned_to = $1 AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'task_updated' as type,
          t.title,
          t.updated_at as timestamp,
          updater.name as created_by,
          assignee.name as assigned_to_name,
          NULL as old_status,
          t.status as new_status
        FROM compliance_tasks t
        JOIN users updater ON t.created_by = updater.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
        WHERE t.assigned_to = $1 AND t.updated_at >= CURRENT_DATE - INTERVAL '7 days' AND t.updated_at != t.created_at
        
        UNION ALL
        
        SELECT 
          'document_uploaded' as type,
          t.title,
          d.created_at as timestamp,
          uploader.name as created_by,
          assignee.name as assigned_to_name,
          NULL as old_status,
          NULL as new_status
        FROM documents d
        JOIN compliance_tasks t ON d.task_id = t.id
        JOIN users uploader ON d.uploaded_by = uploader.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
        WHERE t.assigned_to = $1 AND d.created_at >= CURRENT_DATE - INTERVAL '7 days'
        
        ORDER BY timestamp DESC
        LIMIT 20
      `;
      params = [userId];
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  },

  // Get task distribution by category
  async getTaskDistribution(businessId, userId, role) {
    let query, params;
    
    if (role === 'owner') {
      query = `
        SELECT 
          category,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND due_date < CURRENT_DATE) as overdue
        FROM compliance_tasks
        WHERE business_id = $1
        GROUP BY category
        ORDER BY count DESC
      `;
      params = [businessId];
    } else {
      query = `
        SELECT 
          category,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND due_date < CURRENT_DATE) as overdue
        FROM compliance_tasks
        WHERE assigned_to = $1
        GROUP BY category
        ORDER BY count DESC
      `;
      params = [userId];
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  },

  // Get upcoming deadlines (next 7 days)
  async getUpcomingDeadlines(businessId, userId, role) {
    let query, params;
    
    if (role === 'owner') {
      query = `
        SELECT 
          t.id,
          t.title,
          t.due_date,
          t.status,
          u.name as assigned_to_name,
          u.email as assigned_to_email
        FROM compliance_tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.business_id = $1 
          AND t.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
          AND t.status IN ('pending', 'in_progress')
        ORDER BY t.due_date ASC
        LIMIT 10
      `;
      params = [businessId];
    } else {
      query = `
        SELECT 
          t.id,
          t.title,
          t.due_date,
          t.status
        FROM compliance_tasks t
        WHERE t.assigned_to = $1 
          AND t.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
          AND t.status IN ('pending', 'in_progress')
        ORDER BY t.due_date ASC
        LIMIT 10
      `;
      params = [userId];
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  }
};