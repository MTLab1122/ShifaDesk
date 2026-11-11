# AI Voice Receptionist, Telephony & Intelligent IVR System

## 1. Executive Summary

Phase 9 implements an enterprise-grade, production-oriented **AI Voice Receptionist and Intelligent IVR System** for MatabAI (ShifaDesk). Patients and callers can dial into clinics via standard telephone networks, interact in **Urdu (`ur`)**, **Pashto (`ps`)**, or **English (`en`)**, query clinic hours, consult verified doctor schedules, schedule appointments, track OPD digital queue tokens, and seamlessly transfer to human receptionists when needed.

The voice receptionist strictly adheres to medical ethics: **100% refusal of medical diagnoses, prescriptions, and advice**, coupled with **immediate escalation guidance to Rescue 1122 and emergency hospital facilities** for urgent conditions.

---

## 2. Telephony Architecture & Provider Agnosticism

```
                   [ Inbound Telephone Call ]
                               │
                               ▼
                   ┌───────────────────────┐
                   │ Telephony Carrier     │
                   │ (Twilio / SIP Trunk)  │
                   └───────────┬───────────┘
                               │ HTTP POST Webhook (HMAC-SHA1 Signature)
                               ▼
            ┌──────────────────────────────────────┐
            │ MatabAI Voice Webhook Controller     │
            │ (/api/v1/webhooks/voice/incoming)    │
            └──────────────────┬───────────────────┘
                               │
            ┌──────────────────┴───────────────────┐
            │                                      │
            ▼                                      ▼
┌───────────────────────────┐          ┌───────────────────────────┐
│     Voice IVR Engine      │          │  AI Receptionist Engine   │
│  • Multilingual Greetings │          │  • Intent Detection (NLU) │
│  • DTMF / Speech Gather   │          │  • Tool Execution         │
│  • 1: Urdu, 2: Pashto, 3: │          │  • Emergency Escalation   │
│    English, 0: Handover   │          │  • Medical Advice Refusal │
└───────────┬───────────────┘          └───────────┬───────────────┘
            │                                      │
            └──────────────────┬───────────────────┘
                               │
            ┌──────────────────┴───────────────────┐
            │                                      │
            ▼                                      ▼
┌───────────────────────────┐          ┌───────────────────────────┐
│     Server Tools API      │          │  Human Receptionist Dial  │
│  • Search Doctors         │          │  • TwiML <Dial> Transfer  │
│  • Check Availability     │          │  • Staff In-App Alert     │
│  • Book Appointment       │          │  • Fallback Voice Prompt  │
│  • Queue Status (Tokens)  │          │                           │
│  • Dispatch Phase 8 Alert │          │                           │
└───────────────────────────┘          └───────────────────────────┘
```

### Supported Providers
1. **Twilio Voice (Default Production Adapter)**:
   - TwiML XML Protocol: `<Gather>`, `<Say>`, `<Dial>`, `<Hangup>`, `<Redirect>`.
   - Speech Recognition: Multilingual models (`ur-PK`, `ps-AF`, `en-US`).
   - Text-To-Speech: Amazon Polly Neural voices (`Polly.Aditi`, `Polly.Zayd`, `Polly.Joanna`).
   - Security: Official Twilio HMAC-SHA1 request signature verification via `X-Twilio-Signature`.
2. **Telnyx & SIP Trunking (BYOC)**:
   - High-throughput SIP trunking interconnecting local Pakistani PBX systems or telco enterprise trunks.

---

## 3. Pakistan Telephony & Regulatory Context

### PTA Regulatory Architecture
Under Pakistan Telecommunication Authority (PTA) regulations, direct self-service provisioning of local Pakistani geographic fixed-line (`+92 51`, `+92 42`, `+92 21`) or mobile numbers (`+92 300-349`) via global CPaaS consoles is strictly controlled and requires formal operator interconnect agreements (PTCL, Jazz, Telenor, Zong) or PTA-licensed carrier trunking.

### Implementation Strategies Supported
1. **Twilio BYOC / SIP Trunking**:
   - The clinic's existing local Pakistani landline or PRI/SIP trunk routes inbound calls to the Twilio SIP trunking domain.
2. **International Inbound DIDs**:
   - For overseas diaspora or international consultations (e.g. UK, US, UAE, Saudi Arabia), international toll-free or local DIDs route directly to MatabAI IVR.
3. **Browser-Based Voice Simulator Playground**:
   - Built directly into the dashboard at `/dashboard/voice-assistant`, allowing clinic administrators and staff to test the complete conversational AI loop, DTMF keypad inputs, safety protocols, and server tools without telephony airtime charges.

### Strict Zero Fake Simulation Policy
When real telephony credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) are unconfigured, the system explicitly reports carrier status as `BLOCKED` with detailed guidance. It **never fabricates or simulates live incoming calls** to telephony webhooks.

---

## 4. Multilingual IVR & Keypad Menu

Upon receiving an inbound telephone call:
1. The IVR greets the caller with a trilingual welcome prompt:
   - **Urdu**: *"مطب اے آئی میں خوش آمدید۔ اردو کے لیے ایک دبائیں۔"*
   - **Pashto**: *"د مطب اے آئی ته ښه راغلاست. د پښتو لپاره دوه کېکاږئ."*
   - **English**: *"Welcome to MatabAI clinic assistant. For English, press three."*
2. **Keypad DTMF / Spoken Selection**:
   - `1` or *"Urdu"* / *"اردو"* ➔ Urdu (`ur`)
   - `2` or *"Pashto"* / *"پښتو"* ➔ Pashto (`ps`)
   - `3` or *"English"* ➔ English (`en`)
   - `0` ➔ Direct Human Receptionist Transfer
3. If no digit or speech is captured within 5 seconds, the IVR gently defaults to Urdu and transitions to the conversational receptionist loop.

---

## 5. Medical Safety Protocol

### 100% Medical Advice & Prescription Refusal
The voice receptionist strictly identifies as an **administrative assistant**. If a caller inquires about medication dosages, treatments, symptoms, or diagnoses (e.g., *"میرے سر میں درد ہے مجھے کونسی گولی کھانی چاہیے؟"*):
- The assistant refuses medical advice:
  - **Urdu**: *"بحیثیت انتظامی اسسٹنٹ، میں کوئی طبی مشورہ، نسخہ، یا علاج تجویز نہیں کر سکتا۔ کیا آپ ڈاکٹر کے ساتھ اپائنٹمنٹ بک کرنا چاہتے ہیں؟"*
  - **Pashto**: *"زه یوازې یو اداري مرستیال یم او هیڅ طبي مشوره، درمل یا نسخه نه شم درکولای. ایا غواړئ د ډاکټر سره ملاقات تنظیم کړئ؟"*
  - **English**: *"As an administrative assistant, I cannot provide medical advice, prescriptions, or diagnosis. Would you like to schedule an appointment with a doctor?"*

### Emergency Escalation Protocol
If cardiac, stroke, severe bleeding, or unconsciousness keywords are detected:
- The assistant immediately delivers emergency guidance and terminates the call:
  - **Urdu**: *"اگر یہ کوئی ہنگامی صورتحال ہے تو برائے مہربانی فوری طور پر ریسکیو 1122 پر کال کریں یا قریبی ہسپتال کے ایمرجنسی وارڈ تشریف لے جائیں۔"*
  - **Pashto**: *"که دا بیړنی حالت وي، مهرباني وکړئ سمدستي 1122 ته زنګ ووهئ یا نږدې روغتون ته لاړ شئ."*
  - **English**: *"If this is a medical emergency, please immediately call Rescue 1122 or proceed to the nearest hospital emergency room."*

---

## 6. Conversational Booking & Server Tools

The voice assistant executes authorized backend tools via `AiToolsService`:
1. `get_clinic_information`: Clinic name, address, working hours, and operational status.
2. `search_doctors`: Real-time doctor directory search by name or medical specialty.
3. `get_doctor_availability`: Doctor available time slots for the chosen date.
4. `create_appointment`: Appointment creation with `bookingSource: 'VOICE'`.
5. `scheduleAppointmentNotifications`: Automated dispatch of Phase 8 WhatsApp/SMS confirmation alerts.
6. `get_queue_status`: Real-time OPD queue token status and estimated wait time.
7. `initiateHandover`: Seamless transfer to human receptionist.

### Caller Verification & Privacy
A caller's caller ID (phone number) serves as an initial lookup signal, not identity proof. Public inquiries (doctor schedules, clinic hours, booking new slots) are permitted openly. Access to private patient records, viewing existing bookings, or cancellations requires verbal verification.

---

## 7. Database Entities

| Table | Purpose |
|---|---|
| `voice_integrations` | Carrier integration credentials (SID, encrypted auth token, assigned phone number, verification status). |
| `voice_call_sessions` | Complete telephony session record (Call SID, caller phone, direction, status, language, audio duration, recording). |
| `voice_conversation_messages` | Granular speech turns between Caller, AI Assistant, and System with timestamps. |
| `voice_call_events` | Telephony lifecycle ledger (initiated, speech recognized, DTMF received, tool executed, handover). |
| `voice_provider_settings` | Clinic STT/TTS engine selection, voice model, speed, human transfer number, recording policy. |
| `voice_handover_records` | Receptionist transfer ledger, summary, assigned staff member, and completion status. |

---

## 8. Webhook Endpoints & API Specification

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/webhooks/voice/incoming` | `POST` | Twilio HMAC-SHA1 | Inbound telephony call entrypoint; returns Welcome IVR TwiML. |
| `/api/v1/webhooks/voice/gather` | `POST` | Twilio HMAC-SHA1 | Handles DTMF digits & speech recognition returns; dialogue loop. |
| `/api/v1/webhooks/voice/transfer-status` | `POST` | Twilio HMAC-SHA1 | Receptionist `<Dial>` completion callback; status tracking. |
| `/api/v1/webhooks/voice/status` | `POST` | Twilio HMAC-SHA1 | Call completion status callback; records final audio duration. |
| `/api/v1/voice/calls` | `GET` | JWT (Voice:Read) | Paginated call session history with multi-filter support. |
| `/api/v1/voice/calls/:id` | `GET` | JWT (Voice:Read) | Detailed call session with events and handovers. |
| `/api/v1/voice/calls/:id/transcript` | `GET` | JWT (Voice:Read) | Full conversational transcript turns. |
| `/api/v1/voice/calls/:id/handover` | `POST` | JWT (Voice:Manage) | Manual call transfer dispatch. |
| `/api/v1/voice/analytics` | `GET` | JWT (Voice:Read) | Voice reception KPI metrics and daily timeline. |
| `/api/v1/voice/settings` | `GET`/`PUT` | JWT (Voice:Write) | Clinic STT, TTS, IVR, and transfer configuration. |
| `/api/v1/voice/integrations` | `GET`/`POST`/`PUT` | JWT (Voice:Manage) | Carrier account SID and phone number setup. |
| `/api/v1/voice/integrations/status`| `GET` | JWT (Voice:Read) | Carrier readiness and PTA regulatory status check. |
| `/api/v1/voice/simulate` | `POST` | JWT (Voice:Read) | Interactive browser simulator conversational turn. |

---

## 9. Verification & Automated Test Coverage

The voice module includes 4 dedicated test suites and 22 unit/integration tests:
- `twilio-voice.adapter.spec.ts`: TwiML generation, multilingual gather tags, `<Dial>` transfer, HMAC-SHA1 signature validation.
- `voice-ivr.spec.ts`: DTMF/speech language resolution (Urdu, Pashto, English), welcome greetings, fallback logic.
- `voice-ai-receptionist.spec.ts`: Strict medical advice refusal, immediate Rescue 1122 escalation, doctor booking, queue token queries.
- `voice-handover.spec.ts`: Transfer initiation, receptionist staff in-app notification dispatch, dial completion/failure handling.

