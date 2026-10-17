# Twincast landing page (static)

Open `index.html` directly in a browser. There's no build step and no external requests (fonts are bundled in `fonts/`, SIL OFL).

## Waitlist: LIVE via FormSubmit
- Live site: https://avanbailey-ai.github.io/twincast/ (GitHub Pages repo: avanbailey-ai/twincast)
- Signups are validated client-side, POSTed as JSON to `https://formsubmit.co/ajax/avanbailey@gmail.com` (in `WAITLIST_ENDPOINT` in `app.js`), which emails each signup to the owner, and also saved to this browser's `localStorage` under `twincast_waitlist_v1` as a local backup.
- No secret key is in client code. To move providers, change `WAITLIST_ENDPOINT` and redeploy.
- Console helpers: `twincastWaitlist.list()`, `twincastWaitlist.exportCSV()`, `twincastWaitlist.clear()`.
- To connect a real provider, open `app.js` and either:
  1. set `WAITLIST_ENDPOINT` (for example a Formspree URL, `https://formspree.io/f/XXXX`, or your own `/api/waitlist`), which sends the payload as a JSON POST; or
  2. replace the body of `sendToWaitlistProvider(payload)` (marked `INTEGRATION POINT` / `TODO`).
- ConvertKit/Kit, Mailchimp, Loops and similar services need a secret API key. Proxy those through a server or serverless function, and never put the key in `app.js`.
