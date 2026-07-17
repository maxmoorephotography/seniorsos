/* ===========================================================
   SeniorsOS — assets/auth.js  (ES module)
   Real accounts via Netlify Identity — server-side, works across
   devices, and the actual page-gating happens at Netlify's CDN edge
   via _redirects (Role=full-toolkit), not in this file. This module
   just handles the signup/login/logout UI and the Stripe handoff.

   Requires:
   - Netlify Identity enabled for this site (Project configuration ->
     Identity -> Enable Identity).
   - The "full-toolkit" role granted server-side after payment by
     netlify/functions/stripe-webhook.js.
   =========================================================== */

import {
  signup,
  login,
  logout,
  getUser,
  handleAuthCallback,
} from "https://esm.sh/@netlify/identity";

var STRIPE_PAYMENT_LINK = "YOUR_STRIPE_PAYMENT_LINK"; // e.g. https://buy.stripe.com/xxxxx

var SeniorsAuth = {
  _pendingCheckout: false,
  _currentUser: null,

  async refresh() {
    this._currentUser = await getUser().catch(function () { return null; });
    this._refreshNav();
    return this._currentUser;
  },

  isLoggedIn() {
    return !!this._currentUser;
  },

  hasFullToolkit() {
    return !!(
      this._currentUser &&
      this._currentUser.app_metadata &&
      Array.isArray(this._currentUser.app_metadata.roles) &&
      this._currentUser.app_metadata.roles.indexOf("full-toolkit") !== -1
    );
  },

  _refreshNav() {
    var loggedIn = this.isLoggedIn();
    var member = this.hasFullToolkit();
    document.querySelectorAll(".auth-out").forEach(function (el) {
      el.style.display = loggedIn ? "none" : "";
    });
    document.querySelectorAll(".auth-in").forEach(function (el) {
      el.style.display = loggedIn ? "" : "none";
    });
    document.querySelectorAll(".auth-member").forEach(function (el) {
      el.style.display = member ? "" : "none";
    });
  },

  // ---- Modal ------------------------------------------------------

  _ensureModal() {
    if (document.getElementById("authModalOverlay")) return;
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="auth-modal-overlay" id="authModalOverlay">' +
        '<div class="auth-modal">' +
          '<button class="auth-modal-close" id="authModalClose" aria-label="Close">&times;</button>' +
          '<div class="auth-modal-tabs">' +
            '<button class="auth-tab-btn active" data-auth-tab="login">Log in</button>' +
            '<button class="auth-tab-btn" data-auth-tab="signup">Sign up</button>' +
          '</div>' +
          '<form id="authFormLogin" class="auth-form">' +
            '<label>Email<input type="email" id="loginEmail" required></label>' +
            '<label>Password<input type="password" id="loginPassword" required></label>' +
            '<p class="auth-error" id="loginError"></p>' +
            '<button type="submit" class="btn-primary" id="loginSubmitBtn">Log in</button>' +
          '</form>' +
          '<form id="authFormSignup" class="auth-form" style="display:none;">' +
            '<label>Email<input type="email" id="signupEmail" required></label>' +
            '<label>Password<input type="password" id="signupPassword" required minlength="6"></label>' +
            '<p class="auth-error" id="signupError"></p>' +
            '<button type="submit" class="btn-primary" id="signupSubmitBtn">Create account</button>' +
          '</form>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap.firstChild);

    var self = this;
    document.getElementById("authModalClose").addEventListener("click", function () {
      self.closeModal();
    });
    document.getElementById("authModalOverlay").addEventListener("click", function (e) {
      if (e.target.id === "authModalOverlay") self.closeModal();
    });
    document.querySelectorAll(".auth-tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".auth-tab-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var tab = btn.getAttribute("data-auth-tab");
        document.getElementById("authFormLogin").style.display = tab === "login" ? "flex" : "none";
        document.getElementById("authFormSignup").style.display = tab === "signup" ? "flex" : "none";
      });
    });

    document.getElementById("authFormLogin").addEventListener("submit", async function (e) {
      e.preventDefault();
      var err = document.getElementById("loginError");
      var btn = document.getElementById("loginSubmitBtn");
      err.textContent = "";
      btn.disabled = true;
      btn.textContent = "Logging in…";
      try {
        await login(
          document.getElementById("loginEmail").value,
          document.getElementById("loginPassword").value
        );
        await self.refresh();
        await self._onAuthSuccess();
      } catch (ex) {
        err.textContent = "Email or password doesn't match.";
      } finally {
        btn.disabled = false;
        btn.textContent = "Log in";
      }
    });

    document.getElementById("authFormSignup").addEventListener("submit", async function (e) {
      e.preventDefault();
      var err = document.getElementById("signupError");
      var btn = document.getElementById("signupSubmitBtn");
      err.textContent = "";
      btn.disabled = true;
      btn.textContent = "Creating account…";
      try {
        await signup(
          document.getElementById("signupEmail").value,
          document.getElementById("signupPassword").value
        );
        await self.refresh();
        if (self.isLoggedIn()) {
          // Autoconfirm is on, or confirmation isn't required — proceed straight away.
          await self._onAuthSuccess();
        } else {
          err.style.color = "var(--moss-deep)";
          err.textContent = "Account created — check your email to confirm it, then log in.";
        }
      } catch (ex) {
        err.textContent = ex && ex.message ? ex.message : "Couldn't create that account — try logging in instead.";
      } finally {
        btn.disabled = false;
        btn.textContent = "Create account";
      }
    });
  },

  // After a successful login/signup: close the modal, refresh the nav,
  // and if this was triggered from "Get the Full Toolkit", continue to Stripe.
  async _onAuthSuccess() {
    this.closeModal();
    this._refreshNav();
    if (this._pendingCheckout) {
      this._pendingCheckout = false;
      this._goToCheckout();
    }
  },

  _goToCheckout() {
    if (!this._currentUser) return;
    var url = new URL(STRIPE_PAYMENT_LINK);
    url.searchParams.set("client_reference_id", this._currentUser.id);
    if (this._currentUser.email) {
      url.searchParams.set("prefilled_email", this._currentUser.email);
    }
    window.location.href = url.toString();
  },

  openModal(tab) {
    this._ensureModal();
    document.getElementById("authModalOverlay").classList.add("open");
    var target = tab === "signup" ? "signup" : "login";
    document.querySelector('.auth-tab-btn[data-auth-tab="' + target + '"]').click();
  },

  closeModal() {
    var el = document.getElementById("authModalOverlay");
    if (el) el.classList.remove("open");
  },

  async doLogout() {
    await logout();
    this._currentUser = null;
    this._refreshNav();
  },

  // ---- Wiring on page load -----------------------------------------

  async init() {
    var self = this;

    // Completes email confirmation / password recovery / invite flows that
    // land back on the site with a token in the URL hash.
    try {
      await handleAuthCallback();
    } catch (e) {
      /* no callback token present — nothing to do */
    }

    await this.refresh();

    document.querySelectorAll("[data-auth-open]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        self.openModal(el.getAttribute("data-auth-open"));
      });
    });

    document.querySelectorAll('[data-auth-action="logout"]').forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        self.doLogout();
      });
    });

    // "Get the Full Toolkit" buttons: data-auth-checkout="1"
    document.querySelectorAll("[data-auth-checkout]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        if (self.isLoggedIn()) {
          self._goToCheckout();
        } else {
          self._pendingCheckout = true;
          self.openModal("signup");
        }
      });
    });
  },
};

window.SeniorsAuth = SeniorsAuth;
document.addEventListener("DOMContentLoaded", function () {
  SeniorsAuth.init();
});
