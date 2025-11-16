import { pool } from '../config/db.js';
import emailService from './emailService.js';

export const reminderService = {
  // Send reminders for tasks due in next 7 days
  async sendUpcomingTaskReminders() {
    try {
      console.log('🔔 Starting upcoming task reminders...');
      
      const query = `
        SELECT 
          t.id,
          t.title,
          t.due_date,
          t.assigned_to,
          u.email as staff_email,
          u.name as staff_name,
          b.owner_id,
          o.email as owner_email,
          o.name as owner_name,
          b.id as business_id,
          b.name as business_name
        FROM compliance_tasks t
        JOIN users u ON u.id = t.assigned_to
        JOIN businesses b ON b.id = t.business_id
        JOIN users o ON o.id = b.owner_id
        WHERE t.status = 'pending' 
          AND t.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
      `;

      const { rows: tasks } = await pool.query(query);
      console.log(`📧 Found ${tasks.length} tasks due in next 7 days`);

      if (tasks.length > 0) {
        console.log('🔍 Details of upcoming tasks found:');
        tasks.forEach(task => {
          console.log(`  - Task ID: ${task.id}, Title: "${task.title}", Due: ${task.due_date.toISOString().split('T')[0]}, Status: 'pending'`);
        });
      }

      let sentCount = 0;
      
      for (const task of tasks) {
        console.log(`Attempting to send reminder for Task ID: ${task.id}, To: ${task.staff_email}, BCC: ${task.owner_email}`);
        try {
          const daysUntilDue = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
          
          const subject = `🔔 Upcoming Compliance Task: "${task.title}"`;
          const text = `
Hello ${task.staff_name},

This is a reminder about your upcoming compliance task:

Task: ${task.title}
Due Date: ${task.due_date.toISOString().split('T')[0]}
Due In: ${daysUntilDue} day(s)
Business: ${task.business_name}

Please complete this task before the due date.

Best regards,
Compliance Tracker System
          `.trim();

          // Send to staff and BCC to owner
          await emailService.sendMail({
            to: task.staff_email,
            bcc: task.owner_email,
            subject,
            text,
          });

          sentCount++;
          console.log(`✅ Reminder sent for task: ${task.title}`);
          
        } catch (error) {
          console.error(`❌ Failed to send reminder for task ${task.id}:`, error.message);
        }
      }

      console.log(`🎉 Reminders completed: ${sentCount}/${tasks.length} emails sent`);
      return { total: tasks.length, sent: sentCount };
      
    } catch (error) {
      console.error('❌ Reminder service error:', error);
      throw error;
    }
  },

  // Send overdue task notifications
  async sendOverdueTaskNotifications() {
    try {
      console.log('⚠️ Starting overdue task notifications...');
      
      const query = `
        SELECT 
          t.id,
          t.title,
          t.due_date,
          t.assigned_to,
          u.email as staff_email,
          u.name as staff_name,
          b.owner_id,
          o.email as owner_email,
          o.name as owner_name,
          b.id as business_id,
          b.name as business_name
        FROM compliance_tasks t
        JOIN users u ON u.id = t.assigned_to
        JOIN businesses b ON b.id = t.business_id
        JOIN users o ON o.id = b.owner_id
        WHERE t.status = 'pending' 
          AND t.due_date < CURRENT_DATE
      `;

      const { rows: tasks } = await pool.query(query);
      console.log(`⚠️ Found ${tasks.length} overdue tasks`);

      let sentCount = 0;
      
      for (const task of tasks) {
        try {
          const overdueDays = Math.floor((new Date() - new Date(task.due_date)) / (1000 * 60 * 60 * 24));
          
          const subject = `⚠️ OVERDUE Compliance Task: "${task.title}"`;
          const text = `
URGENT: This compliance task is overdue!

Task: ${task.title}
Due Date: ${task.due_date.toISOString().split('T')[0]}
Overdue By: ${overdueDays} day(s)
Business: ${task.business_name}

Please complete this task immediately to maintain compliance.

Best regards,
Compliance Tracker System
          `.trim();

          // Send to staff and BCC to owner
          await emailService.sendMail({
            to: task.staff_email,
            bcc: task.owner_email,
            subject,
            text,
          });

          sentCount++;
          console.log(`✅ Overdue notification sent for task: ${task.title}`);
          
        } catch (error) {
          console.error(`❌ Failed to send overdue notification for task ${task.id}:`, error.message);
        }
      }

      console.log(`🎉 Overdue notifications completed: ${sentCount}/${tasks.length} emails sent`);
      return { total: tasks.length, sent: sentCount };
      
    } catch (error) {
      console.error('❌ Overdue notification service error:', error);
      throw error;
    }
  },

  // Run all reminder jobs
  async runAllReminders() {
    console.log('🚀 Running all reminder jobs...');
    
    const upcomingResult = await this.sendUpcomingTaskReminders();
    const overdueResult = await this.sendOverdueTaskNotifications();
    
    return {
      upcoming: upcomingResult,
      overdue: overdueResult,
      timestamp: new Date().toISOString(),
    };
  },
};

export default reminderService;