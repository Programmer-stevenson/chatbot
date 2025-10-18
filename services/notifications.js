// Email and SMS notification service
// This module will handle sending appointment confirmations and reminders

// For future implementation, you can use:
// - Twilio for SMS
// - SendGrid, Mailgun, or Nodemailer for emails
// - AWS SES for emails

// ============================================
// EMAIL SERVICE
// ============================================

/**
 * Send appointment confirmation email
 * @param {Object} emailData - Email data including recipient, appointment details
 */
async function sendAppointmentEmail(emailData) {
    const { to, name, confirmationNumber, date, time, type, reason, emailType = 'confirmation' } = emailData;

    // For now, this is a placeholder that logs the email
    // TODO: Implement actual email sending with SendGrid, Mailgun, or AWS SES
    
    console.log('\n📧 ===== EMAIL NOTIFICATION =====');
    console.log(`To: ${to}`);
    console.log(`Subject: ${getEmailSubject(emailType)}`);
    console.log('---');
    console.log(generateEmailBody(emailData, emailType));
    console.log('================================\n');

    // Uncomment and configure when ready to send real emails
    /*
    // Example with Nodemailer (install: npm install nodemailer)
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const mailOptions = {
        from: '"Saia Dental" <noreply@saiadental.com>',
        to: to,
        subject: getEmailSubject(emailType),
        html: generateEmailHTML(emailData, emailType),
        text: generateEmailBody(emailData, emailType)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
    */

    return { success: true, to, type: emailType };
}

function getEmailSubject(type) {
    const subjects = {
        'confirmation': '✅ Appointment Confirmed - Saia Dental',
        'reminder': '⏰ Reminder: Your Dental Appointment Tomorrow',
        'status_update': '📋 Appointment Status Update',
        'cancellation': '❌ Appointment Cancelled'
    };
    return subjects[type] || 'Saia Dental Notification';
}

function generateEmailBody(data, type) {
    const { name, confirmationNumber, date, time, reason, status } = data;

    if (type === 'confirmation') {
        return `
Dear ${name},

Thank you for booking your appointment with Saia Dental!

📋 APPOINTMENT DETAILS:
   Confirmation Number: ${confirmationNumber}
   Date: ${date}
   Time: ${time}
   ${reason ? `Reason: ${reason}` : ''}

⚠️ IMPORTANT REMINDERS:
   • Please arrive 10 minutes early
   • Bring your insurance card and ID
   • If you need to cancel or reschedule, please call us at least 24 hours in advance

We look forward to seeing you!

Best regards,
Saia Dental Team

---
This is an automated message. Please do not reply to this email.
        `.trim();
    } else if (type === 'reminder') {
        return `
Dear ${name},

This is a friendly reminder about your upcoming dental appointment:

📋 APPOINTMENT DETAILS:
   Date: ${date}
   Time: ${time}
   Confirmation Number: ${confirmationNumber}

⚠️ PLEASE REMEMBER:
   • Arrive 10 minutes early
   • Bring your insurance card and ID
   • Call us if you need to cancel or reschedule

We look forward to seeing you tomorrow!

Best regards,
Saia Dental Team
        `.trim();
    } else if (type === 'status_update') {
        return `
Dear ${name},

Your appointment status has been updated.

📋 APPOINTMENT DETAILS:
   Confirmation Number: ${confirmationNumber}
   Date: ${date}
   Time: ${time}
   Status: ${status.toUpperCase()}

If you have any questions, please contact us.

Best regards,
Saia Dental Team
        `.trim();
    }

    return 'Appointment notification from Saia Dental';
}

function generateEmailHTML(data, type) {
    // TODO: Create beautiful HTML email templates
    // You can use services like MJML or email template builders
    
    const { name, confirmationNumber, date, time, type: appointmentType, reason } = data;

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; }
        .appointment-box { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦷 Saia Dental</h1>
            <p>Your Appointment is Confirmed</p>
        </div>
        <div class="content">
            <h2>Dear ${name},</h2>
            <p>Thank you for booking your appointment with us!</p>
            
            <div class="appointment-box">
                <h3>📋 Appointment Details</h3>
                <p><strong>Confirmation Number:</strong> ${confirmationNumber}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Time:</strong> ${time}</p>
                ${appointmentType ? `<p><strong>Type:</strong> ${appointmentType}</p>` : ''}
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>

            <h3>⚠️ Important Reminders:</h3>
            <ul>
                <li>Please arrive 10 minutes early</li>
                <li>Bring your insurance card and valid ID</li>
                <li>If you need to cancel or reschedule, please contact us at least 24 hours in advance</li>
            </ul>

            <p>We look forward to seeing you!</p>
        </div>
        <div class="footer">
            <p>Saia Dental Assistant - Developed by Plexura</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

// ============================================
// SMS SERVICE
// ============================================

/**
 * Send appointment confirmation SMS
 * @param {Object} smsData - SMS data including phone number, appointment details
 */
async function sendAppointmentSMS(smsData) {
    const { to, name, date, time, confirmationNumber, type = 'confirmation' } = smsData;

    // For now, this is a placeholder that logs the SMS
    // TODO: Implement actual SMS sending with Twilio
    
    console.log('\n📱 ===== SMS NOTIFICATION =====');
    console.log(`To: ${to}`);
    console.log('---');
    console.log(generateSMSBody(smsData, type));
    console.log('==============================\n');

    // Uncomment and configure when ready to send real SMS
    /*
    // Example with Twilio (install: npm install twilio)
    const twilio = require('twilio');
    const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );

    const message = await client.messages.create({
        body: generateSMSBody(smsData, type),
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
    });

    console.log('SMS sent:', message.sid);
    return message;
    */

    return { success: true, to, type };
}

function generateSMSBody(data, type) {
    const { name, date, time, confirmationNumber, status } = data;

    if (type === 'confirmation') {
        return `Saia Dental: Hi ${name}! Your appointment is confirmed for ${date} at ${time}. Confirmation #${confirmationNumber}. Please arrive 10 min early. Reply CANCEL to cancel.`;
    } else if (type === 'reminder') {
        return `Saia Dental: Reminder! You have an appointment tomorrow (${date}) at ${time}. Confirmation #${confirmationNumber}. See you soon!`;
    } else if (type === 'status_update') {
        return `Saia Dental: Your appointment (${confirmationNumber}) for ${date} at ${time} has been ${status}. Contact us if you have questions.`;
    } else if (type === 'day_before_reminder') {
        return `Saia Dental: Reminder - Your appointment is tomorrow ${date} at ${time}. Reply CONFIRM to confirm or CANCEL to cancel.`;
    }

    return `Saia Dental: Appointment notification. Confirmation #${confirmationNumber}`;
}

// ============================================
// AUTOMATED REMINDER SCHEDULER
// ============================================

/**
 * Schedule automatic reminders for appointments
 * This should be called by a cron job or scheduled task
 */
async function sendScheduledReminders() {
    const db = require('../database');
    
    try {
        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Find all confirmed appointments for tomorrow
        const appointments = await db.Appointment.find({
            'appointmentDetails.preferredDate': tomorrowStr,
            status: 'confirmed',
            reminderSent: { $ne: true }
        });

        console.log(`\n⏰ Sending reminders for ${appointments.length} appointments tomorrow...\n`);

        for (const apt of appointments) {
            const emailData = {
                to: apt.patientInfo.email,
                name: apt.patientInfo.name,
                confirmationNumber: apt.confirmationNumber,
                date: new Date(apt.appointmentDetails.preferredDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }),
                time: apt.appointmentDetails.preferredTime,
                type: apt.appointmentDetails.type
            };

            const smsData = {
                to: apt.patientInfo.phone,
                name: apt.patientInfo.name,
                date: emailData.date,
                time: apt.appointmentDetails.preferredTime,
                confirmationNumber: apt.confirmationNumber
            };

            try {
                await sendAppointmentEmail({ ...emailData, emailType: 'reminder' });
                await sendAppointmentSMS({ ...smsData, type: 'day_before_reminder' });

                // Mark reminder as sent
                apt.reminderSent = true;
                await apt.save();

                console.log(`✅ Reminder sent to ${apt.patientInfo.name}`);
            } catch (error) {
                console.error(`❌ Failed to send reminder to ${apt.patientInfo.name}:`, error.message);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n✅ Reminder job completed\n');
        return { sent: appointments.length };

    } catch (error) {
        console.error('Error in reminder scheduler:', error);
        throw error;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format phone number for display
 */
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
}

module.exports = {
    sendAppointmentEmail,
    sendAppointmentSMS,
    sendScheduledReminders,
    formatPhoneNumber,
    isValidEmail,
    isValidPhone
};