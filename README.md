# SeniorsOS site

**Paywall currently disabled.** All `member-*.html` pages are open to
everyone, logged in or not — see `_redirects`. The Stripe/Netlify Identity
code is still in place (untouched) so charging can be switched back on later
by editing `_redirects`; no rebuild needed.

Static site (no build step for the pages themselves) plus one Netlify
Function for handling Stripe payments securely. Key files:

- `index.html`, `toolkit.html`, `shop.html`, `pricing.html`, `about.html`,
  `donate.html`, `scam-shield.html` — public pages, no login required
- `member-dashboard.html`, `member-bill-buster.html`, `member-tradie-finder.html`,
  `member-letter-writer.html`, `member-getting-around.html`, `member-car-basics.html`,
  `member-trusted-agents.html`
  — Full Toolkit members-only pages, gated by `_redirects`
- `thank-you.html` — the page Stripe sends people back to right after payment
- `assets/auth.js` — login/signup/logout UI, backed by Netlify Identity
- `netlify/functions/stripe-webhook.js` — verifies Stripe payments and grants access
- `_redirects` — the actual access-control rule (enforced at Netlify's CDN edge)
- `netlify.toml` — build + functions config
- `package.json` — dependencies for the webhook function (`stripe`, `@netlify/identity`)

## One-time setup checklist

**1. Enable Netlify Identity**
In the Netlify dashboard: *Project configuration → Identity → Enable Identity*.
Optionally, under *Identity → Emails → Confirmation template*, turn on
**autoconfirm** so people can start using their account immediately after
signing up instead of waiting on a confirmation email — sensible for a
low-friction $5.99 purchase.

**2. Set up Stripe**
- Create a Stripe account if you don't have one, and create a **Product**
  called "SeniorsOS Full Toolkit" priced at **$5.99, one-time**.
- Create a **Payment Link** for that price.
- Copy the Payment Link URL into `assets/auth.js`, replacing
  `YOUR_STRIPE_PAYMENT_LINK` with the real link.
- In the Payment Link's settings, set the **"After payment"** confirmation
  page to redirect to `https://YOUR-SITE.netlify.app/thank-you.html`.

**3. Connect Stripe to a webhook**
- In Stripe: *Developers → Webhooks → Add endpoint*.
- Endpoint URL: `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`
- Event to send: `checkout.session.completed`
- Stripe will show you a **signing secret** (starts with `whsec_`) — you'll need it next.

**4. Set environment variables in Netlify**
*Project configuration → Environment variables*, add:
- `STRIPE_SECRET_KEY` — your Stripe secret key (starts with `sk_`)
- `STRIPE_WEBHOOK_SECRET` — the signing secret from step 3

**5. Deploy via a connected Git repository, not drag-and-drop**
The webhook function needs `npm install` to run so its dependencies
(`stripe`, `@netlify/identity`) are available at deploy time. Netlify only
does this automatically for sites connected to a Git repo (GitHub, GitLab,
Bitbucket) with continuous deployment — a manual drag-and-drop of this
folder will **not** install those dependencies and the function will fail.
If you're not already connected to a Git repo, push this folder to a new
GitHub repository and connect that repo in Netlify instead.

## How the payment flow works, end to end

1. Visitor clicks "Get the Full Toolkit" → prompted to sign up (or log in) via Netlify Identity.
2. They're redirected to your Stripe Payment Link, with their account ID attached.
3. They pay. Stripe redirects them to `thank-you.html` and, separately, sends
   a webhook to `netlify/functions/stripe-webhook.js`.
4. The function verifies the webhook really came from Stripe, then grants
   that account the `full-toolkit` role via the Netlify Identity Admin API.
5. On `thank-you.html`, they log in once more — this fetches a fresh login
   token that includes the new role — and land on `member-dashboard.html`.
6. From then on, `_redirects` lets them (and only them) through to any
   `member-*.html` page, enforced at Netlify's CDN edge — not by page JavaScript.

## Before going live (checklist)

- [ ] Replace every `#` placeholder link in `shop.html` with real affiliate URLs
- [ ] Replace the two `#` placeholder links in `member-trusted-agents.html` with real
      contact/website links for Dual Realty and The Kaprilian Edit
- [ ] Replace bracketed placeholders in `privacy.html` and `terms.html`, and have them reviewed
- [ ] Complete the Stripe + Identity setup above and test a real $5.99 purchase end to end
- [ ] Connect a Git repo to Netlify if you haven't already (required for the webhook function)
- [ ] Add a favicon (`favicon.ico`) — none is included yet
- [ ] Test signup, login, payment, and the member pages on an actual phone, not just desktop resize

## Notes

- Fonts load from Google Fonts via CDN.
- `assets/auth.js` is loaded as an ES module and imports `@netlify/identity`
  directly from `esm.sh` — no bundler needed for the pages themselves.
- The Netlify Function is the only part of this project that needs `npm install`,
  which is why a Git-connected deploy matters (see step 5 above).
