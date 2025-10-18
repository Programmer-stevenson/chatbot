const mongoose = require('mongoose');

// MongoDB Connection with optimized settings
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Connection pool settings for better performance
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
            // Faster failover
            heartbeatFrequencyMS: 2000,
            // Optimize for read/write operations
            retryWrites: true,
            retryReads: true,
            // Compression for better network performance
            compressors: ['zlib'],
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        
        // Connection event handlers for monitoring
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });
        
        return conn;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        // In production, you might want to retry instead of exiting
        if (process.env.NODE_ENV === 'production') {
            console.log('Retrying connection in 5 seconds...');
            setTimeout(connectDB, 5000);
        } else {
            process.exit(1);
        }
    }
};

// Optimized Conversation Schema
const conversationSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: 5000 // Prevent extremely long messages
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        },
        isDental: {
            type: Boolean,
            default: false,
            index: true
        },
        // Add token count for analytics
        tokens: {
            type: Number,
            default: 0
        }
    }],
    userInfo: {
        ip: { 
            type: String, 
            select: false // Don't return IP by default for privacy
        },
        userAgent: String,
        location: String,
        // Add browser/device info
        device: {
            type: String,
            enum: ['mobile', 'tablet', 'desktop', 'unknown'],
            default: 'unknown'
        }
    },
    // Track conversation metadata
    metadata: {
        totalMessages: {
            type: Number,
            default: 0
        },
        lastActivity: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    }
}, {
    timestamps: true,
    minimize: true
});

// Optimized Appointment Schema
const appointmentSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    patientInfo: {
        name: {
            type: String,
            trim: true,
            maxlength: 100
        },
        phone: {
            type: String,
            trim: true,
            // Simple validation
            validate: {
                validator: function(v) {
                    return !v || /^[\d\s\-\+\(\)]+$/.test(v);
                },
                message: 'Invalid phone number format'
            }
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            // Simple email validation
            validate: {
                validator: function(v) {
                    return !v || /^[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}$/.test(v);
                },
                message: 'Invalid email format'
            }
        },
        dateOfBirth: Date,
        isNewPatient: {
            type: Boolean,
            default: true
        }
    },
    appointmentDetails: {
        preferredDate: String,
        preferredTime: String,
        dayOfWeek: String,
        reason: {
            type: String,
            maxlength: 500
        },
        urgency: {
            type: String,
            enum: ['routine', 'urgent', 'emergency'],
            default: 'routine',
            index: true
        },
        // Add appointment type
        type: {
            type: String,
            enum: ['checkup', 'cleaning', 'consultation', 'treatment', 'emergency', 'other'],
            default: 'other'
        }
    },
    confirmationNumber: {
        type: String,
        unique: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
        default: 'pending',
        index: true
    },
    // Track status changes
    statusHistory: [{
        status: String,
        changedAt: {
            type: Date,
            default: Date.now
        },
        changedBy: String,
        note: String
    }],
    notes: {
        type: String,
        maxlength: 1000
    },
    // Add confirmation tracking
    confirmationSent: {
        type: Boolean,
        default: false
    },
    confirmedAt: Date,
    // Add reminder tracking
    reminderSent: {
        type: Boolean,
        default: false
    },
    todayReminderSent: {
        type: Boolean,
        default: false
    },
    // Add priority flag
    priority: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    }
}, {
    timestamps: true,
    minimize: true
});

// Optimized Analytics Schema
const analyticsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        index: true,
        unique: true // Prevent duplicate daily records
    },
    metrics: {
        totalMessages: {
            type: Number,
            default: 0,
            min: 0
        },
        totalSessions: {
            type: Number,
            default: 0,
            min: 0
        },
        appointmentRequests: {
            type: Number,
            default: 0,
            min: 0
        },
        averageResponseTime: {
            type: Number,
            default: 0,
            min: 0
        },
        // Add more metrics
        uniqueUsers: {
            type: Number,
            default: 0,
            min: 0
        },
        dentalQueries: {
            type: Number,
            default: 0,
            min: 0
        },
        peakHour: {
            type: Number,
            min: 0,
            max: 23
        },
        conversionRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },
    topQuestions: [{
        question: {
            type: String,
            maxlength: 200
        },
        count: {
            type: Number,
            min: 0
        },
        category: String
    }],
    // Add hourly distribution
    hourlyDistribution: {
        type: Map,
        of: Number
    }
}, {
    timestamps: true,
    minimize: true
});

// User Feedback Schema with improvements
const feedbackSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    messageId: {
        type: String,
        trim: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
        index: true
    },
    feedback: {
        type: String,
        maxlength: 1000,
        trim: true
    },
    category: {
        type: String,
        enum: ['helpful', 'unhelpful', 'inaccurate', 'incomplete', 'other'],
        index: true
    },
    // Add tags for categorization
    tags: [{
        type: String,
        trim: true
    }],
    // Track if feedback was reviewed
    reviewed: {
        type: Boolean,
        default: false,
        index: true
    },
    reviewedAt: Date,
    reviewedBy: String,
    // Response to feedback
    response: String
}, {
    timestamps: true,
    minimize: true
});

// Compound indexes for complex queries
conversationSchema.index({ sessionId: 1, 'metadata.lastActivity': -1 });
conversationSchema.index({ 'messages.isDental': 1, createdAt: -1 }, { sparse: true });
conversationSchema.index({ 'metadata.isActive': 1, 'metadata.lastActivity': -1 });

appointmentSchema.index({ status: 1, createdAt: -1 });
appointmentSchema.index({ 'appointmentDetails.urgency': 1, createdAt: -1 });
appointmentSchema.index({ status: 1, 'appointmentDetails.urgency': 1 });

analyticsSchema.index({ date: -1 });

feedbackSchema.index({ rating: 1, createdAt: -1 });
feedbackSchema.index({ reviewed: 1, createdAt: -1 });

// Add pre-save hooks for automatic updates
conversationSchema.pre('save', function(next) {
    this.metadata.totalMessages = this.messages.length;
    this.metadata.lastActivity = new Date();
    next();
});

appointmentSchema.pre('save', function(next) {
    // Auto-calculate priority based on urgency
    if (this.appointmentDetails.urgency === 'emergency') {
        this.priority = 5;
    } else if (this.appointmentDetails.urgency === 'urgent') {
        this.priority = 4;
    }
    next();
});

// Add instance methods
conversationSchema.methods.addMessage = function(role, content, isDental = false) {
    this.messages.push({ role, content, isDental, timestamp: new Date() });
    this.metadata.totalMessages = this.messages.length;
    this.metadata.lastActivity = new Date();
    return this.save();
};

appointmentSchema.methods.updateStatus = function(newStatus, changedBy = 'system', note = '') {
    this.statusHistory.push({
        status: this.status,
        changedAt: new Date(),
        changedBy,
        note
    });
    this.status = newStatus;
    if (newStatus === 'confirmed') {
        this.confirmedAt = new Date();
    }
    return this.save();
};

// Add static methods for common queries
conversationSchema.statics.findActiveConversations = function(limit = 100) {
    return this.find({ 'metadata.isActive': true })
        .sort({ 'metadata.lastActivity': -1 })
        .limit(limit)
        .select('-userInfo.ip')
        .lean();
};

appointmentSchema.statics.findPendingAppointments = function() {
    return this.find({ status: 'pending' })
        .sort({ priority: -1, createdAt: 1 })
        .lean();
};

appointmentSchema.statics.findUrgentAppointments = function() {
    return this.find({ 
        'appointmentDetails.urgency': { $in: ['urgent', 'emergency'] },
        status: 'pending'
    })
    .sort({ priority: -1, createdAt: 1 })
    .lean();
};

// Create Models
const Conversation = mongoose.model('Conversation', conversationSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Optimized Helper Functions with error handling and validation
const saveConversation = async (sessionId, userMessage, assistantResponse, userInfo = {}, isDental = false) => {
    try {
        // Validate inputs
        if (!sessionId || !userMessage || !assistantResponse) {
            throw new Error('Missing required parameters for saveConversation');
        }

        // Extract device type from user agent
        const device = userInfo.userAgent ? 
            (/mobile/i.test(userInfo.userAgent) ? 'mobile' :
             /tablet/i.test(userInfo.userAgent) ? 'tablet' : 'desktop') : 'unknown';

        const conversation = await Conversation.findOneAndUpdate(
            { sessionId },
            {
                $push: {
                    messages: {
                        $each: [
                            {
                                role: 'user',
                                content: userMessage.slice(0, 5000), // Enforce max length
                                timestamp: new Date(),
                                isDental
                            },
                            {
                                role: 'assistant',
                                content: assistantResponse.slice(0, 5000),
                                timestamp: new Date(),
                                isDental
                            }
                        ]
                    }
                },
                $set: {
                    'userInfo.ip': userInfo.ip,
                    'userInfo.userAgent': userInfo.userAgent,
                    'userInfo.location': userInfo.location,
                    'userInfo.device': device,
                    'metadata.lastActivity': new Date(),
                    'metadata.isActive': true,
                    updatedAt: new Date()
                },
                $inc: {
                    'metadata.totalMessages': 2
                }
            },
            { 
                upsert: true, 
                new: true,
                // Only return necessary fields
                select: '-userInfo.ip -__v'
            }
        );
        
        return conversation;
    } catch (error) {
        console.error('Error saving conversation:', error);
        // Don't throw - log and continue
        return null;
    }
};

const saveAppointment = async (appointmentData) => {
    try {
        // Validate required fields
        if (!appointmentData.sessionId) {
            throw new Error('Session ID is required for appointments');
        }

        const appointment = new Appointment(appointmentData);
        await appointment.save();
        
        console.log('📅 Appointment saved:', appointment._id);
        return appointment;
    } catch (error) {
        console.error('Error saving appointment:', error);
        // Re-throw for caller to handle
        throw error;
    }
};

const getConversationHistory = async (sessionId, limit = 10) => {
    try {
        if (!sessionId) {
            return [];
        }

        const conversation = await Conversation.findOne({ sessionId })
            .select('messages')
            .lean()
            .maxTimeMS(5000); // Timeout after 5 seconds
        
        if (!conversation || !conversation.messages) {
            return [];
        }
        
        // Return only the most recent messages
        return conversation.messages.slice(-Math.min(limit, 50));
    } catch (error) {
        console.error('Error fetching conversation:', error);
        return [];
    }
};

const updateAnalytics = async (date = new Date()) => {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Use aggregation pipeline for efficiency with single pass
        const [aggregatedStats, appointmentCount] = await Promise.all([
            Conversation.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfDay, $lte: endOfDay }
                    }
                },
                {
                    $facet: {
                        messageStats: [
                            {
                                $project: {
                                    messageCount: { $size: '$messages' },
                                    dentalMessages: {
                                        $size: {
                                            $filter: {
                                                input: '$messages',
                                                as: 'msg',
                                                cond: { $eq: ['$$msg.isDental', true] }
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalMessages: { $sum: '$messageCount' },
                                    dentalQueries: { $sum: '$dentalMessages' },
                                    uniqueSessions: { $sum: 1 }
                                }
                            }
                        ],
                        sessionCount: [
                            { $count: 'total' }
                        ]
                    }
                }
            ]),
            Appointment.countDocuments({
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            })
        ]);

        const stats = aggregatedStats[0]?.messageStats[0] || { 
            totalMessages: 0, 
            dentalQueries: 0,
            uniqueSessions: 0 
        };
        
        const sessionCount = aggregatedStats[0]?.sessionCount[0]?.total || 0;

        // Calculate conversion rate
        const conversionRate = stats.uniqueSessions > 0 
            ? parseFloat((appointmentCount / stats.uniqueSessions * 100).toFixed(2))
            : 0;

        await Analytics.findOneAndUpdate(
            { date: startOfDay },
            {
                $set: {
                    'metrics.totalMessages': stats.totalMessages,
                    'metrics.totalSessions': sessionCount,
                    'metrics.appointmentRequests': appointmentCount,
                    'metrics.uniqueUsers': stats.uniqueSessions,
                    'metrics.dentalQueries': stats.dentalQueries,
                    'metrics.conversionRate': conversionRate
                }
            },
            { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true
            }
        );
        
        return true;
    } catch (error) {
        console.error('Error updating analytics:', error);
        return false;
    }
};

const saveFeedback = async (feedbackData) => {
    try {
        // Validate required fields
        if (!feedbackData.sessionId || !feedbackData.rating) {
            throw new Error('Session ID and rating are required for feedback');
        }

        const feedback = new Feedback(feedbackData);
        await feedback.save();
        
        return feedback;
    } catch (error) {
        console.error('Error saving feedback:', error);
        throw error;
    }
};

// Add cleanup function for old data with batch processing
const cleanupOldData = async (daysToKeep = 90) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        // Delete in batches to avoid memory issues with large datasets
        let totalDeleted = 0;
        let batchDeleted = 0;
        const batchSize = 1000;

        do {
            const result = await Conversation.deleteMany({
                'metadata.lastActivity': { $lt: cutoffDate },
                'metadata.isActive': false
            }).limit(batchSize);
            
            batchDeleted = result.deletedCount;
            totalDeleted += batchDeleted;
            
            // Small delay between batches to avoid overwhelming the database
            if (batchDeleted === batchSize) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } while (batchDeleted === batchSize);

        console.log(`🧹 Cleaned up ${totalDeleted} old conversations`);
        return totalDeleted;
    } catch (error) {
        console.error('Error cleaning up old data:', error);
        return 0;
    }
};

// Graceful shutdown
const closeConnection = async () => {
    try {
        await mongoose.connection.close();
        console.log('📴 MongoDB connection closed');
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
    }
};

module.exports = {
    connectDB,
    closeConnection,
    Conversation,
    Appointment,
    Analytics,
    Feedback,
    saveConversation,
    saveAppointment,
    getConversationHistory,
    updateAnalytics,
    saveFeedback,
    cleanupOldData
};