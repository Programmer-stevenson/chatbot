// ============================================
// BALANCED DENTAL TRAINING SYSTEM FOR SAIA
// ============================================
// This keeps the AI flexible while adding dental knowledge

const dentalKnowledgeBase = {
  services: {
    general: [
      "Routine dental checkups and cleanings",
      "Dental X-rays and diagnostics",
      "Fillings and cavity treatment",
      "Root canal therapy",
      "Tooth extractions",
      "Preventive care and education"
    ],
    cosmetic: [
      "Teeth whitening and bleaching",
      "Porcelain veneers",
      "Dental bonding",
      "Smile makeovers",
      "Gum contouring"
    ],
    orthodontics: [
      "Traditional metal braces",
      "Ceramic braces",
      "Invisalign clear aligners",
      "Retainers",
      "Bite correction"
    ],
    surgical: [
      "Dental implants",
      "Wisdom teeth removal",
      "Jaw surgery",
      "Bone grafting",
      "Oral cancer screening"
    ],
    emergency: [
      "Severe toothache",
      "Knocked-out tooth",
      "Broken or chipped tooth",
      "Dental abscess",
      "Lost filling or crown"
    ]
  },

  businessInfo: {
    hours: "Monday-Friday 8am-6pm, Saturdays 9am-2pm",
    phone: "(555) 123-4567", // CHANGE THIS
    address: "123 Dental Street, Your City, ST 12345", // CHANGE THIS
    email: "info@yourdental.com", // CHANGE THIS
    emergencyLine: "(555) 911-DENT" // CHANGE THIS
  }
};

// ============================================
// SMART CONTEXT BUILDER (Not Overriding)
// ============================================
function buildDentalContext(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Only add dental context if the query is dental-related
  const dentalKeywords = [
    'teeth', 'tooth', 'dental', 'dentist', 'appointment', 'cleaning',
    'cavity', 'pain', 'insurance', 'cost', 'price', 'hours', 'location',
    'emergency', 'whitening', 'braces', 'implant', 'root canal',
    'checkup', 'hygienist', 'orthodontist', 'gums', 'mouth'
  ];
  
  const isDentalQuery = dentalKeywords.some(keyword => message.includes(keyword));
  
  if (!isDentalQuery) {
    // NOT dental-related - let Gemini respond naturally
    return {
      isDental: false,
      context: "You are Saia, a helpful AI assistant. Answer naturally and conversationally.",
      enhancedPrompt: userMessage
    };
  }
  
  // IS dental-related - add context
  let context = "You are Saia, an AI assistant for a dental practice. ";
  
  // Add specific context based on query type
  if (message.includes("appointment") || message.includes("schedule") || message.includes("book")) {
    context += `Help them schedule an appointment. Our hours: ${dentalKnowledgeBase.businessInfo.hours}. Phone: ${dentalKnowledgeBase.businessInfo.phone}. `;
  }
  
  if (message.includes("pain") || message.includes("hurt") || message.includes("emergency")) {
    context += `This may be urgent. Emergency line: ${dentalKnowledgeBase.businessInfo.emergencyLine}. Assess severity and advise appropriately. `;
  }
  
  if (message.includes("insurance") || message.includes("coverage") || message.includes("obamacare") || message.includes("medicaid")) {
    context += "We accept most major insurance including Delta Dental, Aetna, Cigna, MetLife, United Healthcare, Blue Cross Blue Shield. We verify benefits and provide cost estimates. For specific plans like Obamacare/ACA or Medicaid, advise them to call us to verify coverage. ";
  }
  
  if (message.includes("cost") || message.includes("price") || message.includes("payment")) {
    context += "Provide general cost ranges if asked. Mention we offer payment plans and financing options. ";
  }
  
  if (message.includes("hours") || message.includes("open") || message.includes("closed")) {
    context += `Our hours: ${dentalKnowledgeBase.businessInfo.hours}. `;
  }
  
  if (message.includes("location") || message.includes("address") || message.includes("where")) {
    context += `Location: ${dentalKnowledgeBase.businessInfo.address}. `;
  }
  
  return {
    isDental: true,
    context: context,
    enhancedPrompt: `${context}\n\nUser question: ${userMessage}\n\nProvide a helpful, conversational response.`
  };
}

// ============================================
// LIGHTWEIGHT KEYWORD RESPONDER
// ============================================
const quickResponses = {
  // Only respond to EXACT matches for basic info
  checkKeyword(message) {
    const lower = message.toLowerCase().trim();
    
    // Exact matches only
    if (lower === "hours" || lower === "what are your hours" || lower === "what are your hours?") {
      return `We're open ${dentalKnowledgeBase.businessInfo.hours}. Would you like to schedule an appointment?`;
    }
    
    if (lower === "location" || lower === "address" || lower === "where are you located" || lower === "where are you located?") {
      return `We're located at ${dentalKnowledgeBase.businessInfo.address}. Need directions?`;
    }
    
    if (lower === "phone" || lower === "phone number" || lower === "how do i call you" || lower === "how do i call you?") {
      return `You can reach us at ${dentalKnowledgeBase.businessInfo.phone}. How can we help you today?`;
    }
    
    // No exact match - let AI handle it
    return null;
  }
};

// ============================================
// APPOINTMENT INFO EXTRACTOR (Optional)
// ============================================
const appointmentSystem = {
  extractInfo(conversation) {
    const info = {
      hasPhone: false,
      hasEmail: false,
      hasName: false,
      phone: null,
      email: null
    };

    // Extract phone
    const phoneMatch = conversation.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
    if (phoneMatch) {
      info.hasPhone = true;
      info.phone = phoneMatch[0];
    }

    // Extract email
    const emailMatch = conversation.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      info.hasEmail = true;
      info.email = emailMatch[0];
    }

    return info;
  }
};

// ============================================
// MAIN INTEGRATION FUNCTION (Balanced)
// ============================================
function enhanceWithDentalTraining(userMessage, sessionId = 'default') {
  // 1. Check for exact keyword matches (very limited)
  const quickResponse = quickResponses.checkKeyword(userMessage);
  if (quickResponse) {
    return {
      quickResponse,
      enhancedPrompt: null,
      isDental: true
    };
  }

  // 2. Build context (only if dental-related)
  const { isDental, context, enhancedPrompt } = buildDentalContext(userMessage);

  // 3. Extract appointment info if mentioned
  const appointmentInfo = appointmentSystem.extractInfo(userMessage);

  return {
    quickResponse: null,
    enhancedPrompt,
    isDental,
    context,
    appointmentInfo
  };
}

// ============================================
// EXPORT
// ============================================
module.exports = {
  dentalKnowledgeBase,
  buildDentalContext,
  appointmentSystem,
  quickResponses,
  enhanceWithDentalTraining
};

// ============================================
// USAGE NOTES
// ============================================
/*
This balanced version:
✅ Adds dental knowledge ONLY when relevant
✅ Lets AI handle general questions naturally
✅ Doesn't force dental responses on non-dental queries
✅ Only gives canned responses for exact basic info requests
✅ Allows Gemini's intelligence to shine through

IMPORTANT: Update businessInfo with YOUR actual:
- Phone number
- Address  
- Hours
- Email
- Emergency line
*/