// ============================================
// SAIA DENTAL TRAINING SYSTEM - PRODUCTION
// ============================================

const dentalKnowledgeBase = {
    services: {
        general: [
            'Routine dental checkups and cleanings',
            'Dental X-rays and diagnostics',
            'Fillings and cavity treatment',
            'Root canal therapy',
            'Tooth extractions',
            'Preventive care and education'
        ],
        cosmetic: [
            'Teeth whitening and bleaching',
            'Porcelain veneers',
            'Dental bonding',
            'Smile makeovers',
            'Gum contouring'
        ],
        orthodontics: [
            'Traditional metal braces',
            'Ceramic braces',
            'Invisalign clear aligners',
            'Retainers',
            'Bite correction'
        ],
        surgical: [
            'Dental implants',
            'Wisdom teeth removal',
            'Jaw surgery',
            'Bone grafting',
            'Oral cancer screening'
        ],
        emergency: [
            'Severe toothache',
            'Knocked-out tooth',
            'Broken or chipped tooth',
            'Dental abscess',
            'Lost filling or crown'
        ]
    },

    businessInfo: {
        name: 'Your Dental Practice',
        hours: 'Monday-Friday 8am-6pm, Saturdays 9am-2pm',
        phone: '(555) 123-4567',
        address: '123 Dental Street, Your City, ST 12345',
        email: 'info@yourdental.com',
        emergencyLine: '(555) 911-DENT',
        website: 'www.yourdental.com'
    },

    insurance: {
        accepted: [
            'Delta Dental',
            'Aetna',
            'Cigna',
            'MetLife',
            'United Healthcare',
            'Blue Cross Blue Shield',
            'Humana',
            'Guardian'
        ],
        government: ['Medicaid', 'Medicare (limited)', 'CHIP'],
        marketplace: ['ACA/Obamacare plans']
    }
};

// ============================================
// KEYWORD DETECTION (Optimized with caching)
// ============================================
const keywordSets = {
    dental: new Set([
        'teeth', 'tooth', 'dental', 'dentist', 'appointment', 'cleaning',
        'cavity', 'pain', 'insurance', 'cost', 'price', 'hours', 'location',
        'emergency', 'whitening', 'braces', 'implant', 'root canal',
        'checkup', 'hygienist', 'orthodontist', 'gums', 'mouth', 'filling',
        'extraction', 'crown', 'bridge', 'denture', 'veneer', 'ache',
        'sensitivity', 'bleeding', 'swollen', 'abscess', 'x-ray', 'fluoride'
    ]),
    
    appointment: new Set([
        'appointment', 'schedule', 'book', 'reserve', 'available', 'slot',
        'visit', 'come in', 'see you', 'meet', 'consultation', 'booking'
    ]),
    
    // Strong appointment intent keywords
    appointmentIntent: new Set([
        'book appointment', 'schedule appointment', 'make appointment',
        'need appointment', 'want appointment', 'get appointment',
        'book a visit', 'schedule visit', 'come in', 'see dentist',
        'when can i come', 'availability', 'available times'
    ]),
    
    emergency: new Set([
        'emergency', 'urgent', 'pain', 'hurt', 'broke', 'knocked', 'bleeding',
        'swollen', 'abscess', 'infection', 'severe', 'can\'t eat', 'unbearable'
    ]),
    
    // Symptoms that suggest needing an appointment
    symptoms: new Set([
        'toothache', 'tooth pain', 'cavity', 'broken tooth', 'chipped tooth',
        'loose tooth', 'bleeding gums', 'swollen gums', 'bad breath',
        'sensitivity', 'jaw pain', 'lost filling', 'lost crown'
    ]),
    
    insurance: new Set([
        'insurance', 'coverage', 'plan', 'medicaid', 'medicare', 'obamacare',
        'aca', 'dental plan', 'benefits', 'covered', 'accept'
    ]),
    
    cost: new Set([
        'cost', 'price', 'payment', 'pay', 'affordable', 'expensive',
        'fee', 'charge', 'financing', 'installment', 'budget'
    ])
};

/**
 * Check if message contains any keywords from a set
 * @param {string} message - User message
 * @param {Set} keywords - Set of keywords to check
 * @returns {boolean}
 */
function containsKeywords(message, keywords) {
    const lowerMessage = message.toLowerCase();
    for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
            return true;
        }
    }
    return false;
}

/**
 * Detect if user wants to book an appointment
 * @param {string} message - User message
 * @returns {Object} Intent detection result
 */
function detectAppointmentIntent(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Direct appointment request
    if (containsKeywords(lowerMessage, keywordSets.appointmentIntent)) {
        return {
            shouldOfferBooking: true,
            confidence: 'high',
            reason: 'direct_request'
        };
    }
    
    // Symptoms mentioned - suggest appointment
    if (containsKeywords(lowerMessage, keywordSets.symptoms)) {
        return {
            shouldOfferBooking: true,
            confidence: 'medium',
            reason: 'symptoms'
        };
    }
    
    // Emergency - suggest immediate appointment
    if (containsKeywords(lowerMessage, keywordSets.emergency)) {
        return {
            shouldOfferBooking: true,
            confidence: 'high',
            reason: 'emergency',
            isUrgent: true
        };
    }
    
    // General appointment mention
    if (containsKeywords(lowerMessage, keywordSets.appointment)) {
        return {
            shouldOfferBooking: true,
            confidence: 'medium',
            reason: 'general_inquiry'
        };
    }
    
    return {
        shouldOfferBooking: false,
        confidence: 'low',
        reason: 'no_intent'
    };
}

// ============================================
// SMART CONTEXT BUILDER
// ============================================
/**
 * Build contextual prompt based on query type
 * @param {string} userMessage - User's message
 * @returns {Object} Context information
 */
function buildDentalContext(userMessage) {
    const isDental = containsKeywords(userMessage, keywordSets.dental);
    const appointmentIntent = detectAppointmentIntent(userMessage);
    
    if (!isDental) {
        return {
            isDental: false,
            context: 'You are Saia, a helpful AI assistant. Answer naturally and conversationally.',
            enhancedPrompt: userMessage,
            appointmentIntent
        };
    }
    
    // Build dental-specific context
    let context = `You are Saia, an AI assistant for ${dentalKnowledgeBase.businessInfo.name}. `;
    
    // Appointment-related with booking suggestion
    if (appointmentIntent.shouldOfferBooking) {
        if (appointmentIntent.reason === 'direct_request') {
            context += `The user wants to book an appointment. After answering, ALWAYS end your response with: "\n\n📅 **Ready to book?** [Click here to schedule your appointment](/appointments-form.html)" `;
        } else if (appointmentIntent.reason === 'symptoms') {
            context += `The user mentioned symptoms. After providing advice, ALWAYS suggest: "\n\n💡 I'd recommend scheduling an appointment so our dentist can examine this properly. [Book an appointment here](/appointments-form.html)" `;
        } else if (appointmentIntent.reason === 'emergency' && appointmentIntent.isUrgent) {
            context += `This is URGENT. After advice, say: "\n\n🚨 **This sounds urgent!** Please call our emergency line at ${dentalKnowledgeBase.businessInfo.emergencyLine} immediately, or [book an emergency appointment here](/appointments-form.html)" `;
        } else {
            context += `After answering, offer to book: "\n\n📅 Would you like to schedule an appointment? [Click here to book](/appointments-form.html)" `;
        }
    }
    
    // Emergency-related
    if (containsKeywords(userMessage, keywordSets.emergency)) {
        context += `Emergency line: ${dentalKnowledgeBase.businessInfo.emergencyLine}. Assess severity: life-threatening (ER), urgent (same-day), or can wait. Be calm and reassuring. `;
    }
    
    // Insurance-related
    if (containsKeywords(userMessage, keywordSets.insurance)) {
        const insuranceList = dentalKnowledgeBase.insurance.accepted.join(', ');
        context += `We accept: ${insuranceList}. For government plans (Medicaid/Medicare) or ACA marketplace plans, advise calling ${dentalKnowledgeBase.businessInfo.phone} to verify specific coverage. `;
    }
    
    // Cost-related
    if (containsKeywords(userMessage, keywordSets.cost)) {
        context += `Provide general cost ranges. Mention payment plans and financing options available. Emphasize that exact costs depend on individual needs and insurance. `;
    }
    
    // Location/hours (exact matches)
    const lowerMsg = userMessage.toLowerCase().trim();
    if (lowerMsg.includes('hours') || lowerMsg.includes('open')) {
        context += `Hours: ${dentalKnowledgeBase.businessInfo.hours}. `;
    }
    if (lowerMsg.includes('location') || lowerMsg.includes('address') || lowerMsg.includes('where')) {
        context += `Address: ${dentalKnowledgeBase.businessInfo.address}. `;
    }
    
    return {
        isDental: true,
        context,
        enhancedPrompt: `${context}\n\nUser: ${userMessage}\n\nProvide a helpful, professional, and conversational response. Be warm and empathetic.`,
        appointmentIntent
    };
}

// ============================================
// QUICK RESPONSES (Exact matches only)
// ============================================
const quickResponses = {
    /**
     * Check for exact keyword matches
     * @param {string} message - User message
     * @returns {string|null} Quick response or null
     */
    checkKeyword(message) {
        const normalized = message.toLowerCase().trim().replace(/[?!.,]/g, '');
        
        // Direct booking requests
        if (normalized.includes('book appointment') || normalized.includes('schedule appointment')) {
            return `I'd be happy to help you book an appointment! 📅\n\n[Click here to schedule your appointment](/appointments-form.html)\n\nOr you can call us at ${dentalKnowledgeBase.businessInfo.phone} and we'll be glad to help!`;
        }
        
        // Hours
        if (normalized === 'hours' || normalized === 'what are your hours' || normalized === 'when are you open') {
            return `We're open ${dentalKnowledgeBase.businessInfo.hours}. Would you like to [schedule an appointment](/appointments-form.html)?`;
        }
        
        // Location
        if (normalized === 'location' || normalized === 'address' || normalized === 'where are you located' || normalized === 'where are you') {
            return `We're located at ${dentalKnowledgeBase.businessInfo.address}. Need directions or want to [schedule a visit](/appointments-form.html)?`;
        }
        
        // Phone
        if (normalized === 'phone' || normalized === 'phone number' || normalized === 'how do i call you' || normalized === 'contact') {
            return `You can reach us at ${dentalKnowledgeBase.businessInfo.phone}. How can we help you today?`;
        }
        
        // Email
        if (normalized === 'email' || normalized === 'email address') {
            return `Our email is ${dentalKnowledgeBase.businessInfo.email}. What would you like to know?`;
        }
        
        return null;
    }
};

// ============================================
// APPOINTMENT INFO EXTRACTOR
// ============================================
const appointmentSystem = {
    /**
     * Extract contact information from conversation
     * @param {string} conversation - User message
     * @returns {Object} Extracted information
     */
    extractInfo(conversation) {
        const info = {
            hasPhone: false,
            hasEmail: false,
            phone: null,
            email: null,
            preferredTime: null,
            isUrgent: false
        };

        // Check urgency
        info.isUrgent = containsKeywords(conversation, keywordSets.emergency);

        // Extract phone (various formats)
        const phonePatterns = [
            /\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/,
            /\b(\(\d{3}\)\s*\d{3}[-.]?\d{4})\b/,
            /\b(\d{10})\b/
        ];
        
        for (const pattern of phonePatterns) {
            const match = conversation.match(pattern);
            if (match) {
                info.hasPhone = true;
                info.phone = match[1];
                break;
            }
        }

        // Extract email
        const emailMatch = conversation.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/);
        if (emailMatch) {
            info.hasEmail = true;
            info.email = emailMatch[1];
        }

        // Extract time preferences
        const timeKeywords = ['morning', 'afternoon', 'evening', 'am', 'pm', 'noon'];
        const lowerConv = conversation.toLowerCase();
        for (const keyword of timeKeywords) {
            if (lowerConv.includes(keyword)) {
                info.preferredTime = keyword;
                break;
            }
        }

        return info;
    }
};

// ============================================
// MAIN INTEGRATION FUNCTION
// ============================================
/**
 * Enhance user message with dental training
 * @param {string} userMessage - User's message
 * @param {string} sessionId - Optional session ID for tracking
 * @returns {Object} Enhanced prompt and metadata
 */
function enhanceWithDentalTraining(userMessage, sessionId = 'default') {
    // Input validation
    if (!userMessage || typeof userMessage !== 'string') {
        return {
            quickResponse: null,
            enhancedPrompt: 'Hello! How can I assist you today?',
            isDental: false,
            context: '',
            appointmentInfo: null,
            appointmentIntent: { shouldOfferBooking: false }
        };
    }

    // Check for quick response (exact matches)
    const quickResponse = quickResponses.checkKeyword(userMessage);
    if (quickResponse) {
        return {
            quickResponse,
            enhancedPrompt: null,
            isDental: true,
            context: '',
            appointmentInfo: null,
            appointmentIntent: { shouldOfferBooking: true, reason: 'quick_response' }
        };
    }

    // Build contextual prompt
    const { isDental, context, enhancedPrompt, appointmentIntent } = buildDentalContext(userMessage);

    // Extract appointment information if relevant
    const appointmentInfo = (containsKeywords(userMessage, keywordSets.appointment) || appointmentIntent.shouldOfferBooking)
        ? appointmentSystem.extractInfo(userMessage)
        : null;

    return {
        quickResponse: null,
        enhancedPrompt,
        isDental,
        context,
        appointmentInfo,
        appointmentIntent
    };
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
    dentalKnowledgeBase,
    buildDentalContext,
    appointmentSystem,
    quickResponses,
    enhanceWithDentalTraining,
    detectAppointmentIntent,
    // Export for testing
    containsKeywords,
    keywordSets
};