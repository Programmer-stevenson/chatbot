const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendAppointmentEmail, sendAppointmentSMS } = require('../services/notifications');

// Generate unique confirmation number
function generateConfirmationNumber() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `APT-${timestamp}-${random}`.toUpperCase();
}

// Get available time slots for a specific date
router.get('/available-slots', async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        // Parse the date
        const appointmentDate = new Date(date + 'T00:00:00');
        const startOfDay = new Date(appointmentDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(appointmentDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Find all appointments for this date
        const appointments = await db.Appointment.find({
            'appointmentDetails.preferredDate': date,
            status: { $in: ['pending', 'confirmed'] }
        }).select('appointmentDetails.preferredTime');

        // Extract booked time slots
        const bookedSlots = appointments.map(apt => apt.appointmentDetails.preferredTime);

        res.json({ 
            date,
            bookedSlots,
            availableCount: 16 - bookedSlots.length // Assuming 16 slots per day
        });

    } catch (error) {
        console.error('Error fetching available slots:', error);
        res.status(500).json({ error: 'Failed to fetch available slots' });
    }
});

// Book a new appointment
router.post('/book', async (req, res) => {
    try {
        const { patientInfo, appointmentDetails } = req.body;

        // Validate required fields
        if (!patientInfo || !appointmentDetails) {
            return res.status(400).json({ 
                error: 'Patient information and appointment details are required' 
            });
        }

        if (!patientInfo.name || !patientInfo.phone || !patientInfo.email) {
            return res.status(400).json({ 
                error: 'Name, phone, and email are required' 
            });
        }

        if (!appointmentDetails.type || !appointmentDetails.preferredDate || !appointmentDetails.preferredTime) {
            return res.status(400).json({ 
                error: 'Appointment type, date, and time are required' 
            });
        }

        // Check if slot is still available
        const existingAppointment = await db.Appointment.findOne({
            'appointmentDetails.preferredDate': appointmentDetails.preferredDate,
            'appointmentDetails.preferredTime': appointmentDetails.preferredTime,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingAppointment) {
            return res.status(409).json({ 
                error: 'This time slot is no longer available. Please select another time.' 
            });
        }

        // Generate confirmation number
        const confirmationNumber = generateConfirmationNumber();

        // Calculate day of week
        const appointmentDate = new Date(appointmentDetails.preferredDate + 'T00:00:00');
        const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });

        // Create appointment object
        const appointmentData = {
            sessionId: req.sessionId || `WEB-${Date.now()}`,
            patientInfo: {
                name: patientInfo.name,
                phone: patientInfo.phone,
                email: patientInfo.email,
                dateOfBirth: patientInfo.dateOfBirth,
                isNewPatient: patientInfo.isNewPatient
            },
            appointmentDetails: {
                preferredDate: appointmentDetails.preferredDate,
                preferredTime: appointmentDetails.preferredTime,
                dayOfWeek: dayOfWeek,
                reason: appointmentDetails.reason || 'Not specified',
                urgency: appointmentDetails.urgency || 'routine',
                type: appointmentDetails.type
            },
            confirmationNumber: confirmationNumber,
            status: 'pending',
            notes: `Online booking - ${patientInfo.isNewPatient ? 'New Patient' : 'Existing Patient'}`
        };

        // Save to database
        const appointment = await db.saveAppointment(appointmentData);

        // Send notifications asynchronously (don't wait for them)
        sendAppointmentConfirmations(appointment, patientInfo, appointmentDetails)
            .catch(err => console.error('Notification error:', err));

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            confirmationNumber: confirmationNumber,
            appointmentId: appointment._id,
            appointment: {
                date: appointmentDetails.preferredDate,
                time: appointmentDetails.preferredTime,
                dayOfWeek: dayOfWeek,
                type: appointmentDetails.type
            }
        });

    } catch (error) {
        console.error('Error booking appointment:', error);
        res.status(500).json({ 
            error: 'Failed to book appointment. Please try again.' 
        });
    }
});

// Send confirmation emails and SMS
async function sendAppointmentConfirmations(appointment, patientInfo, appointmentDetails) {
    const appointmentDate = new Date(appointmentDetails.preferredDate + 'T00:00:00');
    const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const emailData = {
        to: patientInfo.email,
        name: patientInfo.name,
        confirmationNumber: appointment.confirmationNumber,
        date: formattedDate,
        time: appointmentDetails.preferredTime,
        type: appointmentDetails.type,
        reason: appointmentDetails.reason
    };

    const smsData = {
        to: patientInfo.phone,
        name: patientInfo.name,
        date: formattedDate,
        time: appointmentDetails.preferredTime,
        confirmationNumber: appointment.confirmationNumber
    };

    try {
        // Send email (will be implemented in notifications service)
        await sendAppointmentEmail(emailData);
        console.log(`📧 Confirmation email sent to ${patientInfo.email}`);
    } catch (error) {
        console.error('Email send failed:', error.message);
    }

    try {
        // Send SMS (will be implemented in notifications service)
        await sendAppointmentSMS(smsData);
        console.log(`📱 SMS sent to ${patientInfo.phone}`);
    } catch (error) {
        console.error('SMS send failed:', error.message);
    }
}

// Get all appointments (admin view)
router.get('/all', async (req, res) => {
    try {
        const { status, date, limit = 100 } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (date) filter['appointmentDetails.preferredDate'] = date;

        const appointments = await db.Appointment.find(filter)
            .sort({ 'appointmentDetails.preferredDate': 1, 'appointmentDetails.preferredTime': 1 })
            .limit(parseInt(limit))
            .lean();

        res.json({ 
            appointments,
            count: appointments.length 
        });

    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// Get appointment by confirmation number
router.get('/confirm/:confirmationNumber', async (req, res) => {
    try {
        const { confirmationNumber } = req.params;

        const appointment = await db.Appointment.findOne({ 
            confirmationNumber: confirmationNumber.toUpperCase() 
        }).lean();

        if (!appointment) {
            return res.status(404).json({ 
                error: 'Appointment not found' 
            });
        }

        res.json({ appointment });

    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({ error: 'Failed to fetch appointment' });
    }
});

// Update appointment status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note, changedBy } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const appointment = await db.Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        // Use the instance method to update status
        await appointment.updateStatus(status, changedBy || 'system', note || '');

        // Send notification if confirmed or cancelled
        if (status === 'confirmed' || status === 'cancelled') {
            sendStatusUpdateNotification(appointment, status)
                .catch(err => console.error('Notification error:', err));
        }

        res.json({ 
            success: true,
            message: `Appointment ${status}`,
            appointment 
        });

    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

// Send status update notification
async function sendStatusUpdateNotification(appointment, newStatus) {
    const emailData = {
        to: appointment.patientInfo.email,
        name: appointment.patientInfo.name,
        status: newStatus,
        confirmationNumber: appointment.confirmationNumber,
        date: new Date(appointment.appointmentDetails.preferredDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        time: appointment.appointmentDetails.preferredTime
    };

    const smsData = {
        to: appointment.patientInfo.phone,
        name: appointment.patientInfo.name,
        status: newStatus,
        date: emailData.date,
        time: appointment.appointmentDetails.preferredTime
    };

    try {
        await sendAppointmentEmail({ ...emailData, type: 'status_update' });
        await sendAppointmentSMS({ ...smsData, type: 'status_update' });
    } catch (error) {
        console.error('Status notification failed:', error);
    }
}

// Cancel appointment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const appointment = await db.Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        await appointment.updateStatus('cancelled', 'patient', reason || 'Cancelled by patient');

        res.json({ 
            success: true,
            message: 'Appointment cancelled successfully' 
        });

    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
});

// Get appointments for a specific week
router.get('/week/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const selectedDate = new Date(date + 'T00:00:00');
        
        // Get start of week (Monday)
        const startOfWeek = new Date(selectedDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        // Get end of week (Sunday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const startDateStr = startOfWeek.toISOString().split('T')[0];
        const endDateStr = endOfWeek.toISOString().split('T')[0];

        const appointments = await db.Appointment.find({
            'appointmentDetails.preferredDate': {
                $gte: startDateStr,
                $lte: endDateStr
            },
            status: { $in: ['pending', 'confirmed'] }
        })
        .sort({ 'appointmentDetails.preferredDate': 1, 'appointmentDetails.preferredTime': 1 })
        .lean();

        // Group by day
        const weekSchedule = {};
        appointments.forEach(apt => {
            const date = apt.appointmentDetails.preferredDate;
            if (!weekSchedule[date]) {
                weekSchedule[date] = [];
            }
            weekSchedule[date].push(apt);
        });

        res.json({ 
            weekStart: startDateStr,
            weekEnd: endDateStr,
            schedule: weekSchedule,
            totalAppointments: appointments.length
        });

    } catch (error) {
        console.error('Error fetching week schedule:', error);
        res.status(500).json({ error: 'Failed to fetch schedule' });
    }
});

// Get statistics
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const [totalPending, totalConfirmed, todayAppointments, urgentAppointments] = await Promise.all([
            db.Appointment.countDocuments({ status: 'pending' }),
            db.Appointment.countDocuments({ status: 'confirmed' }),
            db.Appointment.countDocuments({ 
                'appointmentDetails.preferredDate': todayStr,
                status: { $in: ['pending', 'confirmed'] }
            }),
            db.Appointment.findUrgentAppointments()
        ]);

        res.json({
            pending: totalPending,
            confirmed: totalConfirmed,
            today: todayAppointments,
            urgent: urgentAppointments.length
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;