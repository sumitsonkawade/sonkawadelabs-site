# Sonkawade Labs

**I build software for the parts of India that software usually skips.**

Sonkawade Labs is a one-person software studio run by Sumit Sonkawade from Walandi,
Deoni Taluka, Latur District, Maharashtra. I build tools for the people I live next to:
CSC operators filling government forms all day, farmers enrolling for crop insurance,
kirana shop owners answering the same stock question forty times, plumbers and
electricians losing customers because their hands are inside a wall.

Everything I build shares three rules:

- **It runs on WhatsApp or on Windows.** Not on a new app nobody will install.
- **It speaks Marathi, Hindi and Hinglish** — not just English.
- **It is priced per job, not per seat.** ₹10 for an application, not ₹2,000 a month.

Seven projects below. Two are live and taking money. Three are built and in pilot.
Two are early.

---

## Projects

### CSC Pro — certificate work, done in a fraction of the time
**Live · in use at CSC centres**

Desktop software for Common Service Centre operators in Maharashtra. The operator
photographs a customer's Aadhaar, the software reads it, and it fills the MahaOnline
certificate application in Chrome by itself. The operator reviews and submits.

- Handles caste, income, residence, non-creamy-layer, age/nationality and OBC/SC/ST/VJNT
  certificates — 15 government services in all
- Reads Aadhaar, ration card, voter ID, school-leaving and bonafide documents automatically
- Separate **PMFBY crop-insurance module**: bulk farmer enrolment, land parcel handling,
  premium calculation, payment receipts
- Built-in customer chat: the operator's own WhatsApp Business number, connected in
  three taps, for collecting documents and sending updates
- Prepaid wallet — operators top up online, ₹10 per completed application
- Records personal data under India's DPDP rules: consent screens, deletion requests,
  encrypted storage

*Tech:* Python, PySide6 desktop UI, Playwright browser automation, FastAPI backend,
Supabase, Cashfree payments, WhatsApp Cloud API, AI + Tesseract OCR. Ships as a signed
Windows installer. 858 commits, 146 test files.

---

### Arzi — a formal application letter from a WhatsApp message
**Live**

A citizen messages the bot in any Indian language and describes their problem. Arzi
asks the two or three questions it still needs, then sends back a properly formatted,
ready-to-print application letter addressed to the right office — as a PDF.

- Works in Marathi, Hindi, Hinglish and English
- Understands the problem from plain speech, no forms to fill
- Reads a photo of a government notice and drafts the reply to it
- Returns a print-ready PDF, formatted the way a government office expects
- ₹10 per application, paid online. No subscription.

*Tech:* Python, FastAPI, WhatsApp Cloud API, Gemini via an OpenAI-compatible gateway,
WeasyPrint PDF generation, Supabase, Razorpay, deployed on Railway.

---

### StockSaathi — your shop answers "do you have it?" while you're busy
**Pilot · backend live, desktop app in beta**

A customer WhatsApps the shop asking for an item. StockSaathi checks the shop's real
Tally stock and answers in seconds with availability, price and an estimate — in the
language the customer asked in.

- Reads live stock straight out of TallyPrime through a small Windows agent
- Answers customers in Marathi, Hindi, Hinglish or English, including local nicknames for products
- Tells the owner what customers asked for and the shop *didn't* have — missed sales, in writing
- Full billing desktop app: invoices, purchases, credit notes, receivables, GSTR-1
- **Payment-reminder voice calls** to customers who owe money, with commitments tracked
- Daily digest to the owner; works with or without Tally

*Tech:* Python, FastAPI, Supabase, WhatsApp Cloud API, Sarvam AI voice, Tauri + React
desktop app (Rust), TallyPrime XML integration, Razorpay. Backend live on Railway;
desktop app packaged for the Microsoft Store.

---

### Phone Munshi — an AI receptionist for tradesmen
**Built · pilot pending**

A plumber misses a call because his hands are inside a wall. Within seconds Phone Munshi
WhatsApps the caller, works out what job they need, proposes a time and a price, and
sends the plumber a one-tap confirm. On confirm, the customer gets a UPI payment
request and the job is filed.

- Detects the missed call on the tradesman's own Android phone
- Decides who to answer and who to ignore — VIP list, blocklist, working hours
- Chats with the customer in Marathi, Hindi, Hinglish or English and books the job
- **Voice intake too** — the customer can just talk
- Money goes straight to the tradesman's own UPI ID; Sonkawade Labs never holds it.
  Payment screenshots are verified automatically and an invoice PDF is issued
- One number tells the whole story: *"Phone Munshi answered 34 calls this month =
  ₹47,000 of work booked."*

*Tech:* Python, FastAPI, Supabase, Kotlin + Jetpack Compose Android app, WhatsApp Cloud
API with per-tradesman onboarding, Sarvam AI voice, encrypted token storage, DPDP
consent and deletion flows. 131 backend tests, 10 Android tests, CI on every push.
Code complete through pilot hardening; not yet run with live customers.

---

### ExplainTube — turn any video into an explainer video in your language
**In development · active**

Point the app at a video or drop in a subtitle file, and it writes an original
explainer — summary, hook, scene-by-scene narration, title, description, hashtags,
thumbnail text — in an Indian language, then renders it as a finished video with voiceover.

- Android app; the whole job runs from a phone
- Writes an original explanation of the subject — it does not copy or translate the source
- Generates the voiceover and renders a real 1080p video, portrait or landscape, with a
  music bed
- Picks a matching photo or a real frame from the source video for every scene
- Splits a two-hour source into parts so a phone and a small server can handle it
- Swap the AI provider with one setting — Anthropic, OpenAI, Gemini or Sarvam

*Tech:* TypeScript, Fastify backend, Expo React Native app with a custom Kotlin module,
FFmpeg, yt-dlp, Supabase, Sarvam TTS, Pexels. Deployed via Docker on Railway.

---

### sonkawadelabs.in — the company site
**Live**

The public home for the products: product pages, pricing, download links, and the full
legal set — privacy policy, terms, refunds, data deletion and grievance contact — written
to pass Meta's WhatsApp app review and Indian payment-gateway compliance checks.

*Tech:* Static HTML/CSS, deployed on Railway.

---

### Gamma Blast — options trading research bot
**Prototype · personal research, not a client product**

A scheduled bot that watches ETH options on Delta Exchange, scores an entry against a
fixed checklist of technical conditions, sizes a hypothetical position with a
Black-Scholes model, and reports to Telegram. It runs in paper-trading mode: real market
data, virtual money, no orders placed.

*Tech:* Python, pandas/NumPy/SciPy, Delta Exchange API, Telegram bot, Railway.

> Honest note: the GitHub repo `gamma-blast` currently holds only a README — the working
> code lives on my machine and has not been pushed. Nothing in it is financial advice or
> a live trading system.

---

## Services I offer

Every item below is something already shipped in the projects above — not a wish list.

**WhatsApp business automation**
Bots that hold a real conversation in Marathi, Hindi, Hinglish and English. Connecting a
client's *own* WhatsApp Business number in a few taps (Meta Embedded Signup), message
template approval, delivery tracking, and many clients routed on one system.

**Government portal automation**
Filling MahaOnline and PMFBY forms automatically in a real browser, including portals
that change without warning — with a recorder that learns a new form and self-healing
that survives a layout change.

**Document reading (OCR) pipelines**
Aadhaar, ration cards, voter IDs, school-leaving certificates, bonafide certificates and
government notices turned into clean, correct fields — with quality checks, Marathi
name and address handling, and personal details stripped before anything reaches an AI model.

**Windows desktop software**
Real installable applications, not a web page in a wrapper — Python/PySide6 or Rust/Tauri,
with signed installers, offline-first local databases and Microsoft Store packaging.

**Backends and mobile apps**
FastAPI and Node backends on Railway with Supabase, row-level security, migrations,
background jobs and automated tests on every change. Android apps in Kotlin/Compose or
React Native.

**Payments and billing**
Cashfree and Razorpay payment links with verified webhooks, prepaid credit wallets,
direct UPI collection with screenshot verification, GST invoices and GSTR-1 export.

**Voice and Indian-language AI**
Speech in and speech out in Indian languages, automated reminder calls, and AI built so
the model can never invent a price — it picks the job type, the code looks up the rate.

**Indian compliance, built in**
DPDP consent screens, data-deletion flows, grievance officer notices, retention jobs, and
the legal page set that Meta app review and payment gateways actually ask for.

---

## Contact

**Sonkawade Labs** — Sumit Sonkawade
Walandi, Deoni Taluka, Latur District, Maharashtra 413519, India

- Web: **sonkawadelabs.in**
- Email: sumitsonkawade@sonkawadelabs.in
- Phone: +91 74986 01105
- Hours: Monday–Saturday, 10:00 AM – 6:00 PM IST

*If you have a repetitive job that eats your day — a form, a phone call, a stock
question, a letter — that is exactly the kind of thing I build away.*
