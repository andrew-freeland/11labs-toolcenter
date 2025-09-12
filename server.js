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
    if (!auth(req, READ_SECRET)) return res.status(401).json({ error: "unauthorized" });

    const raw = req.body?.telephony?.from ?? req.body?.twilio?.From ?? req.body?.from ?? null;
    const e164 = toE164(raw);
    if (!e164) return res.status(200).json({}); // keep call alive

    const snap = await db.collection(CONTACTS).doc(e164).get();
    console.log("[client-data] collection=%s id=%s exists=%s", CONTACTS, e164, snap.exists);
    const c = snap.exists ? snap.data() : null;

    return res.status(200).json({
      phone_e164: e164,
      name: c?.name ?? "",
      business: c?.business ?? "",
      cslb: c?.cslb ?? "",
      isRegistered: !!c?.isRegistered
    });
  } catch (err) {
    console.error("client-data error:", err);
    return res.status(200).json({}); // avoid EL 424
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
