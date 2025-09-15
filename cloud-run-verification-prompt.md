# 🚨 URGENT: ElevenLabs Field Structure Verification & Update

## **CRITICAL ISSUE**
The Next.js frontend has been updated to use a unified ElevenLabs field structure, but the Cloud Run service is currently rejecting requests because it expects the old field names. Forms are failing with "Failed to submit to intake service" error due to field name mismatch.

## **VERIFICATION PROMPT FOR CLOUD RUN SERVICE AGENT**

```
URGENT: The Next.js frontend has been updated to use a unified ElevenLabs field structure. The Cloud Run service is currently rejecting requests because it expects the old field names, but the frontend is now sending the new unified structure.

CRITICAL ISSUE: Forms are failing with "Failed to submit to intake service" error because of field name mismatch.

REQUIRED ACTIONS:
1. Update the Cloud Run service to accept the new unified ElevenLabs field structure
2. Ensure all 12 ElevenLabs variables are included
3. Use consistent camelCase naming throughout
4. Use the 'phone' field as the document ID (E.164 format)

NEW SCHEMA TO ACCEPT:
{
  // ElevenLabs Primary Fields (camelCase)
  phone: "string",                 // E.164 format (used as document ID)
  company: "string",
  name: "string", 
  email: "string",
  location: "string",
  constructionType: "string",
  jobTitle: "string",
  companySize: "string",
  painPoints: "string",
  currentTools: "string",
  featureInterest: "array",
  participateFeedback: "boolean",
  
  // System Fields (camelCase)
  contactMethod: "string",         // "text", "phone", or "email"
  isRepeat: "boolean",
  lastContactDate: "string",       // ISO timestamp
  createdDate: "string",           // ISO timestamp
  callCount: "number",             // starts at 1
  licenseNumber: "string",
  businessType: "string",          // "LLC", "INC.", or "Sole Proprietorship"
  languageUsed: "string"           // "en"
}

FIELD MAPPING CHANGES:
- raw_number → phone
- phone_number → phone  
- business_name → company
- contact_name → name
- contact_email → email
- business_address → location
- trade_type → constructionType
- contact_method → contactMethod
- is_repeat → isRepeat
- last_contact_date → lastContactDate
- created_date → createdDate
- call_count → callCount
- license_number → licenseNumber
- business_type → businessType
- language_used → languageUsed

NEW FIELDS TO ACCEPT:
- jobTitle, companySize, painPoints, currentTools, featureInterest, participateFeedback

VALIDATION CONSTRAINTS:
- contactMethod: ['text', 'phone', 'email']
- businessType: ['LLC', 'INC.', 'Sole Proprietorship']
- email: valid email format
- phone: E.164 format
- callCount: non-negative integer
- isRepeat: boolean
- featureInterest: array

DOCUMENT ID: Use the 'phone' field (E.164 format) as the document ID instead of 'phone_number'.

TEST PAYLOAD:
{
  "phone": "+14155551212",
  "company": "ABC Construction LLC",
  "name": "John Doe",
  "email": "john@abcconstruction.com",
  "location": "123 Main St, San Francisco, CA 94105",
  "constructionType": "General Contractor",
  "jobTitle": "Project Manager",
  "companySize": "10-50 employees",
  "painPoints": "Difficulty tracking project progress",
  "currentTools": "Excel spreadsheets",
  "featureInterest": ["project_management", "scheduling"],
  "participateFeedback": true,
  "contactMethod": "email",
  "isRepeat": false,
  "lastContactDate": "2025-01-27T10:30:00.000Z",
  "createdDate": "2025-01-27T10:30:00.000Z",
  "callCount": 1,
  "licenseNumber": "1234567",
  "businessType": "LLC",
  "languageUsed": "en"
}

VERIFICATION CHECKLIST:
- [ ] Service accepts all 12 ElevenLabs variables (phone, company, name, email, location, constructionType, jobTitle, companySize, painPoints, currentTools, featureInterest, participateFeedback)
- [ ] Service accepts all 8 system fields (contactMethod, isRepeat, lastContactDate, createdDate, callCount, licenseNumber, businessType, languageUsed)
- [ ] Service uses 'phone' field as document ID (not random ID)
- [ ] Service validates all field constraints properly
- [ ] Service returns phone number as document ID in response
- [ ] Test payload processes successfully without errors
- [ ] No random document IDs are generated
- [ ] All validation rules are enforced (contactMethod enum, businessType enum, email format, phone E.164, etc.)
- [ ] Service handles both new and existing contacts correctly
- [ ] Call count increments properly for repeat contacts
- [ ] Document ID format is E.164 phone number (e.g., "+14155551212")

Please update the service immediately to fix the form submission errors. Test with the provided payload and confirm all checklist items pass.
```

## **EXPECTED OUTCOMES**

The Cloud Run service agent should either:
- ✅ **Confirm compatibility** and provide test results showing all checklist items pass
- 🔧 **Update the service** to accept the new unified structure and provide confirmation
- 📋 **Provide detailed assessment** of required changes with implementation plan

## **VERIFICATION CHECKLIST**

### **Field Structure Verification**
- [ ] Service accepts all 12 ElevenLabs variables
- [ ] Service accepts all 8 system fields  
- [ ] Service uses 'phone' field as document ID
- [ ] Service validates all field constraints
- [ ] Service returns phone number as document ID
- [ ] Test payload processes successfully
- [ ] No random document IDs generated
- [ ] All validation rules enforced

### **Field Mapping Verification**
- [ ] `raw_number` → `phone` mapping works
- [ ] `phone_number` → `phone` mapping works
- [ ] `business_name` → `company` mapping works
- [ ] `contact_name` → `name` mapping works
- [ ] `contact_email` → `email` mapping works
- [ ] `business_address` → `location` mapping works
- [ ] `trade_type` → `constructionType` mapping works
- [ ] All system field mappings work correctly

### **New Fields Verification**
- [ ] `jobTitle` field accepted and stored
- [ ] `companySize` field accepted and stored
- [ ] `painPoints` field accepted and stored
- [ ] `currentTools` field accepted and stored
- [ ] `featureInterest` array field accepted and stored
- [ ] `participateFeedback` boolean field accepted and stored

### **Validation Rules Verification**
- [ ] `contactMethod` enum validation works
- [ ] `businessType` enum validation works
- [ ] Email format validation works
- [ ] Phone E.164 format validation works
- [ ] `callCount` non-negative integer validation works
- [ ] `isRepeat` boolean validation works
- [ ] `featureInterest` array validation works

## **TEST PAYLOAD**

```json
{
  "phone": "+14155551212",
  "company": "ABC Construction LLC",
  "name": "John Doe",
  "email": "john@abcconstruction.com",
  "location": "123 Main St, San Francisco, CA 94105",
  "constructionType": "General Contractor",
  "jobTitle": "Project Manager",
  "companySize": "10-50 employees",
  "painPoints": "Difficulty tracking project progress",
  "currentTools": "Excel spreadsheets",
  "featureInterest": ["project_management", "scheduling"],
  "participateFeedback": true,
  "contactMethod": "email",
  "isRepeat": false,
  "lastContactDate": "2025-01-27T10:30:00.000Z",
  "createdDate": "2025-01-27T10:30:00.000Z",
  "callCount": 1,
  "licenseNumber": "1234567",
  "businessType": "LLC",
  "languageUsed": "en"
}
```

## **SUCCESS CRITERIA**

The verification is successful when:
1. ✅ All 20 fields are accepted by the service
2. ✅ Document ID is the phone number (E.164 format)
3. ✅ Test payload processes without errors
4. ✅ Response returns the phone number as document ID
5. ✅ All validation rules are properly enforced
6. ✅ No random document IDs are generated

## **NEXT STEPS**

1. **Copy the verification prompt** (everything between the backticks above)
2. **Send it to the Cloud Run service agent**
3. **Request immediate execution** of the verification
4. **Review the results** and confirm all checklist items pass
5. **Update the service** if any issues are found

---

**File Created**: `cloud-run-verification-prompt.md`  
**Status**: Ready for deployment to Cloud Run service agent  
**Priority**: URGENT - Forms currently failing
