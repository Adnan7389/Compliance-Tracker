import { pool } from '../config/db.js';

export const DashboardModel = {
  // Get owner dashboard statistics
  async getOwnerDashboard(businessId) {
    const query = `
    WITH combined_tasks AS (
      SELECT id, status, due_date, assigned_to
      FROM compliance_tasks
      WHERE business_id = $1

      UNION ALL

      SELECT th.task_id AS id, 'completed' AS status, th.completed_at AS due_date, t.assigned_to
      FROM task_history th
      JOIN compliance_tasks t ON t.id = th.task_id
      WHERE t.business_id = $1
    )
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_tasks,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tasks,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_tasks,
      COUNT(*) AS total_tasks,
      COUNT(*) FILTER (WHERE status IN ('pending','in_progress') AND due_date < CURRENT_DATE) AS overdue_tasks,
      COUNT(*) FILTER (WHERE due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')) AS due_this_week,
      COUNT(DISTINCT assigned_to) FILTER (WHERE assigned_to IS NOT NULL) AS active_staff_with_tasks,
      ROUND((COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0)), 2) AS completion_rate,
      ROUND(COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT assigned_to) FILTER (WHERE assigned_to IS NOT NULL), 0), 2) AS avg_tasks_per_staff
    FROM combined_tasks
  `;
    const result = await pool.query(query, [businessId]);
    return result.rows[0];
  },

  // Get staff dashboard statistics
    async getStaffDashboard(staffId) {
      const query = `
      WITH combined_tasks AS (
        SELECT id, status, due_date
        FROM compliance_tasks
        WHERE assigned_to = $1
  
        UNION ALL
  
        SELECT th.task_id AS id, 'completed' AS status, th.completed_at AS due_date
        FROM task_history th
        JOIN compliance_tasks t ON t.id = th.task_id
        WHERE t.assigned_to = $1
      )
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_tasks,
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (WHERE status IN ('pending','in_progress') AND due_date < CURRENT_DATE) AS overdue_tasks,
        COUNT(*) FILTER (WHERE due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')) AS due_this_week,
        ROUND((COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0)), 2) AS completion_rate,
        MIN(due_date) FILTER (WHERE status IN ('pending','in_progress')) AS next_due_date
      FROM combined_tasks
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