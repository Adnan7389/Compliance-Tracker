import { DashboardModel } from '../models/dashboardModel.js';

export const dashboardController = {
  // Get main dashboard data
  async getDashboard(req, res) {
    try {
      const { businessId, id: userId, role } = req.user;

      let stats, recentActivity, taskDistribution, upcomingDeadlines;

      if (role === 'owner') {
        // Owner dashboard
        stats = await DashboardModel.getOwnerDashboard(businessId);
        recentActivity = await DashboardModel.getRecentActivity(businessId, userId, role);
        taskDistribution = await DashboardModel.getTaskDistribution(businessId, userId, role);
        upcomingDeadlines = await DashboardModel.getUpcomingDeadlines(businessId, userId, role);
      } else {
        // Staff dashboard
        stats = await DashboardModel.getStaffDashboard(userId);
        recentActivity = await DashboardModel.getRecentActivity(businessId, userId, role);
        taskDistribution = await DashboardModel.getTaskDistribution(businessId, userId, role);
        upcomingDeadlines = await DashboardModel.getUpcomingDeadlines(businessId, userId, role);
        
        // Calculate days until next due task for staff
        if (stats.next_due_date) {
          const nextDue = new Date(stats.next_due_date);
          const today = new Date();
          const daysUntilDue = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
          stats.days_until_next_due = daysUntilDue;
        }
      }

      // Format response
      const response = {
        message: 'Dashboard data retrieved successfully',
        data: {
          stats: {
            // Basic counts
            total_tasks: parseInt(stats.total_tasks) || 0,
            pending_tasks: parseInt(stats.pending_tasks) || 0,
            in_progress_tasks: parseInt(stats.in_progress_tasks) || 0,
            completed_tasks: parseInt(stats.completed_tasks) || 0,
            cancelled_tasks: parseInt(stats.cancelled_tasks) || 0,
            overdue_tasks: parseInt(stats.overdue_tasks) || 0,
            due_this_week: parseInt(stats.due_this_week) || 0,
            
            // Calculated metrics
            completion_rate: parseFloat(stats.completion_rate) || 0,
            
            // Owner-specific metrics
            ...(role === 'owner' && {
              active_staff_with_tasks: parseInt(stats.active_staff_with_tasks) || 0,
              avg_tasks_per_staff: parseFloat(stats.avg_tasks_per_staff) || 0
            }),
            
            // Staff-specific metrics
            ...(role === 'staff' && {
              days_until_next_due: stats.days_until_next_due || null
            })
          },
          recent_activity: recentActivity,
          task_distribution: taskDistribution,
          upcoming_deadlines: upcomingDeadlines
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        message: 'Failed to retrieve dashboard data'
      });
    }
  },

  // Get only statistics (lightweight endpoint)
  async getStats(req, res) {
    try {
      const { businessId, id: userId, role } = req.user;

      let stats;

      if (role === 'owner') {
        stats = await DashboardModel.getOwnerDashboard(businessId);
      } else {
        stats = await DashboardModel.getStaffDashboard(userId);
      }

      // Format minimal stats response
      const response = {
        message: 'Statistics retrieved successfully',
        stats: {
          total_tasks: parseInt(stats.total_tasks) || 0,
          pending_tasks: parseInt(stats.pending_tasks) || 0,
          in_progress_tasks: parseInt(stats.in_progress_tasks) || 0,
          completed_tasks: parseInt(stats.completed_tasks) || 0,
          overdue_tasks: parseInt(stats.overdue_tasks) || 0,
          completion_rate: parseFloat(stats.completion_rate) || 0
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        message: 'Failed to retrieve statistics'
      });
    }
  }
};