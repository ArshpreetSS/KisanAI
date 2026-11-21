# 🌾 Kisan AI — Precision Agriculture Platform

> **A competition-grade, precision agritech web application engineered for farmers across Punjab, Haryana, and North India.**
> Seamlessly unifies real-time micro-climatic telemetry, AI crop disease scanning, verified regional helpline directories, and a multilingual voice assistant supporting **ਪੰਜਾਬੀ (Gurmukhi)**, **हिन्दी (Devanagari)**, and **Hinglish**.

---

## 🔒 Security & OTP Privacy Update

**Why was the OTP previously visible on screen, and how is it secured now?**
- In the initial development build, a sandbox banner was temporarily enabled so developers could test the registration flow without an active SMS carrier.
- **Production Overhaul**: The sandbox banner has been **completely removed**. The OTP is **strictly excluded** from client-side JSON responses.
- **SMS Gateway Integration**:
  - When `FAST2SMS_API_KEY` or `TWILIO_ACCOUNT_SID` is configured in `.env`, the OTP is delivered directly to the farmer's mobile phone via SMS.
  - When running locally without SMS credentials, the OTP is output strictly to the **server terminal stdout** for the administrator (`[SMS GATEWAY DISPATCH] To: +91-XXXXX | Code: XXXX`).
- **Modern 4-Box UI**: The user enters the code into a modern 4-box auto-advancing verification interface with backspace and paste support.

---

## 🚀 Tuff Features Added

### 1. 🌡️ Micro-Climatic Telemetry & Precision Agromet
- **Circular SVG Telemetry Gauges**: Real-time radial meters for Ambient Temperature, Relative Humidity, Soil Moisture, and Penman-Monteith Evapotranspiration ($ET_0$).
- **📍 GPS Farm Location Auto-Detect**: 1-click detection of actual field latitude & longitude via browser Geolocation, dynamically querying Open-Meteo for the farmer's exact village coordinates.
- **7-Day Agricultural Forecast Strip**: Multi-day weather timeline showing precipitation probability, maximum/minimum temperatures, wind velocity, and an automated **Spray Suitability Score** (evaluating wind speed, rain risk, and dew).
- **Precision Irrigation Calculator**: Farmer enters land acreage and pump horsepower; computes the exact water volume needed ($L$) based on FAO $ET_c$ guidelines and estimates tubewell run time and electrical units.
- **Dynamic Unit Switching**: 1-tap conversion between **°C** and **°F** with live Chart.js telemetry re-scaling.
- **Direct SMS Alert Dispatch**: Dynamic `sms:?body=...` link generation with pre-filled hazard parameters for instant farmer warning.

### 2. 📷 AI Crop & Plant Pathology Scanner
- **High-Tech HUD Camera Viewfinder**: Military-grade corner brackets, laser sweep reticle, resolution tag (`1080p AI Vision`), and camera switch controls.
- **Severity Index & Economic Loss Risk**: Displays severity ratings (*Normal*, *Moderate Alert*, *Critical*) and estimates yield percentage loss if left untreated.
- **Dual-Track Treatment Matrix**:
  - **Organic / Bio-control**: Bio-fungicides, neem seed kernel extracts (NSKE), and cow milk foliar sprays.
  - **Chemical Prescription**: PAU-certified chemical molecules with exact dilution ratios (e.g. *Propiconazole 25 EC @ 200 ml/acre in 200L water*).
- **Direct WhatsApp Share Button**: 1-click button to share the full diagnostic report directly with local agriculture officers, KVK experts, or village cooperatives via WhatsApp.

### 3. 📞 Agricultural Helplines, WhatsApp Advisory & Scheme Calculator
- **Direct WhatsApp Advisory**: Instant WhatsApp chat trigger to KVK Fatehgarh Sahib (`81465-70699`) with prefilled greeting.
- **Verified Helpline Directory**: Kisan Call Centre (`1800-180-1551`), PM-KISAN (`155261`), Agri Advisory (`1551`), KVK Fatehgarh Sahib, PAU Ludhiana (`0161-2401960`).
- **Government Subsidies & Benefits Calculator**: Select farm landholding (*Marginal <2 acres*, *Small 2-5 acres*, *Medium/Large >5 acres*) to view instant benefit breakdowns for PM-KISAN (₹6,000/yr), PM-KUSUM Solar pump subsidies (60%), and KCC loan credit limits (4% subsidised interest).
- **Searchable Manuals Library**: Markdown reader with native **Web Speech API "Read Aloud"** voice narration.

### 4. 🤖 Kisan Registration & Multilingual Voice AI
- **Secure 4-Box OTP Verification**: 4 separate digit inputs with auto-advancing focus, backspace handling, rate-limiting, and brute-force protection.
- **Real-Time HTML5 Canvas Audio Waveform**: Draws pulsating frequency energy bars on an HTML5 canvas while the microphone is listening.
- **Smart Voice Navigation**:
  - *"Temperature dikhao"* → Navigates to Interface 1.
  - *"Crop scanner kholo"* → Navigates to Interface 2.
  - *"KVK helpline number"* → Navigates to Interface 3.
- **Multilingual Conversational Intelligence**: Powered by **Google Gemini 2.5 Flash** with farm context injection (current temperature, humidity, soil moisture, registered crop, and latest scan).
- **Native Speech Synthesis (TTS)**: Natural voice responses in Punjabi (`pa-IN`), Hindi (`hi-IN`), or Indian English (`en-IN`) with a mute toggle.

---

## 🐳 Whole Deployable Architecture

Kisan AI is 100% production-ready and can be deployed anywhere with one command:

### 1. Vercel Serverless (Recommended)
Kisan AI is pre-configured for instant zero-configuration deployment on Vercel:
1. Go to [vercel.com/new](https://vercel.com/new) and select **`ArshpreetSS/KisanAI`**.
2. Framework Preset: **Other** (Vercel automatically detects `vercel.json`).
3. Root Directory: `./` (leave default).
4. Environment Variables: Add `GEMINI_API_KEY` (optional) or `OPENAI_API_KEY` (optional).
5. Click **Deploy**!

### 2. Docker & Docker Compose
```bash
docker compose up --build -d
```
Includes built-in health check polling `http://localhost:3000/health`.

### 3. Standard Node.js Production
```bash
npm install
npm start
```

### 4. Render / Railway / Heroku
A `Procfile` is provided (`web: node server.js`). Simply connect your Git repository and deploy.

### 5. Netlify
Serverless functions configured in `netlify/functions/` and routed via `netlify.toml`.

---

## 📋 Environment Configuration (`.env`)

```env
PORT=3000

# Google Gemini API Key (Optional for production live AI generation)
# If blank, Kisan AI operates in Verified Regional Agromet & Pathology Mode
GEMINI_API_KEY=

# Default Farm Coordinates (Sirhind / Fatehgarh Sahib, Punjab, India)
DEFAULT_LAT=30.6433
DEFAULT_LON=76.3887

# SMS Gateway Configuration (Optional - logs to server console if unset)
FAST2SMS_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```
