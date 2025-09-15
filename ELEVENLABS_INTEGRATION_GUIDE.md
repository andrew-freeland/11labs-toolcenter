# 🎯 ElevenLabs Integration Guide for Cursor Agents

## **🚨 CRITICAL: READ THIS BEFORE MAKING ANY CHANGES**

This document is **MANDATORY** for all Cursor agents working on this codebase. Any changes to the ElevenLabs integration must maintain compatibility with the conversation initiation client data webhook.

---

## **📋 TABLE OF CONTENTS**

1. [Current Dynamic Variables](#current-dynamic-variables)
2. [Variable Consistency Rules](#variable-consistency-rules)
3. [Modular Additions for Dynamic Variables](#modular-additions)
4. [System Variables Management](#system-variables-management)
5. [Guardrails & Compatibility Rules](#guardrails--compatibility-rules)
6. [Testing Requirements](#testing-requirements)
7. [Deployment Checklist](#deployment-checklist)

---

## **🔍 CURRENT DYNAMIC VARIABLES**

### **Primary Variables (REQUIRED - DO NOT REMOVE)**

```javascript
const dynamic_variables = {
  memorycaller_status: {
    // Core identification
    isRegistered: boolean,        // REQUIRED: Registration status
    phone_e164: string,          // REQUIRED: E.164 format phone
    digits: string,              // REQUIRED: Phone without + prefix
    
    // Contact information
    name: string,                // REQUIRED: Contact name
    business: string,            // REQUIRED: Business name
    cslb: string,                // REQUIRED: License number
    
    // Interaction history
    lastChannel: string,         // REQUIRED: Last communication channel
    source: string,              // REQUIRED: How contact was acquired
    notes: string,               // REQUIRED: Contact notes
    tags: array,                 // REQUIRED: Contact tags array
    
    // Timestamps
    createdAt: string,           // REQUIRED: ISO timestamp
    updatedAt: string,           // REQUIRED: ISO timestamp
    
    // System status
    error: boolean               // REQUIRED: Error status
  }
};
```

### **Variable Descriptions & Usage**

| Variable | Type | Purpose | ElevenLabs Usage |
|----------|------|---------|------------------|
| `isRegistered` | boolean | Determines if caller is existing customer | Controls conversation flow (new vs returning) |
| `phone_e164` | string | E.164 format phone number | Contact identification |
| `digits` | string | Phone without + prefix | Alternative phone format |
| `name` | string | Contact's full name | Personalization in greetings |
| `business` | string | Business/company name | Context for conversation |
| `cslb` | string | License number | Verification and context |
| `lastChannel` | string | Last communication method | Conversation continuity |
| `source` | string | How contact was acquired | Understanding customer journey |
| `notes` | string | Previous interaction notes | Context for current call |
| `tags` | array | Contact categorization | Priority and handling |
| `createdAt` | string | Contact creation timestamp | Account age context |
| `updatedAt` | string | Last update timestamp | Recency context |
| `error` | boolean | System error status | Error handling |

---

## **🔒 VARIABLE CONSISTENCY RULES**

### **MANDATORY CONSISTENCY REQUIREMENTS**

1. **Field Names**: Use EXACT camelCase naming as specified
2. **Data Types**: Maintain exact types (boolean, string, array)
3. **Required Fields**: ALL fields in `memorycaller_status` are REQUIRED
4. **Phone Format**: `phone_e164` MUST be E.164 format (+1XXXXXXXXXX)
5. **Timestamps**: MUST be ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
6. **Error Handling**: `error` field MUST be boolean, never null/undefined

### **FORBIDDEN CHANGES**

❌ **DO NOT:**
- Change field names (e.g., `isRegistered` → `is_registered`)
- Change data types (e.g., `boolean` → `string`)
- Remove any required fields
- Change the `memorycaller_status` object structure
- Modify the root `dynamic_variables` structure
- Change timestamp formats
- Remove error handling

✅ **ALLOWED:**
- Add new fields to `memorycaller_status`
- Add new top-level dynamic variables
- Enhance validation logic
- Improve error messages
- Add logging

---

## **🔧 MODULAR ADDITIONS FOR DYNAMIC VARIABLES**

### **Safe Addition Patterns**

#### **1. New Contact Fields**
```javascript
// SAFE: Add to memorycaller_status object
const enhanced_memorycaller_status = {
  // ... existing fields ...
  
  // NEW FIELDS (examples)
  jobTitle: string,              // Contact's job title
  companySize: string,           // Company size category
  industry: string,              // Industry type
  preferredLanguage: string,     // Language preference
  timeZone: string,              // Contact's timezone
  lastCallDate: string,          // Last call timestamp
  callCount: number,             // Total call count
  satisfactionScore: number,     // Customer satisfaction
  preferredContactTime: string,  // Best time to call
  emergencyContact: string,      // Emergency contact info
  projectHistory: array,         // Previous projects
  currentProjects: array,        // Active projects
  painPoints: array,             // Customer pain points
  interests: array,              // Product interests
  budget: string,                // Budget range
  decisionMaker: boolean,        // Is decision maker
  referralSource: string,        // How they heard about us
  socialMedia: object,           // Social media profiles
  documents: array,              // Related documents
  customFields: object           // Flexible custom data
};
```

#### **2. New Top-Level Dynamic Variables**
```javascript
// SAFE: Add new top-level variables
const dynamic_variables = {
  memorycaller_status: { /* existing */ },
  
  // NEW TOP-LEVEL VARIABLES
  system_status: {
    serviceHealth: string,       // Service health status
    maintenanceMode: boolean,    // Maintenance status
    peakHours: boolean,          // Is it peak hours
    queueLength: number,         // Current queue length
    estimatedWaitTime: number    // Estimated wait time
  },
  
  business_context: {
    currentPromotions: array,    // Active promotions
    seasonalOffers: array,       // Seasonal offers
    newProducts: array,          // New product launches
    companyNews: array,          // Company updates
    industryTrends: array        // Industry insights
  },
  
  agent_instructions: {
    priority: string,            // Call priority
    specialInstructions: string, // Special handling notes
    escalationRules: array,      // When to escalate
    followUpRequired: boolean,   // Follow-up needed
    preferredAgent: string       // Preferred agent type
  }
};
```

#### **3. Conversation Config Enhancements**
```javascript
// SAFE: Enhance conversation config
const conversation_config_override = {
  agent: {
    first_message: string,       // Personalized greeting
    language: string,            // Language setting
    voice_id: string,            // Voice selection
    speaking_rate: number,       // Speech rate
    tone: string,                // Conversation tone
    personality: string,         // Agent personality
    expertise_level: string      // Technical expertise
  },
  
  conversation: {
    max_duration: number,        // Max call duration
    topics: array,               // Allowed topics
    restrictions: array,         // Conversation restrictions
    goals: array,                // Call objectives
    success_metrics: array       // Success criteria
  }
};
```

---

## **⚙️ SYSTEM VARIABLES MANAGEMENT**

### **Environment Variables (REQUIRED)**

```bash
# Authentication tokens
READ_SECRET=your_read_secret_here
INTAKE_WRITE_TOKEN=your_write_token_here
CALLER_INIT_TOKEN_V2=your_init_token_here

# Firestore collections
CONTACTS_COLLECTION=contacts
PENDING_CONTACTS_COLLECTION=pending_contacts

# Service configuration
PORT=8080
NODE_ENV=production
```

### **System Variables in Dynamic Variables**

```javascript
// System variables that should be included
const system_variables = {
  // Request context
  request_timestamp: string,     // When request was made
  request_id: string,            // Unique request identifier
  agent_id: string,              // ElevenLabs agent ID
  conversation_id: string,       // Conversation identifier
  
  // Service context
  service_version: string,       // Service version
  deployment_region: string,     // Deployment region
  data_center: string,           // Data center location
  
  // Performance metrics
  response_time: number,         // Response time in ms
  cache_hit: boolean,            // Was data from cache
  database_latency: number,      // DB query time
  
  // Security context
  authentication_method: string, // How request was authenticated
  ip_address: string,            // Request IP (if needed)
  user_agent: string,            // Request user agent
  rate_limit_status: string      // Rate limiting status
};
```

---

## **🛡️ GUARDRAILS & COMPATIBILITY RULES**

### **CRITICAL COMPATIBILITY REQUIREMENTS**

#### **1. Response Structure (NEVER CHANGE)**
```javascript
// REQUIRED: This exact structure must be maintained
{
  "type": "conversation_initiation_client_data",  // NEVER CHANGE
  "dynamic_variables": {                          // NEVER CHANGE
    "memorycaller_status": { /* required fields */ }
  },
  "conversation_config_override": {               // OPTIONAL but recommended
    "agent": { /* agent config */ }
  }
}
```

#### **2. Endpoint Compatibility**
- **URL**: `/elevenlabs/client-data` (NEVER CHANGE)
- **Method**: POST (NEVER CHANGE)
- **Authentication**: Bearer token (NEVER CHANGE)
- **Request Format**: Multiple phone number formats supported (MAINTAIN)

#### **3. Data Validation Rules**
```javascript
// REQUIRED: These validations must be maintained
const validation_rules = {
  phone_e164: {
    required: true,
    format: /^\+[1-9]\d{1,14}$/,
    example: "+14155551212"
  },
  isRegistered: {
    required: true,
    type: "boolean",
    default: false
  },
  error: {
    required: true,
    type: "boolean",
    default: false
  },
  timestamps: {
    required: true,
    format: "ISO 8601",
    example: "2025-01-27T10:30:00.000Z"
  }
};
```

#### **4. Error Handling Requirements**
```javascript
// REQUIRED: Error response structure
const error_response = {
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "memorycaller_status": {
      "isRegistered": false,
      "business": "",
      "cslb": "",
      "name": "",
      "phone_e164": "",
      "digits": "",
      "lastChannel": "",
      "source": "",
      "notes": "",
      "tags": [],
      "createdAt": "",
      "updatedAt": "",
      "error": true  // MUST be true for errors
    }
  }
};
```

### **DEPLOYMENT GUARDRAILS**

#### **Pre-Deployment Checklist**
- [ ] All required fields present in response
- [ ] Phone number validation working
- [ ] Error handling returns proper structure
- [ ] Authentication still functional
- [ ] Response time < 2 seconds
- [ ] No breaking changes to existing fields
- [ ] New fields are optional and backward compatible

#### **Post-Deployment Validation**
- [ ] Test with valid phone number
- [ ] Test with invalid phone number
- [ ] Test with unregistered contact
- [ ] Test with registered contact
- [ ] Test authentication failure
- [ ] Test service error scenarios
- [ ] Verify response structure matches schema

---

## **🧪 TESTING REQUIREMENTS**

### **Mandatory Test Cases**

```javascript
// Test Case 1: Valid registered contact
const test_registered = {
  input: { "telephony": { "from": "+14155551212" } },
  expected: {
    type: "conversation_initiation_client_data",
    dynamic_variables: {
      memorycaller_status: {
        isRegistered: true,
        error: false,
        // ... all other fields
      }
    }
  }
};

// Test Case 2: Unregistered contact
const test_unregistered = {
  input: { "telephony": { "from": "+19999999999" } },
  expected: {
    type: "conversation_initiation_client_data",
    dynamic_variables: {
      memorycaller_status: {
        isRegistered: false,
        error: false,
        // ... all other fields with empty/default values
      }
    }
  }
};

// Test Case 3: Authentication failure
const test_auth_failure = {
  input: { "telephony": { "from": "+14155551212" } },
  headers: { "Authorization": "Bearer invalid_token" },
  expected: { "error": "unauthorized" }
};

// Test Case 4: Service error
const test_service_error = {
  input: { "telephony": { "from": "+14155551212" } },
  expected: {
    type: "conversation_initiation_client_data",
    dynamic_variables: {
      memorycaller_status: {
        isRegistered: false,
        error: true,
        // ... all other fields with empty values
      }
    }
  }
};
```

---

## **📋 DEPLOYMENT CHECKLIST**

### **Before Making Changes**
- [ ] Read this entire guide
- [ ] Understand the current variable structure
- [ ] Plan changes to maintain compatibility
- [ ] Write tests for new functionality
- [ ] Test locally with sample data

### **During Development**
- [ ] Maintain all required fields
- [ ] Use exact field names and types
- [ ] Add proper error handling
- [ ] Include comprehensive logging
- [ ] Validate all inputs
- [ ] Test edge cases

### **Before Deployment**
- [ ] Run all test cases
- [ ] Verify response structure
- [ ] Check authentication
- [ ] Validate error handling
- [ ] Test with real phone numbers
- [ ] Review logs for issues

### **After Deployment**
- [ ] Monitor service health
- [ ] Check response times
- [ ] Verify ElevenLabs integration
- [ ] Monitor error rates
- [ ] Test with live calls
- [ ] Document any issues

---

## **🚨 EMERGENCY PROCEDURES**

### **If ElevenLabs Integration Breaks**

1. **Immediate Response**
   - Check service logs for errors
   - Verify response structure
   - Test with sample data
   - Check authentication

2. **Quick Fixes**
   - Revert to previous working version
   - Fix field name mismatches
   - Restore missing required fields
   - Fix data type issues

3. **Communication**
   - Notify team immediately
   - Document the issue
   - Create incident report
   - Plan permanent fix

### **Rollback Procedure**
```bash
# Rollback to previous version
gcloud run services update-traffic caller-registry-1085614446627 \
  --to-revisions=caller-registry-1085614446627-00017-xyz=100 \
  --region=us-central1
```

---

## **📞 SUPPORT & CONTACTS**

- **Primary Contact**: Development Team
- **ElevenLabs Integration**: [ElevenLabs Documentation](https://elevenlabs.io/docs)
- **Service URL**: `https://caller-registry-1085614446627-1085614446627.us-central1.run.app`
- **Health Check**: `/healthz`
- **Client Data Endpoint**: `/elevenlabs/client-data`

---

## **📝 CHANGE LOG**

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-27 | 1.0.0 | Initial integration guide | Cursor Agent |
| 2025-01-27 | 1.1.0 | Added unified field structure | Cursor Agent |

---

**⚠️ REMEMBER: This integration is CRITICAL for ElevenLabs functionality. Any changes must maintain full compatibility with the conversation initiation client data webhook. When in doubt, test thoroughly and consult this guide.**
