import express from "express";
import { Firestore } from "@google-cloud/firestore";

const app = express();
const db = new Firestore();

// Environment variables
const PORT = process.env.PORT || 8080;
const CONTACTS = process.env.CONTACTS_COLLECTION || "contacts";
const PENDING_CONTACTS = process.env.PENDING_CONTACTS_COLLECTION || "pending_contacts";

app.use(express.json());

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

// Helper function to convert phone number to E164 format
function toE164(raw) {
  if (!raw || typeof raw !== "string") return null;
  
  // Remove all non-digit characters
  const digits = raw.replace(/\D/g, "");
  
  // If it starts with 1 and has 11 digits, it's likely US/Canada
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  
  // If it has 10 digits, assume US/Canada and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it already looks like E164 (starts with +)
  if (raw.startsWith("+")) {
    return raw;
  }
  
  // For other cases, just add + if it looks like a valid international number
  if (digits.length >= 7 && digits.length <= 15) {
    return `+${digits}`;
  }
  
  return null;
}

// ElevenLabs Client Initiation Data Webhook
app.post("/elevenlabs/client-data", async (req, res) => {
  try {
    if (!passesClientDataAuth(req)) {
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
    console.error("[client-data] error:", err);
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

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});