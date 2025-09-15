/**
 * ElevenLabs Integration Code Templates
 * 
 * This file contains code templates and examples for maintaining
 * compatibility with ElevenLabs conversation initiation client data webhook.
 * 
 * ⚠️ CRITICAL: Read ELEVENLABS_INTEGRATION_GUIDE.md before making changes
 */

// ============================================================================
// TEMPLATE 1: CORE DYNAMIC VARIABLES STRUCTURE (NEVER CHANGE)
// ============================================================================

/**
 * REQUIRED: Core dynamic variables structure for ElevenLabs
 * This structure must be maintained exactly as shown
 */
const createCoreDynamicVariables = (contactData, isRegistered = false) => {
  return {
    type: "conversation_initiation_client_data", // NEVER CHANGE
    dynamic_variables: {
      memorycaller_status: {
        // REQUIRED FIELDS - DO NOT REMOVE OR RENAME
        isRegistered: isRegistered,
        business: contactData?.business || "",
        cslb: contactData?.cslb || "",
        name: contactData?.name || "",
        phone_e164: contactData?.phone_e164 || "",
        digits: contactData?.phone_e164?.replace(/^\+/, "") || "",
        lastChannel: contactData?.lastChannel || "",
        source: contactData?.source || "",
        notes: contactData?.notes || "",
        tags: Array.isArray(contactData?.tags) ? contactData.tags : [],
        createdAt: contactData?.createdAt || "",
        updatedAt: contactData?.updatedAt || "",
        error: false
      }
    }
  };
};

// ============================================================================
// TEMPLATE 2: ERROR RESPONSE STRUCTURE (REQUIRED)
// ============================================================================

/**
 * REQUIRED: Error response structure for ElevenLabs
 * Use this when any error occurs in the service
 */
const createErrorResponse = (phoneNumber = "") => {
  return {
    type: "conversation_initiation_client_data", // NEVER CHANGE
    dynamic_variables: {
      memorycaller_status: {
        isRegistered: false,
        business: "",
        cslb: "",
        name: "",
        phone_e164: phoneNumber,
        digits: phoneNumber.replace(/^\+/, ""),
        lastChannel: "",
        source: "",
        notes: "",
        tags: [],
        createdAt: "",
        updatedAt: "",
        error: true // MUST be true for errors
      }
    }
  };
};

// ============================================================================
// TEMPLATE 3: ENHANCED DYNAMIC VARIABLES (SAFE ADDITIONS)
// ============================================================================

/**
 * SAFE: Enhanced dynamic variables with additional fields
 * These additions are backward compatible
 */
const createEnhancedDynamicVariables = (contactData, isRegistered = false) => {
  const core = createCoreDynamicVariables(contactData, isRegistered);
  
  // SAFE ADDITIONS: New fields in memorycaller_status
  core.dynamic_variables.memorycaller_status = {
    ...core.dynamic_variables.memorycaller_status,
    
    // NEW FIELDS (examples - add as needed)
    jobTitle: contactData?.jobTitle || "",
    companySize: contactData?.companySize || "",
    industry: contactData?.industry || "",
    preferredLanguage: contactData?.preferredLanguage || "en",
    timeZone: contactData?.timeZone || "",
    lastCallDate: contactData?.lastCallDate || "",
    callCount: contactData?.callCount || 0,
    satisfactionScore: contactData?.satisfactionScore || 0,
    preferredContactTime: contactData?.preferredContactTime || "",
    emergencyContact: contactData?.emergencyContact || "",
    projectHistory: Array.isArray(contactData?.projectHistory) ? contactData.projectHistory : [],
    currentProjects: Array.isArray(contactData?.currentProjects) ? contactData.currentProjects : [],
    painPoints: Array.isArray(contactData?.painPoints) ? contactData.painPoints : [],
    interests: Array.isArray(contactData?.interests) ? contactData.interests : [],
    budget: contactData?.budget || "",
    decisionMaker: contactData?.decisionMaker || false,
    referralSource: contactData?.referralSource || "",
    socialMedia: contactData?.socialMedia || {},
    documents: Array.isArray(contactData?.documents) ? contactData.documents : [],
    customFields: contactData?.customFields || {}
  };
  
  // SAFE ADDITIONS: New top-level dynamic variables
  core.dynamic_variables.system_status = {
    serviceHealth: "healthy",
    maintenanceMode: false,
    peakHours: false,
    queueLength: 0,
    estimatedWaitTime: 0
  };
  
  core.dynamic_variables.business_context = {
    currentPromotions: [],
    seasonalOffers: [],
    newProducts: [],
    companyNews: [],
    industryTrends: []
  };
  
  core.dynamic_variables.agent_instructions = {
    priority: "normal",
    specialInstructions: "",
    escalationRules: [],
    followUpRequired: false,
    preferredAgent: "general"
  };
  
  return core;
};

// ============================================================================
// TEMPLATE 4: CONVERSATION CONFIG OVERRIDE (RECOMMENDED)
// ============================================================================

/**
 * RECOMMENDED: Conversation config override for personalization
 * This enhances the ElevenLabs agent experience
 */
const createConversationConfigOverride = (contactData, isRegistered = false) => {
  const baseConfig = {
    agent: {
      first_message: isRegistered 
        ? `Hi ${contactData?.name || "there"} — welcome back. How can I help you today?`
        : "Hi! I can help you get started. Are you calling about a new project or an existing one?",
      language: "en",
      voice_id: "default",
      speaking_rate: 1.0,
      tone: "professional",
      personality: "helpful",
      expertise_level: "expert"
    },
    conversation: {
      max_duration: 1800, // 30 minutes
      topics: ["construction", "licensing", "business"],
      restrictions: [],
      goals: ["assist_customer", "gather_info", "provide_support"],
      success_metrics: ["customer_satisfaction", "issue_resolution"]
    }
  };
  
  // Enhanced personalization based on contact data
  if (contactData?.business) {
    baseConfig.agent.first_message = `Hi ${contactData.name || "there"} from ${contactData.business} — welcome back. How can I help you today?`;
  }
  
  if (contactData?.notes) {
    baseConfig.agent.specialInstructions = `Note: ${contactData.notes}`;
  }
  
  if (contactData?.tags?.includes("priority")) {
    baseConfig.conversation.goals.push("priority_handling");
  }
  
  return baseConfig;
};

// ============================================================================
// TEMPLATE 5: VALIDATION FUNCTIONS (REQUIRED)
// ============================================================================

/**
 * REQUIRED: Validation functions for ElevenLabs integration
 * These ensure data integrity and compatibility
 */
const ElevenLabsValidators = {
  // Phone number validation
  validatePhoneE164: (phone) => {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  },
  
  // Required field validation
  validateRequiredFields: (data) => {
    const requiredFields = [
      'isRegistered', 'business', 'cslb', 'name', 'phone_e164', 
      'digits', 'lastChannel', 'source', 'notes', 'tags', 
      'createdAt', 'updatedAt', 'error'
    ];
    
    const missing = requiredFields.filter(field => !(field in data));
    return {
      isValid: missing.length === 0,
      missingFields: missing
    };
  },
  
  // Data type validation
  validateDataTypes: (data) => {
    const typeChecks = {
      isRegistered: typeof data.isRegistered === 'boolean',
      error: typeof data.error === 'boolean',
      tags: Array.isArray(data.tags),
      phone_e164: typeof data.phone_e164 === 'string',
      name: typeof data.name === 'string',
      business: typeof data.business === 'string'
    };
    
    const invalid = Object.entries(typeChecks)
      .filter(([field, isValid]) => !isValid)
      .map(([field]) => field);
    
    return {
      isValid: invalid.length === 0,
      invalidFields: invalid
    };
  },
  
  // Timestamp validation
  validateTimestamps: (data) => {
    const timestampFields = ['createdAt', 'updatedAt'];
    const invalid = timestampFields.filter(field => {
      const value = data[field];
      if (!value) return false;
      const date = new Date(value);
      return isNaN(date.getTime());
    });
    
    return {
      isValid: invalid.length === 0,
      invalidTimestamps: invalid
    };
  }
};

// ============================================================================
// TEMPLATE 6: RESPONSE BUILDERS (REQUIRED)
// ============================================================================

/**
 * REQUIRED: Response builders for ElevenLabs integration
 * Use these to ensure consistent response structure
 */
const ElevenLabsResponseBuilders = {
  // Success response with contact data
  buildSuccessResponse: (contactData, isRegistered = false) => {
    const response = createCoreDynamicVariables(contactData, isRegistered);
    
    // Add conversation config override
    response.conversation_config_override = createConversationConfigOverride(contactData, isRegistered);
    
    return response;
  },
  
  // Error response
  buildErrorResponse: (phoneNumber = "", errorMessage = "") => {
    const response = createErrorResponse(phoneNumber);
    
    // Add error details to notes if needed
    if (errorMessage) {
      response.dynamic_variables.memorycaller_status.notes = `Error: ${errorMessage}`;
    }
    
    return response;
  },
  
  // Enhanced response with additional data
  buildEnhancedResponse: (contactData, isRegistered = false, additionalData = {}) => {
    const response = createEnhancedDynamicVariables(contactData, isRegistered);
    
    // Add conversation config override
    response.conversation_config_override = createConversationConfigOverride(contactData, isRegistered);
    
    // Add any additional data
    if (additionalData.systemStatus) {
      response.dynamic_variables.system_status = {
        ...response.dynamic_variables.system_status,
        ...additionalData.systemStatus
      };
    }
    
    return response;
  }
};

// ============================================================================
// TEMPLATE 7: TESTING UTILITIES (REQUIRED)
// ============================================================================

/**
 * REQUIRED: Testing utilities for ElevenLabs integration
 * Use these to validate your implementation
 */
const ElevenLabsTestUtils = {
  // Test data generators
  generateTestContact: (overrides = {}) => ({
    business: "Test Construction LLC",
    cslb: "1234567",
    name: "John Doe",
    phone_e164: "+14155551212",
    lastChannel: "voice",
    source: "sms-intake",
    notes: "Test contact",
    tags: ["test", "priority"],
    createdAt: "2025-01-27T10:30:00.000Z",
    updatedAt: "2025-01-27T10:30:00.000Z",
    ...overrides
  }),
  
  // Response validation
  validateResponse: (response) => {
    const errors = [];
    
    // Check required structure
    if (!response.type || response.type !== "conversation_initiation_client_data") {
      errors.push("Invalid response type");
    }
    
    if (!response.dynamic_variables || !response.dynamic_variables.memorycaller_status) {
      errors.push("Missing dynamic_variables.memorycaller_status");
    }
    
    // Check required fields
    const fieldValidation = ElevenLabsValidators.validateRequiredFields(
      response.dynamic_variables.memorycaller_status
    );
    
    if (!fieldValidation.isValid) {
      errors.push(`Missing required fields: ${fieldValidation.missingFields.join(', ')}`);
    }
    
    // Check data types
    const typeValidation = ElevenLabsValidators.validateDataTypes(
      response.dynamic_variables.memorycaller_status
    );
    
    if (!typeValidation.isValid) {
      errors.push(`Invalid data types: ${typeValidation.invalidFields.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  // Performance testing
  measureResponseTime: async (requestFunction) => {
    const start = Date.now();
    const response = await requestFunction();
    const end = Date.now();
    
    return {
      responseTime: end - start,
      response,
      isWithinLimit: (end - start) < 2000 // 2 second limit
    };
  }
};

// ============================================================================
// TEMPLATE 8: USAGE EXAMPLES
// ============================================================================

/**
 * USAGE EXAMPLES: How to use these templates
 */

// Example 1: Basic response
const basicResponse = ElevenLabsResponseBuilders.buildSuccessResponse(
  ElevenLabsTestUtils.generateTestContact(),
  true
);

// Example 2: Error response
const errorResponse = ElevenLabsResponseBuilders.buildErrorResponse(
  "+14155551212",
  "Contact not found"
);

// Example 3: Enhanced response
const enhancedResponse = ElevenLabsResponseBuilders.buildEnhancedResponse(
  ElevenLabsTestUtils.generateTestContact(),
  true,
  {
    systemStatus: {
      serviceHealth: "healthy",
      peakHours: true
    }
  }
);

// Example 4: Validation
const validation = ElevenLabsTestUtils.validateResponse(basicResponse);
if (!validation.isValid) {
  console.error("Response validation failed:", validation.errors);
}

// ============================================================================
// EXPORTS (if using modules)
// ============================================================================

// Uncomment if using ES modules
// export {
//   createCoreDynamicVariables,
//   createErrorResponse,
//   createEnhancedDynamicVariables,
//   createConversationConfigOverride,
//   ElevenLabsValidators,
//   ElevenLabsResponseBuilders,
//   ElevenLabsTestUtils
// };

// ============================================================================
// INTEGRATION NOTES
// ============================================================================

/**
 * INTEGRATION NOTES:
 * 
 * 1. Always use these templates when modifying ElevenLabs integration
 * 2. Test thoroughly with the provided test utilities
 * 3. Maintain backward compatibility
 * 4. Document any new fields or changes
 * 5. Update the integration guide when making changes
 * 
 * CRITICAL: Any changes to the core structure must be tested
 * with actual ElevenLabs agents before deployment.
 */
