// server.js — Node 20, Express, Firestore

import express from "express";
import { Firestore, FieldValue } from "@google-cloud/firestore";

const app = express();
app.use(express.json());

const db = new Firestore();

const READ_SECRET  = process.env.READ_SECRET || "";
const INTAKE_SECRET = process.env.INTAKE_SECRET || "";
const CONTACTS = process.env.CONTACTS_COLLECTION || "contacts";
const PENDING  = process.env.PENDING_CONTACTS_COLLECTION || "pending_contacts";
const PORT     = process.env.PORT || 8080;

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
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// ---- Conversation Initiation Client Data Webhook (read-only) ----
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
    if (!auth(req, INTAKE_SECRET)) return res.status(401).json({ error: "unauthorized" });

    const e164 = toE164(req.body?.phone_e164 || req.body?.phone);
    if (!e164) return res.status(400).json({ error: "invalid_phone" });

    const payload = {
      phone_e164: e164,
      name: req.body?.name ?? "",
      business: req.body?.business ?? "",
      cslb: req.body?.cslb ?? "",
      isRegistered: false,
      status: "pending",
      submittedBy: "sms-intake",
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await db.collection(PENDING).doc(e164).set(payload, { merge: true });
    console.log("[pending upsert] collection=%s id=%s", PENDING, e164);
    return res.status(200).json({ ok: true, status: "pending" });
  } catch (err) {
    console.error("pending upsert error:", err);
    return res.status(500).json({ error: "upsert_failed" });
  }
});

app.listen(PORT, () => {
  console.log(`svc listening on :${PORT}`);
  console.log(`contacts collection: ${CONTACTS}`);
  console.log(`pending collection : ${PENDING}`);
});
