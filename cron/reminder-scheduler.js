// Cron job for automated appointment reminders
// This runs daily to send reminders for next-day appointments

const cron = require('node-cron');
const { sendScheduledReminders, sendAppointmentSMS, sendAppointmentEmail } = require('../services/notifications');
const db = require('../database');

/**
 * Initialize cron jobs for automated tasks
 */
function initializeCronJobs() {
    console.log('🕐 Initializing cron jobs...\n');

    // Send reminders every day at 6:00 PM for next day appointments
    cron.schedule('0 18 * * *', async () => {
        console.log('\n⏰ Running daily reminder job at 6:00 PM...');
        try {
            await sendScheduledReminders();
        } catch (error) {
            console.error('Reminder job failed:', error);
        }
    }, {
        timezone: "America/New_York" // Adjust to your timezone
    });

    console.log('✅ Cron job scheduled: Daily reminders at 6:00 PM');

    // Clean up old inactive conversations every Sunday at 2:00 AM
    cron.schedule('0 2 * * 0', async () => {
        console.log('\n🧹 Running weekly cleanup job...');
        try {
            const deleted = await db.cleanupOldData(90);
            console.log(`✅ Cleanup completed: ${deleted} records removed`);
        } catch (error) {
            console.error('Cleanup job failed:', error);
        }
    }, {
        timezone: "America/New_York"
    });

    console.log('✅ Cron job scheduled: Weekly cleanup on Sundays at 2:00 AM');

    // Update analytics every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('\n📊 Running daily analytics update...');
        try {
            await db.updateAnalytics();
            console.log('✅ Analytics updated successfully');
        } catch (error) {
            console.error('Analytics job failed:', error);
        }
    }, {
        timezone: "America/New_York"
    });

    console.log('✅ Cron job scheduled: Daily analytics at midnight\n');

    // Optional: Send morning reminders for same-day appointments
    cron.schedule('0 8 * * *', async () => {
        console.log('\n☀️ Running morning reminder job...');
        try {
            await sendTodayReminders();
        } catch (error) {
            console.error('Morning reminder job failed:', error);
        }
    }, {
        timezone: "America/New_York"
    });

    console.log('✅ Cron job scheduled: Morning reminders at 8:00 AM\n');
}

/**
 * Send reminders for today's appointments
 */
async function sendTodayReminders() {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const appointments = await db.Appointment.find({
            'appointmentDetails.preferredDate': todayStr,
            status: 'confirmed',
            todayReminderSent: { $ne: true }
        });

        console.log(`\n☀️ Sending morning reminders for ${appointments.length} appointments today...\n`);

        for (const apt of appointments) {
            const smsData = {
                to: apt.patientInfo.phone,
                name: apt.patientInfo.name,
                date: 'today',
                time: apt.appointmentDetails.preferredTime,
                confirmationNumber: apt.confirmationNumber,
                type: 'reminder'
            };

            try {
                await sendAppointmentSMS({
                    ...smsData,
                    customMessage: `Saia Dental: Good morning ${apt.patientInfo.name}! Reminder: You have an appointment TODAY at ${apt.appointmentDetails.preferredTime}. See you soon!`
                });

                // Mark today's reminder as sent
                apt.todayReminderSent = true;
                await apt.save();

                console.log(`✅ Morning reminder sent to ${apt.patientInfo.name}`);
            } catch (error) {
                console.error(`❌ Failed to send reminder to ${apt.patientInfo.name}:`, error.message);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n✅ Morning reminder job completed\n');
        return { sent: appointments.length };

    } catch (error) {
        console.error('Error in morning reminder job:', error);
        throw error;
    }
}

/**
 * Manually trigger reminder job (for testing)
 */
async function runReminderJobNow() {
    console.log('🔧 Manually triggering reminder job...\n');
    try {
        await sendScheduledReminders();
        console.log('\n✅ Manual reminder job completed\n');
    } catch (error) {
        console.error('Manual reminder job failed:', error);
    }
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
function stopAllCronJobs() {
    console.log('🛑 Stopping all cron jobs...');
    cron.getTasks().forEach(task => task.stop());
    console.log('✅ All cron jobs stopped');
}

module.exports = {
    initializeCronJobs,
    runReminderJobNow,
    stopAllCronJobs,
    sendTodayReminders
};