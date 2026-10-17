# Twincast landing page (static)

Open `index.html` directly in a browser. There's no build step and no external requests (fonts are bundled in `fonts/`, SIL OFL).

## Waitlist: NO LIVE BACKEND IS CONNECTED
- Signups are validated client-side and saved to this browser's `localStorage` under the key `twincast_waitlist_v1`.
- Console helpers: `twincastWaitlist.list()`, `twincastWaitlist.exportCSV()`, `twincastWaitlist.clear()`.
- To connect a real provider, open `app.js` and either:
  1. set `WAITLIST_ENDPOINT` (for example a Formspree URL, `https://formspree.io/f/XXXX`, or your own `/api/waitlist`), which sends the payload as a JSON POST; or
  2. replace the body of `sendToWaitlistProvider(payload)` (marked `INTEGRATION POINT` / `TODO`).
- ConvertKit/Kit, Mailchimp, Loops and similar services need a secret API key. Proxy those through a server or serverless function, and never put the key in `app.js`.
