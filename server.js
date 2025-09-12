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

// Schema validation for pending contacts
function validatePendingContact(data) {
  const errors = [];
  
  // Required fields validation
  const requiredFields = [
    'raw_number', 'phone_number', 'business_name', 'contact_name', 
    'contact_email', 'contact_method', 'is_repeat', 'last_contact_date',
    'created_date', 'call_count', 'license_number', 'business_address',
    'trade_type', 'business_type', 'language_used'
  ];
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Type and format validations
  if (data.contact_email && !data.contact_email.includes('@')) {
    errors.push('contact_email must be a valid email address');
  }
  
  if (data.contact_method && !['text', 'phone', 'email'].includes(data.contact_method)) {
    errors.push('contact_method must be one of: text, phone, email');
  }
  
  if (data.business_type && !['LLC', 'INC.', 'Sole Proprietorship'].includes(data.business_type)) {
    errors.push('business_type must be one of: LLC, INC., Sole Proprietorship');
  }
  
  if (data.is_repeat !== undefined && typeof data.is_repeat !== 'boolean') {
    errors.push('is_repeat must be a boolean');
  }
  
  if (data.call_count !== undefined && (!Number.isInteger(data.call_count) || data.call_count < 0)) {
    errors.push('call_count must be a non-negative integer');
  }
  
  return errors;
}

// Data normalization helper
function normalizePendingContact(data) {
  const normalized = { ...data };
  
  // Trim whitespace from string fields
  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === 'string') {
      normalized[key] = value.trim();
    }
  }
  
  // Normalize phone number to E164
  if (normalized.phone_number) {
    const e164 = toE164(normalized.phone_number);
    if (e164) {
      normalized.phone_number = e164;
    }
  }
  
  // Ensure email is lowercase
  if (normalized.contact_email) {
    normalized.contact_email = normalized.contact_email.toLowerCase();
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
    const e164 = toE164(normalized.phone_number);
    if (!e164) {
      logEvent("warn", "invalid_phone", { 
        endpoint: "/pending-contacts/upsert", 
        phone: normalized.phone_number 
      });
      return res.status(400).json({ ok: false, error: "invalid_phone_number" });
    }

    // Create payload with all required fields
    const payload = {
      raw_number: normalized.raw_number,
      phone_number: e164,
      business_name: normalized.business_name,
      contact_name: normalized.contact_name,
      contact_email: normalized.contact_email,
      contact_method: normalized.contact_method,
      is_repeat: normalized.is_repeat,
      last_contact_date: normalized.last_contact_date,
      created_date: normalized.created_date,
      call_count: normalized.call_count,
      license_number: normalized.license_number,
      business_address: normalized.business_address,
      trade_type: normalized.trade_type,
      business_type: normalized.business_type,
      language_used: normalized.language_used,
      
      // System fields
      status: "pending",
      submittedBy: "sms-intake",
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // Use auto-generated document ID for better scalability
    const docRef = await db.collection(PENDING).add(payload);
    
    logEvent("info", "upsert_ok", { 
      endpoint: "/pending-contacts/upsert",
      docId: docRef.id,
      phone_number: e164
    });
    
    return res.status(200).json({ ok: true, id: docRef.id });
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
