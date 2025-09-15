// server.js — Node 20, Express, Firestore

import express from "express";
import { Firestore, FieldValue } from "@google-cloud/firestore";

const app = express();
app.use(express.json());

const db = new Firestore();

// Environment configuration
const READ_SECRET = process.env.READ_SECRET || "";
const INTAKE_SECRET = process.env.INTAKE_SECRET || "";
const INTAKE_WRITE_TOKEN = process.env.INTAKE_WRITE_TOKEN || process.env.INTAKE_SECRET || "";
const CONTACTS = process.env.CONTACTS_COLLECTION || "contacts";
const PENDING = process.env.PENDING_CONTACTS_COLLECTION || "pending_contacts";
const PORT = process.env.PORT || 8080;

// Helper function to resolve the expected token from environment
function expectedTokenFromEnv() {
  return (
    process.env.CALLER_REGISTRY_TOKEN ||
    process.env.CALLER_INIT_TOKEN_V2 ||
    process.env.READ_SECRET ||
    process.env.INTAKE_SECRET ||
    ""
  );
}

// Helper function to check auth for client data route
function passesClientDataAuth(req) {
  const want = expectedTokenFromEnv();
  if (!want) return false;
  const rawAuth = req.get("Authorization") || "";
  if (rawAuth.startsWith("Bearer ")) {
    const bearer = rawAuth.slice(7);
    if (bearer === want) return true;
  }
  // Accept raw token in Authorization as a fallback
  if (rawAuth === want) return true;
  // Accept X-Auth-Token as a secondary fallback
  const x = req.get("X-Auth-Token") || "";
  if (x === want) return true;
  return false;
}

// Helper function to check auth for write operations
function passesWriteAuth(req) {
  const want = INTAKE_WRITE_TOKEN;
  if (!want) return false;
  const rawAuth = req.get("Authorization") || "";
  if (rawAuth.startsWith("Bearer ")) {
    const bearer = rawAuth.slice(7);
    if (bearer === want) return true;
  }
  return rawAuth === want;
}

// Structured logging helper
function logEvent(level, event, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    event,
    ...details
  };
  console.log(JSON.stringify(logEntry));
}

// Schema validation for pending contacts - Updated for unified ElevenLabs structure
function validatePendingContact(data) {
  const errors = [];
  
  // Required fields validation - Updated to new camelCase structure
  const requiredFields = [
    'phone', 'company', 'name', 'email', 'location', 'constructionType',
    'jobTitle', 'companySize', 'painPoints', 'currentTools', 'featureInterest', 'participateFeedback',
    'contactMethod', 'isRepeat', 'lastContactDate', 'createdDate', 'callCount',
    'licenseNumber', 'businessType', 'languageUsed'
  ];
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Type and format validations - Updated for new field names
  if (data.email && !data.email.includes('@')) {
    errors.push('email must be a valid email address');
  }
  
  if (data.contactMethod && !['text', 'phone', 'email'].includes(data.contactMethod)) {
    errors.push('contactMethod must be one of: text, phone, email');
  }
  
  if (data.businessType && !['LLC', 'INC.', 'Sole Proprietorship'].includes(data.businessType)) {
    errors.push('businessType must be one of: LLC, INC., Sole Proprietorship');
  }
  
  if (data.isRepeat !== undefined && typeof data.isRepeat !== 'boolean') {
    errors.push('isRepeat must be a boolean');
  }
  
  if (data.callCount !== undefined && (!Number.isInteger(data.callCount) || data.callCount < 0)) {
    errors.push('callCount must be a non-negative integer');
  }
  
  if (data.participateFeedback !== undefined && typeof data.participateFeedback !== 'boolean') {
    errors.push('participateFeedback must be a boolean');
  }
  
  if (data.featureInterest && !Array.isArray(data.featureInterest)) {
    errors.push('featureInterest must be an array');
  }
  
  return errors;
}

// Data normalization helper - Updated for unified ElevenLabs structure
function normalizePendingContact(data) {
  const normalized = { ...data };
  
  // Trim whitespace from string fields
  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === 'string') {
      normalized[key] = value.trim();
    }
  }
  
  // Normalize phone number to E164 - Updated field name
  if (normalized.phone) {
    const e164 = toE164(normalized.phone);
    if (e164) {
      normalized.phone = e164;
    }
  }
  
  // Ensure email is lowercase - Updated field name
  if (normalized.email) {
    normalized.email = normalized.email.toLowerCase();
  }
  
  return normalized;
}

// ---- helper ----
function toE164(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.startsWith("+")) return s.replace(/[^\d+]/g, "");
  const digits = s.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return digits ? `+${digits}` : null;
}
const auth = (req, secret) => req.get("Authorization") === `Bearer ${secret}`;

// ---- health ----
app.get("/healthz", (_req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    service: "tool-center-api",
    version: "1.0.0"
  });
});

// ---- ElevenLabs Conversation Initiation Client Data Webhook ----
/*
 * Environment Variables Required:
 * - READ_SECRET: Bearer token for authentication
 * - CONTACTS_COLLECTION: Firestore collection name (default: "contacts")
 *
 * cURL Test Examples:
 * 
 * Happy path (registered contact):
 * curl -s -X POST "$BASE_URL/twilio-init" \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer $READ_SECRET" \
 *   -d '{"caller_id":"+14152728956","agent_id":"agent_6801k14az46hfz0r03dnpm97zzt9","called_number":"+18777024493","call_sid":"CA_test"}' | jq
 *
 * Unauthorized:
 * curl -s -X POST "$BASE_URL/twilio-init" \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer WRONG" \
 *   -d '{"caller_id":"+14152728956"}' | jq
 *
 * New caller (not found):
 * curl -s -X POST "$BASE_URL/twilio-init" \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer $READ_SECRET" \
 *   -d '{"caller_id":"+19999999999"}' | jq
 */
app.post("/twilio-init", async (req, res) => {
  try {
    // Auth: Require Authorization: Bearer <READ_SECRET>
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== READ_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const { caller_id, agent_id, called_number, call_sid } = req.body || {};
    
    // Normalize caller_id to E.164 format
    const phone = toE164(caller_id);
    if (!phone) {
      return res.status(400).json({ error: "missing caller_id" });
    }

    // Look up contact doc: contacts/{caller_id} where doc id is E.164 phone
    const col = CONTACTS;
    const snap = await db.collection(col).doc(phone).get();
    const data = snap.exists ? snap.data() : {};

    // Map Firestore fields to dynamic variables (exact field mapping per spec)
    const dynamic_variables = {
      // Firestore → dynamic variable mapping
      customer_name: data?.name || "",                    // name → customer_name
      business_name: data?.business || "",                // business → business_name  
      license_number: data?.cslb || "",                   // cslb → license_number
      phone_e164: data?.phone_e164 || "",                 // phone_e164 → phone_e164
      last_channel: data?.lastChannel || "",              // lastChannel → last_channel
      notes: data?.notes || "",                           // notes → notes
      source: data?.source || "",                         // source → source
      tags: Array.isArray(data?.tags) ? data.tags : [],  // tags → tags (array)
      is_registered_contact: !!snap.exists,              // isRegistered → is_registered_contact
      
      // System passthroughs
      system__caller_id: phone,
      system__called_number: toE164(called_number) || "",
      system__call_sid: call_sid || ""
    };

    // conversation_config_override: personalized first message based on registration status
    const conversation_config_override = snap.exists 
      ? { 
          agent: { 
            first_message: `Hi ${dynamic_variables.customer_name || "there"} — welcome back. How can I help today?`,
            language: "en" 
          } 
        }
      : { 
          agent: { 
            first_message: "Hi! I can help you get started. Are you calling about a new project or an existing one?",
            language: "en" 
          } 
        };

    // Return exact JSON shape required by ElevenLabs
    return res.json({
      type: "conversation_initiation_client_data",
      dynamic_variables,
      conversation_config_override
    });

  } catch (e) {
    console.error("[twilio-init] error:", e);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---- Conversation Initiation Client Data Webhook (read-only) ----
app.post("/elevenlabs/client-data", async (req, res) => {
  try {
    if (!passesClientDataAuth(req)) {
      logEvent("warn", "auth_fail", { endpoint: "/elevenlabs/client-data", ip: req.ip });
      return res.status(401).json({ error: "unauthorized" });
    }

    const raw =
      req.body?.telephony?.from ??
      req.body?.twilio?.From ??
      req.body?.from ??
      null;

    const e164 = toE164(raw);
    if (!e164) {
      return res.status(200).json({
        type: "conversation_initiation_client_data",
        dynamic_variables: {}
      });
    }

    const snap = await db.collection(CONTACTS).doc(e164).get();
    const c = snap.exists ? snap.data() : null;
    
    logEvent("info", "lookup_contact", { 
      phone_e164: e164, 
      found: snap.exists,
      endpoint: "/elevenlabs/client-data"
    });

    // Convert Firestore Timestamp-> ISO string
    const ts = (v) =>
      v && typeof v.toDate === "function" ? v.toDate().toISOString() : "";

    const payload = {
      isRegistered: !!c?.isRegistered,
      business: c?.business ?? "",
      cslb: c?.cslb ?? "",
      name: c?.name ?? "",
      phone_e164: e164,
      digits: e164.replace(/^\+/, ""),
      lastChannel: c?.lastChannel ?? "",
      source: c?.source ?? "",
      notes: c?.notes ?? "",
      tags: Array.isArray(c?.tags) ? c.tags : [],
      createdAt: ts(c?.createdAt),
      updatedAt: ts(c?.updatedAt),
      error: false
    };

    if (!c) {
      payload.isRegistered = false;
    }

    return res.status(200).json({
      type: "conversation_initiation_client_data",
      dynamic_variables: { memorycaller_status: payload }
    });
  } catch (err) {
    logEvent("error", "client_data_error", { error: err.message, stack: err.stack });
    return res.status(200).json({
      type: "conversation_initiation_client_data",
      dynamic_variables: {
        memorycaller_status: {
          isRegistered: false,
          business: "",
          cslb: "",
          name: "",
          phone_e164: "",
          digits: "",
          lastChannel: "",
          source: "",
          notes: "",
          tags: [],
          createdAt: "",
          updatedAt: "",
          error: true
        }
      }
    });
  }
});

// ---- Optional: read-only lookup (for tools) ----
app.post("/contacts/lookup", async (req, res) => {
  try {
    if (!auth(req, READ_SECRET)) return res.status(401).json({ error: "unauthorized" });
    const e164 = toE164(req.body?.phone_e164 || req.body?.phone);
    if (!e164) return res.status(400).json({ error: "invalid_phone" });

    const snap = await db.collection(CONTACTS).doc(e164).get();
    const c = snap.exists ? snap.data() : null;
    return res.status(200).json(
      c
        ? { phone_e164: e164, name: c.name ?? "", business: c.business ?? "", cslb: c.cslb ?? "", isRegistered: !!c.isRegistered }
        : null
    );
  } catch (err) {
    console.error("lookup error:", err);
    return res.status(500).json({ error: "lookup_failed" });
  }
});

// ---- Writer: SMS intake upsert into pending_contacts ----
app.post("/pending-contacts/upsert", async (req, res) => {
  try {
    if (!passesWriteAuth(req)) {
      logEvent("warn", "auth_fail", { endpoint: "/pending-contacts/upsert", ip: req.ip });
      return res.status(401).json({ error: "unauthorized" });
    }

    // Validate input schema
    const validationErrors = validatePendingContact(req.body);
    if (validationErrors.length > 0) {
      logEvent("warn", "validation_error", { 
        endpoint: "/pending-contacts/upsert", 
        errors: validationErrors 
      });
      return res.status(400).json({ 
        ok: false, 
        error: "validation_failed",
        details: validationErrors 
      });
    }

    // Normalize and prepare data
    const normalized = normalizePendingContact(req.body);
    const e164 = toE164(normalized.phone);
    if (!e164) {
      logEvent("warn", "invalid_phone", { 
        endpoint: "/pending-contacts/upsert", 
        phone: normalized.phone 
      });
      return res.status(400).json({ ok: false, error: "invalid_phone_number" });
    }

    // Create payload with all required fields - Updated for unified ElevenLabs structure
    const payload = {
      // ElevenLabs Primary Fields (camelCase)
      phone: e164,
      company: normalized.company,
      name: normalized.name,
      email: normalized.email,
      location: normalized.location,
      constructionType: normalized.constructionType,
      jobTitle: normalized.jobTitle,
      companySize: normalized.companySize,
      painPoints: normalized.painPoints,
      currentTools: normalized.currentTools,
      featureInterest: normalized.featureInterest,
      participateFeedback: normalized.participateFeedback,
      
      // System Fields (camelCase)
      contactMethod: normalized.contactMethod,
      isRepeat: normalized.isRepeat,
      lastContactDate: normalized.lastContactDate,
      createdDate: normalized.createdDate,
      callCount: normalized.callCount,
      licenseNumber: normalized.licenseNumber,
      businessType: normalized.businessType,
      languageUsed: normalized.languageUsed,
      
      // System fields
      status: "pending",
      submittedBy: "sms-intake",
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // Use phone number as document ID for better organization and deduplication
    // CRITICAL: Ensure we're using the phone number as document ID, not auto-generated
    if (!e164) {
      logEvent("error", "missing_e164", { 
        endpoint: "/pending-contacts/upsert",
        phone_number: normalized.phone_number 
      });
      return res.status(400).json({ ok: false, error: "invalid_phone_number_format" });
    }
    
    const docRef = db.collection(PENDING).doc(e164);
    
    // Log the document ID being used for debugging
    logEvent("info", "using_doc_id", { 
      endpoint: "/pending-contacts/upsert",
      docId: e164,
      phone_number: e164 
    });
    
    // Check if document already exists to determine if this is an update
    const existingDoc = await docRef.get();
    const isUpdate = existingDoc.exists;
    
    if (isUpdate) {
      // Update existing document, preserving createdDate and incrementing callCount
      const existingData = existingDoc.data();
      payload.createdDate = existingData.createdDate; // Preserve original created date
      payload.callCount = (existingData.callCount || 0) + 1; // Increment call count
      payload.isRepeat = true; // Mark as repeat contact
      payload.lastContactDate = new Date().toISOString(); // Update last contact
    }
    
    await docRef.set(payload);
    
    logEvent("info", "upsert_ok", { 
      endpoint: "/pending-contacts/upsert",
      docId: e164,
      phone_number: e164,
      isUpdate: isUpdate,
      callCount: payload.callCount
    });
    
    // Return response with phone number as document ID
    return res.status(200).json({ 
      ok: true, 
      id: e164,  // This MUST be the phone number, not a random ID
      isUpdate: isUpdate,
      callCount: payload.callCount
    });
  } catch (err) {
    logEvent("error", "upsert_failed", { 
      endpoint: "/pending-contacts/upsert",
      error: err.message 
    });
    return res.status(500).json({ ok: false, error: "upsert_failed" });
  }
});

app.listen(PORT, () => {
  console.log(`svc listening on :${PORT}`);
  console.log(`contacts collection: ${CONTACTS}`);
  console.log(`pending collection : ${PENDING}`);
});
