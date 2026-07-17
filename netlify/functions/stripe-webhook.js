// netlify/functions/stripe-webhook.js
//
// Receives Stripe's webhook when a Full Toolkit payment completes,
// verifies it's genuinely from Stripe (not just a URL someone guessed),
// and grants the paying Netlify Identity user the "full-toolkit" role —
// which is what _redirects uses to unlock the member-*.html pages.
//
// Required environment variables (set these in Netlify:
// Project configuration -> Environment variables):
//   STRIPE_SECRET_KEY     - your Stripe secret key (starts with sk_)
//   STRIPE_WEBHOOK_SECRET - the signing secret Stripe gives you when you
//                           create the webhook endpoint (starts with whsec_)
//
// Set up the webhook itself in the Stripe Dashboard -> Developers -> Webhooks:
//   Endpoint URL: https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook
//   Event to send: checkout.session.completed
//
// Also set the Payment Link's "After payment" confirmation page to redirect to:
//   https://YOUR-SITE.netlify.app/thank-you.html
// (not straight to member-dashboard.html — see the comment in thank-you.html
// for why: the visitor's login token needs one more login to pick up the
// new role, which thank-you.html walks them through.)

import Stripe from "stripe";
import { admin } from "@netlify/identity";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    // Signature didn't match — this request did not genuinely come from Stripe.
    console.error("Webhook signature verification failed:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id;

    if (!userId) {
      console.error("Payment completed but no client_reference_id was attached.");
      return new Response("Missing client_reference_id", { status: 400 });
    }

    try {
      const user = await admin.getUser(userId);
      const existingRoles = (user && user.app_metadata && user.app_metadata.roles) || [];
      const roles = Array.from(new Set([...existingRoles, "full-toolkit"]));

      await admin.updateUser(userId, {
        app_metadata: { roles },
      });

      console.log(`Granted full-toolkit role to user ${userId}`);
    } catch (err) {
      console.error("Failed to grant role after payment:", err);
      // Return 500 so Stripe retries the webhook automatically.
      return new Response("Failed to grant access", { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
