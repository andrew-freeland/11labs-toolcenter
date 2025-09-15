# 🚀 ElevenLabs Integration Quick Reference

## **⚡ EMERGENCY QUICK FIXES**

### **If ElevenLabs Integration Breaks:**

1. **Check Response Structure:**
   ```json
   {
     "type": "conversation_initiation_client_data",
     "dynamic_variables": {
       "memorycaller_status": {
         "isRegistered": boolean,
         "error": boolean,
         // ... all other fields
       }
     }
   }
   ```

2. **Verify Required Fields:**
   - `isRegistered` (boolean)
   - `phone_e164` (string, E.164 format)
   - `error` (boolean)
   - All other fields in `memorycaller_status`

3. **Test Endpoint:**
   ```bash
   curl -X POST https://caller-registry-1085614446627-1085614446627.us-central1.run.app/elevenlabs/client-data \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"telephony": {"from": "+14155551212"}}'
   ```

---

## **🔧 COMMON FIXES**

### **Field Name Issues:**
- ❌ `is_registered` → ✅ `isRegistered`
- ❌ `phone_number` → ✅ `phone_e164`
- ❌ `business_name` → ✅ `business`

### **Data Type Issues:**
- ❌ `"true"` → ✅ `true` (boolean)
- ❌ `null` → ✅ `""` (empty string)
- ❌ `undefined` → ✅ `[]` (empty array)

### **Missing Fields:**
```javascript
// Add missing fields with defaults
const defaults = {
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
  error: false
};
```

---

## **📋 DEPLOYMENT CHECKLIST**

- [ ] Response has correct `type` field
- [ ] All required fields present
- [ ] Data types are correct
- [ ] Phone format is E.164
- [ ] Error handling works
- [ ] Authentication works
- [ ] Response time < 2 seconds

---

## **🚨 ROLLBACK COMMAND**

```bash
gcloud run services update-traffic caller-registry-1085614446627 \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1
```

---

## **📞 QUICK CONTACTS**

- **Service URL**: `https://caller-registry-1085614446627-1085614446627.us-central1.run.app`
- **Health Check**: `/healthz`
- **Client Data**: `/elevenlabs/client-data`
- **Docs**: `ELEVENLABS_INTEGRATION_GUIDE.md`
- **Templates**: `ELEVENLABS_CODE_TEMPLATES.js`

---

**⚠️ When in doubt, test with the provided templates and maintain the exact response structure!**
